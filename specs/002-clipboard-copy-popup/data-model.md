# Data Model: Clipboard Copy Popup

**Branch**: `002-clipboard-copy-popup` | **Date**: 2026-06-01

---

## Ghi chú

Feature này **không thêm bảng SQLite mới**. Nội dung được lưu vào bảng `captured_content` và `captured_tags` đã có sẵn từ feature 001.

---

## Entities (Runtime / In-memory)

### PopupState (React state, không persist)

| Field | Type | Notes |
|-------|------|-------|
| `content` | `string` | Text vừa copy |
| `charCount` | `number` | Số ký tự |
| `category` | `ContentCategory` | Default: `'general'` |
| `tags` | `string[]` | Tags do user nhập |
| `folder` | `string` | Optional folder |
| `notes` | `string` | Optional personal notes |
| `isVisible` | `boolean` | Trạng thái hiển thị popup window |
| `isSaving` | `boolean` | Đang gọi save API |
| `dismissTimer` | `number \| null` | ID của auto-dismiss setTimeout |

---

### ClipboardChangedPayload (Tauri event, đã có sẵn)

| Field | Type | Notes |
|-------|------|-------|
| `content` | `String` | Text mới |
| `char_count` | `usize` | Số ký tự |

Emit từ `clipboard_watcher.rs` — **không thay đổi**.

---

## State Transitions

```
POPUP HIDDEN
    │
    │ clipboard:changed event (char_count ≥ 10, content != last)
    ▼
POPUP VISIBLE ──────────── auto-dismiss timer (10s) ──────────▶ POPUP HIDDEN
    │                                                              ▲
    │ new clipboard:changed event                                  │
    ▼                                                              │
POPUP VISIBLE (content updated, timer reset)                      │
    │                                                              │
    │ user clicks "Save"                    user clicks "Ignore"   │
    ▼                                       or Escape/click outside│
SAVING ────────── success ──────────────▶ POPUP HIDDEN ──────────┘
    │
    └── error ──▶ POPUP VISIBLE (error message shown)
```

---

## Tauri Window Configuration

| Property | Value |
|----------|-------|
| Label | `clipboard-popup` |
| Decorations | `false` (frameless) |
| Always on top | `true` |
| Skip taskbar | `true` |
| Visible at startup | `false` |
| Width | `360px` (logical) |
| Height | `auto` / `260px` max |
| Position | Bottom-right (via positioner plugin) |
| Resizable | `false` |
| Shadow | OS default |
