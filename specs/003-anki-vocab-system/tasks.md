# Tasks: Anki-Style Vocabulary System

**Input**: Design documents tá»« `specs/003-anki-vocab-system/`

**Prerequisites**: plan.md âœ… | spec.md âœ… | research.md âœ… | data-model.md âœ… | contracts/tauri-commands.md âœ… | quickstart.md âœ…

**Tests**: KhÃ´ng bao gá»“m TDD. Cargo tests cho srs_v2.rs vÃ  cloze_parser.rs Ä‘Æ°á»£c tÃ­ch há»£p vÃ o task implement.

**Organization**: Tasks nhÃ³m theo user story. US1 (Deck) vÃ  US2 (Note/Card) lÃ  blocking cho US3+ nÃªn Ä‘Æ°á»£c gá»™p vÃ o Foundational phase.

---

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Cháº¡y song song Ä‘Æ°á»£c (file khÃ¡c nhau, khÃ´ng phá»¥ thuá»™c)
- **[Story]**: US1â€“US6

---

## Phase 1: Setup â€” Database Migration

**Purpose**: ThÃªm 4 báº£ng má»›i vÃ  migrate data tá»« vocabulary_entries. Táº¥t cáº£ phases sau Ä‘á»u block á»Ÿ Ä‘Ã¢y.

- [X] T001 Viáº¿t `src-tauri/migrations/002_anki_schema.sql` â€” CREATE TABLE decks, notes, cards, review_logs vá»›i Ä‘áº§y Ä‘á»§ indexes, constraints, vÃ  migration INSERT tá»« vocabulary_entries theo data-model.md
- [X] T002 ÄÄƒng kÃ½ migration 002 trong `src-tauri/src/lib.rs` â€” thÃªm `Migration { version: 2, description: "anki_schema", sql: include_str!("../migrations/002_anki_schema.sql"), kind: Up }` vÃ o plugin builder

**Checkpoint**: `cargo check` pass. DB schema má»›i tá»“n táº¡i sau khi cháº¡y app.

---

## Phase 2: Foundational â€” Rust Services & Commands

**Purpose**: Backend core mÃ  táº¥t cáº£ US Ä‘á»u cáº§n. Block US3â€“US6.

âš ï¸ **CRITICAL**: Pháº£i hoÃ n thÃ nh trÆ°á»›c khi lÃ m báº¥t ká»³ frontend story nÃ o.

- [X] T003 Viáº¿t `src-tauri/src/services/srs_v2.rs` â€” hÃ m `calculate_next(state: &str, current_step: i64, rating: &str, interval_days: f64, ease_factor: f64) -> SrsResult` vá»›i learning steps [10, 1440, 4320] phÃºt vÃ  cargo tests cho táº¥t cáº£ state transitions (new/learning/review Ã— again/hard/good/easy)
- [X] T004 [P] Viáº¿t `src-tauri/src/services/cloze_parser.rs` â€” hÃ m `parse_cloze(text: &str) -> Vec<ClozeCard>`, `render_cloze_for_card(text: &str, cloze_index: u32) -> String` (hiá»ƒn thá»‹ `[...]` cho Ä‘Ãºng index, hiá»‡n text gá»‘c cho index khÃ¡c), cargo tests
- [X] T005 [P] Viáº¿t `src-tauri/src/commands/anki.rs` â€” scaffold module vá»›i táº¥t cáº£ command stubs: `get_decks`, `create_deck`, `delete_deck`, `create_note`, `update_note`, `delete_note`, `get_notes_for_deck`, `get_due_cards_for_deck`, `submit_card_rating`, `bury_card`, `suspend_card`, `flag_card`, `create_note_from_clipboard`
- [X] T006 Implement `get_decks` trong `src-tauri/src/commands/anki.rs` â€” recursive CTE query láº¥y toÃ n bá»™ cÃ¢y deck kÃ¨m stats (new/learning/review count per deck)
- [X] T007 [P] Implement `create_deck` vÃ  `delete_deck` trong `src-tauri/src/commands/anki.rs` â€” create vá»›i UNIQUE(name, parent_deck_id), delete CASCADE
- [X] T008 Implement `create_note` trong `src-tauri/src/commands/anki.rs` â€” nháº­n templateType, tá»± sinh cards: basicâ†’1 card forward, reverseâ†’1 card reverse, basic_reverseâ†’2 cards, clozeâ†’N cards tá»« cloze_parser; gá»i srs_v2 Ä‘á»ƒ tÃ­nh initial due_date
- [X] T009 [P] Implement `update_note` vÃ  `delete_note` trong `src-tauri/src/commands/anki.rs` â€” update re-generate cards náº¿u front thay Ä‘á»•i; delete CASCADE
- [X] T010 Implement `get_notes_for_deck` trong `src-tauri/src/commands/anki.rs` â€” recursive CTE khi includeSubdecks=true, filter by tag/search
- [X] T011 Implement `get_due_cards_for_deck` trong `src-tauri/src/commands/anki.rs` â€” recursive CTE láº¥y cards: state IN (new,learning,review) AND due_date<=now AND suspended=0 AND (buried_until IS NULL OR buried_until<=now); tráº£ vá» counts per state
- [X] T012 Implement `submit_card_rating` trong `src-tauri/src/commands/anki.rs` â€” gá»i srs_v2::calculate_next, update card (state, current_step, due_date, interval_days, ease_factor, review_count), insert review_logs
- [X] T013 [P] Implement `bury_card`, `suspend_card`, `flag_card` trong `src-tauri/src/commands/anki.rs`
- [X] T014 Implement `create_note_from_clipboard` trong `src-tauri/src/commands/anki.rs` â€” gá»i create_note vá»›i capturedContentId optional reference
- [X] T015 ÄÄƒng kÃ½ module `anki` vÃ  táº¥t cáº£ commands trong `src-tauri/src/lib.rs` invoke_handler; thÃªm `pub mod anki;` vÃ o `src-tauri/src/commands/mod.rs`

