# Tasks: English Learning Desktop Application

**Input**: Design documents from `specs/001-english-learning-app/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/tauri-commands.md ✅ | quickstart.md ✅

**Tests**: Not included (not explicitly requested in spec). Add test tasks via `/speckit-tasks` with a TDD flag if needed.

**Organization**: Tasks grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies between them)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Exact file paths included in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize Tauri v2 project, install all dependencies, configure tooling. Nothing else can start until this is done.

- [ ] T001 Initialize Tauri v2 + React + TypeScript project using `pnpm create tauri-app@latest` with Vite template in repo root
- [ ] T002 Install all pnpm frontend dependencies: react-router-dom, @reduxjs/toolkit, react-redux, @tanstack/react-query, tailwindcss, @tauri-apps/api, @tauri-apps/plugin-sql, @tauri-apps/plugin-store, @tauri-apps/plugin-clipboard-manager
- [ ] T003 [P] Add all Rust dependencies to `src-tauri/Cargo.toml`: tauri-plugin-sql (sqlite feature), tauri-plugin-store, tauri-plugin-clipboard-manager, rusqlite (bundled), tokio (full), reqwest (json), serde (derive), serde_json, arboard
- [ ] T004 [P] Configure Tailwind CSS v3 via `@tailwindcss/vite` plugin in `vite.config.ts` and create `src/index.css` with Tailwind directives
- [ ] T005 Create shared TypeScript types in `src/types/index.ts` covering all entities from data-model.md (VideoSession, SubtitleEntry, Recording, VocabularyEntry, CapturedContent, WritingSubmission, etc.)
- [ ] T006 Create typed `invoke()` wrapper functions for all Tauri commands in `src/services/tauriCommands.ts` (mirrors contracts/tauri-commands.md)
- [ ] T007 Create SQLite migration file `src-tauri/migrations/001_initial_schema.sql` with full schema from data-model.md (all 11 tables + FTS5 virtual table + triggers)
- [ ] T008 Create Rust commands module scaffolding: `src-tauri/src/commands/mod.rs`, `speaking.rs`, `writing.rs`, `vocabulary.rs`, `clipboard.rs` (empty modules, all registered)
- [ ] T009 [P] Create SQLite connection pool in `src-tauri/src/db/pool.rs` using rusqlite with connection initialization and migration runner
- [ ] T010 Register all Tauri plugins (tauri-plugin-sql with migration 001, tauri-plugin-store, tauri-plugin-clipboard-manager) in `src-tauri/src/main.rs`
- [ ] T011 Set up Redux store with `appSlice` (active tab, online status), `clipboardSlice` (popup visibility, pending content), `recordingSlice` (is-recording, session state) in `src/store/index.ts` and slice files
- [ ] T012 [P] Configure TanStack Query provider (`QueryClient` + `QueryClientProvider`) in `src/main.tsx` wrapping the Redux `Provider`
- [ ] T013 Create main `App.tsx` with tab routing (Speaking / Writing / Vocabulary / Clipboard / Settings) rendering the appropriate tab component
- [ ] T014 Build `TabBar` component in `src/components/shared/TabBar.tsx` with 5 tab buttons, active state, and due-card badge placeholder for Vocabulary
- [ ] T015 Build Settings screen in `src/components/shared/SettingsScreen.tsx`: Gemini API key input (password field), clipboard monitoring toggle, TTS voice selector, default writing mode selector
- [ ] T016 Implement `save_settings` and `get_settings` Tauri commands in `src-tauri/src/commands/mod.rs` — API key stored via tauri-plugin-store (never in SQLite), other settings in SQLite settings table

**Checkpoint**: `pnpm tauri dev` launches, TabBar shows all 5 tabs, Settings screen saves API key. Foundation ready for all user stories.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared infrastructure required by multiple user stories — STT, Gemini client, recording hook.

⚠️ **CRITICAL**: US1 (Shadowing), US2 (Teleprompter), and US3 (Writing) all depend on components built here.

- [ ] T017 Implement Gemini 2.0 Flash HTTP client in `src-tauri/src/services/gemini.rs` — `generate_content()` function accepting system prompt + user message, returning parsed JSON; reads API key from tauri-plugin-store
- [ ] T018 Implement STT service in `src-tauri/src/services/stt.rs` — accepts raw audio bytes (WebM/Opus), encodes to base64, calls Gemini audio transcription, returns transcript string
- [ ] T019 Implement `useRecording` custom hook in `src/hooks/useRecording.ts` — wraps MediaRecorder API: `startRecording()`, `stopRecording()` returning `Blob`, recording duration, live audio level (for VU meter display)
- [ ] T020 Build `RecordingControls` component in `src/components/speaking/RecordingControls.tsx` — Start/Stop buttons, recording timer display, audio level indicator; takes `onRecordingComplete(blob, durationMs)` callback
- [ ] T021 Build `AccuracyScore` component in `src/components/speaking/AccuracyScore.tsx` — accepts `referenceText` and `transcription`, renders word-by-word diff: green=correct, red=missing, orange=mispronounced; shows percentage score, missed-word %, reading WPM

**Checkpoint**: Foundation complete. All three shared services/components are independently usable.

---

## Phase 3: User Story 1 — Shadowing Practice (Priority: P1) 🎯 MVP

**Goal**: User pastes YouTube URL → imports SRT → sets repeat range → records → sees accuracy score.

**Independent Test**: Open app → paste a YouTube URL → import a local .srt file → verify subtitles sync with video → set Start:01:15 End:01:30 with Loop on → record 15 seconds → stop → verify accuracy score (0–100%) displays.

### Implementation

- [ ] T022 [P] [US1] Implement `create_video_session` Tauri command in `src-tauri/src/commands/speaking.rs` — inserts row into `video_sessions`, returns id + title (fetched from YouTube oEmbed API via reqwest) + thumbnail_url
- [ ] T023 [P] [US1] Implement `import_subtitles` Tauri command in `src-tauri/src/commands/speaking.rs` — SRT parser in Rust: split on empty lines, parse `HH:MM:SS,mmm --> HH:MM:SS,mmm` timestamps, insert all cues into `subtitle_entries` table
- [ ] T024 [P] [US1] Implement `update_subtitle_entry` and `get_subtitles_for_session` commands in `src-tauri/src/commands/speaking.rs`
- [ ] T025 [US1] Implement `save_recording` command for shadowing mode in `src-tauri/src/commands/speaking.rs` — calls stt.rs for transcription, runs word-diff algorithm against reference subtitle text, computes accuracy_score + missed_word_pct + mispronounced_words[], saves Recording row
- [ ] T026 [US1] Implement YouTube IFrame API wrapper in `src/services/youtubePlayer.ts` — `loadVideo(url)`, `play()`, `pause()`, `seekTo(ms)`, `getCurrentTime(): Promise<number>` with 250ms polling, `onTimeUpdate(callback)` subscription, `destroy()`
- [ ] T027 [US1] Build `VideoPlayer` component in `src/components/speaking/VideoPlayer.tsx` — renders YouTube iframe via IFrame API wrapper, exposes `currentTimeMs`, play/pause/seek controls, video timeline scrubber
- [ ] T028 [P] [US1] Build `SubtitleEditor` component in `src/components/speaking/SubtitleEditor.tsx` — scrollable list of subtitle cues, each row shows start/end time + editable text input, Save button calls `update_subtitle_entry`; auto-scrolls to cue matching current video time
- [ ] T029 [US1] Build `RepeatRangeControl` component in `src/components/speaking/RepeatRangeControl.tsx` — Start Time picker, End Time picker (both in MM:SS format), Loop Mode toggle switch; emits `onRangeChange(startMs, endMs, loopEnabled)` callback
- [ ] T030 [US1] Integrate repeat-range logic into `VideoPlayer`: when `currentTimeMs >= endMs`, if loopMode=true seekTo(startMs), else pause(); pass range from RepeatRangeControl
- [ ] T031 [US1] Build `ShadowingTab` main view in `src/components/speaking/ShadowingTab.tsx` — YouTube URL input + "Load" button, file picker for SRT import, VideoPlayer + SubtitleEditor side-by-side layout, RepeatRangeControl bar, RecordingControls at bottom, AccuracyScore results panel (shown after recording stops)

**Checkpoint**: US1 fully functional — shadowing session from URL to accuracy score works end-to-end.

---

## Phase 4: User Story 2 — Teleprompter Reading Practice (Priority: P2)

**Goal**: User pastes text → customizes display → records while text scrolls → sees accuracy/speed evaluation.

**Independent Test**: Open Teleprompter tab → paste a 100-word paragraph → adjust scroll speed to 1.5x, font size 40, dark background → click Start Recording → verify text scrolls and recording timer starts → click Stop → verify evaluation report shows accuracy %, missed-word %, mispronounced list, WPM.

### Implementation

- [ ] T032 [P] [US2] Implement `create_teleprompter_session` Tauri command in `src-tauri/src/commands/speaking.rs` — inserts into `teleprompter_sessions`, returns id; also implement `update_teleprompter_session`
- [ ] T033 [US2] Build `TeleprompterDisplay` component in `src/components/speaking/TeleprompterDisplay.tsx` — fullscreen text display with CSS `scrollBehavior: smooth` animation driven by `scrollSpeed` prop; pauses on Stop Recording; highlights current word using estimated position from recording timer; accepts `backgroundColor`, `textColor`, `fontSize` props
- [ ] T034 [US2] Extend `save_recording` command to handle `session_type: 'teleprompter'` — compute `reading_speed_wpm` from word count ÷ duration_minutes; extend AccuracyScore component to display WPM
- [ ] T035 [US2] Build `TeleprompterTab` main view in `src/components/speaking/TeleprompterTab.tsx` — text input area (with paste button), customization panel (scroll speed slider, font size slider, color pickers), fullscreen TeleprompterDisplay overlay on record start, RecordingControls, AccuracyScore results panel; history list of past sessions from TanStack Query

**Checkpoint**: US2 fully functional — teleprompter session from text paste to evaluation report works independently.

---

## Phase 5: User Story 3 — AI Writing Evaluation (Priority: P2)

**Goal**: User types essay → selects mode → submits → sees structured score report with corrections.

**Independent Test**: Open Writing tab → type 150-word passage → select "Aptis Writing" → click Evaluate → verify score report appears with Overall Score, Grammar Score, Vocabulary Score, Coherence Score, at least 2 Suggestions, Grammar Corrections section, Better Sentences section.

### Implementation

- [ ] T036 [P] [US3] Implement `evaluate_writing` Tauri command in `src-tauri/src/commands/writing.rs` — builds mode-specific system prompt (IELTS/TOEIC/Aptis/General), calls gemini.rs `generate_content()`, parses JSON response into WritingEvaluationResult struct, saves WritingSubmission row, returns full result; handle API error with descriptive error string
- [ ] T037 [P] [US3] Build `WritingEditor` component in `src/components/writing/WritingEditor.tsx` — textarea with live word count, evaluation mode selector (4 options), Evaluate button with loading state, character limit warning at 3000 words
- [ ] T038 [US3] Build `EvaluationReport` component in `src/components/writing/EvaluationReport.tsx` — score cards row (Overall, Grammar, Vocabulary, Coherence each as circular gauge or colored card), collapsible Suggestions list, Grammar Corrections table (original → corrected), Better Sentences accordion (original → improved)
- [ ] T039 [US3] Build `WritingTab` main view in `src/components/writing/WritingTab.tsx` — WritingEditor + EvaluationReport stacked layout; sidebar list of past submissions from TanStack Query (date + mode + overall score); click past submission to reload its report
- [ ] T040 [P] [US3] Implement `useWritingHistory` TanStack Query hook in `src/hooks/useWritingHistory.ts` — `useSubmissions()` list query, `useEvaluateWriting()` mutation with optimistic loading state

**Checkpoint**: US3 fully functional — writing evaluation from text input to full score report works independently.

---

## Phase 6: User Story 4 — Vocabulary Learning with SRS (Priority: P3)

**Goal**: User adds vocabulary words → reviews due cards with SM-2 scheduling → rates recall → intervals adjust.

**Independent Test**: Add 5 vocabulary words → open Review tab → verify cards due immediately → flip each card → rate as Easy/Good/Hard/Again → verify next due dates are set correctly (Easy ≈ 3 days, Hard ≈ 1 day, Again = same session) → verify session summary shows correct rating counts.

### Implementation

- [ ] T041 [P] [US4] Implement SM-2 algorithm in `src-tauri/src/services/srs.rs` — `calculate_next_interval(interval_days, ease_factor, rating) -> (new_interval, new_ease_factor)` with SM-2 rules: Again resets to 0, Hard multiplies by 1.2 (ease -0.15), Good multiplies by ease_factor, Easy multiplies by ease_factor×1.3 (ease +0.15); clamp ease_factor ≥ 1.3
- [ ] T042 [US4] Implement `add_vocabulary_entry` Tauri command in `src-tauri/src/commands/vocabulary.rs` — inserts into `vocabulary_entries` with `due_date = NOW()` (immediate first review), returns id + due_date; return error if word already exists (UNIQUE constraint)
- [ ] T043 [P] [US4] Implement `get_due_cards` Tauri command in `src-tauri/src/commands/vocabulary.rs` — `SELECT * FROM vocabulary_entries WHERE due_date <= datetime('now') ORDER BY due_date ASC`; include total due count for badge display
- [ ] T044 [US4] Implement `submit_review_rating` command in `src-tauri/src/commands/vocabulary.rs` — calls srs.rs to compute new interval + ease_factor, updates `vocabulary_entries` row (due_date, interval_days, ease_factor, review_count), inserts `review_cards` row, returns next_due_date + new_interval_days
- [ ] T045 [P] [US4] Implement `start_review_session` and `end_review_session` commands in `src-tauri/src/commands/vocabulary.rs` — create/close `review_sessions` rows; `end` computes aggregate stats (cards_again, cards_hard, cards_good, cards_easy)
- [ ] T046 [P] [US4] Build `AddWordForm` component in `src/components/vocabulary/AddWordForm.tsx` — fields: word (required), phonetics (IPA, optional), meaning (required), example sentence, personal notes, tags (comma-separated); Submit button; duplicate-word warning message on conflict
- [ ] T047 [US4] Build `Flashcard` component in `src/components/vocabulary/Flashcard.tsx` — front side shows word + phonetics + TTS play button (`window.speechSynthesis.speak()`); back side shows meaning + example + notes + image (if set); CSS flip animation on click; 4 rating buttons (Again/Hard/Good/Easy) shown on back side only
- [ ] T048 [US4] Build `ReviewSession` component in `src/components/vocabulary/ReviewSession.tsx` — calls `start_review_session` on mount; renders Flashcard queue (current card + "X remaining" counter); on rating submit calls `submit_review_rating`; if rating=Again re-queues card at end of session; on empty queue calls `end_review_session` and shows summary (total reviewed, breakdown by rating, accuracy %)
- [ ] T049 [US4] Build `VocabularyTab` main view in `src/components/vocabulary/VocabularyTab.tsx` — two-panel layout: left = word library list (searchable, with AddWordForm modal), right = "Start Review" button with due-card count badge; when reviewing shows ReviewSession full-screen; update TabBar badge via Redux after card count changes
- [ ] T050 [P] [US4] Implement `useVocabulary` TanStack Query hooks in `src/hooks/useVocabulary.ts` — `useDueCards()`, `useVocabularyList()`, `useAddWord()` mutation, `useSubmitRating()` mutation with cache invalidation on due-card count

**Checkpoint**: US4 fully functional — vocabulary SRS loop (add → review → rate → reschedule) works independently with correct SM-2 intervals.

---

## Phase 7: User Story 5 — Clipboard Capture & Knowledge Collection (Priority: P3)

**Goal**: Copy text anywhere → Save popup appears → save with tags → search knowledge library.

**Independent Test**: Enable clipboard monitoring in Settings → copy a 50-word paragraph from any browser tab → verify popup appears within 2 seconds → select category "Vocabulary", add tag "test" → click Save → open Clipboard tab → search "test" → verify saved item appears with correct content, tag, and timestamp.

### Implementation

- [ ] T051 [P] [US5] Implement clipboard watcher background thread in `src-tauri/src/services/clipboard_watcher.rs` — spawn Tokio async task that polls `arboard::Clipboard::get_text()` every 500ms; compare with last captured text; skip if: not text, length < 10, same as previous; emit Tauri event `clipboard:changed` with `{content, char_count}` payload; respect monitoring_enabled flag via shared `AtomicBool`
- [ ] T052 [US5] Register clipboard watcher thread in `src-tauri/src/main.rs` — spawn watcher on app startup; wire `toggle_clipboard_monitoring` command to flip the `AtomicBool`; implement `get_clipboard_status` command
- [ ] T053 [P] [US5] Implement `save_captured_content` Tauri command in `src-tauri/src/commands/clipboard.rs` — inserts `captured_content` row, inserts `captured_tags` rows (one per tag), triggers FTS5 sync via existing triggers, returns id + created_at
- [ ] T054 [P] [US5] Implement `search_captured_content` Tauri command in `src-tauri/src/commands/clipboard.rs` — if `query` non-empty: use `captured_content_fts` FTS5 full-text search joined with `captured_content`; apply WHERE filters for category, folder, date range; LEFT JOIN `captured_tags` for tag filter; return paginated results (limit + offset); total count in response
- [ ] T055 [US5] Implement `process_content_with_ai` Tauri command in `src-tauri/src/commands/clipboard.rs` — calls gemini.rs with content extraction prompt, parses JSON for summary/vocabulary/collocations/idioms, updates `captured_content` row (ai_* fields + ai_processed=1), optionally auto-creates VocabularyEntry rows for extracted words, emits `ai:processing_complete` event
- [ ] T056 [US5] Build `SavePopup` overlay component in `src/components/clipboard/SavePopup.tsx` — subscribe to `clipboard:changed` Tauri event via `listen()` on mount; render fixed-position overlay card: content preview (first 200 chars), category dropdown, folder text input, tag input (multi-tag with Enter key), personal notes textarea, Save/Ignore buttons; dispatch to clipboardSlice on Save; call `save_captured_content`
- [ ] T057 [P] [US5] Build `SearchBar` component in `src/components/clipboard/SearchBar.tsx` — text input for full-text query, category filter dropdown, folder filter input, date range pickers (from/to), tag filter input; debounced onChange (300ms) triggers TanStack Query refetch
- [ ] T058 [US5] Build `ContentLibrary` component in `src/components/clipboard/ContentLibrary.tsx` — results list showing content preview card (first 150 chars, tags, category badge, timestamp, AI-processed indicator); infinite scroll or pagination; click item to expand full content; "Process with AI" button per item (calls `process_content_with_ai`)
- [ ] T059 [US5] Build `ClipboardTab` main view in `src/components/clipboard/ClipboardTab.tsx` — SearchBar at top, ContentLibrary below; monitoring toggle switch (calls `toggle_clipboard_monitoring`); empty state with instructions when no items saved
- [ ] T060 [P] [US5] Implement `useCapturedContent` TanStack Query hooks in `src/hooks/useCapturedContent.ts` — `useSearchContent(filters)` query with filter params as query key, `useSaveContent()` mutation with cache invalidation, `useProcessWithAI()` mutation

**Checkpoint**: US5 fully functional — clipboard capture loop (copy → popup → save → search) works end-to-end.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Production-quality UX, error handling, performance, and accessibility across all stories.

- [ ] T061 [P] Build `ErrorBoundary` component in `src/components/shared/ErrorBoundary.tsx` — wraps each tab; catches React render errors; shows friendly "Something went wrong" with retry button; logs error details
- [ ] T062 [P] Build `LoadingSpinner` component in `src/components/shared/LoadingSpinner.tsx` — reusable centered spinner with optional label; used by all async operations
- [ ] T063 Implement offline detection in `src/store/appSlice.ts` — `window.addEventListener('online'/'offline')` updates Redux `isOnline` state; disable AI-dependent buttons (Evaluate Writing, Process with AI, Load YouTube, STT) with "Requires internet connection" tooltip when offline
- [ ] T064 Add duplicate vocabulary word detection in `AddWordForm`: on `add_vocabulary_entry` UNIQUE conflict error, show "Word already exists — view existing entry?" link instead of generic error
- [ ] T065 Implement SRS backlog cap in `ReviewSession`: if `get_due_cards` returns > 20 cards, display "20 of {total} due cards" and only review the 20 oldest; show "X more cards waiting" message in session summary
- [ ] T066 [P] Add keyboard shortcuts to `ReviewSession` in `src/components/vocabulary/ReviewSession.tsx`: Space = flip card, 1 = Again, 2 = Hard, 3 = Good, 4 = Easy; show shortcut hints on rating buttons
- [ ] T067 [P] Configure system tray icon in `src-tauri/tauri.conf.json` — tray icon with right-click menu: "Open", "Toggle Clipboard Monitoring", "Quit"; app minimizes to tray when window is closed (does not quit)
- [ ] T068 [P] Set app icon and window title in `src-tauri/tauri.conf.json` — title "Aptis English Learning", icon set (PNG 32/64/128/256px)
- [ ] T069 Performance verification: add 10,000 test rows to `captured_content` via SQLite script; measure `search_captured_content` query time via Rust `std::time::Instant`; confirm < 1000ms; document result in `specs/001-english-learning-app/plan.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 completion — blocks US1, US2
- **Phase 3 (US1 Shadowing)**: Depends on Phase 1 + Phase 2
- **Phase 4 (US2 Teleprompter)**: Depends on Phase 1 + Phase 2
- **Phase 5 (US3 Writing)**: Depends on Phase 1 only (gemini.rs built in Phase 2 also used here)
- **Phase 6 (US4 Vocabulary)**: Depends on Phase 1 only (independent of Gemini and recording)
- **Phase 7 (US5 Clipboard)**: Depends on Phase 1; optionally integrates Phase 6 (auto-creates vocabulary entries)
- **Phase 8 (Polish)**: Depends on all prior phases

