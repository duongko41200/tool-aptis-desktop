# Feature Specification: English Learning Desktop Application

**Feature Branch**: `001-english-learning-app`

**Created**: 2026-05-31

**Status**: Draft

**Input**: User description: "English Learning Desktop Application — Speaking, Writing, Vocabulary, Clipboard Capture"

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Shadowing Practice with YouTube Video (Priority: P1)

A learner wants to improve their English pronunciation and listening by shadowing a YouTube video. They paste a YouTube URL into the app, import or auto-load subtitles (SRT), then record themselves reading along with the video. After recording, the app compares their speech to the original subtitle text and shows an accuracy score.

**Why this priority**: Shadowing is the core speaking feature and is the most differentiating capability of the app. It directly addresses pronunciation and fluency improvement — the primary user goal.

**Independent Test**: Can be fully tested by pasting a YouTube URL, loading a subtitle file, recording a 30-second segment, and receiving an accuracy score — delivering a complete speaking practice session.

**Acceptance Scenarios**:

1. **Given** a user has a YouTube video URL, **When** they enter it in the Shadowing screen, **Then** the app loads the video and attempts to fetch or prompt for subtitle import.
2. **Given** a subtitle file (SRT) has been loaded, **When** the video plays, **Then** subtitles are displayed in sync with the video timeline.
3. **Given** the user sets a Repeat Range (Start: 01:15, End: 01:30), **When** video reaches End Time, **Then** the app either stops or loops back to Start Time based on Loop Mode setting.
4. **Given** the user clicks "Start Recording" during video playback, **When** they finish speaking and stop recording, **Then** their speech is transcribed and compared against the subtitle text, displaying an Accuracy Score (0–100%).
5. **Given** Loop Mode is enabled and a Repeat Range is set, **When** the video reaches End Time, **Then** the video automatically restarts from Start Time without user interaction.

---

### User Story 2 - Teleprompter Reading Practice (Priority: P2)

A learner wants to practice reading aloud fluently by using a teleprompter-style display. They paste a passage of text, press "Start Recording", and the text scrolls automatically while their voice is recorded. After finishing, they receive a detailed evaluation including accuracy, missed words, mispronounced words, and reading speed.

**Why this priority**: Teleprompter practice supports fluency and public speaking skills. It is self-contained and delivers measurable feedback independently of external video content.

**Independent Test**: Can be fully tested by pasting a paragraph, adjusting scroll speed, recording while reading, and reviewing the evaluation report — delivering a complete reading fluency session.

**Acceptance Scenarios**:

1. **Given** the user pastes text into the Teleprompter screen, **When** they press "Start Recording", **Then** the text begins scrolling and audio recording starts simultaneously.
2. **Given** recording is in progress, **When** the user adjusts scroll speed, **Then** the text scroll rate changes immediately without stopping the recording.
3. **Given** the user has finished reading and stops the recording, **When** the evaluation completes, **Then** the app displays: Accuracy %, Missed Word %, list of mispronounced words, and reading speed (words per minute).
4. **Given** the user customizes text size, background color, and font color, **When** the teleprompter runs, **Then** all display preferences are applied.

---

### User Story 3 - AI Writing Evaluation (Priority: P2)

A learner wants to practice writing and receive instant AI-powered feedback. They select an exam mode (e.g., Aptis Writing), type their essay, and submit it. The app sends the text to an AI service and returns a structured score report with improvement suggestions.

**Why this priority**: Writing evaluation is a complete, independent feature with high user value for exam preparation (IELTS, TOEIC, Aptis). It is independently testable without requiring audio hardware.

**Independent Test**: Can be fully tested by typing a short passage, selecting "Aptis Writing" mode, submitting, and reviewing the score report — delivering a complete writing assessment session.

**Acceptance Scenarios**:

1. **Given** the user types a passage and selects an evaluation mode (IELTS / TOEIC / Aptis / General), **When** they submit, **Then** the app sends the content for AI evaluation.
2. **Given** the AI evaluation completes, **When** results are returned, **Then** the app displays: Overall Score, Grammar Score, Vocabulary Score, Coherence & Cohesion Score, Suggestions for Improvement, Grammar Corrections, and Better Sentence Suggestions.
3. **Given** the user changes the evaluation mode from IELTS to Aptis, **When** they resubmit the same text, **Then** the scoring criteria change to reflect the selected standard.
4. **Given** the AI service is unavailable, **When** the user submits a writing, **Then** the app shows a clear error message and allows retry.

---

### User Story 4 - Vocabulary Learning with Spaced Repetition (Priority: P3)

A learner wants to build vocabulary systematically using a flashcard-style spaced repetition system (SRS) similar to Anki. They add new words with pronunciation, definition, example, and notes, then review them on a scheduled basis. After each flashcard, they rate their recall (Easy / Good / Hard / Again), and the app reschedules future reviews accordingly.

**Why this priority**: Vocabulary learning is foundational but requires the SRS algorithm and scheduling logic. It is independently valuable as a standalone study tool even without the speaking or writing features.

