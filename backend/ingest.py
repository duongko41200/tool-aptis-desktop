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


# ── Automation Flow execution ─────────────────────────────

def _split_sentences(text: str) -> list[str]:
    """Tách text thành đơn vị nhỏ để so sánh diff sau mỗi click."""
    import re
    lines = re.split(r'[\n.。]', text)
    return [l.strip() for l in lines if len(l.strip()) >= 20]


async def _execute_flow(
    url: str,
    nodes: list[dict],
    edges: list[dict],
    cookies: str | None = None,
) -> list[Document]:
    """
    Chạy automation workflow bằng Playwright.

    Luồng thực thi:
        1. Build DAG từ nodes + edges
        2. Tìm node Start → navigate tới URL
        3. Duyệt tuần tự theo edges:
           - click/dbl_click/hover  → click element, đợi, capture diff nội dung
           - extract_text/html      → capture toàn bộ nội dung trang
           - open_url               → navigate sang URL mới
           - type_text              → điền text vào input
           - press_key              → nhấn phím
           - wait_*                 → đợi timeout / element / network idle
           - save_chroma / end      → dừng vòng lặp
        4. Tích luỹ các Document với nội dung đã diff (không trùng)
        5. Trả về list Document để chunk + embed + lưu ChromaDB
    """
    from playwright.async_api import async_playwright

    # Build adjacency list (DAG)
    node_map = {n["id"]: n for n in nodes}
    graph: dict[str, list[str]] = {n["id"]: [] for n in nodes}
    for edge in edges:
        src = edge["source"]
        tgt = edge["target"]
        if src in graph:
            graph[src].append(tgt)

    # Tìm node Start
    start = next((n for n in nodes if n["data"].get("type") == "start"), None)
    if not start:
        return []

    collected: list[Document] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context()

        if cookies:
            parsed = _parse_cookie_string(cookies, url)
            if parsed:
                await ctx.add_cookies(parsed)

        page = await ctx.new_page()

        # Mở trang gốc
        await page.goto(url, wait_until="networkidle", timeout=30_000)
        old_content = await page.inner_text("body")
        seen = set(_split_sentences(old_content))

        current_id: str | None = start["id"]

        while current_id:
            node = node_map.get(current_id)
            if not node:
                break

            ntype = node["data"].get("type", "")
            nd    = node["data"]
            cont_on_err = bool(nd.get("continue_on_error", True))

            try:
                # ── Browser ──────────────────────────────────
                if ntype == "start":
                    pass  # đã navigate ở trên

                elif ntype == "open_url":
                    target = nd.get("url") or url
                    await page.goto(target, wait_until="networkidle", timeout=30_000)
                    old_content = await page.inner_text("body")
                    seen = set(_split_sentences(old_content))

                elif ntype == "refresh":
                    await page.reload(wait_until="networkidle", timeout=20_000)

                elif ntype == "back":
                    await page.go_back(wait_until="networkidle", timeout=20_000)

                elif ntype in ("end", "save_chroma"):
                    break  # dừng flow

                # ── Interaction ───────────────────────────────
                elif ntype in ("click", "dbl_click", "hover"):
                    selector        = nd.get("selector", "")
                    wait_ms         = int(nd.get("wait_ms", 800))
                    repeat          = int(nd.get("repeat", 1))
                    capture_content = bool(nd.get("capture_content", True))

                    if selector:
                        el = page.locator(selector).first
                        if await el.count() > 0:
                            for _ in range(repeat):
                                if ntype == "click":
                                    await el.click(timeout=5_000)
                                elif ntype == "dbl_click":
                                    await el.dblclick(timeout=5_000)
                                else:
                                    await el.hover(timeout=5_000)
                                await page.wait_for_timeout(wait_ms)

                            # Chỉ đọc nội dung nếu capture_content = True
                            if capture_content:
                                new_content = await page.inner_text("body")
                                new_sents   = set(_split_sentences(new_content))
                                diff        = new_sents - seen
                                if diff:
                                    collected.append(Document(
                                        page_content="\n".join(sorted(diff)),
                                        metadata={
                                            "source": page.url,
                                            "title": await page.title() or page.url,
                                            "node": nd.get("label", ntype),
                                        },
                                    ))
                                    seen.update(diff)

                elif ntype == "type_text":
                    selector = nd.get("selector", "")
                    text     = nd.get("text", "")
                    if selector and text:
                        await page.locator(selector).first.fill(text)

                elif ntype == "press_key":
                    key = nd.get("key", "Enter")
                    await page.keyboard.press(key)
                    await page.wait_for_timeout(int(nd.get("wait_ms", 500)))

                # ── Wait ──────────────────────────────────────
                elif ntype == "wait_time":
                    await page.wait_for_timeout(int(nd.get("wait_ms", 1_000)))

                elif ntype == "wait_element":
                    sel = nd.get("selector", "")
                    if sel:
                        await page.wait_for_selector(sel, timeout=10_000)

                elif ntype == "wait_network":
                    await page.wait_for_load_state("networkidle", timeout=15_000)

                # ── Data ──────────────────────────────────────
                elif ntype in ("extract_text", "extract_html"):
                    content = (
                        await page.inner_text("body")
                        if ntype == "extract_text"
                        else await page.content()
                    )
                    if content.strip():
                        collected.append(Document(
                            page_content=content,
                            metadata={
                                "source": page.url,
                                "title": await page.title() or page.url,
                                "node": nd.get("label", ntype),
                            },
                        ))

                elif ntype == "crawl":
                    # Crawl trang hiện tại và APPEND vào ChromaDB (không xóa dữ liệu cũ)
                    crawl_url  = page.url
                    max_depth  = int(nd.get("max_depth", 0))
                    crawl_docs = await _crawl_pages(crawl_url, max_depth, cookies)
                    if crawl_docs:
                        crawl_chunks = _chunk_docs(crawl_docs)
                        crawl_chunks = [c for c in crawl_chunks if len(c.page_content.strip()) >= 50]
                        if crawl_chunks:
                            for i, chunk in enumerate(crawl_chunks):
                                m = chunk.metadata
                                m["source"]      = m.get("source") or crawl_url
                                m["title"]       = m.get("title") or crawl_url
                                m["chunk_index"] = i
                                m.setdefault("section", "")
                            for chunk in crawl_chunks:
                                chunk.metadata = {k: (v if v is not None else "") for k, v in chunk.metadata.items()}
                            vs = get_vectorstore()
                            crawl_ids = [str(uuid.uuid4()) for _ in crawl_chunks]
                            vs.add_documents(crawl_chunks, ids=crawl_ids)

            except Exception:
                if not cont_on_err:
                    raise
                # continue_on_error=True → bỏ qua lỗi, đi tiếp

            # Chuyển sang node tiếp theo
            next_ids = graph.get(current_id, [])
            current_id = next_ids[0] if next_ids else None

        await browser.close()

    return collected


