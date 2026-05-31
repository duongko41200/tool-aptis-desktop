# Data Model: English Learning Desktop Application

**Branch**: `001-english-learning-app` | **Date**: 2026-05-31

---

## Entity Relationship Overview

```
VideoSession ──< SubtitleEntry
VideoSession ──< Recording
TeleprompterSession ──< Recording
WritingSubmission (standalone)
VocabularyEntry ──< ReviewSession (via ReviewCard)
VocabularyEntry ──< Flashcard
CapturedContent ──< CapturedTag
CapturedContent ──> Flashcard (auto-generated)
```

---

## Entities

### 1. VideoSession

Represents a Shadowing Practice session tied to a YouTube video.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `youtube_url` | TEXT | NOT NULL | Full YouTube URL |
| `title` | TEXT | NULLABLE | Auto-fetched from YouTube oEmbed API |
| `thumbnail_url` | TEXT | NULLABLE | |
| `duration_seconds` | INTEGER | NULLABLE | Total video duration |
| `repeat_start_ms` | INTEGER | NULLABLE | Repeat Range start (milliseconds) |
| `repeat_end_ms` | INTEGER | NULLABLE | Repeat Range end (milliseconds) |
| `loop_mode` | INTEGER | NOT NULL DEFAULT 0 | Boolean: 0=off, 1=on |
| `created_at` | TEXT | NOT NULL | ISO 8601 timestamp |
| `updated_at` | TEXT | NOT NULL | ISO 8601 timestamp |

---

### 2. SubtitleEntry

A single subtitle cue associated with a VideoSession.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `video_session_id` | INTEGER | NOT NULL, FK → VideoSession | |
| `start_ms` | INTEGER | NOT NULL | Cue start time in milliseconds |
| `end_ms` | INTEGER | NOT NULL | Cue end time in milliseconds |
| `text` | TEXT | NOT NULL | Subtitle text (editable by user) |
| `original_text` | TEXT | NULLABLE | Original imported text before edits |
| `sequence` | INTEGER | NOT NULL | Display order within the session |

---

### 3. Recording

An audio recording from either a Shadowing or Teleprompter session.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `session_type` | TEXT | NOT NULL | `'shadowing'` or `'teleprompter'` |
| `session_id` | INTEGER | NOT NULL | FK → VideoSession or TeleprompterSession |
| `audio_path` | TEXT | NOT NULL | Relative path to audio file in app data dir |
| `duration_ms` | INTEGER | NULLABLE | Recording duration |
| `transcription` | TEXT | NULLABLE | STT output text |
| `accuracy_score` | REAL | NULLABLE | 0.0–100.0 |
| `missed_word_pct` | REAL | NULLABLE | Percentage of words skipped |
| `mispronounced_words` | TEXT | NULLABLE | JSON array of words |
| `reading_speed_wpm` | REAL | NULLABLE | Words per minute (Teleprompter only) |
| `created_at` | TEXT | NOT NULL | ISO 8601 timestamp |

---

### 4. TeleprompterSession

A Teleprompter Reading Practice session with its source text and display config.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `source_text` | TEXT | NOT NULL | User-entered or pasted text |
| `scroll_speed` | REAL | NOT NULL DEFAULT 1.0 | Lines per second multiplier |
| `font_size` | INTEGER | NOT NULL DEFAULT 32 | Pixels |
| `background_color` | TEXT | NOT NULL DEFAULT '#000000'` | Hex color |
| `text_color` | TEXT | NOT NULL DEFAULT '#FFFFFF'` | Hex color |
| `created_at` | TEXT | NOT NULL | ISO 8601 timestamp |
| `updated_at` | TEXT | NOT NULL | ISO 8601 timestamp |

---

### 5. WritingSubmission

A user writing submission and its AI evaluation result.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `content` | TEXT | NOT NULL | User's essay or passage |
| `evaluation_mode` | TEXT | NOT NULL | `'ielts'`, `'toeic'`, `'aptis'`, `'general'` |
| `overall_score` | REAL | NULLABLE | 0.0–9.0 (IELTS) or 0–100 |
| `grammar_score` | REAL | NULLABLE | |
| `vocabulary_score` | REAL | NULLABLE | |
| `coherence_score` | REAL | NULLABLE | |
| `suggestions` | TEXT | NULLABLE | JSON array of suggestion strings |
| `grammar_corrections` | TEXT | NULLABLE | JSON array of `{original, corrected}` objects |
| `better_sentences` | TEXT | NULLABLE | JSON array of `{original, improved}` objects |
| `ai_raw_response` | TEXT | NULLABLE | Full Gemini response (for debugging) |
| `word_count` | INTEGER | NULLABLE | Computed on submission |
| `created_at` | TEXT | NOT NULL | ISO 8601 timestamp |