**Independent Test**: Can be fully tested by adding 5 vocabulary words, completing a review session, rating each card, and verifying that the next review dates are correctly rescheduled.

**Acceptance Scenarios**:

1. **Given** the user adds a new word with word, pronunciation, meaning, example, and personal notes, **When** they save it, **Then** the word is stored and its first review is scheduled immediately.
2. **Given** a word is due for review, **When** the user opens the Vocabulary tab, **Then** the flashcard for that word is shown (front side first).
3. **Given** the user reveals the answer and rates the card as "Easy", **When** they proceed, **Then** the next review is scheduled significantly further in the future than if they rated "Hard".
4. **Given** the user rates a card "Again", **When** they proceed, **Then** the word reappears within the same review session and its interval resets.
5. **Given** Flashcard Mode is active, **When** viewing a card, **Then** the user can play the word's pronunciation audio, view an example sentence, and see an illustration image if one exists.

---

### User Story 5 - Clipboard Capture & Knowledge Collection (Priority: P3)

A learner encounters interesting English content (an article, a PDF, a web page) and wants to save it instantly to their personal learning library without switching apps. They copy text using Ctrl+C, the app detects the clipboard change, shows a popup asking "Save this content?", and if confirmed, stores the content with tags, notes, and a folder. Optionally, AI processes the content to extract vocabulary and generate flashcards automatically.

**Why this priority**: Clipboard capture enables passive, frictionless knowledge collection throughout the user's day. It is independently useful as a content-saving tool even without AI processing.

**Independent Test**: Can be fully tested by copying a paragraph of text from a browser, approving the popup, adding a tag, saving, and then searching for the saved item by tag — delivering a complete capture-and-retrieve workflow.

**Acceptance Scenarios**:

1. **Given** the app is running in the background, **When** the user copies text (Ctrl+C) in any external application, **Then** a popup appears: "Save this content to Learning App? [Save] [Ignore]".
2. **Given** the popup appears and the user selects "Save", **When** they optionally add tags, notes, and a category folder, **Then** the content is stored with timestamp, tags, notes, and folder.
3. **Given** the user selects "Ignore" on the popup, **When** dismissed, **Then** nothing is saved and the popup disappears without interruption.
4. **Given** saved content exists in the library, **When** the user searches by keyword, tag, folder, or date range, **Then** matching items are returned and displayed.
5. **Given** AI Processing is enabled and content is saved, **When** AI processing completes, **Then** the app displays: content summary, extracted vocabulary list, collocations, idioms, and auto-generated flashcards for review.

---

### Edge Cases

- What happens when a YouTube URL is invalid or the video is unavailable (private/region-locked)?
- How does the app handle SRT files with malformed timestamps or encoding errors?
- What happens if microphone access is denied by the operating system?
- What happens if the AI evaluation service returns an error or times out?
- How does the SRS scheduler behave if the user does not open the app for multiple days (backlog of overdue cards)?
- What happens if the clipboard contains non-text content (image, file path) — should the popup appear?
- How does the app handle very large clipboard content (e.g., an entire article of 5,000+ words)?
- What happens if the user tries to add a word that already exists in the vocabulary library?

---

## Requirements *(mandatory)*

### Functional Requirements

#### Speaking — Shadowing Practice

- **FR-001**: System MUST accept a YouTube video URL and display the video within the application.
- **FR-002**: System MUST support importing SRT subtitle files and display subtitles synchronized to the video timeline.
- **FR-003**: Users MUST be able to edit subtitle text directly within the application before or during practice.
- **FR-004**: Users MUST be able to set a Repeat Range by selecting a Start Time and End Time on the video timeline.
- **FR-005**: System MUST support Loop Mode, where the video automatically replays the selected Repeat Range segment upon reaching End Time.
- **FR-006**: System MUST allow users to start and stop audio recording during video playback.
- **FR-007**: System MUST transcribe the user's recorded audio to text and compare it against the corresponding subtitle content.
- **FR-008**: System MUST display an Accuracy Score (0–100%) reflecting the match between user speech and subtitle text.

#### Speaking — Teleprompter Reading Practice

- **FR-009**: Users MUST be able to input or paste text for teleprompter display.
- **FR-010**: System MUST display text in an auto-scrolling teleprompter format when recording begins.
- **FR-011**: Users MUST be able to customize scroll speed, font size, background color, and text color.
- **FR-012**: System MUST record the user's voice during the teleprompter session.
- **FR-013**: System MUST transcribe the recorded audio and compare it to the original teleprompter text.
- **FR-014**: System MUST display an evaluation report including: accuracy percentage, missed word percentage, list of mispronounced words, and reading speed in words per minute.

#### Writing — AI Evaluation

- **FR-015**: Users MUST be able to type or paste a written passage into the Writing tab.
- **FR-016**: Users MUST be able to select an evaluation standard: IELTS Writing, TOEIC Writing, Aptis Writing, or General English Writing.
- **FR-017**: System MUST submit the writing to an AI evaluation service and display results.
- **FR-018**: System MUST display: Overall Score, Grammar Score, Vocabulary Score, Coherence & Cohesion Score, Suggestions for Improvement, Grammar Corrections, and Better Sentence Suggestions.
- **FR-019**: System MUST show a user-friendly error message if the AI service is unavailable and allow the user to retry.