### User Story Dependencies

- **US1 (Shadowing, P1)**: Needs Phase 2 (RecordingControls, AccuracyScore, STT service)
- **US2 (Teleprompter, P2)**: Needs Phase 2 (RecordingControls, AccuracyScore, STT service); can share T025 `save_recording` with US1
- **US3 (Writing, P2)**: Needs Phase 2 (gemini.rs); independent of US1/US2
- **US4 (Vocabulary, P3)**: Fully independent; can start after Phase 1
- **US5 (Clipboard, P3)**: Fully independent; optional integration with US4 vocabulary auto-creation

### Within Each Phase

- [P]-marked tasks within the same phase can run concurrently
- Non-[P] tasks within a phase must run sequentially as listed

---

## Parallel Execution Examples

### Phase 1 Parallel Group
```
Concurrent (different files, no deps):
  T003  → add Rust Cargo.toml dependencies
  T004  → configure Tailwind CSS
  T005  → create TypeScript types
  T006  → create tauriCommands.ts wrappers
  T012  → configure TanStack Query provider

Sequential after T007:
  T008  → commands module scaffolding
  T009  → db pool (needs T007 schema)
  T010  → register plugins + migrations (needs T009)
```

### Phase 2 Parallel Group
```
Concurrent:
  T017  → gemini.rs service
  T018  → stt.rs service
  T019  → useRecording hook

Sequential after T019:
  T020  → RecordingControls component (needs T019)
  T021  → AccuracyScore component (can be parallel with T020)
```

