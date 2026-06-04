# Phân tích Logic Nạp Dữ Liệu URL — Vấn đề Mất Thông Tin

## Tổng quan pipeline hiện tại

```
URL → RecursiveUrlLoader → HTML → BeautifulSoup → Plain Text → RecursiveCharacterTextSplitter → Chunks → ChromaDB
```

Mỗi bước đều có thể gây mất thông tin. Dưới đây là phân tích chi tiết từng điểm.

---

## Bước 1: Thu thập trang — `RecursiveUrlLoader`

```python
loader = RecursiveUrlLoader(
    url=url,
    max_depth=max_depth,   # hiện tại = 1 (frontend), 2 (backend default)
    extractor=_bs4_extractor,
)
```

### Vấn đề

| Vấn đề | Mô tả | Hậu quả |
|--------|-------|----------|
| **JavaScript rendering** | `RecursiveUrlLoader` dùng `requests` đơn giản, không chạy JS | Các trang SPA (React, Vue, Next.js) sẽ trả về HTML rỗng hoặc skeleton |
| **max_depth=1** | Chỉ crawl trang gốc, không đi vào link con | Mất toàn bộ nội dung sub-page |
| **Rate limiting** | Không có delay giữa các request | Website có thể block, trả về 429/503 |
| **Robots.txt** | Không kiểm tra `robots.txt` | Có thể bị block hoặc vi phạm ToS |
| **Authentication** | Không hỗ trợ trang cần login | Trả về trang login thay vì nội dung thật |
| **Redirect chain** | Một số redirect phức tạp có thể fail | Không lấy được trang đích |
| **Timeout** | Default timeout của requests có thể quá ngắn | Bỏ qua trang chậm |

---

## Bước 2: Trích xuất text — `_bs4_extractor`

```python
def _bs4_extractor(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()
    return soup.get_text(separator="\n", strip=True)
```

### Vấn đề

| Vấn đề | Mô tả | Hậu quả |
|--------|-------|----------|
| **Mất cấu trúc** | `get_text()` xóa toàn bộ HTML tag | Heading, bullet list, table bị flatten thành plain text → mất ngữ cảnh |
| **Table → vô nghĩa** | `<table>` với 3 cột khi extract thành text sẽ thành chuỗi liên tiếp không cấu trúc | AI không hiểu được dữ liệu dạng bảng |
| **Xóa quá nhiều** | `header`, `nav`, `aside` bị xóa | Một số trang để nội dung quan trọng trong `<aside>` (ví dụ: sidebar docs) |
| **Encoding** | Một số trang Unicode/emoji có thể bị mã hóa sai | Ký tự lạ trong chunk |
| **Quảng cáo / cookie banner** | Không được lọc | Làm nhiễu chunk với text vô nghĩa |
| **Nội dung dynamic** | Nội dung load bằng AJAX không có trong HTML ban đầu | Hoàn toàn bị bỏ qua |

### Ví dụ mất cấu trúc

HTML gốc:
```html
<h2>Cấu trúc bài thi APTIS</h2>
<table>
  <tr><th>Phần</th><th>Thời gian</th><th>Điểm</th></tr>
  <tr><td>Reading</td><td>30 phút</td><td>25%</td></tr>
</table>
```

Sau extract:
```
Cấu trúc bài thi APTIS
Phần Thời gian Điểm Reading 30 phút 25%
```

→ AI nhận được một dòng vô nghĩa, không biết đây là bảng.

---

## Bước 3: Chia chunk — `RecursiveCharacterTextSplitter`

```python
splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,       # ký tự
    chunk_overlap=150,     # ký tự overlap giữa 2 chunk liền kề
    separators=["\n\n", "\n", ". ", " ", ""],
)
```

### Vấn đề

| Vấn đề | Mô tả | Hậu quả |
|--------|-------|----------|
| **Cắt giữa câu** | 1000 ký tự không khớp với ranh giới câu/đoạn | AI nhận chunk thiếu đầu hoặc thiếu cuối |
| **Overlap quá nhỏ** | 150 ký tự (~2 dòng) | Câu kết nối 2 đoạn bị mất |
| **Chunk_size tính theo ký tự** | Tiếng Việt có dấu = nhiều byte hơn ASCII | Chunk thực tế ngắn hơn kỳ vọng khi tính token |
| **Không giữ ngữ cảnh heading** | Chunk thứ 3 của một section không biết mình đang ở section nào | AI trả lời thiếu context ("Reading part requires..." mà không biết đang nói về APTIS) |
| **Danh sách bị tách** | Bullet list 20 mục bị cắt thành 2 chunk | Mỗi chunk chỉ có 10 mục, không đủ thông tin |

### Ví dụ cắt mất ngữ cảnh

