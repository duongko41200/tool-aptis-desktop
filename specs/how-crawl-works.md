# Cách hệ thống crawl dữ liệu web

## Tổng quan pipeline

```
URL nhập vào
    │
    ▼
[1] RecursiveUrlLoader  ──── fetch HTML (requests, không chạy JS)
    │   nếu rỗng ──────────► [1b] Playwright  (headless Chromium, chạy JS)
    │
    ▼
[2] _html_to_markdown()  ──── HTML → Markdown thuần
    │
    ▼
[3] MarkdownHeaderTextSplitter  ──── cắt theo heading (#, ##, ###)
    │
    ▼
[4] RecursiveCharacterTextSplitter  ──── cắt tiếp nếu chunk > 1000 ký tự
    │
    ▼
[5] Enrich metadata + prepend [Chủ đề: ...]
    │
    ▼
[6] ChromaDB  ──── lưu vector + full text
```

---

## Bước 1 — Fetch HTML

### 1a. RecursiveUrlLoader (mặc định)
- Dùng **`requests`** HTTP đơn giản, **không chạy JavaScript**
- Crawl đệ quy theo `max_depth` (mặc định = 1, chỉ crawl trang gốc)
- `prevent_outside=True` → chỉ crawl link cùng domain

### 1b. Playwright fallback
- Nếu nội dung từ requests rỗng (< 500 ký tự), thử lại bằng **headless Chromium**
- Chờ `networkidle` (trang load xong hẳn) tối đa 30 giây
- Playwright KHÔNG được chạy tự động cho mọi link con — chỉ cho URL gốc

### Vấn đề thường gặp ở bước này

| Tình huống | Kết quả |
|------------|---------|
| Trang dùng JS để render nội dung (React/Vue SPA) | `requests` trả về HTML rỗng/skeleton → nếu playwright không cài, nội dung = rỗng |
| Trang yêu cầu đăng nhập / cookie | Bị chặn, trả về trang login thay vì nội dung thật |
| Trang dùng infinite scroll | Chỉ lấy được phần đầu trang nhìn thấy khi load lần đầu |
| Trang có Cloudflare / anti-bot | Bị chặn hoặc trả về CAPTCHA |
| `max_depth=1` (mặc định) | Chỉ crawl **đúng 1 trang**, không theo link con |

---

## Bước 2 — HTML → Markdown

Hàm `_html_to_markdown()` làm những việc sau:

### Xóa noise
```
script, style, nav, footer, aside, header
+ elements có class/id chứa: cookie, banner, popup, ad-, advertisement, gdpr
```

### Chuyển đổi tag

| HTML tag | Markdown output |
|----------|----------------|
| `h1`–`h6` | `# Tiêu đề` đến `###### Tiêu đề` |
| `table` | Markdown table `\| col1 \| col2 \|` |
| `ul` / `ol` | `- item` / `1. item` |
| `blockquote` | `> text` |
| `pre` / `code` | ` ```code``` ` |
| `p`, `div`, `section`... | Đệ quy xử lý children |

### Vấn đề thường gặp ở bước này

| Tình huống | Kết quả |
|------------|---------|
| Nội dung nằm trong `<div>` không có tag semantic | Được lấy, nhưng không có heading → chunk không có breadcrumb |
| Trang dùng CSS để ẩn/hiện nội dung (tab, accordion) | **Tất cả nội dung ẩn đều bị lấy** vì BeautifulSoup không hiểu CSS |
| Trang dùng `<span>` hoặc `<a>` thay vì `<p>` cho đoạn văn | Text bị bỏ sót hoặc dính vào nhau |
| Layout 2 cột / sidebar | Sidebar và nội dung chính bị trộn lẫn theo thứ tự DOM |
| `<main>` hoặc `<article>` không tồn tại | Lấy toàn bộ `<body>` kể cả sidebar, breadcrumb... |

---

## Bước 3 — Cắt theo Heading (MarkdownHeaderTextSplitter)

Tách văn bản thành chunk tại mỗi `#`, `##`, `###`.

**Ví dụ:**
```markdown
# Introduction
This is intro text.

## Section A
Content of A.

### Subsection A1
Content of A1.
```

→ Tạo ra 3 chunk, mỗi chunk mang metadata:
```json
{"heading1": "Introduction"}
{"heading1": "Introduction", "heading2": "Section A"}
{"heading1": "Introduction", "heading2": "Section A", "heading3": "Subsection A1"}
```

