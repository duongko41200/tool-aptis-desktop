# Crawl trang có nội dung ẩn sau tương tác

## Vấn đề

Nhiều trang web không render toàn bộ nội dung khi load — nội dung chỉ xuất hiện **sau khi người dùng tương tác**:

```
Trang exam/LMS:
  [Câu 1] Bấm vào → đề bài hiện ra
  [Câu 2] Bấm vào → đề bài hiện ra
  [Câu 3] ...

Trang tài liệu:
  [+] Chương 1  → bấm mở → nội dung hiện
  [+] Chương 2  → bấm mở → nội dung hiện

Trang có tab:
  [Tab A] [Tab B] [Tab C]
  → chỉ Tab A đang active, Tab B/C chưa render
```

Crawler thông thường chỉ lấy được nội dung đang hiển thị lúc load — bỏ sót toàn bộ phần còn lại.

---

## Phân loại tình huống

| Loại | Ví dụ | Cách xử lý |
|---|---|---|
| **Chuẩn ARIA** | `aria-expanded="false"` | JS click tự động |
| **HTML native** | `<details>` chưa `open` | JS set `open=true` |
| **Custom class** | `.question-item`, `.accordion` | Truyền selector thủ công |
| **Phân trang JS** | Click Next/Prev, URL không đổi | Playwright loop |
| **Infinite scroll** | Cuộn xuống load thêm | Playwright scroll loop |
| **Tab switching** | Click tab để đổi nội dung | Click từng tab + extract |

---

## Kiến trúc giải pháp

```
ingest_url(url, auto_interact=True, click_selectors=[...])
    │
    ├─ Phase 1: Crawl trang với auto-interact
    │     ├─ Inject cookies (nếu có)
    │     ├─ Load trang
    │     ├─ Chạy JS mở hết ARIA + details
    │     ├─ Click từng selector trong click_selectors
    │     └─ Extract markdown
    │
    ├─ Phase 2: Pagination loop (nếu detect được Next)
    │     ├─ Tìm nút Next theo danh sách selectors
    │     ├─ Click → chờ load → extract
    │     └─ Lặp đến khi hết trang (max_pages)
    │
    └─ Gộp tất cả content → chunk → lưu ChromaDB
```

---

## Triển khai chi tiết

### 1. Hàm JS mở nội dung chuẩn ARIA

Chạy ngay sau khi trang load xong, trước khi extract:

```python
JS_AUTO_EXPAND = """
(async () => {
  // Mở tất cả element đang collapsed theo chuẩn ARIA
  document.querySelectorAll('[aria-expanded="false"]').forEach(el => {
    try { el.click(); } catch(e) {}
  });

  // Mở tất cả <details> native HTML
  document.querySelectorAll('details:not([open])').forEach(el => {
    el.open = true;
  });

  // Đợi animation/transition xong
  await new Promise(r => setTimeout(r, 600));
})();
"""
```

Dùng trong `CrawlerRunConfig`:

```python
run_cfg = CrawlerRunConfig(
    js_code=JS_AUTO_EXPAND,
    wait_for="body",          # hoặc CSS selector cụ thể hơn
    cache_mode=CacheMode.BYPASS,
    ...
)
```

---

### 2. Hàm click custom selectors

Khi trang dùng class riêng (không theo chuẩn ARIA):

```python
def _build_click_js(selectors: list[str]) -> str:
    """
    Tạo JS click tất cả element khớp với danh sách selectors.
    Mỗi selector click xong thì đợi 300ms cho content load.
    """
    js_parts = []
    for sel in selectors:
        # Escape selector để đưa vào string JS
        safe = sel.replace("'", "\\'")
        js_parts.append(f"""
    for (const el of document.querySelectorAll('{safe}')) {{
        try {{
            el.click();
            await new Promise(r => setTimeout(r, 300));
        }} catch(e) {{}}
    }}
        """)

    return f"""
(async () => {{
    {''.join(js_parts)}
    await new Promise(r => setTimeout(r, 500));
}})();
"""
```

Ví dụ sử dụng với trang exam có class `.question-row`:

```python
js = _build_click_js([".question-row", ".exam-item", "[data-toggle]"])
run_cfg = CrawlerRunConfig(js_code=js, ...)
```

---

### 3. Pagination loop với Playwright

Dùng khi trang có nút Next (URL không đổi, JS load nội dung mới):

