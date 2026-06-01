# Feature Specification: Clipboard Copy Popup (Standalone Overlay)

**Feature Branch**: `002-clipboard-copy-popup`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "tôi muốn popup trong phần clipBoard, khi bôi đen nhấn copy ctrl+c trên browser thì cái popup này hiện ra (lưu ý popup này không cần thuộc trong desktop app mà hiển thị mỗi popup khi copy thôi)"

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Quick Save from Browser (Priority: P1)

Người dùng đang đọc tài liệu trên trình duyệt (Chrome, Edge, Firefox), bôi đen một đoạn văn bản thú vị và nhấn Ctrl+C. Ngay lập tức, một popup nhỏ xuất hiện ở góc màn hình (ngoài cửa sổ desktop app) với nội dung vừa copy, cho phép người dùng lưu nhanh vào knowledge library mà không cần chuyển qua app.

**Why this priority**: Đây là core value của tính năng — loại bỏ ma sát giữa "thấy nội dung hay" và "lưu lại". Nếu phải switch qua app thì mất flow đọc.

**Independent Test**: Bật desktop app, bôi đen 1 đoạn văn trên bất kỳ trang web nào, nhấn Ctrl+C. Popup xuất hiện trong ≤1 giây mà không cần click gì trong app.

**Acceptance Scenarios**:

1. **Given** app đang chạy ở background, **When** người dùng copy ≥10 ký tự trên trình duyệt, **Then** popup xuất hiện ở góc màn hình trong vòng 1 giây.
2. **Given** popup đang hiển thị, **When** người dùng nhấn "Save", **Then** nội dung được lưu vào library và popup tự đóng.
3. **Given** popup đang hiển thị, **When** người dùng nhấn "Ignore" hoặc bấm ra ngoài popup, **Then** popup đóng mà không lưu.
4. **Given** popup đang hiển thị, **When** người dùng copy nội dung mới, **Then** popup cập nhật nội dung mới thay vì mở popup thứ hai.

---

### User Story 2 — Phân loại và gắn thẻ nhanh (Priority: P2)

Trước khi lưu, người dùng muốn phân loại nội dung (vocabulary, grammar, reading...) và gắn tag để dễ tìm lại sau. Thao tác này phải nhanh — tối đa 3–5 giây.

**Why this priority**: Tags và category giúp knowledge library có giá trị; không có phân loại thì search sau này rất khó.

**Independent Test**: Popup xuất hiện → chọn category "vocabulary" → nhập tag "idiom" → nhấn Save → mở Clipboard tab trong app → xác nhận item có đúng category và tag.

**Acceptance Scenarios**:

1. **Given** popup đang hiển thị, **When** người dùng chọn category và nhập tag rồi nhấn Save, **Then** nội dung được lưu với đúng metadata.
2. **Given** popup đang hiển thị, **When** người dùng không chọn gì và nhấn Save, **Then** nội dung được lưu với category mặc định "general".

---

### User Story 3 — Không bị làm phiền khi không cần (Priority: P3)

Người dùng có thể tắt popup tạm thời (ví dụ đang copy password, code...) mà không cần tắt toàn bộ app.

**Why this priority**: Trải nghiệm tốt — popup không nên xuất hiện mọi lúc mọi nơi không kiểm soát được.

**Independent Test**: Vào Settings → tắt "Clipboard monitoring" → copy text trên browser → xác nhận không có popup nào xuất hiện.

**Acceptance Scenarios**:

1. **Given** clipboard monitoring bị tắt, **When** người dùng copy bất kỳ text nào, **Then** không có popup nào xuất hiện.
2. **Given** clipboard monitoring đang tắt, **When** người dùng bật lại từ Settings hoặc System Tray, **Then** popup hoạt động trở lại ngay lập tức.

---

### Edge Cases

