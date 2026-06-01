# Quickstart: Anki Vocab System

**Branch**: `003-anki-vocab-system` | **Date**: 2026-06-01

---

## Thay đổi chính so với feature 001

### Rust — New files
```
src-tauri/src/
├── commands/
│   └── anki.rs          # Tất cả deck/note/card commands
├── services/
│   └── srs_v2.rs        # SM-2 + Learning Steps state machine
│   └── cloze_parser.rs  # Parse {{c1::answer}} → Card generation
└── migrations/
    └── 002_anki_schema.sql
```

### Frontend — New files
```
src/
├── components/vocabulary/
│   ├── DeckList.tsx          # Sidebar cây deck
│   ├── DeckStudyView.tsx     # Home khi chọn deck (stats + Start Review)
│   ├── NoteEditor.tsx        # Form tạo/edit Note (hỗ trợ Cloze highlight)
│   ├── CardReviewer.tsx      # Review session (thay ReviewSession.tsx cũ)
│   └── CardFront.tsx / CardBack.tsx
├── hooks/
│   └── useAnki.ts            # TanStack Query hooks cho decks/notes/cards
└── components/popup/
    └── AddToVocabForm.tsx     # Thay thế phần Add to Vocab trong ClipboardPopup
```

---

## Test thủ công

```
1. pnpm tauri dev
2. Tab Vocabulary → thấy deck "Default" (từ migrate)
3. Tạo deck mới "English" → sub-deck "English::Vocabulary"
4. Tạo Note Basic: front="Apple", back="Táo" → thấy 1 Card
5. Tạo Note Cloze: "{{c1::Tokyo}} is the capital of Japan"
6. Start Review → lật thẻ → nhấn Good → thẻ rời khỏi queue
7. Ctrl+K → copy text → Add to Vocab → chọn deck + template Cloze
8. Bury 1 card → xác nhận không hiện lại hôm nay
9. Flag card màu đỏ → xác nhận icon màu đỏ hiện trong list
```
