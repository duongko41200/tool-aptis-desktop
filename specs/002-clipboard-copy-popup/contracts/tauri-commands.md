# Tauri IPC Contracts: Clipboard Popup

**Branch**: `002-clipboard-copy-popup` | **Date**: 2026-06-01

---

## Existing Commands (không thay đổi)

`save_captured_content` — đã có, popup gọi lại như cũ.

---

## New Commands

### `show_clipboard_popup`

Hiển thị popup window và cập nhật nội dung mới.

**Direction**: Frontend (main) → Rust → Popup window  
**Trigger**: Automatic sau khi `clipboard:changed` event nhận được

```typescript
invoke('show_clipboard_popup', {
  content: string,
  charCount: number
}): Promise<void>
```

**Rust side**:
```rust
// Lấy window "clipboard-popup", gọi .show() + emit event vào popup
```

---

### `hide_clipboard_popup`

Ẩn popup window.

```typescript
invoke('hide_clipboard_popup'): Promise<void>
```

---

## Existing Events (không thay đổi)

### `clipboard:changed` (Rust → Frontend broadcast)

```typescript
// Payload
{
  content: string,
  char_count: number
}
```

Popup window lắng nghe event này trực tiếp — không qua main window.

---

## Window URL Routing

| Window label | URL |
|---|---|
| `main` | `http://localhost:1420/` (dev) hoặc `index.html` |
| `clipboard-popup` | `http://localhost:1420/popup` (dev) hoặc `index.html#/popup` |

Popup React app kiểm tra `window.location.pathname === '/popup'` để render `PopupApp` thay vì `App`.
