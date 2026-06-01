# Tasks: Clipboard Copy Popup (Standalone Overlay)

**Input**: Design documents tá»« `specs/002-clipboard-copy-popup/`

**Prerequisites**: plan.md âœ… | spec.md âœ… | research.md âœ… | data-model.md âœ… | contracts/tauri-commands.md âœ… | quickstart.md âœ…

**Tests**: KhÃ´ng bao gá»“m (khÃ´ng yÃªu cáº§u TDD). ThÃªm test tasks qua `/speckit-tasks` vá»›i TDD flag náº¿u cáº§n.

**Organization**: Tasks nhÃ³m theo user story Ä‘á»ƒ cÃ³ thá»ƒ implement vÃ  test Ä‘á»™c láº­p tá»«ng story.

---

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: CÃ³ thá»ƒ cháº¡y song song (file khÃ¡c nhau, khÃ´ng phá»¥ thuá»™c nhau)
- **[Story]**: User story tÆ°Æ¡ng á»©ng (US1â€“US3)
- File path cá»¥ thá»ƒ trong má»—i task

---

## Phase 1: Setup (Dependencies)

**Purpose**: CÃ i thÃªm `tauri-plugin-positioner` â€” dependency duy nháº¥t má»›i cho feature nÃ y.

- [X] T001 ThÃªm `tauri-plugin-positioner = "2"` vÃ o `src-tauri/Cargo.toml` dependencies
- [X] T002 [P] Cháº¡y `pnpm add @tauri-apps/plugin-positioner` Ä‘á»ƒ cÃ i npm package tÆ°Æ¡ng á»©ng

**Checkpoint**: `cargo check` pass, `pnpm list @tauri-apps/plugin-positioner` xÃ¡c nháº­n Ä‘Ã£ cÃ³.

---

## Phase 2: Foundational (Rust Backend â€” Blocking Prerequisite)

**Purpose**: Táº¡o cá»­a sá»• popup Tauri áº©n lÃºc startup vÃ  cÃ¡c commands Ä‘iá»u khiá»ƒn. Táº¥t cáº£ US Ä‘á»u cáº§n phase nÃ y.

âš ï¸ **CRITICAL**: Pháº£i hoÃ n thÃ nh trÆ°á»›c khi lÃ m frontend báº¥t ká»³ US nÃ o.

- [X] T003 ÄÄƒng kÃ½ `tauri_plugin_positioner::init()` trong `.plugin()` chain trong `src-tauri/src/lib.rs`; vÃ  trong `setup()` thÃªm táº¡o WebviewWindow áº©n: label `"clipboard-popup"`, url `/popup`, `always_on_top(true)`, `decorations(false)`, `skip_taskbar(true)`, `visible(false)`, `inner_size(360.0, 260.0)`
- [X] T004 [P] Táº¡o file `src-tauri/capabilities/popup.json` vá»›i `"windows": ["clipboard-popup"]` vÃ  permissions `["core:default", "core:window:default", "core:event:default"]`
- [X] T005 Implement `show_clipboard_popup(app: AppHandle) -> Result<(), String>` trong `src-tauri/src/commands/clipboard.rs` â€” láº¥y window `"clipboard-popup"`, gá»i `.show()`, `.set_focus()`, dÃ¹ng `MoveWindow::BottomRight` tá»« `tauri_plugin_positioner`
- [X] T006 Implement `hide_clipboard_popup(app: AppHandle) -> Result<(), String>` trong `src-tauri/src/commands/clipboard.rs` â€” gá»i `.hide()` trÃªn window `"clipboard-popup"`; Ä‘Äƒng kÃ½ cáº£ 2 commands vÃ o `invoke_handler` trong `lib.rs`

**Checkpoint**: `cargo check` pass, app khá»Ÿi Ä‘á»™ng Ä‘Æ°á»£c (popup window áº©n táº¡o thÃ nh cÃ´ng).

---

