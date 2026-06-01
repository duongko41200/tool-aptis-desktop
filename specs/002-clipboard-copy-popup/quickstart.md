# Quickstart: Clipboard Popup Feature

**Branch**: `002-clipboard-copy-popup` | **Date**: 2026-06-01

---

## Prerequisites

Tất cả đã có từ feature 001 — không cần cài thêm gì ngoài:

```bash
# Thêm positioner plugin
cargo add tauri-plugin-positioner
pnpm add @tauri-apps/plugin-positioner
```

---

## Thay đổi chính

### 1. Rust — `src-tauri/Cargo.toml`

```toml
tauri-plugin-positioner = "2"
```

### 2. Rust — `src-tauri/src/lib.rs`

```rust
.plugin(tauri_plugin_positioner::init())
// Trong setup: tạo popup window ẩn
tauri::WebviewWindowBuilder::new(app, "clipboard-popup", 
    tauri::WebviewUrl::App("/popup".into()))
    .always_on_top(true)
    .decorations(false)
    .skip_taskbar(true)
    .visible(false)
    .inner_size(360.0, 260.0)
    .build()?;
```

### 3. Rust — new commands

```rust
// src-tauri/src/commands/clipboard.rs
#[tauri::command]
pub async fn show_clipboard_popup(app: tauri::AppHandle) -> Result<(), String>
#[tauri::command]  
pub async fn hide_clipboard_popup(app: tauri::AppHandle) -> Result<(), String>
```

### 4. Capabilities — `src-tauri/capabilities/popup.json` (mới)

```json
{
  "identifier": "clipboard-popup",
  "windows": ["clipboard-popup"],
  "permissions": ["core:default", "core:window:default"]
}
```

### 5. Frontend — `src/main.tsx`

```tsx
// Detect popup window và render PopupApp
if (window.location.pathname === '/popup') {
  ReactDOM.createRoot(...).render(<PopupApp />)
} else {
  ReactDOM.createRoot(...).render(<App />)
}
```

### 6. Frontend — `src/components/popup/PopupApp.tsx` (mới)

Standalone React component — không dùng Redux store, chỉ local state + Tauri events.

### 7. Vite — `vite.config.ts`

Thêm route `/popup` trỏ về `index.html` (Vite SPA fallback tự xử lý).

---

## Test thủ công

```
1. pnpm tauri dev
2. Bật clipboard monitoring trong Settings
3. Mở Chrome, bôi đen đoạn văn > 10 ký tự
4. Ctrl+C
5. Popup xuất hiện góc phải dưới trong ≤1 giây
6. Nhấn Save → popup đóng → mở Clipboard tab → xác nhận item đã lưu
7. Không tương tác 10 giây → popup tự đóng
8. Copy lại cùng đoạn text → popup không xuất hiện
```
