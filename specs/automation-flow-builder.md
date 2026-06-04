# Automation Flow Builder (React Flow Version)

## Ý tưởng cốt lõi

Thay vì crawler tự đoán phải click vào đâu, **người dùng sẽ thiết kế một workflow trực quan bằng React Flow**.

Mỗi thao tác (mở URL, click, đợi, extract dữ liệu, lưu vector...) là một Node trên canvas. Người dùng chỉ cần kéo thả và nối các node với nhau để định nghĩa luồng thực thi.

Hệ thống sẽ chạy workflow theo đúng thứ tự kết nối giữa các node. được code băng React Flow

---

## Luồng sử dụng

```
Người dùng mở app
      │
      ├── Nhập URL
      │
      ├── Kéo các node vào canvas
      │
      │      ┌─────────┐
      │      │  Start  │
      │      └────┬────┘
      │           │
      │           ▼
      │   ┌──────────────┐
      │   │ Click Item 1 │
      │   └──────┬───────┘
      │           │
      │           ▼
      │   ┌──────────────┐
      │   │ Click Item 2 │
      │   └──────┬───────┘
      │           │
      │           ▼
      │   ┌──────────────┐
      │   │ Next Page    │
      │   └──────┬───────┘
      │           │
      │           ▼
      │   ┌──────────────┐
      │   │ Extract Text │
      │   └──────┬───────┘
      │           │
      │           ▼
      │      ┌─────────┐
      │      │  Save   │
      │      └─────────┘
      │
      ├── Nhấn Run
      │
      └── Backend thực thi theo workflow
```

---

## Giao diện

```
┌──────────────────────────────────────────────────────────────────────┐
│ Automation Flow Builder                                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ URL: [ https://example.com/exam/123            ] [Preview]           │
│                                                                      │
├───────────────┬──────────────────────────────────────────────────────┤
│               │                                                      │
│ Node Library  │                React Flow Canvas                    │
│               │                                                      │
│ Start         │          ┌─────────┐                                 │
│ Open URL      │          │ START   │                                 │
│ Click         │          └────┬────┘                                 │
│ Wait          │               │                                      │
│ Extract       │               ▼                                      │
│ Save          │      ┌────────────────┐                              │
│ Loop          │      │ Click Item 1  │                              │
│ Condition     │      └────────┬──────┘                              │
│               │               │                                      │
│               │               ▼                                      │
│               │      ┌────────────────┐                              │
│               │      │ Next Page     │                              │
│               │      └────────┬──────┘                              │
│               │               │                                      │
│               │               ▼                                      │
│               │      ┌────────────────┐                              │
│               │      │ Extract Text  │                              │
│               │      └────────┬──────┘                              │
│               │               │                                      │
│               │               ▼                                      │
│               │          ┌─────────┐                                 │
│               │          │ SAVE    │                                 │
│               │          └─────────┘                                 │
│                                                                      │
├───────────────┴──────────────────────────────────────────────────────┤
│                                                                      │
│ [ Run ] [ Save ] [ Export JSON ] [ Import JSON ]                    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Node Properties

Khi chọn một node, panel bên phải sẽ hiển thị thông tin cấu hình.

```
┌──────────────────────────────┐
│      Node Properties         │
├──────────────────────────────┤
│ Type                         │
│ Click                        │
│                              │
│ Label                        │
│ [ Question 1             ]   │
│                              │
│ Selector                     │
│ [ .question:nth-child(1) ]   │
│                              │
│ Wait After Action            │
│ [ 800 ] ms                   │
│                              │
│ Repeat                       │
│ [ 1 ]                        │
│                              │
│ Continue On Error            │
│ ☑ Enabled                    │
│                              │
│ [ Save ]                     │
└──────────────────────────────┘
```

---

## Cấu trúc Node

```typescript
export interface FlowNode {
  id: string;

  type:
    | "start"
    | "open_url"
    | "click"
    | "wait"
    | "extract"
    | "condition"
    | "loop"
    | "save"
    | "end";

  position: {
    x: number;
    y: number;
  };

  data: {
    label: string;
    selector?: string;
    wait_ms?: number;
    repeat?: number;
    continue_on_error?: boolean;
  };
}
```

---

## Cấu trúc Edge

```typescript
export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}
```

---

## Flow JSON

```json
{
  "url": "https://example.com/exam/123",
  "nodes": [
    {
      "id": "start",
      "type": "start",
      "position": { "x": 100, "y": 100 },
      "data": { "label": "Start" }
    },
    {
      "id": "click1",
      "type": "click",
      "position": { "x": 350, "y": 100 },
      "data": {
        "label": "Question 1",
        "selector": ".question:nth-child(1)",
        "wait_ms": 800,
        "repeat": 1
      }
    }
  ],
  "edges": [
    { "id": "e1", "source": "start", "target": "click1" }
  ]
}
```

---

## Backend Execution (DAG)

Backend chuyển React Flow thành Directed Acyclic Graph rồi thực thi tuần tự.

```python
graph = build_graph(nodes, edges)
current = find_start_node(graph)

while current:
    execute_node(current)
    next_nodes = graph[current.id]
    if not next_nodes:
        break
    current = next_nodes[0]
```

---

## Logic của Node Click

```python
el = page.locator(node.data.selector).first

if await el.count() == 0:
    return

for _ in range(node.data.repeat):
    await el.click()
    await page.wait_for_timeout(node.data.wait_ms)

new_content = await page.inner_text("body")
diff = compare_content(old_content, new_content)
append_to_memory(diff)
```

---

## Các loại Node hỗ trợ

### Browser
- Start, Open URL, Refresh, Back, End

### Interaction
- Click, Double Click, Hover, Type Text, Press Key, Upload File

### Wait
- Wait Time, Wait Element, Wait Network Idle

### Data
- Extract Text, Extract HTML, Screenshot, Save Variable

### Logic
- If, Switch, Loop, Repeat Until

### RAG
- Chunk Text, Embedding, Save ChromaDB, Save PostgreSQL, Export Markdown

---

## Ưu điểm so với Flow dạng List

| List Builder     | React Flow Builder                   |
| ---------------- | ------------------------------------ |
| Chỉ chạy tuần tự | Hỗ trợ DAG                           |
| Khó mở rộng      | Thêm node mới dễ dàng                |
| Không có branch  | Có If / Loop / Switch                |
| Chỉ drag sort    | Kéo thả trực quan                    |
| Khó debug        | Hiển thị trạng thái từng node        |
| Không giống n8n  | UI tương tự n8n / Flowise / LangFlow |

---

## Mục tiêu cuối cùng

Xây dựng một Workflow Builder chuyên cho Web Crawling + RAG. Người dùng chỉ cần kéo thả các node trên React Flow, kết nối chúng với nhau và nhấn Run để hệ thống tự động crawl theo đúng workflow đã thiết kế.

```
Start → Open URL → Login → Click Question → Extract Text → Chunk → Embedding → Save ChromaDB → End
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
