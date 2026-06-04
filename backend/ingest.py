import asyncio
import os
import uuid
from urllib.parse import urlparse

from langchain_text_splitters import RecursiveCharacterTextSplitter, MarkdownHeaderTextSplitter
from langchain_core.documents import Document
from agent import get_vectorstore

# Dùng local Playwright, không dùng cloud ACS proxy của crawl4ai
os.environ.setdefault("CRAWL4AI_DISABLE_ACS", "1")


def _parse_cookie_string(cookie_str: str, url: str) -> list[dict]:
    """
    Chuyển cookie header string → list Playwright cookie objects.
    Ví dụ: "session=abc; token=xyz" → [{"name":"session","value":"abc","domain":"example.com","path":"/"}]
    """
    domain = urlparse(url).hostname or ""
    cookies = []
    for part in cookie_str.split(";"):
        part = part.strip()
        if not part or "=" not in part:
            continue
        name, _, value = part.partition("=")
        name = name.strip()
        value = value.strip()
        if name:
            cookies.append({
                "name": name,
                "value": value,
                "domain": domain,
                "path": "/",
            })
    return cookies


# ── Crawl4AI fetcher ──────────────────────────────────────

async def _crawl_pages(url: str, max_depth: int, cookies: str | None = None) -> list[Document]:
    """
    Crawl URL (và link con đến max_depth) bằng crawl4ai.
    Trả về list Document với markdown content sạch.
    """
    from crawl4ai import AsyncWebCrawler, CacheMode, BrowserConfig, CrawlerRunConfig
    from crawl4ai.content_filter_strategy import PruningContentFilter
    from crawl4ai.markdown_generation_strategy import DefaultMarkdownGenerator

    base_netloc = urlparse(url).netloc
    visited: set[str] = set()
    queue: set[str] = {url}
    docs: list[Document] = []

    # Inject cookie vào browser context (Playwright) — cách duy nhất
    # hoạt động với trang dùng JS để check auth (document.cookie)
    browser_cookies = _parse_cookie_string(cookies, url) if cookies else []
    browser_cfg = BrowserConfig(
        headless=True,
        verbose=False,
        cookies=browser_cookies,
    )

    md_gen = DefaultMarkdownGenerator(
        content_filter=PruningContentFilter(threshold=0.45, threshold_type="fixed"),
    )
    run_cfg = CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,
        markdown_generator=md_gen,
        word_count_threshold=20,
        exclude_external_links=True,
        exclude_social_media_links=True,
        remove_overlay_elements=True,
        magic=False,
    )

    async with AsyncWebCrawler(config=browser_cfg) as crawler:
        for _depth in range(max_depth + 1):
            if not queue:
                break

            batch = list(queue - visited)
            visited.update(batch)
            queue.clear()

            results = await crawler.arun_many(urls=batch, config=run_cfg)

            for res in results:
                if not res.success:
                    continue

                # crawl4ai 0.8+: res.markdown là object, không phải string
                md_obj = res.markdown
                if md_obj is None:
                    continue
                fit = getattr(md_obj, "fit_markdown", None) or ""
                raw = getattr(md_obj, "raw_markdown", None) or ""
                content = (fit or raw).strip()
                if not content:
                    continue

                meta_raw = res.metadata or {}
                docs.append(Document(
                    page_content=content,
                    metadata={
                        "source": res.url,
                        "title": (meta_raw.get("title") or res.url).strip(),
                    },
                ))

                # Thu thập internal links cho depth tiếp theo
                if _depth < max_depth:
                    links = res.links or {}
                    for link in links.get("internal", []):
                        href = (link.get("href") or "").strip()
                        if href and urlparse(href).netloc == base_netloc and href not in visited:
                            queue.add(href)

    return docs


def _crawl_sync(url: str, max_depth: int, cookies: str | None = None) -> list[Document]:
    """Wrapper sync để gọi từ thread pool."""
    return asyncio.run(_crawl_pages(url, max_depth, cookies))


# ── Chunking pipeline ─────────────────────────────────────

_MD_HEADERS = [
    ("#",   "heading1"),
    ("##",  "heading2"),
    ("###", "heading3"),
]

_md_splitter = MarkdownHeaderTextSplitter(
    headers_to_split_on=_MD_HEADERS,
    strip_headers=False,
)

_char_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    separators=["\n\n", "\n", ". ", " ", ""],
)


def _chunk_docs(raw_docs: list[Document]) -> list[Document]:
    final: list[Document] = []

    for doc in raw_docs:
        if not doc.page_content.strip():
            continue
        base_meta = {k: v for k, v in (doc.metadata or {}).items() if v is not None}

        md_chunks = _md_splitter.split_text(doc.page_content)
        for mc in md_chunks:
            if mc.metadata is None:
                mc.metadata = {}
            for k, v in base_meta.items():
                mc.metadata.setdefault(k, v)

        char_chunks = _char_splitter.split_documents(md_chunks)
        for cc in char_chunks:
            if cc.metadata is None:
                cc.metadata = {}
        final.extend(char_chunks)

    return final


# ── Main ingest function ──────────────────────────────────

def ingest_url(url: str, max_depth: int = 1, cookies: str | None = None) -> int:
    """
    Crawl URL bằng crawl4ai, chunk và lưu vào ChromaDB.
    Tự động xóa bản cũ nếu URL đã được nạp.
    """
    raw_docs = _crawl_sync(url, max_depth, cookies)

    if not raw_docs:
        return 0

    final_chunks = _chunk_docs(raw_docs)

    if not final_chunks:
        return 0

    # Prepend breadcrumb ngữ cảnh vào đầu mỗi chunk
    for chunk in final_chunks:
        heading_parts = [
            chunk.metadata[k]
            for k in ["heading1", "heading2", "heading3"]
            if chunk.metadata.get(k)
        ]
        if heading_parts:
            section = " > ".join(heading_parts)
            if not chunk.page_content.startswith("[Chủ đề:"):
                chunk.page_content = f"[Chủ đề: {section}]\n\n{chunk.page_content}"

    # Xóa bản cũ
    vs = get_vectorstore()
    try:
        existing = vs.get(where={"source": url})
        if existing and existing.get("ids"):
            vs.delete(ids=existing["ids"])
    except Exception:
        pass

    # Enrich metadata
    for i, chunk in enumerate(final_chunks):
        m = chunk.metadata
        m["source"]      = m.get("source") or url
        m["title"]       = m.get("title") or url
        m["chunk_index"] = i
        heading_parts    = [m[k] for k in ["heading1", "heading2", "heading3"] if m.get(k)]
        m["section"]     = " > ".join(heading_parts) if heading_parts else ""

    # Lọc chunk quá ngắn
    final_chunks = [c for c in final_chunks if len(c.page_content.strip()) >= 50]

    # ChromaDB không chấp nhận None values
    for chunk in final_chunks:
        chunk.metadata = {k: (v if v is not None else "") for k, v in chunk.metadata.items()}

    ids = [str(uuid.uuid4()) for _ in final_chunks]
    vs.add_documents(final_chunks, ids=ids)

    return len(final_chunks)