```python
# Danh sách selectors phổ biến cho nút Next
NEXT_SELECTORS = [
    "button:has-text('Next')",
    "button:has-text('Tiếp theo')",
    "button:has-text('Tiếp')",
    "a:has-text('Next')",
    "a:has-text('›')",
    "a:has-text('»')",
    "[aria-label='Next page']",
    "[aria-label='Next']",
    ".pagination .next",
    ".btn-next",
    "button.next",
    "[data-action='next']",
]

async def _crawl_with_pagination(
    url: str,
    cookies: list[dict],
    click_selectors: list[str],
    max_pages: int = 20,
) -> list[str]:
    """
    Crawl trang có pagination JS.
    Trả về list markdown content, mỗi phần tử là 1 trang/state.
    """
    from playwright.async_api import async_playwright

    all_contents: list[str] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context()

        # Inject cookies
        if cookies:
            await ctx.add_cookies(cookies)

        page = await ctx.new_page()
        await page.goto(url, wait_until="networkidle", timeout=30_000)

        for page_num in range(max_pages):
            # Phase 1: Mở hết nội dung ẩn trên trang hiện tại
            await page.evaluate(JS_AUTO_EXPAND)

            # Phase 2: Click các selector tùy chỉnh
            for sel in click_selectors:
                elements = await page.query_selector_all(sel)
                for el in elements:
                    try:
                        await el.click()
                        await page.wait_for_timeout(300)
                    except Exception:
                        pass

            # Extract nội dung
            content = await page.inner_text("body")
            if content.strip():
                all_contents.append(content)

            # Tìm nút Next
            next_found = False
            for sel in NEXT_SELECTORS:
                try:
                    next_btn = page.locator(sel).first
                    if await next_btn.count() > 0:
                        is_disabled = await next_btn.get_attribute("disabled")
                        aria_disabled = await next_btn.get_attribute("aria-disabled")
                        if is_disabled is None and aria_disabled != "true":
                            await next_btn.click()
                            await page.wait_for_load_state("networkidle", timeout=10_000)
                            next_found = True
                            break
                except Exception:
                    continue

            if not next_found:
                break  # Hết trang

        await browser.close()

    return all_contents
```

---

### 4. Tab switching

Khi trang có nhiều tab, mỗi tab chứa nội dung khác nhau:

```python
async def _extract_all_tabs(page, tab_selector: str) -> list[str]:
    """
    Click từng tab, extract nội dung sau mỗi lần click.
    """
    contents = []
    tabs = await page.query_selector_all(tab_selector)

    for tab in tabs:
        try:
            await tab.click()
            await page.wait_for_timeout(500)  # đợi transition
            content = await page.inner_text(".tab-content")  # selector content area
            if content.strip():
                contents.append(content)
        except Exception:
            continue

    return contents
```

---

### 5. Infinite scroll

```python
async def _scroll_to_bottom(page, max_scrolls: int = 30) -> None:
    """
    Scroll xuống từng bước, đợi content load sau mỗi lần scroll.
    Dừng khi không còn content mới.
    """
    prev_height = 0
    for _ in range(max_scrolls):
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await page.wait_for_timeout(1500)  # đợi lazy load

        curr_height = await page.evaluate("document.body.scrollHeight")
        if curr_height == prev_height:
            break  # không còn content mới
        prev_height = curr_height
```

---

### 6. Tích hợp vào `ingest.py`

Thêm tham số vào hàm `ingest_url`:

```python
def ingest_url(
    url: str,
    max_depth: int = 1,
    cookies: str | None = None,
    # Tham số mới:
    auto_interact: bool = False,        # bật mở ARIA/details tự động
    click_selectors: list[str] | None = None,  # selector cần click
    paginate: bool = False,             # bật pagination loop
    max_pages: int = 20,                # giới hạn số trang
) -> int:
    ...
```

Logic trong hàm:

```python
if paginate:
    # Dùng Playwright loop
    browser_cookies = _parse_cookie_string(cookies, url) if cookies else []
    raw_contents = asyncio.run(
        _crawl_with_pagination(url, browser_cookies, click_selectors or [], max_pages)
    )
    raw_docs = [Document(page_content=c, metadata={"source": url}) for c in raw_contents]
elif auto_interact or click_selectors:
    # Dùng crawl4ai với js_code
    js = JS_AUTO_EXPAND
    if click_selectors:
        js += _build_click_js(click_selectors)
    raw_docs = _crawl_sync(url, max_depth, cookies, js_code=js)
else:
    # Crawl thông thường như hiện tại
    raw_docs = _crawl_sync(url, max_depth, cookies)
```

---

### 7. Truyền từ frontend

Thêm options trong `RagChatPage.tsx` khi nạp URL:

```typescript
// Gọi API với options mới
await ragIngestUrl(url, 1, openaiKey, cookies, {
  autoInteract: true,
  clickSelectors: ['.question-item', '.exam-row'],
  paginate: true,
  maxPages: 50,
});
```

Backend `IngestRequest`:

```python
class IngestRequest(BaseModel):
    url: str
    max_depth: int = 2
    openai_key: str | None = None
    cookies: str | None = None
    auto_interact: bool = False
    click_selectors: list[str] = []
    paginate: bool = False
    max_pages: int = 20
```

---

## Ưu tiên dùng giải pháp nào

```
Bắt đầu với auto_interact=True
    │
    ├─ Lấy được hết nội dung? → Done
    │
    └─ Vẫn thiếu nội dung?
          │
          ├─ Inspect trang → tìm selector → thêm click_selectors
          │
          └─ Vẫn thiếu do phân trang? → bật paginate=True
```

---

## Giới hạn không thể tự động hóa

| Tình huống | Lý do không tự động được |
|---|---|
| CAPTCHA | Cần xác nhận người dùng thật |
| OTP / 2FA | Cần thiết bị vật lý |
| Trang dùng Canvas để render | Không có DOM để đọc |
| Video/audio content | Không extract được text |
| Nội dung sau payment wall | Session/token đặc biệt |