**Checkpoint**: `cargo check` + `cargo test` pass cho srs_v2 vÃ  cloze_parser.

---

## Phase 3: US1+US2 â€” Deck Management & Note/Card Model (P1)

**Goal**: Táº¡o Ä‘Æ°á»£c Deck phÃ¢n cáº¥p, thÃªm Note, xem Card Ä‘Æ°á»£c sinh ra Ä‘Ãºng.

**Independent Test**: Táº¡o deck "English" â†’ sub-deck "English::Vocabulary" â†’ táº¡o Note Basic+Cloze â†’ xÃ¡c nháº­n cards sinh Ä‘Ãºng sá»‘ lÆ°á»£ng vÃ  loáº¡i.

- [X] T016 ThÃªm typed wrappers trong `src/services/tauriCommands.ts` cho táº¥t cáº£ 13 anki commands (getDecks, createDeck, deleteDeck, createNote, updateNote, deleteNote, getNotesForDeck, getDueCardsForDeck, submitCardRating, buryCard, suspendCard, flagCard, createNoteFromClipboard)
- [X] T017 Viáº¿t `src/hooks/useAnki.ts` â€” `useDecks()`, `useNotesForDeck(deckId, opts)`, `useDueCards(deckId, opts)`, `useCreateDeck()` mutation, `useCreateNote()` mutation, `useDeleteNote()` mutation, `useSubmitRating()` mutation (invalidate due-cards cache on success)
- [X] T018 [P] [US1] Viáº¿t `src/components/vocabulary/DeckList.tsx` â€” danh sÃ¡ch deck phÃ¢n cáº¥p (indent theo depth), má»—i deck hiá»‡n tÃªn + badges New/Learning/Review vá»›i mÃ u tÆ°Æ¡ng á»©ng, click Ä‘á»ƒ chá»n active deck; nÃºt "New Deck" vÃ  nÃºt "New Sub-deck"
- [X] T019 [P] [US2] Viáº¿t `src/components/vocabulary/NoteEditor.tsx` â€” form vá»›i fields: Front (textarea), Back (textarea, áº©n náº¿u Cloze), Example, Tags; template selector (Basic/Basic+Reverse/Cloze); nÃºt "Cloze" highlight text Ä‘Æ°á»£c chá»n thÃ nh `{{c1::...}}`; preview sá»‘ card sáº½ sinh; Submit + Cancel
- [X] T020 [US1] Viáº¿t `src/components/vocabulary/DeckStudyView.tsx` â€” header vá»›i tÃªn deck Ä‘áº§y Ä‘á»§ (e.g. "English::Vocabulary"), 3 stat boxes (New/Learning/Review), nÃºt "Start Review" luÃ´n visible, list notes rÃºt gá»n vá»›i nÃºt "+ New Note", nÃºt Seed Test Data (10 notes máº«u)
- [X] T021 [US1] [US2] Cáº­p nháº­t `src/components/vocabulary/VocabularyTab.tsx` â€” layout: sidebar DeckList (w-64) + main DeckStudyView; state: selectedDeckId, activeView (home/note-editor/review); khi khÃ´ng cÃ³ deck nÃ o hiá»‡n onboarding