## Phase 3: User Story 1 â€” Quick Save from Browser (Priority: P1) ðŸŽ¯ MVP

**Goal**: Copy text â‰¥10 kÃ½ tá»± â†’ popup xuáº¥t hiá»‡n â‰¤1 giÃ¢y â†’ nháº¥n Save â†’ ná»™i dung lÆ°u vÃ o library â†’ popup Ä‘Ã³ng.

**Independent Test**: Báº­t monitoring trong Settings â†’ bÃ´i Ä‘en Ä‘oáº¡n vÄƒn 20+ kÃ½ tá»± trong Chrome â†’ Ctrl+C â†’ popup xuáº¥t hiá»‡n gÃ³c pháº£i dÆ°á»›i trong 1 giÃ¢y â†’ nháº¥n Save â†’ má»Ÿ Clipboard tab â†’ xÃ¡c nháº­n item Ä‘Ã£ lÆ°u.

- [X] T007 [US1] ThÃªm typed wrappers `showClipboardPopup()` vÃ  `hideClipboardPopup()` vÃ o `src/services/tauriCommands.ts` (gá»i `invoke('show_clipboard_popup')` vÃ  `invoke('hide_clipboard_popup')`)
- [X] T008 [US1] Sá»­a `src/main.tsx`: kiá»ƒm tra `window.location.pathname === '/popup'` â€” náº¿u Ä‘Ãºng render `<PopupApp />` thay vÃ¬ `<App />` (khÃ´ng cáº§n Redux Provider hay QueryClient cho popup)
- [X] T009 [US1] Táº¡o `src/components/popup/PopupApp.tsx` â€” component root cho popup window: dÃ¹ng `listen('clipboard:changed', ...)` tá»« `@tauri-apps/api/event` Ä‘á»ƒ nháº­n event; khi nháº­n event thÃ¬ gá»i `showClipboardPopup()` vÃ  cáº­p nháº­t state content; render `<ClipboardPopup />`
- [X] T010 [US1] Táº¡o `src/components/popup/ClipboardPopup.tsx` â€” UI tá»‘i giáº£n cho P1: preview ná»™i dung (tá»‘i Ä‘a 200 kÃ½ tá»± + "..."), nÃºt Save (gá»i `saveCapturedContent` vá»›i category `'general'`), nÃºt Ignore (gá»i `hideClipboardPopup()`); khi Save thÃ nh cÃ´ng gá»i `hideClipboardPopup()`; nháº¥n Escape cÅ©ng Ä‘Ã³ng popup

**Checkpoint**: US1 hoáº¡t Ä‘á»™ng end-to-end â€” copy text trÃªn browser â†’ popup xuáº¥t hiá»‡n â†’ Save â†’ item lÆ°u vÃ o library.

---

## Phase 4: User Story 2 â€” Category, Tags & Metadata (Priority: P2)

**Goal**: TrÆ°á»›c khi nháº¥n Save, ngÆ°á»i dÃ¹ng chá»n Ä‘Æ°á»£c category vÃ  nháº­p tags. Thao tÃ¡c hoÃ n thÃ nh trong <5 giÃ¢y.

**Independent Test**: Popup xuáº¥t hiá»‡n â†’ chá»n category "vocabulary" â†’ nháº­p tags "idiom,business" â†’ Save â†’ Clipboard tab â†’ xÃ¡c nháº­n item cÃ³ Ä‘Ãºng category vÃ  tags.

- [X] T011 [US2] ThÃªm category dropdown vÃ o `src/components/popup/ClipboardPopup.tsx` â€” 6 options: vocabulary, speaking, writing, grammar, reading, general; default "general"; truyá»n vÃ o `saveCapturedContent`
- [X] T012 [P] [US2] ThÃªm tags input vÃ o `src/components/popup/ClipboardPopup.tsx` â€” text input, nháº¥n Enter hoáº·c dáº¥u pháº©y Ä‘á»ƒ thÃªm tag; hiá»ƒn thá»‹ tag Ä‘Ã£ nháº­p dÆ°á»›i dáº¡ng badge cÃ³ nÃºt xÃ³a; truyá»n `string[]` vÃ o `saveCapturedContent`
- [X] T013 [P] [US2] ThÃªm folder input (optional, text field, placeholder "Folder...") vÃ o `ClipboardPopup.tsx`; truyá»n vÃ o `saveCapturedContent`

