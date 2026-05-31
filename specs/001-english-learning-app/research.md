# Research: English Learning Desktop Application

**Branch**: `001-english-learning-app` | **Date**: 2026-05-31 | **Phase**: 0

---

## 1. Desktop Framework — Tauri v2

**Decision**: Use Tauri v2 with Rust backend + Vite/React frontend.

**Rationale**:
- Tauri v2 ships with a stable plugin system (`tauri-plugin-*`) covering clipboard, SQL, shell, notifications, and system tray — directly mapping to our feature needs.
- WebView renderer is Chromium-based on Windows, giving access to Web APIs (Web Speech API, YouTube IFrame API, Canvas, AudioContext).
- Rust backend handles OS-level operations (clipboard monitoring, file I/O, SQLite) with zero-overhead safety.
- Binary size is significantly smaller than Electron while delivering equivalent capabilities.

**Alternatives considered**:
- Electron: Larger bundle (~80MB vs ~8MB for Tauri), higher memory footprint, no built-in Rust integration.
- Flutter Desktop: Requires separate plugin ecosystem for web-based features (YouTube embed is complex).

---

## 2. Database — SQLite via tauri-plugin-sql

**Decision**: Use `tauri-plugin-sql` (JavaScript-side API) for simple queries; use `rusqlite` directly in Rust commands for complex operations (SRS scheduling, FTS5 full-text search, batch inserts).

**Rationale**:
- `tauri-plugin-sql` exposes a `Database` class to the frontend for lightweight CRUD.
- For the SRS scheduler and FTS5 search, Rust-side `rusqlite` gives full SQL control and better performance.
- SQLite FTS5 extension provides full-text search across saved clipboard content without an external search engine.
- Single `.sqlite` file stored in Tauri's `$APPDATA` directory — portable and backup-friendly.

**Schema migration**: Use `sqlx` migrate macros or manual versioned SQL files in `src-tauri/migrations/`.

**Alternatives considered**:
- Sled (embedded key-value): No SQL, no FTS5, harder to query relational data.
- Redb: Newer, less mature ecosystem.
- PouchDB/IndexedDB (frontend-only): No access from Rust backend; can't run scheduled background tasks.

---

## 3. YouTube Video Playback

**Decision**: Embed YouTube videos using the YouTube IFrame Player API rendered inside the Tauri WebView.

**Rationale**:
- Tauri's WebView on Windows uses WebView2 (Chromium-based), which can render YouTube iframes natively.
- The IFrame Player API provides JavaScript events for `onStateChange`, `onTimeUpdate`, and `seekTo()` — enabling Repeat Range control and subtitle synchronization.
- No video download required; all playback is streamed from YouTube.

**Subtitle sync**: Poll `player.getCurrentTime()` at 250ms intervals to match subtitle cue display with video position.

**Limitations**:
- Private or region-locked videos will fail to load — display a clear error message referencing YouTube's availability restrictions.
- YouTube's CSP headers may require adding `https://www.youtube.com` to Tauri's `allowlist` / CSP configuration.

**Alternatives considered**:
- `yt-dlp` to download + play locally via `<video>` tag: Violates YouTube ToS; adds legal risk and storage overhead.
- `mpv` embedded player: Complex IPC bridge; no SRT subtitle sync API.

---

## 4. Speech-to-Text (STT)

**Decision**: Use the **Web Speech API** (`SpeechRecognition`) as the primary STT engine; fall back to **Gemini API's audio transcription** for higher accuracy on post-recording analysis.

**Rationale**:
- Web Speech API is available in Tauri's WebView2 (Chromium) on Windows — zero cost, zero latency, no API key for basic real-time transcription.
- For post-recording evaluation (accuracy scoring), send the recorded audio blob to Gemini's `generateContent` with an audio part for higher-quality transcription and comparison.
- Two-tier approach: real-time feedback uses Web Speech API; final score uses Gemini for accuracy.

**Recording format**: `MediaRecorder` API → WebM/Opus blob → convert to base64 for Gemini API upload.

**Alternatives considered**:
- Whisper (local): Requires ~1.5GB model file; adds Rust ML dependency; slow on CPU.
- Deepgram / AssemblyAI: Additional paid API keys; adds external dependency beyond Gemini.
- Azure Cognitive Services STT: Additional vendor; user already has Gemini API key.

---

## 5. Text-to-Speech (TTS)

**Decision**: Use the **Web Speech Synthesis API** (`SpeechSynthesis`) for vocabulary flashcard pronunciation — built-in, zero-cost, English voices available on Windows.

**Rationale**:
- Available natively in all Chromium-based WebViews; no API key, no latency.
- Windows 10/11 ships with high-quality English neural voices (Microsoft David, Zira, Mark, and newer neural voices).
- For higher-quality TTS (e.g., Teleprompter playback reference audio), optionally integrate Gemini's TTS capabilities.

**Alternatives considered**:
- ElevenLabs: Premium quality but costly; overkill for vocabulary pronunciation.
- Google Cloud TTS: Separate API key; unnecessary given Web Speech Synthesis quality.

---

## 6. Spaced Repetition Algorithm — SM-2

**Decision**: Implement the **SM-2 algorithm** in Rust (Tauri command), with scheduling state stored in SQLite.