**Checkpoint**: Táº¡o deck, táº¡o note, xem card counts trong DeckStudyView.

---

## Phase 4: US3 â€” Review Session: New â†’ Learning â†’ Review (P1)

**Goal**: Review cards vá»›i Learning Steps Ä‘Ãºng flow. Again quay láº¡i ngay, Good tÄƒng interval.

**Independent Test**: Seed 5 notes â†’ Start Review â†’ 5 tháº» xuáº¥t hiá»‡n (state=new) â†’ Ä‘Ã¡nh giÃ¡ Good 3 tháº» (chuyá»ƒn learning) â†’ Again 2 tháº» (xuáº¥t hiá»‡n láº¡i trong session) â†’ session káº¿t thÃºc hiá»‡n thá»‘ng kÃª.

- [X] T022 [US3] Viáº¿t `src/components/vocabulary/CardReviewer.tsx` â€” nháº­n `cards: Card[]` snapshot lÃºc click Start Review; render CardFront (word + phiÃªn Ã¢m + TTS button), flip animation, CardBack (nghÄ©a + vÃ­ dá»¥ + notes); 4 rating buttons (Again/Hard/Good/Easy) vá»›i phÃ­m táº¯t 1-4; Space Ä‘á»ƒ flip; "More" menu: Bury / Suspend / Flag (Red/Yellow/Green); countdown "X cards left"; khi háº¿t cards gá»i onFinish
- [X] T023 [US3] Viáº¿t `src/components/vocabulary/SessionSummary.tsx` â€” modal/screen hiá»‡n sau session: tá»•ng cards reviewed, breakdown Again/Hard/Good/Easy, sá»‘ new cards graduated, cÃ¢u Ä‘á»™ng viÃªn; nÃºt "Back to Deck"
- [X] T024 [US3] Wire CardReviewer vÃ o DeckStudyView â€” khi Start Review: capture getDueCardsForDeck snapshot â†’ render CardReviewer; khi onFinish â†’ show SessionSummary â†’ invalidate useDecks cache

**Checkpoint**: Full review loop â€” Start Review â†’ flip cards â†’ rate â†’ session summary â†’ deck stats cáº­p nháº­t.

---

## Phase 5: US4 â€” Cloze Deletion (P2)

**Goal**: Táº¡o Note Cloze vá»›i `{{c1::answer}}`, card hiá»ƒn thá»‹ Ä‘Ãºng `[...]`, nhiá»u cloze sinh nhiá»u cards.

**Independent Test**: Táº¡o note Cloze "Tokyo is the {{c1::capital}} of {{c2::Japan}}" â†’ 2 cards sinh ra â†’ Card 1 hiá»‡n "Tokyo is the [...] of Japan" â†’ Card 2 hiá»‡n "Tokyo is the capital of [...]".

- [X] T025 [US4] NÃ¢ng cáº¥p `src/components/vocabulary/NoteEditor.tsx` â€” pháº§n Cloze: textarea vá»›i syntax highlighting `{{c1::...}}` (bold + mÃ u violet), nÃºt "Wrap as Cloze" bÃ´i Ä‘en text, preview real-time sá»‘ cards sáº½ sinh, validation message náº¿u khÃ´ng cÃ³ cloze nÃ o
- [X] T026 [US4] NÃ¢ng cáº¥p `src/components/vocabulary/CardReviewer.tsx` â€” render Cloze card front: thay `{{cN::text}}` Ä‘Ãºng index báº±ng styled `[...]`, hiá»‡n text gá»‘c cho cÃ¡c cloze khÃ¡c; back hiá»‡n full text vá»›i cloze answer Ä‘Æ°á»£c highlight
- [X] T027 [P] [US4] Viáº¿t `src/components/vocabulary/ClozeHighlighter.tsx` â€” utility component render text vá»›i cloze syntax highlighted: `{{c1::word}}` â†’ colored pill "word" vá»›i badge "c1"

