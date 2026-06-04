# Automation Flow Builder — Crawl trang theo luồng tự định nghĩa

## Ý tưởng cốt lõi

Thay vì crawler tự đoán phải click vào đâu, **người dùng tự thiết kế luồng tương tác** — định nghĩa từng bước click theo đúng thứ tự mình muốn. Hệ thống thực thi theo đúng luồng đó, mỗi bước click xong thì đọc nội dung mới xuất hiện và tích lũy vào kho dữ liệu.

---

## Luồng sử dụng

```
Người dùng mở app
    │
    ├─ Nhập URL trang muốn crawl
    │
    ├─ Thêm các node vào flow (theo thứ tự):
    │     Node 1: click ".question-item:nth-child(1)"
    │     Node 2: click ".question-item:nth-child(2)"
    │     Node 3: click "#btn-next-page"
    │     Node 4: click ".question-item:nth-child(1)"
    │     ...
    │
    ├─ Nhấn "Chạy flow"
    │
    └─ Hệ thống thực thi:
          Vào trang → đọc nội dung gốc
          → Click Node 1 → có nội dung mới? → append
          → Click Node 2 → có nội dung mới? → append
          → Click Node 3 → có nội dung mới? → append
          → ...
          → Hoàn tất → lưu toàn bộ vào ChromaDB
```

---

## Cấu trúc một Node

Mỗi node trong flow là một bước tương tác, gồm các thông tin:

```typescript
interface AutomationNode {
  id: string;               // uuid, dùng để sort/drag
  order: number;            // thứ tự thực thi
  selector: string;         // CSS selector của element cần click
                            // ví dụ: ".question-row", "#btn-next", "li.tab:nth-child(2)"
  label: string;            // tên do người dùng đặt, ví dụ: "Câu hỏi 1", "Next page"
  wait_ms: number;          // đợi bao lâu sau khi click (ms) để content load
                            // mặc định: 800ms
  repeat: number;           // click bao nhiêu lần (mặc định: 1)
                            // dùng khi cần click nhiều lần liên tiếp
}
```

---

## Giao diện Flow Builder

```
┌─────────────────────────────────────────────────────────┐
│  Automation Flow Builder                                │
│                                                         │
│  URL: https://example.com/exam/123  [Xem trước]        │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Flow (kéo thả để sắp xếp)                      │   │
│  │                                                  │   │
│  │  [1]  Câu hỏi 1    .question:nth-child(1)  800ms│   │
│  │  [2]  Câu hỏi 2    .question:nth-child(2)  800ms│   │
│  │  [3]  Câu hỏi 3    .question:nth-child(3)  800ms│   │
│  │  [4]  Trang tiếp   #btn-next               1500ms│   │
│  │  [5]  Câu hỏi 1    .question:nth-child(1)  800ms│   │
│  │                                                  │   │
│  │  [+ Thêm node]                                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [Chạy flow]  [Lưu flow]  [Xoá tất cả]                 │
└─────────────────────────────────────────────────────────┘
```

### Form thêm node:

```
┌──────────────────────────────────────┐
│  Thêm node mới                       │
│                                      │
│  Tên:     [Câu hỏi 1            ]   │
│  Selector:[.question:nth-child(1)]   │
│  Đợi (ms):[800                   ]   │
│  Lặp lại: [1                     ]   │
│                                      │
│  [Thêm]  [Huỷ]                       │
└──────────────────────────────────────┘
```

---

## Logic thực thi phía backend

### Bước 1 — Vào trang, đọc nội dung gốc

```python
await page.goto(url, wait_until="networkidle")
base_content = await page.inner_text("body")
collected_contents = [base_content]
seen_sentences = set(_split_sentences(base_content))
```

### Bước 2 — Thực thi từng node theo thứ tự

```python
for node in flow_nodes:  # đã sort theo node.order
    try:
        # Click element
        el = page.locator(node.selector).first
        if await el.count() == 0:
            continue  # element không tồn tại, bỏ qua
        
        for _ in range(node.repeat):
            await el.click()
            await page.wait_for_timeout(node.wait_ms)

        # Đọc lại nội dung sau khi click
        new_content = await page.inner_text("body")
        
        # Chỉ lấy phần NỘI DUNG MỚI (không trùng với đã có)
        new_sentences = set(_split_sentences(new_content))
        diff = new_sentences - seen_sentences
        
        if diff:
            # Có nội dung mới → tích lũy
            collected_contents.append("\n".join(diff))
            seen_sentences.update(diff)

    except Exception as e:
        # Node lỗi → ghi log, tiếp tục node tiếp theo
        log_node_error(node, e)
        continue
```