**SM-2 interval rules**:
```
Rating: Again (0) → interval = 0 (repeat same session), ease_factor unchanged
Rating: Hard  (1) → interval = interval * 1.2, ease_factor -= 0.15
Rating: Good  (2) → interval = interval * ease_factor
Rating: Easy  (3) → interval = interval * ease_factor * 1.3, ease_factor += 0.15
Initial interval: 0 days (same session) → 1 day → 3 days → then SM-2 kicks in
Minimum ease_factor: 1.3 | Starting ease_factor: 2.5
```

**Rationale**:
- SM-2 is battle-tested (Anki uses a derivative). Simple enough to implement in ~50 lines of Rust.
- Keeping scheduling logic server-side (Rust) prevents clock manipulation from affecting review intervals.

**Alternatives considered**:
- FSRS (Free Spaced Repetition Scheduler): More accurate but significantly more complex; SM-2 sufficient for v1.
- Frontend-only SRS in TypeScript: Works but loses scheduling integrity on time manipulation.

---

## 7. Clipboard Monitoring

**Decision**: Implement clipboard monitoring using a **Tauri background thread** in Rust with `arboard` crate polling at 500ms intervals; show native OS notification or Tauri window event to trigger the Save popup.

**Rationale**:
- `tauri-plugin-clipboard-manager` provides read/write but no change events; we need a polling loop.
- `arboard` crate reads clipboard content cross-platform with minimal overhead.
- Filter: only trigger popup if new clipboard content is plain text AND differs from last captured text AND contains ≥10 characters (avoid accidental single-word copies).
- Send event to frontend via Tauri's `emit()` event system; React component renders the popup overlay.

**Polling strategy**: 500ms interval is imperceptible to users and generates negligible CPU load (~0.01%).

**Alternatives considered**:
- OS-level clipboard hooks (WinAPI `SetClipboardViewer`): More responsive but complex Rust FFI; harder to cross-platform.
- Tauri system tray popup: Less integrated UX than an in-app overlay popup.

---

## 8. AI Integration — Gemini API

**Decision**: Use **Gemini 2.0 Flash** as the default model for all AI features (writing evaluation, clipboard AI processing, STT fallback).

**Rationale**:
- Gemini 2.0 Flash offers the best speed/cost ratio for real-time educational feedback.
- Single API key covers all AI features — minimal user configuration.
- Gemini supports multimodal input (text + audio) enabling future combined speaking + writing analysis.

**API call routing**: All Gemini API calls are made from the **Rust backend** (Tauri commands) to keep the API key out of the frontend JavaScript bundle. The key is stored in Tauri's secure store (`tauri-plugin-store`).

**Writing evaluation prompt structure**:
```
System: "You are an expert {mode} writing evaluator. Score the following essay..."
User: "{essay_text}"
Response format: JSON with scores + feedback fields
```

**Alternatives considered**:
- OpenAI GPT-4o: Higher cost; no multimodal audio support without Whisper separately.
- Claude API: Excellent quality; could be added as an alternative provider in v2.

---

## 9. RAG / Search for Knowledge Library

**Decision**: Implement **two-tier search**:
1. **SQLite FTS5** for full-text keyword search (fast, offline, no API needed).
2. **Gemini Embedding API** for semantic similarity search (optional, requires connectivity).

**Rationale**:
- FTS5 is built into SQLite; handles tag/folder/date filtering natively via `WHERE` clauses.
- Semantic search via embeddings enables "search by meaning" — finding content even when exact keywords don't match.
- Embeddings are generated on save and stored as BLOBs in SQLite; similarity computed in Rust using cosine similarity.

**Offline behavior**: Full-text and metadata search always available; semantic search disabled when no connectivity.

**Alternatives considered**:
- Meilisearch: Excellent but requires a running server process; overkill for local single-user app.
- Tantivy (Rust full-text search): More powerful than FTS5 but adds ~2MB to binary; FTS5 sufficient for v1.

---

## 10. Frontend State Architecture

**Decision**: Use **Redux Toolkit** for global app state (active tab, settings, clipboard popup state, current session data) and **TanStack Query** for all data that originates from SQLite (vocabulary list, review queue, saved content library).

**Rationale**:
- TanStack Query handles caching, background refresh, and optimistic updates for database-backed lists — eliminates manual loading state management.
- Redux Toolkit handles transient UI state that is not persisted (current teleprompter settings, active recording state, video player state).
- Clear separation: TanStack Query = server state (SQLite); Redux = client state (UI).

**Alternatives considered**:
- Zustand only: Simpler, but no built-in server state cache; would need manual invalidation logic.
- React Context only: Fine for small apps; insufficient for cross-cutting state like clipboard popup over all tabs.

---

## Resolved Clarifications

| # | Topic | Resolution |
|---|-------|------------|
| 1 | STT provider | Web Speech API (real-time) + Gemini (post-recording accuracy) |
| 2 | SRS algorithm | SM-2 with Rust implementation |
| 3 | Clipboard monitoring | Rust polling with `arboard` at 500ms |
| 4 | AI model | Gemini 2.0 Flash via Rust backend |
| 5 | Search | SQLite FTS5 (offline) + Gemini Embeddings (optional) |
| 6 | Video playback | YouTube IFrame API in Tauri WebView |
| 7 | TTS | Web Speech Synthesis API |
| 8 | DB access pattern | `tauri-plugin-sql` for frontend CRUD; `rusqlite` for complex queries |
