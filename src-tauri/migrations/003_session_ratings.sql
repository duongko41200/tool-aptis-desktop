-- ── Session ratings per note ────────────────────────────────────
-- Stores the last rating a user gave to each note in a session.
-- Used to persist per-word level badges and chart data across restarts.
CREATE TABLE IF NOT EXISTS note_session_ratings (
    note_id    INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    deck_id    INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    last_rating TEXT NOT NULL CHECK(last_rating IN ('again','hard','good','easy')),
    updated_at  TEXT NOT NULL,
    PRIMARY KEY (note_id, deck_id)
);
CREATE INDEX IF NOT EXISTS idx_nsr_deck ON note_session_ratings(deck_id);

-- ── Aggregate session stats per deck ────────────────────────────
-- Stores the totals (again/hard/good/easy) from the last review session.
CREATE TABLE IF NOT EXISTS deck_session_stats (
    deck_id      INTEGER PRIMARY KEY REFERENCES decks(id) ON DELETE CASCADE,
    again_count  INTEGER NOT NULL DEFAULT 0,
    hard_count   INTEGER NOT NULL DEFAULT 0,
    good_count   INTEGER NOT NULL DEFAULT 0,
    easy_count   INTEGER NOT NULL DEFAULT 0,
    last_session_at TEXT NOT NULL
);