### Phase 3 Parallel Group (US1)
```
Concurrent:
  T022  → create_video_session command
  T023  → import_subtitles command
  T024  → update_subtitle_entry command
  T026  → youtubePlayer.ts wrapper
  T028  → SubtitleEditor component

Sequential:
  T025  → save_recording (needs T017, T018 from Phase 2)
  T027  → VideoPlayer (needs T026)
  T029  → RepeatRangeControl
  T030  → Integrate repeat-range into VideoPlayer (needs T027, T029)
  T031  → ShadowingTab assembly (needs T020, T021, T027, T028, T029, T030)
```

### After Phase 1: Stories US3 and US4 can start independently
```
Developer A → Phase 3 (US1 Shadowing)
Developer B → Phase 5 (US3 Writing) — only needs Phase 1 + T017
Developer C → Phase 6 (US4 Vocabulary) — only needs Phase 1
```

---

## Implementation Strategy

### MVP (US1 Only — Shadowing Practice)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (recording, STT, Gemini)
3. Complete Phase 3: US1 Shadowing
4. **STOP AND VALIDATE**: Test full shadowing session end-to-end
5. Demo: YouTube URL → SRT import → repeat range → record → accuracy score

### Incremental Delivery Order

1. Phase 1 + 2 → Infrastructure ready
2. Phase 6 (US4 Vocabulary) → Add first standalone value (no internet needed)
3. Phase 5 (US3 Writing) → AI writing feedback
4. Phase 4 (US2 Teleprompter) → Speaking practice without YouTube dependency
5. Phase 3 (US1 Shadowing) → Full speaking practice with video
6. Phase 7 (US5 Clipboard) → Passive knowledge collection
7. Phase 8 → Polish all features

