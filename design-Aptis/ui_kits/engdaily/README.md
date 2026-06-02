# EngDaily UI Kit

A high-fidelity, clickable recreation of the EngDaily lo-fi study app. Open
`index.html` for the full prototype — it boots on the Welcome screen and lets
you navigate the whole product.

## Screens
- **Welcome** (`/`) — hero CTA, practice shortcuts, streak widgets, utility rail
  with working Profile / Settings / Search popovers.
- **Dashboard** — daily hub: progress ring, three practice mode cards, recent
  activity, lo-fi music player, word of the day.
- **AI Speaking** — chat with live corrections, recording mic, topic + error panels.
- **Writing** — prompt + live requirement checklist, editor, submit to grade.
- **Writing Feedback** — score ring, Grammar / Vocab / Structure / Model tabs.
- **Vocab modal** — frosted flashcard reviewer (conditional front/back, **not** a
  3D flip), deck list, empty state.

## Components (`EngDaily/*.jsx`)
- `lib.jsx` — `Icon` (inline linear SVG set), `Logo`, `Widget`, `useCountdown`.
- `welcome.jsx` — `WelcomeScreen`, `TopBar`, `ProfilePopover`, `SettingsPopover`, `SearchPopover`.
- `dashboard.jsx` — `DashboardScreen`, `Ring`, `ModeCard`, `Player`.
- `vocab.jsx` — `VocabModal`.
- `speaking.jsx` — `SpeakingScreen`, `Bubble`.
- `writing.jsx` — `WritingScreen`, `FeedbackScreen`, `ScoreBar`.
- `app.jsx` — state-machine routing, background layers, rain, Tweaks wiring.

## Notes
- Tokens come from `EngDaily/styles.css` (mirror of root `colors_and_type.css`).
  When building production, prefer the `--ed-*` tokens.
- The background is a drag-and-drop `<image-slot>` in the prototype; swap for a
  hosted image in production.
- Built as React-via-Babel for preview only. For the real app (Tauri + Vite +
  TS), see the integration guidance in the root README and the handoff package.