**Checkpoint**: Táº¡o Note Cloze 2 groups â†’ 2 cards â†’ flip tá»«ng card â†’ Ä‘Ã¡p Ã¡n Ä‘Ãºng hiá»‡n Ä‘Ãºng chá»—.

---

## Phase 6: US5 â€” Tags, Bury, Suspend, Flag (P3)

**Goal**: Gáº¯n tag vÃ o Note, lá»c theo tag. Bury/Suspend/Flag card trong review.

**Independent Test**: Táº¡o 5 notes vá»›i tag "IELTS", 3 notes tag "TOEIC" â†’ lá»c "IELTS" â†’ 5 notes. Trong review â†’ Bury card â†’ khÃ´ng hiá»‡n láº¡i hÃ´m nay. Suspend card â†’ khÃ´ng bao giá» hiá»‡n láº¡i.

- [X] T028 [US5] ThÃªm tag filter vÃ o `src/components/vocabulary/DeckStudyView.tsx` â€” input tÃ¬m kiáº¿m + dropdown filter tag (aggregated tá»« táº¥t cáº£ notes trong deck), filter realtime
- [X] T029 [P] [US5] Verify `src/components/vocabulary/CardReviewer.tsx` â€” "More" menu actions: Bury gá»i buryCard + skip card, Suspend gá»i suspendCard + skip card, Flag gá»i flagCard + update local state; hiá»ƒn thá»‹ flag indicator trÃªn card back
- [X] T030 [P] [US5] Hiá»ƒn thá»‹ tag chips trong `src/components/vocabulary/DeckStudyView.tsx` note list â€” má»—i note card hiá»‡n tags vá»›i mÃ u sáº¯c

**Checkpoint**: Tag filter hoáº¡t Ä‘á»™ng. Bury/Suspend/Flag trong review thay Ä‘á»•i Ä‘Ãºng tráº¡ng thÃ¡i.

---

## Phase 7: US6 â€” Clipboard Integration (P1)

**Goal**: Tá»« Ctrl+K popup, chá»n Deck Ä‘Ã­ch + template + táº¡o Cloze card ngay trong popup.

**Independent Test**: Copy cÃ¢u "The Eiffel Tower was built in {{c1::1889}}" â†’ Ctrl+K â†’ Add to Vocab â†’ chá»n deck "English" â†’ template Cloze â†’ Save â†’ vÃ o Vocab tab â†’ deck English â†’ xÃ¡c nháº­n note + 1 card Cloze.

- [X] T031 [US6] Viáº¿t `src/components/popup/AddToVocabSection.tsx` â€” component standalone: deck dropdown (gá»i getDecks Ä‘á»ƒ load), template selector (Basic / Cloze), field Front (pre-filled vá»›i clipboard content), field Back (chá»‰ hiá»‡n khi Basic), Cloze editor khi template=Cloze (textarea + nÃºt "Wrap Cloze" cho selected text), nÃºt "Create New Deck" inline; loading + error states
- [X] T032 [US6] Cáº­p nháº­t `src/components/popup/ClipboardPopup.tsx` â€” swap pháº§n Add to Vocab cÅ© (addVocabularyEntry call) báº±ng `<AddToVocabSection>` component; truyá»n content lÃ m initial front value; khi save gá»i createNoteFromClipboard

**Checkpoint**: Ctrl+K â†’ báº­t Add to Vocab â†’ chá»n deck â†’ Save â†’ note + cards xuáº¥t hiá»‡n trong Vocab tab.

---

## Phase 8: Polish & Cross-Cutting

**Purpose**: UX hoÃ n thiá»‡n, TabBar badge, seed data, backward compat.

