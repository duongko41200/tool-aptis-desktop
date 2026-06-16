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
    gemini_key: str | None = None,
    openai_key: str | None = None,
    on_node=None,
) -> list[Document]:
    """
    Chạy automation workflow bằng Playwright.

    Luồng thực thi:
        1. Build DAG từ nodes + edges (lưu sourceHandle)
        2. Tìm node Start → navigate tới URL
        3. Duyệt tuần tự theo edges với hỗ trợ biến, điều kiện, vòng lặp
        4. Tích luỹ các Document với nội dung đã diff (không trùng)
        5. Trả về list Document để chunk + embed + lưu ChromaDB
    """
    import re as _re
    from playwright.async_api import async_playwright

    # Build adjacency list (DAG) — lưu edge info kèm sourceHandle
    node_map = {n["id"]: n for n in nodes}
    graph: dict[str, list[dict]] = {n["id"]: [] for n in nodes}
    for edge in edges:
        if edge["source"] in graph:
            graph[edge["source"]].append({
                "target": edge["target"],
                "sourceHandle": edge.get("sourceHandle"),
            })

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

        # Helpers
        vars_store: dict[str, str] = {}
        visit_counts: dict[str, int] = {}

        def resolve(s: str) -> str:
            return _re.sub(r'\{\{(\w+)\}\}', lambda m: vars_store.get(m.group(1), m.group(0)), str(s or ""))

        async def eval_condition(nd: dict) -> bool:
            ctype    = nd.get("condition_type", "element_exists")
            selector = resolve(nd.get("selector", ""))
            expected = resolve(nd.get("expected", ""))
            var_name = nd.get("var_name", "")
            if ctype == "element_exists":
                return bool(selector) and await page.locator(selector).count() > 0
            elif ctype == "page_contains":
                content = await page.inner_text("body")
                return bool(expected) and expected.lower() in content.lower()
            elif ctype == "var_equals":
                return vars_store.get(var_name, "") == expected
            elif ctype == "url_contains":
                return bool(expected) and expected in page.url
            return False

        current_id: str | None = start["id"]

        while current_id:
            node = node_map.get(current_id)
            if not node:
                break

            ntype = node["data"].get("type", "")
            if on_node:
                await on_node(current_id, ntype)
            nd    = node["data"]
            cont_on_err = bool(nd.get("continue_on_error", True))

            # Cập nhật visit count và tính next edges
            visit_counts[current_id] = visit_counts.get(current_id, 0) + 1
            next_edges = graph.get(current_id, [])
            next_id = next_edges[0]["target"] if next_edges else None

            try:
                # ── Browser ──────────────────────────────────
                if ntype == "start":
                    pass  # đã navigate ở trên

                elif ntype == "open_url":
                    target = resolve(nd.get("url") or url)
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
                    selector        = resolve(nd.get("selector", ""))
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
                    selector = resolve(nd.get("selector", ""))
                    text     = resolve(nd.get("text", ""))
                    if selector and text:
                        await page.locator(selector).first.fill(text)

                elif ntype == "press_key":
                    key = resolve(nd.get("key", "Enter"))
                    await page.keyboard.press(key)
                    await page.wait_for_timeout(int(nd.get("wait_ms", 500)))

                # ── Wait ──────────────────────────────────────
                elif ntype == "wait_time":
                    await page.wait_for_timeout(int(nd.get("wait_ms", 1_000)))

                elif ntype == "wait_element":
                    sel = resolve(nd.get("selector", ""))
                    if sel:
                        await page.wait_for_selector(sel, timeout=10_000)

                elif ntype == "wait_network":
                    await page.wait_for_load_state("networkidle", timeout=15_000)

                # ── Data ──────────────────────────────────────
                elif ntype in ("extract_text", "extract_html"):
                    sel = resolve(nd.get("selector", ""))
                    if sel:
                        el = page.locator(sel).first
                        if await el.count() > 0:
                            content = await el.inner_text() if ntype == "extract_text" else await el.inner_html()
                        else:
                            content = ""
                    else:
                        content = await page.inner_text("body") if ntype == "extract_text" else await page.content()
                    if content.strip():
                        collected.append(Document(
                            page_content=content,
                            metadata={
                                "source": page.url,
                                "title": await page.title() or page.url,
                                "node": nd.get("label", ntype),
                            },
                        ))

                elif ntype == "screenshot":
                    content = await page.inner_text("body")
                    if content.strip():
                        collected.append(Document(
                            page_content=content,
                            metadata={
                                "source": page.url,
                                "title": f"[Screenshot] {await page.title() or page.url}",
                                "node": nd.get("label", ntype),
                            },
                        ))

                elif ntype == "save_var":
                    var_name = nd.get("var_name", "")
                    selector = resolve(nd.get("selector", ""))
                    attr     = nd.get("attribute", "")
                    pattern  = nd.get("regex", "")
                    if var_name:
                        if selector:
                            el = page.locator(selector).first
                            if await el.count() > 0:
                                val = await el.get_attribute(attr) if attr else await el.inner_text()
                            else:
                                val = ""
                        else:
                            val = await page.inner_text("body")
                        if pattern:
                            m = _re.search(pattern, val or "")
                            val = m.group(1) if m and m.groups() else (m.group(0) if m else "")
                        vars_store[var_name] = (val or "").strip()

                elif ntype == "condition":
                    result      = await eval_condition(nd)
                    true_edges  = [e for e in next_edges if e.get("sourceHandle") == "true"]
                    false_edges = [e for e in next_edges if e.get("sourceHandle") == "false"]
                    if not true_edges and not false_edges:
                        true_edges  = next_edges[:1]
                        false_edges = next_edges[1:2]
                    chosen     = true_edges if result else false_edges
                    current_id = chosen[0]["target"] if chosen else None
                    continue

                elif ntype == "loop":
                    repeat     = int(nd.get("repeat", 1))
                    body_edges = [e for e in next_edges if e.get("sourceHandle") == "body"]
                    exit_edges = [e for e in next_edges if e.get("sourceHandle") == "exit"]
                    if not body_edges and not exit_edges:
                        body_edges = next_edges[:1]
                        exit_edges = next_edges[1:2]
                    if visit_counts.get(current_id, 0) <= repeat:
                        current_id = body_edges[0]["target"] if body_edges else None
                    else:
                        current_id = exit_edges[0]["target"] if exit_edges else None
                    continue

                elif ntype == "repeat_until":
                    max_repeat = int(nd.get("max_repeat", 10))
                    result     = await eval_condition(nd)
                    body_edges = [e for e in next_edges if e.get("sourceHandle") == "body"]
                    exit_edges = [e for e in next_edges if e.get("sourceHandle") == "exit"]
                    if not body_edges and not exit_edges:
                        body_edges = next_edges[:1]
                        exit_edges = next_edges[1:2]
                    if result or visit_counts.get(current_id, 0) >= max_repeat:
                        current_id = exit_edges[0]["target"] if exit_edges else None
                    else:
                        current_id = body_edges[0]["target"] if body_edges else None
                    continue

                elif ntype in ("chunk_text", "embedding"):
                    pass  # processed at end of flow

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
                            vs = get_vectorstore(gemini_key=gemini_key, openai_key=openai_key)
                            crawl_ids = [str(uuid.uuid4()) for _ in crawl_chunks]
                            vs.add_documents(crawl_chunks, ids=crawl_ids)

            except Exception:
                if not cont_on_err:
                    raise
                # continue_on_error=True → bỏ qua lỗi, đi tiếp

            # advance
            current_id = next_id

        await browser.close()

    return collected


def ingest_url_with_flow(
    url: str,
    nodes: list[dict],
    edges: list[dict],
    cookies: str | None = None,
    gemini_key: str | None = None,
    openai_key: str | None = None,
) -> int:
    """
    Chạy automation flow và lưu nội dung thu thập vào ChromaDB.
    Trả về số chunks đã lưu.
    """
    docs = asyncio.run(_execute_flow(url, nodes, edges, cookies, gemini_key, openai_key))

    if not docs:
        return 0

    final_chunks = _chunk_docs(docs)
    if not final_chunks:
        return 0

    vs = get_vectorstore(gemini_key=gemini_key, openai_key=openai_key)

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

def ingest_url(url: str, max_depth: int = 1, cookies: str | None = None, gemini_key: str | None = None, openai_key: str | None = None) -> int:
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
    vs = get_vectorstore(gemini_key=gemini_key, openai_key=openai_key)
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
