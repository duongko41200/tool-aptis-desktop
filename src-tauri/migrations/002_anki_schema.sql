-- =====================================================================
-- Migration 002: Anki-Style Deck / Note / Card schema (DDL only)
-- Data migration is handled at app startup via Rust code
-- =====================================================================

CREATE TABLE IF NOT EXISTS decks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_deck_id INTEGER REFERENCES decks(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    UNIQUE(name, parent_deck_id)
);
CREATE INDEX IF NOT EXISTS idx_decks_parent ON decks(parent_deck_id);

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

CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    card_type TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'new' CHECK(state IN ('new','learning','review')),
    current_step INTEGER NOT NULL DEFAULT 0,
    due_date TEXT NOT NULL,
    interval_days REAL NOT NULL DEFAULT 0,
    ease_factor REAL NOT NULL DEFAULT 2.5,
    review_count INTEGER NOT NULL DEFAULT 0,
    suspended INTEGER NOT NULL DEFAULT 0,
    buried_until TEXT,
    flag_color TEXT CHECK(flag_color IN ('red','yellow','green') OR flag_color IS NULL),
    created_at TEXT NOT NULL,
    UNIQUE(note_id, card_type)
);
CREATE INDEX IF NOT EXISTS idx_cards_due ON cards(due_date);
CREATE INDEX IF NOT EXISTS idx_cards_note ON cards(note_id);

CREATE TABLE IF NOT EXISTS review_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL REFERENCES cards(id),
    rating TEXT NOT NULL CHECK(rating IN ('again','hard','good','easy')),
    state_before TEXT NOT NULL,
    interval_before REAL NOT NULL,
    interval_after REAL NOT NULL,
    reviewed_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_review_logs_card ON review_logs(card_id);