> This order (Vocabulary first) follows the plan.md recommendation: build the simplest Rust backend first (SM-2, pure computation) to validate the Tauri/SQLite pipeline before tackling complex audio + YouTube integrations.

---

## Task Summary

| Phase | Story | Tasks | Parallel Tasks |
|-------|-------|-------|---------------|
| Phase 1: Setup | — | T001–T016 (16 tasks) | T003, T004, T005, T006, T012 |
| Phase 2: Foundational | — | T017–T021 (5 tasks) | T017, T018, T019, T021 |
| Phase 3 | US1 Shadowing (P1) | T022–T031 (10 tasks) | T022, T023, T024, T026, T028 |
| Phase 4 | US2 Teleprompter (P2) | T032–T035 (4 tasks) | T032 |
| Phase 5 | US3 Writing (P2) | T036–T040 (5 tasks) | T036, T037, T040 |
| Phase 6 | US4 Vocabulary (P3) | T041–T050 (10 tasks) | T041, T043, T045, T046, T050 |
| Phase 7 | US5 Clipboard (P3) | T051–T060 (10 tasks) | T051, T053, T054, T057, T060 |
| Phase 8: Polish | — | T061–T069 (9 tasks) | T061, T062, T066, T067, T068 |
| **Total** | | **69 tasks** | **25 parallelizable** |

---

## Notes

- `[P]` tasks touch different files with no shared dependencies — safe to run concurrently
- `[Story]` labels enable traceability: each task maps to a spec.md user story
- Each phase ends with an independent test checkpoint — stop and validate before continuing
- Commit after each task or logical group
- Avoid working on two tasks in the same file concurrently even if both are marked `[P]`
