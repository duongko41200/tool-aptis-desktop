-- VideoSession
CREATE TABLE IF NOT EXISTS video_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    youtube_url TEXT NOT NULL,
    title TEXT,
    thumbnail_url TEXT,
    duration_seconds INTEGER,
    repeat_start_ms INTEGER,
    repeat_end_ms INTEGER,
    loop_mode INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- SubtitleEntry
CREATE TABLE IF NOT EXISTS subtitle_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_session_id INTEGER NOT NULL REFERENCES video_sessions(id) ON DELETE CASCADE,
    start_ms INTEGER NOT NULL,
    end_ms INTEGER NOT NULL,
    text TEXT NOT NULL,
    original_text TEXT,
    sequence INTEGER NOT NULL
);

-- TeleprompterSession
CREATE TABLE IF NOT EXISTS teleprompter_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_text TEXT NOT NULL,
    scroll_speed REAL NOT NULL DEFAULT 1.0,
    font_size INTEGER NOT NULL DEFAULT 32,
    background_color TEXT NOT NULL DEFAULT '#000000',
    text_color TEXT NOT NULL DEFAULT '#FFFFFF',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Recording
CREATE TABLE IF NOT EXISTS recordings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_type TEXT NOT NULL CHECK(session_type IN ('shadowing', 'teleprompter')),
    session_id INTEGER NOT NULL,
    audio_path TEXT NOT NULL,
    duration_ms INTEGER,
    transcription TEXT,
    accuracy_score REAL,
    missed_word_pct REAL,
    mispronounced_words TEXT,
    reading_speed_wpm REAL,
    created_at TEXT NOT NULL
);

-- WritingSubmission
CREATE TABLE IF NOT EXISTS writing_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    evaluation_mode TEXT NOT NULL CHECK(evaluation_mode IN ('ielts', 'toeic', 'aptis', 'general')),
    overall_score REAL,
    grammar_score REAL,
    vocabulary_score REAL,
    coherence_score REAL,
    suggestions TEXT,
    grammar_corrections TEXT,
    better_sentences TEXT,
    ai_raw_response TEXT,
    word_count INTEGER,
    created_at TEXT NOT NULL
);

-- VocabularyEntry
CREATE TABLE IF NOT EXISTS vocabulary_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT NOT NULL UNIQUE,
    phonetics TEXT,
    meaning TEXT NOT NULL,
    example TEXT,
    personal_notes TEXT,
    image_path TEXT,
    tags TEXT,
    interval_days REAL NOT NULL DEFAULT 0,
    ease_factor REAL NOT NULL DEFAULT 2.5,
    due_date TEXT NOT NULL,
    review_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_vocab_due_date ON vocabulary_entries(due_date);

-- ReviewSession
CREATE TABLE IF NOT EXISTS review_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    cards_reviewed INTEGER NOT NULL DEFAULT 0,
    cards_again INTEGER NOT NULL DEFAULT 0,
    cards_hard INTEGER NOT NULL DEFAULT 0,
    cards_good INTEGER NOT NULL DEFAULT 0,
    cards_easy INTEGER NOT NULL DEFAULT 0
);

-- ReviewCard
CREATE TABLE IF NOT EXISTS review_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    review_session_id INTEGER NOT NULL REFERENCES review_sessions(id),
    vocabulary_entry_id INTEGER NOT NULL REFERENCES vocabulary_entries(id),
    rating TEXT NOT NULL CHECK(rating IN ('again', 'hard', 'good', 'easy')),
    interval_before REAL NOT NULL,
    interval_after REAL NOT NULL,
    reviewed_at TEXT NOT NULL
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- CapturedContent
CREATE TABLE IF NOT EXISTS captured_content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    folder TEXT,
    personal_notes TEXT,
    ai_summary TEXT,
    ai_vocabulary TEXT,
    ai_collocations TEXT,
    ai_idioms TEXT,
    ai_processed INTEGER NOT NULL DEFAULT 0,
    embedding BLOB,
    created_at TEXT NOT NULL
);

-- CapturedTag
CREATE TABLE IF NOT EXISTS captured_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    captured_content_id INTEGER NOT NULL REFERENCES captured_content(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    UNIQUE(captured_content_id, tag)
);

-- FTS5 Virtual Table for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS captured_content_fts USING fts5(
    content,
    personal_notes,
    ai_summary,
    ai_vocabulary,
    content='captured_content',
    content_rowid='id'
);

-- FTS5 triggers to keep in sync
CREATE TRIGGER IF NOT EXISTS cc_fts_insert AFTER INSERT ON captured_content BEGIN
    INSERT INTO captured_content_fts(rowid, content, personal_notes, ai_summary, ai_vocabulary)
    VALUES (new.id, new.content, new.personal_notes, new.ai_summary, new.ai_vocabulary);
END;

CREATE TRIGGER IF NOT EXISTS cc_fts_update AFTER UPDATE ON captured_content BEGIN
    INSERT INTO captured_content_fts(captured_content_fts, rowid, content, personal_notes, ai_summary, ai_vocabulary)
    VALUES ('delete', old.id, old.content, old.personal_notes, old.ai_summary, old.ai_vocabulary);
    INSERT INTO captured_content_fts(rowid, content, personal_notes, ai_summary, ai_vocabulary)
    VALUES (new.id, new.content, new.personal_notes, new.ai_summary, new.ai_vocabulary);
END;

CREATE TRIGGER IF NOT EXISTS cc_fts_delete AFTER DELETE ON captured_content BEGIN
    INSERT INTO captured_content_fts(captured_content_fts, rowid, content, personal_notes, ai_summary, ai_vocabulary)
    VALUES ('delete', old.id, old.content, old.personal_notes, old.ai_summary, old.ai_vocabulary);
END;
