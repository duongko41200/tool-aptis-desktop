# Data Model: Anki-Style Vocabulary System

**Branch**: `003-anki-vocab-system` | **Date**: 2026-06-01

---

## Entity Relationship

```
Deck ──< Deck (self-reference parent_deck_id)
Deck ──< Note
Note ──< Card
Card ──< ReviewLog
Note has tags (comma-separated)
Card has flag, suspended, buried_until
```

---

## New Tables (Migration 002)

### `decks`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `name` | TEXT | NOT NULL | Tên deck (e.g. "English") |
| `parent_deck_id` | INTEGER | NULLABLE, FK → decks(id) | NULL = root deck |
| `created_at` | TEXT | NOT NULL | ISO 8601 |

**Index**: `parent_deck_id`
**Constraint**: UNIQUE(name, parent_deck_id) — tên deck không trùng cùng cấp

---

### `notes`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `deck_id` | INTEGER | NOT NULL, FK → decks(id) | |
| `template_type` | TEXT | NOT NULL | `'basic'`, `'reverse'`, `'basic_reverse'`, `'cloze'` |
| `front` | TEXT | NOT NULL | Mặt trước / câu Cloze |
| `back` | TEXT | NULLABLE | Mặt sau (NULL cho Cloze) |
| `example` | TEXT | NULLABLE | Câu ví dụ |
| `personal_notes` | TEXT | NULLABLE | Ghi chú riêng |
| `tags` | TEXT | NULLABLE | Comma-separated tags |
| `created_at` | TEXT | NOT NULL | |
| `updated_at` | TEXT | NOT NULL | |

---

### `cards`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `note_id` | INTEGER | NOT NULL, FK → notes(id) ON DELETE CASCADE | |
| `card_type` | TEXT | NOT NULL | `'forward'`, `'reverse'`, `'cloze_1'`, `'cloze_2'`, ... |
| `state` | TEXT | NOT NULL DEFAULT `'new'` | `'new'`, `'learning'`, `'review'` |
| `current_step` | INTEGER | NOT NULL DEFAULT 0 | Index trong learning steps array |
| `due_date` | TEXT | NOT NULL | ISO 8601 datetime |
| `interval_days` | REAL | NOT NULL DEFAULT 0 | Interval hiện tại (ngày) |
| `ease_factor` | REAL | NOT NULL DEFAULT 2.5 | SM-2 ease factor |
| `review_count` | INTEGER | NOT NULL DEFAULT 0 | Tổng số lần review |
| `suspended` | INTEGER | NOT NULL DEFAULT 0 | 0=active, 1=suspended vô thời hạn |
| `buried_until` | TEXT | NULLABLE | NULL=không bury; ISO datetime=bury đến khi nào |
| `flag_color` | TEXT | NULLABLE | `'red'`, `'yellow'`, `'green'`, NULL |
| `created_at` | TEXT | NOT NULL | |

**Index**: `due_date`, `(note_id, card_type)` UNIQUE

---

### `review_logs`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `card_id` | INTEGER | NOT NULL, FK → cards(id) | |
| `rating` | TEXT | NOT NULL | `'again'`, `'hard'`, `'good'`, `'easy'` |
| `state_before` | TEXT | NOT NULL | State trước khi review |
| `interval_before` | REAL | NOT NULL | Interval trước |
| `interval_after` | REAL | NOT NULL | Interval sau |
| `reviewed_at` | TEXT | NOT NULL | ISO 8601 |

---

## Learning Steps & State Machine

**Learning steps mặc định**: `[10, 1440, 4320]` phút (10min, 1day, 3days)

```
State: new
  Again → state=learning, step=0, due=+10min
  Hard  → state=learning, step=0, due=+10min
  Good  → state=learning, step=1, due=+1day
  Easy  → state=review,   step=0, due=+4days, interval=4

State: learning (step=N)
  Again → state=learning, step=0, due=+10min
  Hard  → state=learning, step=max(0,N-1), due=+steps[N-1]
  Good  → nếu N+1 < len(steps): step=N+1, due=+steps[N+1]
           nếu N+1 >= len(steps): state=review, interval=1
  Easy  → state=review, interval=graduating_interval(4)

State: review (SM-2)
  Again → state=learning, step=0, due=+10min, interval=0, ease-0.20
  Hard  → interval×1.2, ease-0.15
  Good  → interval×ease
  Easy  → interval×ease×1.3, ease+0.15
```

