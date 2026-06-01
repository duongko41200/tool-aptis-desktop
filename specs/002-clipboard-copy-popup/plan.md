# Implementation Plan: Clipboard Copy Popup

**Branch**: `002-clipboard-copy-popup` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification từ `specs/002-clipboard-copy-popup/spec.md`

---

## Summary

Thêm một cửa sổ Tauri độc lập (frameless, always-on-top) xuất hiện tự động ở góc phải dưới màn hình mỗi khi người dùng copy text ≥10 ký tự từ bất kỳ ứng dụng nào. Popup cho phép lưu nhanh vào knowledge library với category + tags, tự đóng sau 10 giây nếu không tương tác. Xây dựng trên hạ tầng clipboard_watcher.rs đã có — thêm `tauri-plugin-positioner`, second window config, và một React component nhẹ cho popup.

---

## Technical Context

**Language/Version**: TypeScript 5 (React 18) + Rust 1.94 (Tauri v2)

**Primary Dependencies**: Tauri v2, tauri-plugin-positioner (mới), React 18, @tauri-apps/plugin-positioner (mới)

**Storage**: SQLite qua `captured_content` table đã có — không thêm schema mới

**Testing**: Manual integration test (copy từ browser → popup → save → verify in library)

**Target Platform**: Windows 10/11 desktop (WebView2)

**Project Type**: Desktop app extension — thêm feature vào Tauri app đã có

**Performance Goals**: Popup xuất hiện ≤1 giây sau Ctrl+C; CPU idle < 1%

**Constraints**: App phải đang chạy (background/tray OK); popup chỉ hiện khi monitoring bật

**Scale/Scope**: Single-user; one popup window; sử dụng lại toàn bộ backend save logic

---

## Constitution Check

*No project constitution ratified — applying general quality principles.*

| Gate | Status | Notes |
|------|--------|-------|
| Feature aligns with project purpose | PASS | Clipboard capture là core feature |
| No unnecessary new dependencies | PASS | Chỉ thêm tauri-plugin-positioner (official) |
| Reuses existing infrastructure | PASS | clipboard_watcher, save_captured_content, captured_content table đã có |
| Data stored locally | PASS | SQLite, không cloud |
| Second window không leak sensitive data | PASS | API key không cần trong popup |

---

## Project Structure

### Documentation (this feature)

```text
specs/002-clipboard-copy-popup/
├── plan.md           ← This file
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── tauri-commands.md
└── tasks.md          ← /speckit-tasks output
```

### Source Code Changes

```text
src-tauri/
├── Cargo.toml                     [MODIFY] thêm tauri-plugin-positioner
├── src/
│   ├── lib.rs                     [MODIFY] init plugin + tạo popup window ẩn lúc startup
│   └── commands/
│       └── clipboard.rs           [MODIFY] thêm show_clipboard_popup, hide_clipboard_popup
└── capabilities/
    └── popup.json                 [NEW] capabilities cho clipboard-popup window

src/
├── main.tsx                       [MODIFY] detect /popup path → render PopupApp
├── components/
│   └── popup/
│       ├── PopupApp.tsx           [NEW] root component cho popup window
│       └── ClipboardPopup.tsx     [NEW] UI: preview + category + tags + save/ignore
└── services/
    └── tauriCommands.ts           [MODIFY] thêm showClipboardPopup / hideClipboardPopup
```

---

## Implementation Phases

### Phase 1 — Rust Backend

1. Thêm `tauri-plugin-positioner` vào `Cargo.toml`
2. Đăng ký plugin + tạo popup window ẩn trong `lib.rs` setup
3. Implement `show_clipboard_popup` — show + focus + position BottomRight
4. Implement `hide_clipboard_popup` — hide
5. Register commands, tạo `capabilities/popup.json`

### Phase 2 — Frontend Popup Component

1. Sửa `main.tsx`: route `/popup` → `PopupApp` (lightweight, không Redux)
2. `PopupApp.tsx`: listen `clipboard:changed` → call `show_clipboard_popup`
3. `ClipboardPopup.tsx`: preview + category + tags + Save/Ignore + auto-dismiss 10s
4. Thêm typed wrappers vào `tauriCommands.ts`

### Phase 3 — Integration & Polish

1. Test end-to-end: copy → popup → save → verify
2. Test edge cases: text ngắn, trùng content, monitoring tắt, auto-dismiss
3. Cập nhật `SavePopup.tsx` trong main app (optional: remove hoặc giữ làm fallback)

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Window type | Tauri WebviewWindow riêng | Duy nhất float được trên browser |
| Show/hide | Create hidden at startup, show/hide runtime | Nhanh hơn create/destroy |
| Positioning | tauri-plugin-positioner BottomRight | Tự handle Windows taskbar |
| React routing | pathname `/popup` trong main bundle | Đơn giản, không cần multi-entry Vite |
| Auto-dismiss | setTimeout 10s trong React | Không cần Rust timer |

---

## Artifact Reference

| Artifact | Path |
|----------|------|
| Specification | `specs/002-clipboard-copy-popup/spec.md` |
| Research | `specs/002-clipboard-copy-popup/research.md` |
| Data Model | `specs/002-clipboard-copy-popup/data-model.md` |
| Contracts | `specs/002-clipboard-copy-popup/contracts/tauri-commands.md` |
| Quickstart | `specs/002-clipboard-copy-popup/quickstart.md` |