- Nếu text copy dưới 10 ký tự (ví dụ copy 1 từ đơn, số điện thoại ngắn) → popup không xuất hiện.
- Nếu copy cùng một đoạn text hai lần liên tiếp → popup không xuất hiện lần thứ hai.
- Nếu copy ảnh hoặc file (không phải text) → popup không xuất hiện.
- Nếu nội dung copy là password (không có cách phân biệt tự động) → người dùng tự tắt monitoring khi cần.
- Nếu popup đang hiển thị mà người dùng copy text mới → popup cập nhật nội dung, không mở popup chồng.
- Nếu app bị minimize về system tray → popup vẫn hoạt động bình thường.
- Nếu màn hình đang fullscreen game/video → popup hiển thị trên overlay (không bị che khuất).
- Nếu copy từ ứng dụng khác (không phải browser, ví dụ Word, Notepad) → popup vẫn xuất hiện (không giới hạn chỉ browser).

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Popup PHẢI xuất hiện tự động khi người dùng copy text ≥10 ký tự từ bất kỳ ứng dụng nào (không giới hạn browser), mà không cần người dùng tương tác với desktop app.
- **FR-002**: Popup PHẢI là cửa sổ độc lập (standalone overlay window) — không nằm trong cửa sổ chính của desktop app, hiển thị trên top of all windows.
- **FR-003**: Popup PHẢI xuất hiện trong vòng 1 giây sau khi copy.
- **FR-004**: Popup PHẢI hiển thị preview nội dung vừa copy (tối đa 200 ký tự, có "..." nếu dài hơn).
- **FR-005**: Popup PHẢI có nút "Save" và nút "Ignore/Close".
- **FR-006**: Popup PHẢI cho phép người dùng chọn category (vocabulary, speaking, writing, grammar, reading, general).
- **FR-007**: Popup PHẢI cho phép nhập tags (nhiều tag, cách nhau bằng dấu phẩy hoặc Enter).
- **FR-008**: Khi nhấn Save, nội dung PHẢI được lưu vào knowledge library với metadata đã chọn.
- **FR-009**: Popup PHẢI tự đóng sau khi lưu thành công.
- **FR-010**: Popup PHẢI đóng khi người dùng nhấn Ignore, bấm ra ngoài vùng popup, hoặc nhấn Escape.
- **FR-011**: Nếu người dùng copy text mới khi popup đang mở, popup PHẢI cập nhật nội dung mới (không mở popup thứ hai).
- **FR-012**: Người dùng PHẢI có thể bật/tắt tính năng popup từ Settings hoặc System Tray icon.
- **FR-013**: Popup PHẢI xuất hiện ở vị trí cố định, dễ thấy (góc phải dưới hoặc phải trên màn hình).
- **FR-014**: Popup KHÔNG được xuất hiện khi text copy dưới 10 ký tự hoặc trùng với lần copy trước.

### Key Entities

- **ClipboardCapture**: Nội dung text vừa copy, kèm thời điểm, số ký tự.
- **SavedItem**: Nội dung đã được lưu vào library, gồm text, category, tags, timestamp.
- **MonitoringState**: Trạng thái bật/tắt của clipboard monitoring.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Popup xuất hiện trong vòng **1 giây** sau khi người dùng nhấn Ctrl+C, trong 95% trường hợp.
- **SC-002**: Người dùng hoàn thành thao tác "copy → save với category + tag" trong **dưới 5 giây**.
- **SC-003**: Popup không xuất hiện cho các trường hợp không mong muốn: text < 10 ký tự, copy lặp, copy ảnh/file — đạt **100% accuracy**.
- **SC-004**: Tỉ lệ nội dung được lưu đúng metadata (category, tags) khớp với lựa chọn của người dùng đạt **100%**.
- **SC-005**: Tính năng hoạt động bình thường khi app đang chạy ở background/minimize, không làm ảnh hưởng đến hiệu năng hệ thống (CPU < 1% idle).

---

## Assumptions

- Popup là một **cửa sổ Tauri riêng biệt** (separate window), không phải overlay HTML trong cửa sổ chính — đây là cách duy nhất để hiển thị "trên đầu" mọi ứng dụng khác trên Windows.
- Desktop app PHẢI đang chạy (dù minimize hoặc ở system tray) thì popup mới hoạt động — không phải background service độc lập.
- Monitoring áp dụng cho **mọi ứng dụng** (không giới hạn browser), vì clipboard là system-wide.
- Category mặc định khi người dùng không chọn là "general".
- Popup không cần chức năng "Add to Vocabulary" trực tiếp trong lần này — chỉ cần Save vào captured_content library.
- Vị trí popup cố định ở **góc phải dưới** màn hình, cách cạnh 20px.
- Popup tự động đóng sau **10 giây** nếu người dùng không tương tác (auto-dismiss).