### Bước 3 — Gộp và lưu

```python
full_content = "\n\n---\n\n".join(collected_contents)
doc = Document(page_content=full_content, metadata={"source": url})
# → chunk → embed → lưu ChromaDB (pipeline như hiện tại)
```

### Hàm tách câu để so sánh nội dung mới

```python
def _split_sentences(text: str) -> list[str]:
    """
    Tách text thành các đơn vị nhỏ để so sánh diff.
    Dùng dòng hoặc câu (split theo dấu chấm, xuống dòng).
    Lọc bỏ dòng quá ngắn (< 20 ký tự) để tránh nhiễu.
    """
    lines = re.split(r'[\n.。]', text)
    return [l.strip() for l in lines if len(l.strip()) >= 20]
```

---

## API endpoint mới

```python
class FlowNode(BaseModel):
    id: str
    order: int
    selector: str
    label: str
    wait_ms: int = 800
    repeat: int = 1

class FlowIngestRequest(BaseModel):
    url: str
    nodes: list[FlowNode]
    cookies: str | None = None
    openai_key: str | None = None

@app.post("/ingest/flow")
async def ingest_flow(req: FlowIngestRequest):
    """
    Crawl trang theo luồng tương tác do người dùng định nghĩa.
    """
    try:
        chunks = await asyncio.to_thread(
            ingest_url_with_flow,
            req.url,
            req.nodes,
            req.cookies,
        )
        return {"status": "ok", "url": req.url, "chunks": chunks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

## Frontend API call

```typescript
export interface FlowNode {
  id: string;
  order: number;
  selector: string;
  label: string;
  wait_ms: number;
  repeat: number;
}

export async function ragIngestFlow(
  url: string,
  nodes: FlowNode[],
  cookies?: string,
  openaiKey?: string,
): Promise<{ chunks: number }> {
  const r = await fetch(`${BASE}/ingest/flow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      nodes,
      cookies: cookies || null,
      openai_key: openaiKey ?? null,
    }),
    signal: AbortSignal.timeout(300_000), // 5 phút vì flow có thể dài
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: r.statusText }));
    throw new Error(err.detail ?? `HTTP ${r.status}`);
  }
  return r.json();
}
```

---

## Lưu và tái sử dụng flow

Flow nên được lưu lại để dùng lại lần sau (cùng trang hoặc trang tương tự):

```typescript
interface SavedFlow {
  id: string;
  name: string;           // "APTIS Exam - Tất cả câu hỏi"
  url_pattern: string;    // "https://example.com/exam/*"
  nodes: FlowNode[];
  created_at: string;
  last_run: string | null;
}
```

Lưu vào `localStorage` hoặc file JSON trong app data.

---

## Phân biệt với các cách crawl khác

| Cách crawl | Ai quyết định click vào đâu | Phù hợp khi |
|---|---|---|
| Crawl thông thường | Crawler tự follow links | Trang nội dung tĩnh |
| `auto_interact` | Crawler tự đoán (ARIA) | Trang chuẩn web |
| **Flow Builder** | **Người dùng định nghĩa** | Trang phức tạp, logic đặc thù |

Flow Builder phù hợp nhất khi:
- Trang có cấu trúc đặc biệt mà crawler không tự đoán được
- Cần đúng thứ tự tương tác (click A trước rồi mới click B)
- Muốn kiểm soát chính xác nội dung nào được lấy
- Trang yêu cầu đăng nhập + tương tác phức tạp

---

## Giới hạn cần lưu ý

| Vấn đề | Cách xử lý |
|---|---|
| Selector sai → element không tìm thấy | Bỏ qua node đó, ghi log, tiếp tục |
| Trang load chậm → click trước khi content hiện | Tăng `wait_ms` của node đó |
| Nội dung bị trùng | So sánh diff, chỉ append phần mới |
| Flow quá dài → timeout | Tăng timeout hoặc chia nhỏ flow |
| Selector thay đổi sau khi trang update | Cần cập nhật lại flow |
