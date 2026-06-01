# Implementation Plan: Anki-Style Vocabulary System

**Branch**: `003-anki-vocab-system` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)

---

## Summary

Nâng cấp toàn bộ Vocabulary module từ model Word/Meaning đơn giản lên Anki-style Deck → Note → Card với Learning Steps, Cloze Deletion, Tags, Bury/Suspend/Flag. Xây trên Tauri v2 + SQLite. Thêm migration chuyển dữ liệu cũ từ `vocabulary_entries` sang `notes/cards`. Cập nhật Clipboard popup để hỗ trợ chọn Deck và tạo Cloze card khi Add to Vocab.

---

## Technical Context

**Language/Version**: TypeScript 5 (React 18) + Rust 1.94 (Tauri v2)

**Primary Dependencies**: Tauri v2, SQLite (rusqlite), React, TanStack Query — tất cả đã có sẵn

**Storage**: SQLite — thêm tables `decks`, `notes`, `cards`, `review_logs` qua Migration 002

**Testing**: Manual (quickstart.md), cargo test cho srs_v2.rs và cloze_parser.rs

**Target Platform**: Windows 10/11

**Project Type**: Extension của feature 001 — không thay đổi infrastructure

**Performance Goals**: `get_due_cards_for_deck` với 1,000 cards < 100ms; recursive deck query < 50ms

**Constraints**: Backward compatible — vocabulary_entries cũ vẫn tồn tại trong DB

**Scale/Scope**: Single user; up to 10,000 cards; deck depth ≤ 3 levels

---

## Constitution Check

*No constitution ratified — applying general quality principles.*

| Gate | Status | Notes |
|------|--------|-------|
| Feature aligns with project purpose | PASS | Vocabulary learning là core feature |
| No unnecessary new dependencies | PASS | Không thêm crate mới (dùng rusqlite đã có) |
| Backward compatible | PASS | vocabulary_entries cũ giữ nguyên, data migrate |
| Data stored locally | PASS | SQLite, không cloud |
| Migration safe | PASS | INSERT OR IGNORE, không xóa data cũ |

---

## Project Structure

### Documentation

```text
specs/003-anki-vocab-system/
├── plan.md               ← This file
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── tauri-commands.md
└── tasks.md
```

### Source Code Changes

```text
src-tauri/
├── migrations/
│   └── 002_anki_schema.sql          [NEW] Deck/Note/Card tables + migration data
├── src/
│   ├── lib.rs                        [MODIFY] register migration 002 + new commands
│   ├── commands/
│   │   └── anki.rs                   [NEW] deck/note/card/review/flag commands
│   └── services/
│       ├── srs_v2.rs                 [NEW] SM-2 + Learning Steps state machine
│       └── cloze_parser.rs           [NEW] {{cN::answer}} parser + card generation

src/
├── components/vocabulary/
│   ├── VocabularyTab.tsx             [MODIFY] integrate DeckList + DeckStudyView
│   ├── DeckList.tsx                  [NEW] sidebar cây deck với stats badges
│   ├── DeckStudyView.tsx             [NEW] home khi chọn deck (stats + Start Review)
│   ├── NoteEditor.tsx                [NEW] form tạo/edit note, cloze highlight
│   ├── CardReviewer.tsx              [NEW] review session: front/back, 4 buttons, actions
│   └── CardItem.tsx                  [NEW] 1 card với flag/suspend/bury actions
├── hooks/
│   └── useAnki.ts                    [NEW] TanStack Query hooks
├── services/
│   └── tauriCommands.ts              [MODIFY] thêm anki commands
└── components/popup/
    └── AddToVocabSection.tsx         [NEW] Deck selector + template + cloze editor
```

---

## Implementation Phases

### Phase 1 — Database & Rust Backend

1. Viết `002_anki_schema.sql` — tables + indexes + migration từ vocabulary_entries
2. Đăng ký migration 002 trong `lib.rs`
3. Viết `srs_v2.rs` — SM-2 + Learning Steps: `calculate_next(state, step, rating) → (new_state, new_step, due_offset_mins, new_interval, new_ease)`
4. Viết `cloze_parser.rs` — `parse_cloze(text) → Vec<ClozeCard>`, validate, render per-card text
5. Viết `commands/anki.rs` — tất cả Tauri commands từ contracts
6. Đăng ký tất cả commands trong `lib.rs`
7. `cargo test` — srs_v2 state machine + cloze parser

### Phase 2 — Frontend Core

1. Thêm Anki typed wrappers vào `tauriCommands.ts`
2. Viết `useAnki.ts` — `useDecks()`, `useNotesForDeck()`, `useDueCards()`, `useSubmitRating()` mutations
3. Viết `DeckList.tsx` — cây deck, collapse/expand, New/Learning/Review badges
4. Viết `DeckStudyView.tsx` — stats header, list notes, Start Review button
5. Viết `NoteEditor.tsx` — Basic form + Cloze editor với highlight button
6. Viết `CardReviewer.tsx` — review loop: front → flip → back + 4 buttons + Bury/Suspend/Flag

### Phase 3 — Tab Integration

1. Cập nhật `VocabularyTab.tsx` — sidebar DeckList + main DeckStudyView + NoteEditor + CardReviewer
2. Wire session end → refresh deck stats
3. TabBar badge = tổng due cards

### Phase 4 — Clipboard Integration

1. Viết `AddToVocabSection.tsx` — deck dropdown (fetch decks), template selector, cloze editor
2. Cập nhật `ClipboardPopup.tsx` — swap Add to Vocab section cũ

### Phase 5 — Polish

1. Bury sibling cards khi review (optional)
2. Session summary modal
3. Tag filter trong DeckStudyView

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Learning Steps | [10m, 1d, 3d] fixed | Đơn giản, đủ cho v1 |
| Deck query | Recursive CTE | SQLite native, không cần lib ngoài |
| Migration | INSERT OR IGNORE | An toàn, không mất data |
| Cloze parser | Rust regex | Performance + testable |
| Card generation | Server-side (Rust) | Logic thuần túy |
| Backward compat | vocabulary_entries giữ | Không break feature 001 |

---

## Artifact Reference

| Artifact | Path |
|----------|------|
| Specification | `specs/003-anki-vocab-system/spec.md` |
| Research | `specs/003-anki-vocab-system/research.md` |
| Data Model | `specs/003-anki-vocab-system/data-model.md` |
| Contracts | `specs/003-anki-vocab-system/contracts/tauri-commands.md` |
| Quickstart | `specs/003-anki-vocab-system/quickstart.md` |