#### Vocabulary — Spaced Repetition System

- **FR-020**: Users MUST be able to add vocabulary entries containing: word, phonetic transcription, meaning, example sentence, and personal notes.
- **FR-021**: System MUST schedule review sessions based on a spaced repetition algorithm with intervals of: immediate, 1 day, 3 days, 7 days, 14 days, 30 days.
- **FR-022**: Users MUST be able to rate each flashcard as: Easy, Good, Hard, or Again — and the system MUST adjust future review intervals accordingly.
- **FR-023**: System MUST display flashcards in a front/back format, supporting audio pronunciation playback, example sentences, and illustration images.
- **FR-024**: System MUST show the number of cards due for review on the Vocabulary tab entry point.

#### Clipboard Capture & Knowledge Collection

- **FR-025**: System MUST monitor the operating system clipboard in the background and detect text changes.
- **FR-026**: System MUST display a confirmation popup when text is copied, offering "Save" and "Ignore" actions.
- **FR-027**: System MUST save captured content with: text content, timestamp, tags, personal notes, and folder/category.
- **FR-028**: System MUST support the following categories for organization: Vocabulary, Speaking, Writing, Grammar, Reading.
- **FR-029**: System MUST provide full-text search across all saved content.
- **FR-030**: System MUST support filtering saved content by tag, folder/category, and date range.
- **FR-031**: System SHOULD optionally process saved content via AI to extract: summary, new vocabulary, collocations, idioms, and auto-generated flashcards.

### Key Entities

- **Video Session**: A shadowing practice session linked to a YouTube URL; contains subtitle data, repeat range settings, and recording history.
- **Subtitle Entry**: A single subtitle line with start time, end time, and text content; editable by the user.
- **Recording**: A captured audio file from a practice session with its transcription result and accuracy score.
- **Teleprompter Session**: A reading practice session containing the source text, display settings, recording, and evaluation report.
- **Writing Submission**: A user-written passage with selected evaluation mode, submission timestamp, and AI evaluation result.
- **Vocabulary Entry**: A single vocabulary item with word, phonetics, meaning, example, notes, SRS metadata (interval, due date, ease factor), and optional image.
- **Review Session**: A timed study session grouping vocabulary cards due for review; stores per-card ratings and resulting schedule updates.
- **Captured Content**: A clipboard-saved item with text body, source metadata, timestamp, tags, category folder, notes, and optional AI-processed extractions.
- **Flashcard**: A review card generated from a Vocabulary Entry or Captured Content, linked to the SRS scheduler.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete a full shadowing practice session (load video → import subtitles → set repeat range → record → view score) in under 3 minutes of setup time.
- **SC-002**: Accuracy score results are displayed within 10 seconds of the user stopping a recording for segments up to 60 seconds in length.
- **SC-003**: Users can add a new vocabulary word and schedule their first review in under 30 seconds.
- **SC-004**: The clipboard capture popup appears within 2 seconds of the user pressing Ctrl+C in any external application.
- **SC-005**: Full-text search across the saved knowledge library returns results in under 1 second for libraries containing up to 10,000 items.
- **SC-006**: AI writing evaluation results are returned and displayed within 30 seconds of submission under normal network conditions.
- **SC-007**: Users who complete at least 10 spaced repetition review sessions retain 80% or more of studied vocabulary at the 30-day interval (measured by "Easy" or "Good" ratings on final review).
- **SC-008**: 90% of users can successfully complete their first shadowing session without requiring external documentation or support.
- **SC-009**: The application runs without crashing or data loss during an 8-hour continuous background session (for clipboard monitoring).
- **SC-010**: All user data (vocabulary, recordings, saved content) is stored locally and remains accessible after the application is restarted.

---

## Assumptions

- Users are running Windows 10 or Windows 11 as their primary operating system.
- Users have a working microphone connected to their device for all recording features.
- Internet connectivity is required for: YouTube video loading, Speech-to-Text transcription, AI writing evaluation, and AI clipboard processing. Core features (flashcard review, teleprompter display, saved content browsing) are assumed to work offline.
- YouTube video playback is subject to regional availability and YouTube's terms of service; the app does not download or store YouTube video files locally.
- Subtitle files are provided by the user in SRT format; automatic subtitle fetching from YouTube is a best-effort feature and may not be available for all videos.
- The Spaced Repetition algorithm follows SM-2 or an equivalent open algorithm; the exact implementation is a technical decision for the development team.
- AI writing evaluation and clipboard AI processing require a valid API key configured by the user; the app does not bundle API credentials.
- Clipboard monitoring is limited to plain text content; images, files, and other non-text clipboard data are ignored without triggering a popup.
- The application is single-user (no multi-account or sync features in v1); all data is stored locally on the user's machine.
- Audio pronunciation for vocabulary flashcards is sourced from a text-to-speech service and does not require pre-recorded audio files.