- [X] T033 [P] Cáº­p nháº­t `src/components/shared/TabBar.tsx` â€” badge sá»‘ trÃªn tab Vocabulary = tá»•ng due cards (gá»i getDueCardsForDeck cho táº¥t cáº£ decks, sum up); refresh má»—i 60 giÃ¢y
- [X] T034 [P] ThÃªm seed function vÃ o `src/components/vocabulary/DeckStudyView.tsx` â€” nÃºt "ðŸ§ª Seed" táº¡o deck "English::Test" vá»›i 10 notes máº«u cáº£ Basic láº«n Cloze (thay tháº¿ SEED_WORDS cÅ© trong VocabularyTab)
- [X] T035 Kiá»ƒm tra backward compat â€” cháº¡y app vá»›i DB cÅ© (cÃ³ vocabulary_entries): xÃ¡c nháº­n migration 002 cháº¡y Ä‘Ãºng, deck "Default" xuáº¥t hiá»‡n vá»›i Ä‘Ãºng sá»‘ notes, cÃ¡c cards cÅ© cÃ³ state vÃ  due_date Ä‘Ãºng

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Báº¯t Ä‘áº§u ngay
- **Phase 2 (Foundational)**: Sau Phase 1 â€” blocks táº¥t cáº£
- **Phase 3 (US1+US2)**: Sau Phase 2
- **Phase 4 (US3 Review)**: Sau Phase 3
- **Phase 5 (US4 Cloze)**: Sau Phase 3 (frontend cáº§n NoteEditor Ä‘Ã£ cÃ³)
- **Phase 6 (US5 Tags/Bury)**: Sau Phase 3+4
- **Phase 7 (US6 Clipboard)**: Sau Phase 3 (cáº§n deck list)
- **Phase 8 (Polish)**: Sau táº¥t cáº£

### Parallel Opportunities per Phase

```
Phase 2 Parallel:
  T003 â†’ srs_v2.rs       (service)
  T004 â†’ cloze_parser.rs (service)
  T005 â†’ anki.rs stubs   (commands)

Phase 3 Parallel:
  T018 â†’ DeckList.tsx    (UI)
  T019 â†’ NoteEditor.tsx  (UI)
```

---

## Implementation Strategy

### MVP (US1 + US2 + US3 only â€” Phases 1-4)

1. Phase 1: Migration
2. Phase 2: Rust backend (T003â€“T015)
3. Phase 3: DeckList + NoteEditor + DeckStudyView
4. Phase 4: CardReviewer + SessionSummary
5. **STOP & VALIDATE**: Deck â†’ Note â†’ Review loop hoÃ n chá»‰nh
6. Demo: Táº¡o deck â†’ thÃªm note â†’ Start Review â†’ Ä‘Ã¡nh giÃ¡ â†’ stats

### Full Delivery Order

1. MVP (Phase 1-4)
2. Phase 5 (Cloze) â†’ powerful card type
3. Phase 7 (Clipboard) â†’ seamless capture â†’ learn flow
4. Phase 6 (Tags/Bury) â†’ organization
5. Phase 8 (Polish)

---

## Task Summary

| Phase | Story | Tasks | Parallel |
|-------|-------|-------|---------|
| Phase 1: Setup | â€” | T001â€“T002 (2) | â€” |
| Phase 2: Foundational | â€” | T003â€“T015 (13) | T004, T005, T007, T009, T013 |
| Phase 3: US1+US2 | P1 | T016â€“T021 (6) | T018, T019 |
| Phase 4: US3 Review | P1 | T022â€“T024 (3) | â€” |
| Phase 5: US4 Cloze | P2 | T025â€“T027 (3) | T027 |
| Phase 6: US5 Tags/Bury | P3 | T028â€“T030 (3) | T029, T030 |
| Phase 7: US6 Clipboard | P1 | T031â€“T032 (2) | â€” |
| Phase 8: Polish | â€” | T033â€“T035 (3) | T033, T034 |
| **Total** | | **35 tasks** | **11 parallelizable** |

---

## Notes

- T003 (srs_v2) vÃ  T004 (cloze_parser) pháº£i cÃ³ cargo tests tÃ­ch há»£p trong task
- T008 (create_note) lÃ  task phá»©c táº¡p nháº¥t â€” sinh cards tá»« multiple templates
- US3 vÃ  US4 frontend Ä‘á»u phá»¥ thuá»™c NoteEditor (T019) nhÆ°ng cÃ³ thá»ƒ lÃ m song song sau khi T019 xong
- Backward compat (T035) lÃ  verification task, khÃ´ng generate code má»›i
- Seed data (T034) thay tháº¿ SEED_WORDS cÅ© trong VocabularyTab.tsx