**Vấn đề:** Nếu trang không có heading (ví dụ toàn `<div>` với text thuần), toàn bộ nội dung = 1 chunk duy nhất, không có breadcrumb.

---

## Bước 4 — Cắt theo độ dài (RecursiveCharacterTextSplitter)

- `chunk_size = 1000` ký tự
- `chunk_overlap = 200` ký tự (mỗi chunk kế tiếp lặp lại 200 ký tự cuối của chunk trước)
- Separator ưu tiên: `\n\n` → `\n` → `. ` → ` ` → `""`

**Chunk overlap** giúp tránh mất ngữ cảnh khi câu bị cắt đôi giữa 2 chunk.

---

## Bước 5 — Enrich metadata

Mỗi chunk cuối cùng có metadata:

```json
{
  "source": "https://...",
  "title": "Page title",
  "heading1": "...",
  "heading2": "...",
  "heading3": "...",
  "section": "Heading1 > Heading2 > Heading3",
  "chunk_index": 0
}
```

Phần đầu mỗi chunk được prepend:
```
[Chủ đề: Heading1 > Heading2]

...nội dung chunk...
```

---

## Bước 6 — Lưu vào ChromaDB

- Mỗi chunk được embed thành vector bằng `nomic-embed-text` (hoặc `FakeEmbeddings` nếu không có)
- Lưu cả vector + full text + metadata
- Nếu URL đã được crawl trước → **xóa bản cũ trước, lưu bản mới**

---

## Tại sao nội dung bị thiếu hoặc sai?

### Nguyên nhân phổ biến nhất

**1. Trang dùng JavaScript để render** (React, Vue, Angular, Next.js SSR...)
- `requests` chỉ lấy HTML tĩnh ban đầu — nội dung chưa được render
- Playwright fallback chỉ chạy cho URL gốc, không chạy cho mọi link con
- **Fix:** Cài Playwright (`pip install playwright && playwright install chromium`) và đảm bảo nó hoạt động

**2. Nội dung nằm ngoài `<body>` hoặc trong shadow DOM**
- BeautifulSoup không xử lý được Web Components / Shadow DOM

**3. Trang cần đăng nhập**
- Hệ thống không hỗ trợ session/cookie/auth

**4. `max_depth` quá thấp**
- Mặc định = 1 → chỉ lấy đúng trang nhập vào
- Nếu nội dung nằm ở các trang con (subpage), cần tăng `max_depth = 2` hoặc `3`
- Lưu ý: `max_depth` cao = crawl rất nhiều trang, chậm hơn nhiều

**5. Nội dung là PDF, video, hình ảnh**
- Hệ thống chỉ xử lý HTML text — PDF/media bị bỏ qua hoàn toàn

---

## Loại trang nào crawl tốt / tệ?

| Loại trang | Chất lượng | Ghi chú |
|------------|-----------|---------|
| Blog / news (WordPress, Ghost...) | ✅ Tốt | HTML tĩnh, có heading rõ ràng |
| Tài liệu kỹ thuật (docs.xxx.com) | ✅ Tốt | Có cấu trúc heading tốt |
| Wikipedia | ✅ Tốt | HTML tĩch, heading rõ |
| Trang chính phủ / học thuật | ✅ Khá tốt | Thường dùng HTML tĩnh |
| Next.js / Nuxt SSR | ⚠️ Trung bình | HTML có sẵn nhưng thiếu phần lazy-load |
| React SPA (Vite, CRA...) | ❌ Tệ | HTML chỉ có `<div id="root">`, cần Playwright |
| Trang sau đăng nhập | ❌ Không hỗ trợ | |
| PDF / file tải về | ❌ Không hỗ trợ | |

---

## Khuyến nghị khi dùng

1. **Thử trước với URL cụ thể**: Sau khi crawl, vào "Xem dữ liệu chunk" để kiểm tra nội dung đã đúng chưa
2. **Nếu nội dung rỗng**: Có thể trang dùng JS — thử cài Playwright
3. **Nếu nội dung lẫn lộn sidebar/menu**: Đó là giới hạn của BeautifulSoup khi trang không dùng `<main>` hoặc `<article>` đúng chuẩn
4. **Nếu cần nhiều trang con**: Tăng `max_depth` lên 2 (cẩn thận: chậm hơn nhiều)
5. **Nên crawl trang có cấu trúc heading** (`h1`, `h2`, `h3`) để RAG hoạt động hiệu quả nhất
