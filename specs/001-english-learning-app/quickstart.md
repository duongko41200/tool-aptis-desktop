# Developer Quickstart: English Learning Desktop Application

**Branch**: `001-english-learning-app` | **Date**: 2026-05-31

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20 LTS+ | https://nodejs.org |
| Rust | 1.77+ (stable) | `rustup` |
| Tauri CLI | v2.x | `cargo install tauri-cli` |
| pnpm | 8+ | `npm i -g pnpm` |
| WebView2 Runtime | Latest | Pre-installed on Windows 11; download for Windows 10 |

---

## Project Bootstrap

### 1. Initialize Tauri + React project

```bash
pnpm create tauri-app@latest tool-aptis-desktop \
  --template react-ts \
  --manager pnpm

cd tool-aptis-desktop
pnpm install
```

### 2. Install frontend dependencies

```bash
pnpm add react-router-dom@6
pnpm add @reduxjs/toolkit react-redux
pnpm add @tanstack/react-query
pnpm add tailwindcss @tailwindcss/vite
pnpm add @tauri-apps/api
pnpm add @tauri-apps/plugin-sql
pnpm add @tauri-apps/plugin-store
pnpm add @tauri-apps/plugin-clipboard-manager
```

### 3. Install Tauri plugins (Rust side)

In `src-tauri/Cargo.toml`, add:

```toml
[dependencies]
tauri = { version = "2", features = ["tray-icon", "devtools"] }
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
tauri-plugin-store = "2"
tauri-plugin-clipboard-manager = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
rusqlite = { version = "0.31", features = ["bundled"] }
tokio = { version = "1", features = ["full"] }
reqwest = { version = "0.12", features = ["json", "multipart"] }
arboard = "3"
```

### 4. Configure Tauri capabilities

In `src-tauri/capabilities/default.json`, add the required permissions for clipboard, SQL, and store plugins.

### 5. Set up SQLite migrations

```
src-tauri/
└── migrations/
    └── 001_initial_schema.sql   ← paste schema from data-model.md
```

Load migrations in `main.rs`:

```rust
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new()
            .add_migrations("sqlite:aptis.db", vec![
                Migration {
                    version: 1,
                    description: "initial_schema",
                    sql: include_str!("../migrations/001_initial_schema.sql"),
                    kind: MigrationKind::Up,
                }
            ])
            .build())
        // ... other plugins
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## Project Structure

```
tool-aptis-desktop/
├── src/                          # React frontend
│   ├── main.tsx                  # App entry point
│   ├── App.tsx                   # Root component + router
│   ├── components/
│   │   ├── speaking/
│   │   │   ├── ShadowingTab.tsx
│   │   │   ├── VideoPlayer.tsx
│   │   │   ├── SubtitleEditor.tsx
│   │   │   ├── RepeatRangeControl.tsx
│   │   │   ├── RecordingControls.tsx
│   │   │   ├── AccuracyScore.tsx
│   │   │   ├── TeleprompterTab.tsx
│   │   │   └── TeleprompterDisplay.tsx
│   │   ├── writing/
│   │   │   ├── WritingTab.tsx
│   │   │   ├── WritingEditor.tsx
│   │   │   └── EvaluationReport.tsx
│   │   ├── vocabulary/
│   │   │   ├── VocabularyTab.tsx
│   │   │   ├── AddWordForm.tsx
│   │   │   ├── Flashcard.tsx
│   │   │   └── ReviewSession.tsx
│   │   ├── clipboard/
│   │   │   ├── ClipboardTab.tsx
│   │   │   ├── SavePopup.tsx
│   │   │   ├── ContentLibrary.tsx
│   │   │   └── SearchBar.tsx
│   │   └── shared/
│   │       ├── TabBar.tsx
│   │       ├── LoadingSpinner.tsx
│   │       └── ErrorBoundary.tsx
│   ├── store/
│   │   ├── index.ts              # Redux store setup
│   │   ├── appSlice.ts           # Global app state (active tab, settings)
│   │   ├── clipboardSlice.ts     # Clipboard popup state
│   │   └── recordingSlice.ts     # Active recording state
│   ├── hooks/
│   │   ├── useVocabulary.ts      # TanStack Query hooks for vocabulary
│   │   ├── useCapturedContent.ts # TanStack Query hooks for knowledge library
│   │   ├── useWritingHistory.ts  # TanStack Query hooks for writing submissions
│   │   └── useRecording.ts       # MediaRecorder hook
│   ├── services/
│   │   ├── tauriCommands.ts      # Typed wrappers for all invoke() calls
│   │   └── youtubePlayer.ts      # YouTube IFrame API wrapper
│   └── types/
│       └── index.ts              # Shared TypeScript types
│
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── main.rs               # Tauri app entry, plugin registration
│   │   ├── commands/
│   │   │   ├── mod.rs
│   │   │   ├── speaking.rs       # Shadowing + Teleprompter commands
│   │   │   ├── writing.rs        # Writing evaluation commands
│   │   │   ├── vocabulary.rs     # SRS + flashcard commands
│   │   │   └── clipboard.rs      # Clipboard capture commands
│   │   ├── services/
│   │   │   ├── srs.rs            # SM-2 algorithm implementation
│   │   │   ├── gemini.rs         # Gemini API client
│   │   │   ├── stt.rs            # Speech-to-Text via Gemini audio
│   │   │   └── clipboard_watcher.rs  # Background clipboard polling
│   │   └── db/
│   │       ├── mod.rs
│   │       └── pool.rs           # SQLite connection pool
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── specs/
│   └── 001-english-learning-app/ # This feature's spec artifacts
├── package.json
├── pnpm-lock.yaml
└── vite.config.ts
```

---

## Running the App

```bash
# Development (hot reload)
pnpm tauri dev

# Build for production
pnpm tauri build
```

---

## Environment Configuration

Create `src-tauri/.env` (gitignored):

```env
# No API keys here — stored in Tauri secure store at runtime
```

The user configures their Gemini API key via the Settings screen; it is stored using `tauri-plugin-store` in the OS keychain-backed store, never in plaintext files or SQLite.

---

## Testing Strategy

| Layer | Tool | Scope |
|-------|------|-------|
| Rust unit tests | `cargo test` | SRS algorithm, text comparison, SQL queries |
| Frontend unit tests | Vitest | Redux slices, utility functions, hooks |
| Component tests | Vitest + @testing-library/react | Individual UI components |
| Integration tests | Tauri test harness | End-to-end IPC command flows |

Run all tests:

```bash
# Frontend
pnpm test

# Rust backend
cd src-tauri && cargo test
```
