# Research: Anki-Style Vocabulary System

**Branch**: `003-anki-vocab-system` | **Date**: 2026-06-01

---

## Decision 1: Learning Steps (New → Learning → Review)

**Decision**: Thêm `state` (new/learning/review) + `current_learning_step` vào Card. Learning steps mặc định: `[10m, 1d, 3d]`. Sau khi qua hết steps → Graduate vào Review queue với SM-2.

**Mechanics**:
```
New card:
  Again → Step 1 (due: +10 min)
  Good  → Step 2 (due: +1 day)
  Easy  → Graduate to Review (due: +4 days)

Learning card (bước hiện tại = step_index):
  Again → Reset về Step 1
  Good  → Advance to next step; nếu hết steps → Graduate
  Easy  → Graduate ngay

Review card:
  → SM-2 hiện tại (interval × ease_factor)
```

**Rationale**: Pure SM-2 không có Learning phase gây ra việc thẻ mới bị lịch vào nhiều ngày sau dù chưa thực sự học. Learning steps tạo buffer học trước khi vào long-term memory queue.

**Implementation**: Nâng cấp `srs.rs` — thêm `calculate_next` nhận vào state + step_index + rating → trả về (new_state, new_step_index, due_offset_minutes).

---

## Decision 2: Cloze Card Parsing

**Decision**: Parse `{{cN::answer}}` bằng regex `\{\{(c\d+)::(.*?)\}\}`. Sinh 1 Card cho mỗi cloze group. Store `cloze_index` trên Card.

**Render logic**:
- Card c1: thay `{{c1::X}}` → `[...]`, giữ nguyên `{{c2::Y}}` → hiện `Y`
- Validation: fail nếu không có cloze nào

**Rationale**: Standard Anki syntax, dễ parse, tương thích với nội dung Anki có sẵn nếu user muốn import.

---

## Decision 3: Deck Hierarchy — Recursive CTE

**Decision**: Self-referencing table `decks(id, parent_deck_id)`. Query thẻ của deck + all subdecks dùng **Recursive CTE**:

```sql
WITH RECURSIVE deck_tree AS (
  SELECT id FROM decks WHERE id = ?1
  UNION ALL
  SELECT d.id FROM decks d
  INNER JOIN deck_tree dt ON d.parent_deck_id = dt.id
)
SELECT cards.* FROM cards
JOIN notes ON cards.note_id = notes.id
WHERE notes.deck_id IN (SELECT id FROM deck_tree);
```

**Rationale**: SQLite hỗ trợ recursive CTE từ version 3.8.3. Không cần Closure Table hay Nested Sets — simpler schema, đủ cho depth ≤ 3.

**Performance**: Index trên `decks(parent_deck_id)` và `notes(deck_id)` → fast traversal.

---

## Decision 4: Migration từ vocabulary_entries

**Decision**: Migration SQL tạo deck mặc định "Default", chuyển mỗi `vocabulary_entry` → 1 `note` (front=word, back=meaning) + 1 `card` (state=new hoặc review tùy interval_days).

```sql
-- Migration 002
INSERT INTO decks (id, name, parent_deck_id, created_at)
VALUES (1, 'Default', NULL, datetime('now'));

INSERT INTO notes (deck_id, template_type, front, back, example, tags, created_at, updated_at)
SELECT 1, 'basic', word, meaning, example, tags, created_at, updated_at
FROM vocabulary_entries;

INSERT INTO cards (note_id, card_type, state, current_step, due_date, interval_days, ease_factor, suspended, created_at)
SELECT n.id, 'forward',
  CASE WHEN ve.interval_days = 0 THEN 'new' ELSE 'review' END,
  0, ve.due_date, ve.interval_days, ve.ease_factor, 0, ve.created_at
FROM notes n
JOIN vocabulary_entries ve ON n.front = ve.word;
```

**Rationale**: Preserve existing SRS progress. Không xóa vocabulary_entries ngay (giữ để backward compat trong transition).

---

## Decision 5: Note/Card Split vs giữ hiện tại

**Decision**: Thêm tables mới (`decks`, `notes`, `cards`, `review_logs`). Giữ `vocabulary_entries` như bảng cũ cho tương thích, deprecated.

**Rationale**: Non-breaking change. Existing code vẫn chạy. Feature 003 build trên model mới.

---

## Decision 6: Card template types

**Decision**: Hỗ trợ 3 template: `basic` (front→back), `reverse` (back→front), `cloze`. Basic+Reverse tạo 2 cards từ 1 note.

**Rationale**: 80% use case. Image Occlusion (v2) không block v1.