---

## Migration 002 — SQL

```sql
-- Tạo bảng mới
CREATE TABLE IF NOT EXISTS decks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_deck_id INTEGER REFERENCES decks(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    UNIQUE(name, parent_deck_id)
);

CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    template_type TEXT NOT NULL CHECK(template_type IN ('basic','reverse','basic_reverse','cloze')),
    front TEXT NOT NULL,
    back TEXT,
    example TEXT,
    personal_notes TEXT,
    tags TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notes_deck_id ON notes(deck_id);
CREATE INDEX IF NOT EXISTS idx_notes_tags ON notes(tags);

CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    card_type TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'new',
    current_step INTEGER NOT NULL DEFAULT 0,
    due_date TEXT NOT NULL,
    interval_days REAL NOT NULL DEFAULT 0,
    ease_factor REAL NOT NULL DEFAULT 2.5,
    review_count INTEGER NOT NULL DEFAULT 0,
    suspended INTEGER NOT NULL DEFAULT 0,
    buried_until TEXT,
    flag_color TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(note_id, card_type)
);
CREATE INDEX IF NOT EXISTS idx_cards_due_date ON cards(due_date);
CREATE INDEX IF NOT EXISTS idx_cards_note_id ON cards(note_id);

CREATE TABLE IF NOT EXISTS review_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL REFERENCES cards(id),
    rating TEXT NOT NULL CHECK(rating IN ('again','hard','good','easy')),
    state_before TEXT NOT NULL,
    interval_before REAL NOT NULL,
    interval_after REAL NOT NULL,
    reviewed_at TEXT NOT NULL
);

-- Deck mặc định cho migration dữ liệu cũ
INSERT OR IGNORE INTO decks (id, name, parent_deck_id, created_at)
VALUES (1, 'Default', NULL, datetime('now'));

-- Migrate vocabulary_entries → notes + cards
INSERT OR IGNORE INTO notes (deck_id, template_type, front, back, example, tags, created_at, updated_at)
SELECT 1, 'basic', word, meaning, example, tags, created_at, updated_at
FROM vocabulary_entries;

INSERT OR IGNORE INTO cards (note_id, card_type, state, current_step, due_date, interval_days, ease_factor, review_count, suspended, created_at)
SELECT n.id, 'forward',
    CASE WHEN ve.interval_days = 0 THEN 'new' ELSE 'review' END,
    0, ve.due_date, ve.interval_days, ve.ease_factor, ve.review_count, 0, ve.created_at
FROM notes n
JOIN vocabulary_entries ve ON n.front = ve.word
WHERE n.deck_id = 1;
```

---

## TypeScript Types

```typescript
interface Deck {
  id: number;
  name: string;
  parent_deck_id: number | null;
  created_at: string;
  // computed:
  full_name?: string;       // "English::Vocabulary"
  new_count?: number;
  learning_count?: number;
  review_count?: number;
}

interface Note {
  id: number;
  deck_id: number;
  template_type: 'basic' | 'reverse' | 'basic_reverse' | 'cloze';
  front: string;
  back: string | null;
  example: string | null;
  personal_notes: string | null;
  tags: string | null;
  created_at: string;
  updated_at: string;
}

interface Card {
  id: number;
  note_id: number;
  card_type: string;
  state: 'new' | 'learning' | 'review';
  current_step: number;
  due_date: string;
  interval_days: number;
  ease_factor: number;
  review_count: number;
  suspended: number;
  buried_until: string | null;
  flag_color: 'red' | 'yellow' | 'green' | null;
  created_at: string;
  // joined:
  note?: Note;
}

interface ReviewRatingResult {
  next_due_date: string;
  new_interval_days: number;
  new_state: 'new' | 'learning' | 'review';
}

interface DeckStats {
  deck_id: number;
  new_count: number;
  learning_count: number;
  review_count: number;
}
```