**Checkpoint**: Popup Ä‘áº§y Ä‘á»§ fields: preview + category + tags + folder + Save/Ignore. Metadata lÆ°u Ä‘Ãºng.

---

## Phase 5: User Story 3 â€” Monitoring Toggle (Priority: P3)

**Goal**: Báº­t/táº¯t popup tá»« Settings hoáº·c system tray; khi táº¯t thÃ¬ copy text khÃ´ng hiá»‡n popup.

**Independent Test**: Settings â†’ táº¯t monitoring â†’ copy báº¥t ká»³ text â†’ khÃ´ng cÃ³ popup. Báº­t láº¡i â†’ copy text â†’ popup xuáº¥t hiá»‡n.

- [X] T014 [US3] Kiá»ƒm tra vÃ  Ä‘áº£m báº£o `PopupApp.tsx` chá»‰ gá»i `showClipboardPopup()` khi `monitoring_enabled = true`; láº¥y tráº¡ng thÃ¡i ban Ä‘áº§u tá»« `getClipboardStatus()` khi mount; láº¯ng nghe state changes náº¿u cáº§n
- [X] T015 [US3] XÃ³a hoáº·c disable `SavePopup.tsx` overlay trong `src/App.tsx` Ä‘á»ƒ trÃ¡nh popup kÃ©p â€” main window khÃ´ng cáº§n hiá»‡n popup ná»¯a vÃ¬ Ä‘Ã£ cÃ³ separate window; comment rÃµ lÃ½ do

**Checkpoint**: Toggle monitoring trong Settings â†’ popup window hoáº¡t Ä‘á»™ng Ä‘Ãºng theo tráº¡ng thÃ¡i.

---

## Phase 6: Polish & Edge Cases

**Purpose**: Auto-dismiss, dedup, UX hoÃ n thiá»‡n.

- [X] T016 [P] ThÃªm auto-dismiss 10 giÃ¢y vÃ o `ClipboardPopup.tsx` â€” `setTimeout(hideClipboardPopup, 10000)` khi popup show; clear timer khi cÃ³ content má»›i hoáº·c user tÆ°Æ¡ng tÃ¡c; hiá»‡n countdown nhá» (optional)
- [X] T017 [P] Xá»­ lÃ½ dedup trong `PopupApp.tsx` â€” lÆ°u `lastContent` ref; náº¿u `event.payload.content === lastContent` thÃ¬ khÃ´ng gá»i `showClipboardPopup()`; reset khi popup Ä‘Ã³ng
- [X] T018 ThÃªm `cursor-style: pointer-events` overlay trong `ClipboardPopup.tsx` Ä‘á»ƒ click ra ngoÃ i popup thÃ¬ Ä‘Ã³ng (dÃ¹ng `onBlur` hoáº·c transparent backdrop div)
- [X] T019 [P] Cáº­p nháº­t `vite.config.ts` náº¿u cáº§n: Ä‘áº£m báº£o route `/popup` Ä‘Æ°á»£c serve Ä‘Ãºng trong cáº£ dev vÃ  production (Vite SPA fallback thÆ°á»ng tá»± xá»­ lÃ½)
- [X] T020 Cháº¡y end-to-end test theo `quickstart.md`: copy â†’ popup â†’ save â†’ search trong library; ghi láº¡i káº¿t quáº£

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Báº¯t Ä‘áº§u ngay â€” khÃ´ng phá»¥ thuá»™c gÃ¬
- **Phase 2 (Foundational)**: Sau Phase 1 â€” blocks táº¥t cáº£ US
- **Phase 3 (US1)**: Sau Phase 2
- **Phase 4 (US2)**: Sau Phase 3 (bá»• sung UI vÃ o popup Ä‘Ã£ cÃ³)
- **Phase 5 (US3)**: Sau Phase 3 (cáº§n popup window Ä‘Ã£ hoáº¡t Ä‘á»™ng)
- **Phase 6 (Polish)**: Sau Phase 3, 4, 5

