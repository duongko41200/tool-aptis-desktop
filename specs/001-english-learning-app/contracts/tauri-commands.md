# Tauri IPC Command Contracts

**Branch**: `001-english-learning-app` | **Date**: 2026-05-31

All frontend-to-backend communication uses Tauri's `invoke()` IPC mechanism.
Each command is a Rust `#[tauri::command]` function exposed via the plugin system.

---

## Convention

```typescript
// Frontend call pattern
import { invoke } from '@tauri-apps/api/core';
const result = await invoke<ResponseType>('command_name', { param1, param2 });
```

All commands return `Result<T, String>` on the Rust side.
Errors are surfaced as rejected promises on the frontend.

---

## Speaking — Shadowing

### `create_video_session`
Creates a new shadowing session for a YouTube URL.

**Input**:
```typescript
{ youtube_url: string }
```
**Output**:
```typescript
{ id: number; title: string | null; thumbnail_url: string | null; duration_seconds: number | null }
```

---

### `import_subtitles`
Imports an SRT file and associates entries with a VideoSession.

**Input**:
```typescript
{ video_session_id: number; srt_content: string }
```
**Output**:
```typescript
{ imported_count: number; entries: SubtitleEntry[] }
```

---

### `update_subtitle_entry`
Saves user edits to a subtitle entry's text.

**Input**:
```typescript
{ id: number; text: string }
```
**Output**:
```typescript
{ success: boolean }
```

---

### `save_recording`
Saves a completed audio recording and triggers STT processing.

**Input**:
```typescript
{
  session_type: 'shadowing' | 'teleprompter';
  session_id: number;
  audio_data: number[];  // audio bytes as u8 array
  duration_ms: number;
  reference_text: string;  // subtitle text or teleprompter text for comparison
}
```
**Output**:
```typescript
{
  recording_id: number;
  transcription: string;
  accuracy_score: number;
  missed_word_pct: number;
  mispronounced_words: string[];
  reading_speed_wpm: number | null;
}
```

---

## Speaking — Teleprompter

### `create_teleprompter_session`
Creates or updates a Teleprompter session.

**Input**:
```typescript
{
  source_text: string;
  scroll_speed: number;
  font_size: number;
  background_color: string;
  text_color: string;
}
```
**Output**:
```typescript
{ id: number }
```

---

## Writing

### `evaluate_writing`
Sends a writing submission to Gemini for evaluation.

**Input**:
```typescript
{
  content: string;
  evaluation_mode: 'ielts' | 'toeic' | 'aptis' | 'general';
}
```
**Output**:
```typescript
{
  submission_id: number;
  overall_score: number;
  grammar_score: number;
  vocabulary_score: number;
  coherence_score: number;
  suggestions: string[];
  grammar_corrections: Array<{ original: string; corrected: string }>;
  better_sentences: Array<{ original: string; improved: string }>;
}
```

---

## Vocabulary

### `add_vocabulary_entry`
Adds a new word to the vocabulary library. Schedules first review immediately.

**Input**:
```typescript
{
  word: string;
  phonetics: string | null;
  meaning: string;
  example: string | null;
  personal_notes: string | null;
  tags: string | null;
}
```
**Output**:
```typescript
{ id: number; due_date: string }
```

---

### `get_due_cards`
Returns all vocabulary entries due for review today.

**Input**: `{}`

**Output**:
```typescript
Array<{
  id: number;
  word: string;
  phonetics: string | null;
  meaning: string;
  example: string | null;
  personal_notes: string | null;
  image_path: string | null;
  interval_days: number;
  review_count: number;
}>
```

---

### `submit_review_rating`
Records a card rating and updates the SRS schedule.

**Input**:
```typescript
{
  review_session_id: number;
  vocabulary_entry_id: number;
  rating: 'again' | 'hard' | 'good' | 'easy';
}
```
**Output**:
```typescript
{ next_due_date: string; new_interval_days: number }
```

---

### `start_review_session` / `end_review_session`
Manages review session lifecycle.

**start Input**: `{}`
**start Output**: `{ review_session_id: number }`

**end Input**: `{ review_session_id: number }`
**end Output**: `{ cards_reviewed: number; cards_again: number; cards_hard: number; cards_good: number; cards_easy: number }`

---

## Clipboard

### `get_clipboard_status`
Returns whether clipboard monitoring is currently active.

**Input**: `{}`
**Output**: `{ active: boolean }`

### `toggle_clipboard_monitoring`
Enables or disables background clipboard monitoring.

**Input**: `{ enabled: boolean }`
**Output**: `{ active: boolean }`

---

### `save_captured_content`
Saves a clipboard-captured text item with optional metadata.

**Input**:
```typescript
{
  content: string;
  category: 'vocabulary' | 'speaking' | 'writing' | 'grammar' | 'reading' | 'general';
  folder: string | null;
  personal_notes: string | null;
  tags: string[];
}
```
**Output**:
```typescript
{ id: number; created_at: string }
```

---

### `search_captured_content`
Searches the knowledge library.

**Input**:
```typescript
{
  query: string | null;        // Full-text search query
  tag: string | null;
  folder: string | null;
  category: string | null;
  date_from: string | null;    // ISO 8601
  date_to: string | null;      // ISO 8601
  limit: number;               // Default: 50
  offset: number;              // Default: 0
}
```
**Output**:
```typescript
{
  total: number;
  items: Array<{
    id: number;
    content: string;
    category: string;
    folder: string | null;
    tags: string[];
    personal_notes: string | null;
    ai_summary: string | null;
    ai_processed: boolean;
    created_at: string;
  }>;
}
```

---

### `process_content_with_ai`
Triggers optional AI processing on a saved content item.

**Input**:
```typescript
{ captured_content_id: number }
```
**Output**:
```typescript
{
  summary: string;
  vocabulary: string[];
  collocations: string[];
  idioms: string[];
  flashcards_created: number;
}
```

---

## Settings

### `get_settings`
Returns current app settings.

**Output**:
```typescript
{
  gemini_api_key_set: boolean;    // Never return the actual key
  clipboard_monitoring_enabled: boolean;
  tts_voice: string;
  tts_rate: number;
  default_evaluation_mode: string;
}
```

### `save_settings`
Persists app settings (API key is stored in secure store, never in plain SQLite).

**Input**:
```typescript
{
  gemini_api_key: string | null;  // null = don't change
  clipboard_monitoring_enabled: boolean;
  tts_voice: string;
  tts_rate: number;
  default_evaluation_mode: string;
}
```
**Output**: `{ success: boolean }`

---

## Tauri Events (Backend → Frontend)

These events are emitted by the Rust backend and listened to on the frontend via `listen()`.

| Event Name | Payload | Description |
|-----------|---------|-------------|
| `clipboard:changed` | `{ content: string; char_count: number }` | New text detected in clipboard |
| `ai:processing_complete` | `{ captured_content_id: number }` | AI processing finished for a content item |
| `recording:transcription_complete` | `{ recording_id: number; accuracy_score: number }` | STT finished |