```
=== Chunk 1 (1000 ký tự) ===
[Heading: APTIS Reading]
Part 1 yêu cầu đọc 3 đoạn văn ngắn...
...mỗi đoạn dài khoảng 200 từ. Bạn cần trả lời...

=== Chunk 2 (1000 ký tự) ===
...4 câu hỏi trắc nghiệm trong 8 phút.
Part 2 yêu cầu đọc một đoạn dài hơn...
```

Chunk 2 không có heading "APTIS Reading" → AI không biết context là phần Reading của APTIS.

---

## Bước 4: Lưu vào ChromaDB

```python
ids = [str(uuid.uuid4()) for _ in chunks]
vs = get_vectorstore()
vs.add_documents(chunks, ids=ids)
```

### Vấn đề

| Vấn đề | Mô tả | Hậu quả |
|--------|-------|----------|
| **Không kiểm tra duplicate** | Nạp lại cùng URL tạo ra chunk mới với ID khác | Thông tin bị lưu 2 lần → kết quả search bị lệch |
| **FakeEmbeddings hiện tại** | Đang dùng random vector (không có embed model thật) | Vector search cho kết quả ngẫu nhiên, vô nghĩa |
| **Metadata tối thiểu** | Chỉ lưu `source` và `title` | Không biết chunk này nằm ở đâu trong trang, section nào |

---

## Bước 5: Truy xuất khi chat — `get_retriever`

```python
vector_ret = vs.as_retriever(search_kwargs={"k": 4})
# ...
return EnsembleRetriever(
    retrievers=[vector_ret, bm25_ret],
    weights=[0.7, 0.3],
)
```

### Vấn đề

| Vấn đề | Mô tả | Hậu quả |
|--------|-------|----------|
| **k=4 cố định** | Chỉ lấy 4 chunk bất kể câu hỏi phức tạp hay đơn giản | Câu hỏi rộng cần 10+ chunk → bị bỏ sót |
| **70% vector / 30% BM25** | Khi FakeEmbeddings → vector search ngẫu nhiên → 70% kết quả sai | Toàn bộ kết quả gần như ngẫu nhiên |
| **Không reranking** | Không có bước lọc lại sau khi retrieve | Chunk không liên quan lọt vào context |
| **Context window limit** | `format_docs()` nối 4 chunk → có thể vượt context của model | Model nhận được prompt quá dài → truncate |

---

## Tóm tắt điểm mất thông tin theo mức độ ảnh hưởng

```
CRITICAL ████████████  FakeEmbeddings → vector search vô nghĩa
HIGH     ████████      Không xử lý JS → trang SPA rỗng
HIGH     ████████      Mất cấu trúc table/heading sau extract
MEDIUM   ██████        Cắt chunk không theo ranh giới ngữ nghĩa
MEDIUM   ██████        Không giữ heading trong mỗi chunk
MEDIUM   ██████        Duplicate khi nạp lại URL
LOW      ████          k=4 quá nhỏ cho câu hỏi phức tạp
LOW      ████          Không reranking
```

---

## Giải pháp đề xuất (theo thứ tự ưu tiên)

### 1. Pull embedding model thật (CRITICAL — làm ngay)
```bash
ollama pull nomic-embed-text   # 274MB — khuyến nghị
# hoặc
ollama pull all-minilm         # 46MB — nhỏ hơn
```

### 2. Giữ heading khi chunk (HIGH)
Thêm heading vào đầu mỗi chunk để AI biết context:
```python
# Trong ingest.py — thêm heading prefix vào mỗi chunk
from langchain_text_splitters import MarkdownHeaderTextSplitter
```

### 3. Tăng chunk_overlap (MEDIUM)
```python
chunk_overlap=200   # thay vì 150
```

### 4. Kiểm tra duplicate trước khi nạp (MEDIUM)
```python
# Trong ingest.py
existing = vs.get(where={"source": url})
if existing["ids"]:
    vs.delete(ids=existing["ids"])  # xóa bản cũ trước khi thêm mới
```

### 5. Tăng k khi retrieval (LOW)
```python
vector_ret = vs.as_retriever(search_kwargs={"k": 6})  # thay vì 4
```

### 6. Xử lý trang JS (tương lai)
Dùng `playwright` hoặc `selenium` thay `requests` cho trang SPA:
```bash
pip install playwright
playwright install chromium
```

---

## Trạng thái hiện tại

| Tính năng | Trạng thái |
|-----------|-----------|
| Crawl trang tĩnh (HTML) | ✅ Hoạt động |
| Crawl trang JS/SPA | ❌ Không hỗ trợ |
| Embedding thật | ❌ Đang dùng FakeEmbeddings |
| BM25 text search | ✅ Hoạt động |
| Xử lý duplicate | ❌ Chưa có |
| Giữ heading trong chunk | ❌ Chưa có |
| Reranking | ❌ Chưa có |