### User Story Dependencies

- **US1 (P1)**: Cáº§n Phase 2 hoÃ n thÃ nh â€” core popup window
- **US2 (P2)**: Cáº§n US1 â€” bá»• sung fields vÃ o UI Ä‘Ã£ cÃ³
- **US3 (P3)**: Cáº§n US1 â€” toggle monitoring cho popup window

### Within Each Phase

- [P]-marked tasks cÃ³ thá»ƒ cháº¡y song song (file khÃ¡c nhau)
- Non-[P] tasks cháº¡y tuáº§n tá»± theo thá»© tá»± liá»‡t kÃª

---

## Parallel Execution Examples

### Phase 2 Parallel Group

```
Sequential:
  T003 â†’ khá»Ÿi táº¡o plugin + táº¡o window
  T004 â†’ capabilities file (cÃ³ thá»ƒ song song vá»›i T003)
  T005 â†’ show command (cáº§n T003 xong)
  T006 â†’ hide command + register (cáº§n T005)
```

### Phase 4 Parallel Group (US2)

```
Concurrent (khÃ¡c file/section):
  T011 â†’ category dropdown
  T012 â†’ tags input
  T013 â†’ folder input

Sequential sau Ä‘Ã³:
  Wire táº¥t cáº£ vÃ o saveCapturedContent call
```

---

## Implementation Strategy

### MVP (US1 Only)

1. Phase 1: Install dependencies
2. Phase 2: Rust popup window + commands
3. Phase 3: PopupApp + ClipboardPopup cÆ¡ báº£n
4. **STOP & VALIDATE**: Copy text â†’ popup hiá»‡n â†’ save â†’ verify
5. Demo: Clipboard popup standalone hoáº¡t Ä‘á»™ng

### Incremental Delivery

1. Phase 1 + 2 â†’ Infrastructure sáºµn sÃ ng
2. Phase 3 (US1) â†’ MVP: popup save Ä‘Æ°á»£c
3. Phase 4 (US2) â†’ ThÃªm category + tags
4. Phase 5 (US3) â†’ Toggle monitoring
5. Phase 6 â†’ Polish

---

## Task Summary

| Phase | Story | Tasks | Parallel |
|-------|-------|-------|---------|
| Phase 1: Setup | â€” | T001â€“T002 (2 tasks) | T002 |
| Phase 2: Foundational | â€” | T003â€“T006 (4 tasks) | T004 |
| Phase 3: US1 Quick Save | US1 (P1) | T007â€“T010 (4 tasks) | â€” |
| Phase 4: US2 Metadata | US2 (P2) | T011â€“T013 (3 tasks) | T012, T013 |
| Phase 5: US3 Toggle | US3 (P3) | T014â€“T015 (2 tasks) | â€” |
| Phase 6: Polish | â€” | T016â€“T020 (5 tasks) | T016, T017, T019 |
| **Total** | | **20 tasks** | **7 parallelizable** |

---

## Notes

- `[P]` tasks = file khÃ¡c nhau, khÃ´ng cÃ³ shared dependency
- `[Story]` label cho phÃ©p trace tá»«ng task vá» user story trong spec.md
- Má»—i US cÃ³ independent test checkpoint â€” dá»«ng vÃ  validate trÆ°á»›c khi sang US tiáº¿p
- Commit sau má»—i task hoáº·c nhÃ³m logic
- US2 vÃ  US3 cÃ³ thá»ƒ bá» qua Ä‘á»ƒ deliver MVP sá»›m hÆ¡n

