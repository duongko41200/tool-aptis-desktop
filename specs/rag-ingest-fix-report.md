# Báo cáo Fix RAG Ingest Pipeline

**Ngày:** 2026-06-04  
**Phạm vi:** `backend/ingest.py`, `backend/agent.py`  
**Trạng thái:** ✅ Hoàn thành — tất cả import test pass

---

## Danh sách fix đã triển khai

### Fix 1 — Trích xuất HTML giữ cấu trúc
**File:** `ingest.py`  
**Vấn đề cũ:** `_bs4_extractor` dùng `get_text()` làm mất toàn bộ cấu trúc (table, heading, list).  
**Giải pháp:** Thay bằng `_html_to_markdown()` chuyển đổi HTML sang Markdown có cấu trúc.

| HTML gốc | Trước (plain text) | Sau (markdown) |
|---|---|---|
| `<h2>APTIS Reading</h2>` | `APTIS Reading` | `## APTIS Reading` |
| `<table><tr><th>Phần</th>...` | `Phần Thời gian Điểm...` | `\| Phần \| Thời gian \| Điểm \|` |
| `<ul><li>Part 1</li>...` | `Part 1 Part 2 Part 3` | `- Part 1\n- Part 2\n- Part 3` |

Các phần tử noise bị loại bỏ thêm: `class` chứa `cookie`, `banner`, `popup`, `ad-` và `id` chứa `cookie`.

---

### Fix 2 — Chunking theo ngữ nghĩa heading
**File:** `ingest.py`  
**Vấn đề cũ:** `RecursiveCharacterTextSplitter` cắt mù theo số ký tự, chunk không biết mình thuộc section nào.  
**Giải pháp:** Two-pass chunking:

```
HTML → _html_to_markdown → MarkdownHeaderTextSplitter → RecursiveCharacterTextSplitter
```

1. **Pass 1 — MarkdownHeaderTextSplitter:** chia tài liệu theo `#`, `##`, `###` → mỗi section thành 1 document riêng với metadata heading.
2. **Pass 2 — RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200):** chia tiếp section dài thành chunk nhỏ, giữ nguyên metadata heading.

Mỗi chunk được tự động prepend context:
```
[Chủ đề: APTIS Reading > Part 1]

Trong phần này bạn cần đọc 3 đoạn văn...
```

→ AI luôn biết chunk đang thuộc section nào.

---

### Fix 3 — Xóa duplicate trước khi nạp lại
**File:** `ingest.py`  
**Vấn đề cũ:** Nạp cùng URL 2 lần tạo ra 2 bản chunk, làm lệch kết quả search.  
**Giải pháp:**

```python
existing = vs.get(where={"source": url})
if existing.get("ids"):
    vs.delete(ids=existing["ids"])
```

Trước khi `add_documents`, tất cả chunk cũ của URL đó bị xóa sạch.

---

### Fix 4 — Metadata đầy đủ trên mỗi chunk
**File:** `ingest.py`  
**Vấn đề cũ:** Chunk chỉ có `source` và `title`.  
**Giải pháp:** Mỗi chunk giờ có:

| Field | Ví dụ | Dùng để |
|---|---|---|
| `source` | `https://example.com/aptis` | Truy nguyên nguồn |
| `title` | `APTIS Study Guide` | Hiển thị UI |
| `section` | `APTIS Reading > Part 1` | Hiển thị trong chat response |
| `chunk_index` | `7` | Debug, ordering |
| `heading1/2/3` | `APTIS Reading` | Internal heading tracking |

---

### Fix 5 — Dynamic weights theo loại embedding
**File:** `agent.py`  
**Vấn đề cũ:** Khi FakeEmbeddings, vector search (70%) cho kết quả ngẫu nhiên nhưng vẫn được dùng.  
**Giải pháp:** Tự động detect và điều chỉnh:

| Trạng thái | Vector weight | BM25 weight | Kết quả |
|---|---|---|---|
| FakeEmbeddings (chưa pull embed model) | 0% | **100%** | BM25 text search — ổn định |
| Có embed model thật | 70% | 30% | Semantic + lexical hybrid |

---

### Fix 6 — Tăng k từ 4 lên 6
**File:** `agent.py`  
**Vấn đề cũ:** Chỉ lấy 4 chunk → câu hỏi phức tạp bị thiếu context.  
**Giải pháp:** `get_retriever(k=6)` — lấy 6 chunk mỗi lần.

---

### Fix 7 — Dedup reranking trong format_docs
**File:** `agent.py`  
**Vấn đề cũ:** Nhiều chunk từ cùng 1 URL lấn át context của URL khác.  
**Giải pháp:**

```python
# Giới hạn tối đa 3 chunk per source URL
source_counts: dict = defaultdict(int)
for d in docs:
    if source_counts[src] < 3:
        filtered.append(d)
```

Đồng thời context giờ hiện section rõ ràng cho AI:
```
[Nguồn: https://aptis.example.com] [Mục: APTIS Reading > Part 1]
[Chủ đề: APTIS Reading > Part 1]

Trong phần này bạn cần...
```

---

## Kết quả tổng thể

| Vấn đề | Trước | Sau |
|---|---|---|
| HTML table → AI hiểu | ❌ Chuỗi vô nghĩa | ✅ Markdown table |
| Chunk biết section nào | ❌ Không | ✅ Prefix `[Chủ đề: ...]` |
| Nạp lại URL bị duplicate | ❌ Có | ✅ Tự động xóa bản cũ |
| Vector search khi no embed model | ❌ Random 70% | ✅ 0%, BM25 100% |
| Số chunk truy xuất | 4 | 6 |
| Chunk overlap | 150 ký tự | 200 ký tự |
| Metadata đầy đủ | ❌ source, title | ✅ source, title, section, chunk_index |
| Dedup per source | ❌ Không giới hạn | ✅ Tối đa 3 chunk/URL |

---

## Những gì chưa xử lý (cần làm tiếp)

| Vấn đề | Mức độ | Giải pháp đề xuất |
|---|---|---|
| Trang JS/SPA trả về HTML rỗng | HIGH | Dùng `playwright` headless browser |
| Không có embedding model thật | CRITICAL | `ollama pull nomic-embed-text` (274MB) hoặc `all-minilm` (46MB) |
| Timeout khi crawl trang chậm | MEDIUM | Thêm `timeout` param vào `RecursiveUrlLoader` |
| Không rerank bằng score | LOW | Dùng `CrossEncoderReranker` từ langchain |

---

## Cách test

```bash
# Restart backend
uvicorn main:app --port 8080

# Trong app: thêm 1 URL có heading rõ ràng, ví dụ:
# https://www.britishcouncil.org/exam/aptis

# Sau khi nạp xong → chat hỏi về nội dung
# Kết quả sẽ hiện [Mục: ...] trong sources
```
