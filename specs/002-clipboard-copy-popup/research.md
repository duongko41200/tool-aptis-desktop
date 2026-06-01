# Research: Clipboard Copy Popup (Standalone Overlay)

**Branch**: `002-clipboard-copy-popup` | **Date**: 2026-06-01

---

## Decision 1: Cơ chế hiển thị popup

**Decision**: Tauri second window (WebviewWindow) — tạo sẵn lúc startup, ẩn (`.visible(false)`), chỉ `.show()` khi có clipboard event.

**Rationale**:
- Phải là native OS window mới hiển thị được **trên đầu** trình duyệt (browser window). HTML overlay trong main window không thể float over browser.
- Show/hide nhanh hơn create/destroy (không tạo lại WebView mỗi lần).
- `always_on_top(true)` + `decorations(false)` + `skip_taskbar(true)` là standard pattern cho Tauri notification popup.

**Alternatives considered**:
- HTML overlay trong main app window → bị che bởi browser, loại bỏ.
- Windows Toast notification (WinRT) → không tương tác được, loại bỏ.
- Create/destroy window mỗi lần → chậm hơn do WebView2 initialization, loại bỏ.

---

## Decision 2: Cách popup nhận clipboard event

**Decision**: Clipboard watcher (`clipboard_watcher.rs`) emit `app.emit()` broadcast — popup window lắng nghe cùng event `clipboard:changed` giống main window.

**Rationale**:
- `AppHandle::emit()` trong Tauri v2 broadcast tới tất cả windows — popup nhận event tự động mà không cần thay đổi watcher.
- Đơn giản hơn `emit_to()` vì popup và main window đều cần event này.

**Alternatives considered**:
- `emit_to("clipboard-popup", ...)` để target riêng popup → thêm logic phức tạp, không cần thiết.

---

## Decision 3: Vị trí popup

**Decision**: Sử dụng `tauri-plugin-positioner` với `Position::BottomRight` — tự động tính offset cho Windows taskbar.

**Rationale**:
- Plugin xử lý taskbar height offset tự động (tránh popup bị taskbar che).
- Không cần tính thủ công screen dimensions.

**Alternatives considered**:
- Manual `.position(x, y)` sau khi lấy monitor size → phải tính taskbar height, phức tạp hơn.

---

## Decision 4: Auto-dismiss

**Decision**: Frontend React dùng `setTimeout(closePopup, 10000)` reset mỗi khi popup show.

**Rationale**:
- Logic đơn giản, không cần Rust timer.
- Reset timer khi có content mới.

---

## Decision 5: Capabilities cho second window

**Decision**: Tạo file `src-tauri/capabilities/popup.json` riêng với `"windows": ["clipboard-popup"]`.

**Rationale**:
- Principle of least privilege — popup chỉ cần window controls và events, không cần SQL/Store.
- Tách biệt security boundary giữa main app và popup.

---

## Decision 6: React app riêng cho popup

**Decision**: Popup window load cùng Vite dev server nhưng render một component riêng (`PopupApp.tsx`) thông qua route `/popup` hoặc entry point riêng.

**Rationale**:
- Popup chỉ cần UI nhỏ (~300×200px), không cần load Redux store đầy đủ.
- Dùng URL path `/popup` để phân biệt main app vs popup window trong cùng một Vite bundle.

**Alternatives considered**:
- Separate Vite entry point (vite.config multi-page) → phức tạp build config.
- Load cùng `App.tsx` nhưng kiểm tra window label → dễ nhưng tải nhiều code thừa.