def ingest_url_with_flow(
    url: str,
    nodes: list[dict],
    edges: list[dict],
    cookies: str | None = None,
) -> int:
    """
    Chạy automation flow và lưu nội dung thu thập vào ChromaDB.
    Trả về số chunks đã lưu.
    """
    docs = asyncio.run(_execute_flow(url, nodes, edges, cookies))

    if not docs:
        return 0

    final_chunks = _chunk_docs(docs)
    if not final_chunks:
        return 0

    vs = get_vectorstore()

    # Xóa bản cũ cùng URL
    try:
        existing = vs.get(where={"source": url})
        if existing and existing.get("ids"):
            vs.delete(ids=existing["ids"])
    except Exception:
        pass

    for i, chunk in enumerate(final_chunks):
        m = chunk.metadata
        m["source"]      = m.get("source") or url
        m["title"]       = m.get("title") or url
        m["chunk_index"] = i
        m.setdefault("section", "")

    final_chunks = [c for c in final_chunks if len(c.page_content.strip()) >= 50]
    for chunk in final_chunks:
        chunk.metadata = {k: (v if v is not None else "") for k, v in chunk.metadata.items()}

    ids = [str(uuid.uuid4()) for _ in final_chunks]
    vs.add_documents(final_chunks, ids=ids)
    return len(final_chunks)


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