---

### 6. VocabularyEntry

A single vocabulary item with SRS scheduling metadata.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `word` | TEXT | NOT NULL | The target word or phrase |
| `phonetics` | TEXT | NULLABLE | IPA transcription |
| `meaning` | TEXT | NOT NULL | Definition in user's language |
| `example` | TEXT | NULLABLE | Example sentence |
| `personal_notes` | TEXT | NULLABLE | User's private notes |
| `image_path` | TEXT | NULLABLE | Optional illustration image path |
| `tags` | TEXT | NULLABLE | Comma-separated tags |
| `interval_days` | REAL | NOT NULL DEFAULT 0 | Current SRS interval in days |
| `ease_factor` | REAL | NOT NULL DEFAULT 2.5 | SM-2 ease factor |
| `due_date` | TEXT | NOT NULL | ISO 8601 — next review date |
| `review_count` | INTEGER | NOT NULL DEFAULT 0 | Total number of reviews |
| `created_at` | TEXT | NOT NULL | ISO 8601 timestamp |
| `updated_at` | TEXT | NOT NULL | ISO 8601 timestamp |

**Indexes**: `due_date` (for fetching cards due today), `word` UNIQUE (prevent duplicates).

---

### 7. ReviewSession

A timed study session grouping multiple flashcard reviews.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `started_at` | TEXT | NOT NULL | ISO 8601 timestamp |
| `ended_at` | TEXT | NULLABLE | NULL if session is in progress |
| `cards_reviewed` | INTEGER | NOT NULL DEFAULT 0 | |
| `cards_again` | INTEGER | NOT NULL DEFAULT 0 | |
| `cards_hard` | INTEGER | NOT NULL DEFAULT 0 | |
| `cards_good` | INTEGER | NOT NULL DEFAULT 0 | |
| `cards_easy` | INTEGER | NOT NULL DEFAULT 0 | |

---

### 8. ReviewCard

Individual flashcard rating event within a ReviewSession.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `review_session_id` | INTEGER | NOT NULL, FK → ReviewSession | |
| `vocabulary_entry_id` | INTEGER | NOT NULL, FK → VocabularyEntry | |
| `rating` | TEXT | NOT NULL | `'again'`, `'hard'`, `'good'`, `'easy'` |
| `interval_before` | REAL | NOT NULL | Interval before this review |
| `interval_after` | REAL | NOT NULL | Interval scheduled after this review |
| `reviewed_at` | TEXT | NOT NULL | ISO 8601 timestamp |

---

### 9. CapturedContent

A clipboard-saved knowledge item.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `content` | TEXT | NOT NULL | Captured plain text |
| `category` | TEXT | NOT NULL DEFAULT 'general'` | `'vocabulary'`, `'speaking'`, `'writing'`, `'grammar'`, `'reading'`, `'general'` |
| `folder` | TEXT | NULLABLE | User-defined folder name |
| `personal_notes` | TEXT | NULLABLE | User's notes on this item |
| `ai_summary` | TEXT | NULLABLE | AI-generated summary |
| `ai_vocabulary` | TEXT | NULLABLE | JSON array of extracted vocabulary words |
| `ai_collocations` | TEXT | NULLABLE | JSON array of collocation strings |
| `ai_idioms` | TEXT | NULLABLE | JSON array of idiom strings |
| `ai_processed` | INTEGER | NOT NULL DEFAULT 0 | Boolean: 1 = AI processing completed |
| `embedding` | BLOB | NULLABLE | Float32 vector for semantic search |
| `created_at` | TEXT | NOT NULL | ISO 8601 timestamp |

**FTS5 virtual table**: `captured_content_fts` mirroring `content`, `personal_notes`, `ai_summary`, `ai_vocabulary`.

---

### 10. CapturedTag

Many-to-many tags for CapturedContent.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `captured_content_id` | INTEGER | NOT NULL, FK → CapturedContent | |
| `tag` | TEXT | NOT NULL | Tag string |

**Index**: `(captured_content_id, tag)` UNIQUE.

---

## SQLite Schema — Migration 001

```sql
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
```

---

## State Transitions

### VocabularyEntry — SRS States

```
NEW → DUE (on creation, due_date = now)
DUE → LEARNING (after first review, interval 0→1 day)
LEARNING → REVIEW (interval 1→3→7 days)
REVIEW → MATURE (interval > 21 days)
Any state → DUE (when due_date <= today)
Any state → NEW_AGAIN (rating = 'again', interval resets to 0)
```

### Recording — Processing States

```
PENDING → TRANSCRIBING (STT in progress)
TRANSCRIBING → EVALUATED (accuracy score computed)
TRANSCRIBING → FAILED (STT error)
```
