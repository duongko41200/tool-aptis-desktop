# Hướng dẫn sử dụng Automation Flow Builder

## Mục lục

1. [Mở Flow Builder](#1-mở-flow-builder)
2. [Giao diện tổng quan](#2-giao-diện-tổng-quan)
3. [Thêm node vào canvas](#3-thêm-node-vào-canvas)
4. [Kết nối các node](#4-kết-nối-các-node)
5. [Cấu hình node](#5-cấu-hình-node)
6. [Xóa node hoặc đường nối](#6-xóa-node-hoặc-đường-nối)
7. [Chạy workflow](#7-chạy-workflow)
8. [Lưu và tái sử dụng](#8-lưu-và-tái-sử-dụng)
9. [Ví dụ thực tế](#9-ví-dụ-thực-tế)
10. [Danh sách node đầy đủ](#10-danh-sách-node-đầy-đủ)

---

## 1. Mở Flow Builder

1. Vào trang **RAG Chat** (menu bên trái)
2. Mở tab **Nguồn dữ liệu** (góc trên phải)
3. Nhấn nút **⚡ Thêm auto workflow**

> Cửa sổ Flow Builder hiện ra dạng modal. Nhấn ngoài vùng tối hoặc nút **✕** để đóng.

---

## 2. Giao diện tổng quan

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚡ Automation Flow Builder   │  [URL input]           │  [✕]  │  ← Header
├───────────────┬────────────────────────────────────┬────────────┤
│               │                                    │            │
│  Node Library │        Canvas (vẽ flow)            │ Properties │
│  ─────────── │                                    │  (khi chọn │
│  Browser      │   Kéo thả node vào đây            │   node)    │
│  Interaction  │   Nối node với nhau                │            │
│  Wait         │                                    │            │
│  Data         │                                    │            │
│  Logic        │                                    │            │
│  RAG          │                                    │            │
│               │                                    │            │
├───────────────┴────────────────────────────────────┴────────────┤
│  [▶ Chạy flow]  [Export JSON]  [Import JSON]    3 nodes·2 edges │  ← Footer
└─────────────────────────────────────────────────────────────────┘
```

| Vùng | Chức năng |
|---|---|
| **Header** | Nhập URL trang cần crawl, đóng modal |
| **Node Library** (trái) | Danh sách các node có thể thêm |
| **Canvas** (giữa) | Khu vực thiết kế workflow |
| **Properties** (phải) | Cấu hình chi tiết node đang chọn |
| **Footer** | Chạy, Export/Import, thống kê |

---

## 3. Thêm node vào canvas

### Cách 1 — Click vào tên node

Nhấn thẳng vào tên node trong **Node Library** bên trái. Node sẽ tự động xuất hiện trên canvas.

### Cách 2 — Kéo thả (Drag & Drop)

1. Giữ chuột trái vào tên node trong **Node Library**
2. Kéo vào vị trí mong muốn trên canvas
3. Thả chuột — node xuất hiện đúng vị trí vừa thả

> **Mẹo:** Luôn bắt đầu bằng node **Start** và kết thúc bằng **End** hoặc **Save ChromaDB**.

---

## 4. Kết nối các node

Các node được nối với nhau bằng **Handle** — chấm tròn có màu ở đầu/cuối mỗi node:

- **Handle trên** (input) — nhận kết nối đến
- **Handle dưới** (output) — kéo để kết nối tới node khác

### Cách nối

1. Di chuột vào **handle dưới** của node nguồn — handle sẽ to ra
2. Giữ chuột trái và **kéo** sang node đích
3. Di chuột đến **handle trên** của node đích — handle sáng lên
4. **Thả chuột** — đường nối xuất hiện

```
  ┌──────────┐
  │  Click 1 │
  └────●─────┘   ← handle dưới, kéo từ đây
       │
       │  (đường nối)
       │
  ┌────●─────┐   ← handle trên, thả vào đây
  │  Click 2 │
  └──────────┘
```

> **Lưu ý:** Chỉ nối từ handle **dưới** → handle **trên**. Không thể nối ngược lại.

---

## 5. Cấu hình node

1. **Click** vào node trên canvas
2. Panel **Properties** hiện ra bên phải
3. Chỉnh sửa các trường:

### Các trường cấu hình phổ biến

| Trường | Mô tả | Ví dụ |
|---|---|---|
| **Tên node** | Nhãn hiển thị trên canvas | `Câu hỏi 1`, `Next page` |
| **CSS Selector** | Element cần thao tác | `.question:nth-child(1)`, `#btn-next` |
| **Chờ sau thao tác (ms)** | Thời gian đợi sau khi click để trang load | `800`, `1500` |
| **Lặp lại** | Số lần click liên tiếp | `1`, `3` |
| **Đọc nội dung sau thao tác** | Có lưu nội dung mới xuất hiện sau click không | Bật / Tắt |
| **Bỏ qua lỗi** | Nếu node lỗi thì tiếp tục hay dừng | Bật / Tắt |

### Tìm CSS Selector

1. Mở trang web muốn crawl trong trình duyệt
2. Nhấn `F12` mở DevTools
3. Nhấn biểu tượng **inspector** (mũi tên góc trên trái DevTools)
4. Click vào element muốn thao tác
5. Chuột phải vào element trong HTML panel → **Copy** → **Copy selector**

---

## 6. Xóa node hoặc đường nối

### Xóa node

| Cách | Thao tác |
|---|---|
| Nút xóa | Click node → panel phải → nhấn **Xóa node** (nút đỏ dưới cùng) |
| Phím tắt | Click chọn node → nhấn `Delete` hoặc `Backspace` |

> Khi xóa node, tất cả đường nối kết nối vào/ra node đó cũng tự động xóa.

### Xóa đường nối (edge)

1. Click vào đường nối trên canvas — đường nối chuyển sang màu xanh
2. Nhấn `Delete` hoặc `Backspace`

---

## 7. Chạy workflow

### Bước 1 — Nhập URL

Nhập URL trang web muốn crawl vào ô input ở **header** (góc trên).

```
https://example.com/exam/123
```

### Bước 2 — Kiểm tra flow

Đảm bảo:
- Có node **Start** ở đầu
- Các node đã được **nối liên tiếp** với nhau
- Node cuối là **End** hoặc **Save ChromaDB**
- Các node Click/Hover đã điền **CSS Selector**

### Bước 3 — Nhấn Chạy flow

Nhấn nút **▶ Chạy flow** ở footer.

### Luồng thực thi

```
Nhấn Chạy flow
      │
      ▼
Backend mở Chrome headless
      │
      ▼
Vào URL → chờ trang load
      │
      ▼
Chạy từng node theo thứ tự:
  ├─ click       → click element → đợi → lưu nội dung mới
  ├─ extract     → lưu toàn bộ nội dung trang
  ├─ wait_time   → đợi X ms
  └─ end         → dừng
      │
      ▼
Chunk + Embed nội dung → Lưu ChromaDB
      │
      ▼
Hiển thị "Xong! Lưu được N chunks"
URL tự động thêm vào danh sách Nguồn dữ liệu
```

### Trạng thái khi chạy

| Trạng thái | Ý nghĩa |
|---|---|
| `Đang chạy...` | Playwright đang thực thi workflow |
| `✓ Xong! Lưu được N chunks` | Thành công, N đoạn văn bản đã lưu vào ChromaDB |
| `✗ Lỗi ...` | Có lỗi xảy ra, xem chi tiết để debug |

---

## 8. Lưu và tái sử dụng

### Export JSON

Nhấn **Export JSON** → tải file `workflow.json` về máy.

File JSON chứa toàn bộ cấu trúc workflow:

```json
{
  "url": "https://example.com/exam/123",
  "nodes": [
    { "id": "start-1", "type": "automation", "position": {...}, "data": { "type": "start" } },
    { "id": "click-2", "type": "automation", "position": {...}, "data": { "type": "click", "selector": ".question:nth-child(1)", "wait_ms": 800 } }
  ],
  "edges": [
    { "id": "e1", "source": "start-1", "target": "click-2" }
  ]
}
```

### Import JSON

Nhấn **Import JSON** → chọn file `.json` đã lưu → workflow tự động tải lên canvas.

---

## 9. Ví dụ thực tế

### Ví dụ 1 — Crawl trang có nhiều câu hỏi cần click để xem

**Tình huống:** Trang exam có 5 câu hỏi, mỗi câu phải click để mở ra nội dung.

**Workflow:**

```
Start
  │
  ▼
Click → selector: .question:nth-child(1) · wait: 800ms · Đọc nội dung: Bật
  │
  ▼
Click → selector: .question:nth-child(2) · wait: 800ms · Đọc nội dung: Bật
  │
  ▼
Click → selector: .question:nth-child(3) · wait: 800ms · Đọc nội dung: Bật
  │
  ▼
Click → selector: .question:nth-child(4) · wait: 800ms · Đọc nội dung: Bật
  │
  ▼
Click → selector: .question:nth-child(5) · wait: 800ms · Đọc nội dung: Bật
  │
  ▼
End
```

---

### Ví dụ 2 — Crawl nhiều trang (phân trang)

**Tình huống:** Trang có nút "Trang tiếp theo", cần lặp qua 3 trang.

**Workflow:**

```
Start
  │
  ▼
Extract Text → lấy nội dung trang 1
  │
  ▼
Click → selector: #btn-next · wait: 1500ms · Đọc nội dung: Tắt
  │
  ▼
Extract Text → lấy nội dung trang 2
  │
  ▼
Click → selector: #btn-next · wait: 1500ms · Đọc nội dung: Tắt
  │
  ▼
Extract Text → lấy nội dung trang 3
  │
  ▼
Save ChromaDB
```

> Dùng **Đọc nội dung: Tắt** cho node Click "Next page" vì chỉ muốn chuyển trang, không cần lưu nội dung tại thời điểm click.

---

### Ví dụ 3 — Trang cần đăng nhập

**Tình huống:** Trang yêu cầu đăng nhập trước khi xem nội dung.

**Bước 1:** Lấy cookie từ trình duyệt
1. Đăng nhập vào trang trong Chrome
2. Nhấn `F12` → tab **Network**
3. Reload trang
4. Click vào request đầu tiên → tab **Headers**
5. Copy giá trị header `Cookie`

**Bước 2:** Dùng node `Open URL` với cookie (hiện tại hỗ trợ qua URL input)

**Workflow:**

```
Start
  │
  ▼
Open URL → url: https://example.com/dashboard
  │
  ▼
Wait Network → chờ trang load xong
  │
  ▼
Click → selector: .lesson-item · Đọc nội dung: Bật
  │
  ▼
End
```

---

## 10. Danh sách node đầy đủ

### Browser

| Node | Chức năng | Cần cấu hình |
|---|---|---|
| **Start** | Điểm bắt đầu flow, tự động mở URL | — |
| **Open URL** | Điều hướng sang URL khác | URL |
| **Refresh** | Tải lại trang | — |
| **Back** | Quay lại trang trước | — |
| **End** | Kết thúc flow | — |

### Interaction

| Node | Chức năng | Cần cấu hình |
|---|---|---|
| **Click** | Click vào element | Selector, Wait ms, Repeat, Đọc nội dung |
| **Double Click** | Double-click element | Selector, Wait ms, Đọc nội dung |
| **Hover** | Di chuột qua element | Selector, Wait ms, Đọc nội dung |
| **Type Text** | Điền text vào input | Selector, Text |
| **Press Key** | Nhấn phím | Key (Enter/Tab/Escape...) |

### Wait

| Node | Chức năng | Cần cấu hình |
|---|---|---|
| **Wait Time** | Đợi cố định | Wait ms |
| **Wait Element** | Đợi đến khi element xuất hiện | Selector |
| **Wait Network** | Đợi đến khi network idle | — |

### Data

| Node | Chức năng | Lưu vào ChromaDB |
|---|---|---|
| **Extract Text** | Lấy toàn bộ text trang hiện tại | Có |
| **Extract HTML** | Lấy toàn bộ HTML trang | Có |
| **Screenshot** | Chụp ảnh màn hình | Không |
| **Save Variable** | Lưu giá trị vào biến | — |

### Logic

| Node | Chức năng | Cần cấu hình |
|---|---|---|
| **Condition (If)** | Rẽ nhánh theo điều kiện | — |
| **Loop** | Lặp lại N lần | Số lần lặp |
| **Repeat Until** | Lặp cho đến khi điều kiện đúng | Số lần lặp |

### RAG

| Node | Chức năng |
|---|---|
| **Chunk Text** | Chia nhỏ text đã thu thập |
| **Embedding** | Tạo vector embedding |
| **Save ChromaDB** | Lưu vào ChromaDB và dừng flow |
| **Export MD** | Xuất ra file Markdown |

---

## Mẹo và lưu ý

**CSS Selector không tìm thấy element:**
- Tăng **Wait ms** của node trước đó (trang chưa load kịp)
- Kiểm tra lại selector trong DevTools
- Bật **Bỏ qua lỗi** để flow tiếp tục dù node đó lỗi

**Flow chạy xong nhưng chunks = 0:**
- Kiểm tra xem node **Extract Text** hoặc **Click + Đọc nội dung** đã được thêm chưa
- Node **End** dừng flow sớm trước khi extract

**Trang tải chậm:**
- Thêm node **Wait Network** sau các Click quan trọng
- Tăng **Wait ms** lên 1500–3000ms

**Debug flow:**
- Chạy thử với 1–2 node trước, kiểm tra chunks có dữ liệu không
- Sau đó thêm dần các node còn lại
