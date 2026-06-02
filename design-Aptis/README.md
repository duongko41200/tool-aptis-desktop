# EngDaily — Lo-fi Study Design System

**Version:** 1.0 · **Status:** internal · **Surface:** desktop app (Tauri + React)

EngDaily is a desktop app for learning English a little every day — vocabulary,
reading, listening, AI speaking practice, and AI-graded writing. Its visual
language is **lo-fi study room**: a warm illustrated background (a cozy desk,
café, or rainy window), soft frosted-glass panels floating on top, a single
lime-green accent, and calm late-night-study mood. This system codifies that
language so any new screen — settings, history, leaderboard, onboarding —
can be built without re-deriving the rules.

The mood is **calm focus, not gamified hype**. Glass is light and readable
(dark ink on white-frost), the accent earns its place, and motion is gentle.

---

## Sources

This system was produced from the EngDaily prototype built in this project
(`EngDaily.html` + `EngDaily/*.jsx`) and the original codebase it targets
(`aptis-desktop-apps/` — React 19 + Vite + Tauri 2 + TypeScript + Tailwind v4).
The prototype is the design source of truth; the codebase is the integration
target.

- **Codebase:** `aptis-desktop-apps/` (in this project, read-only reference)
- **Prototype / mocks:** `EngDaily.html`, `EngDaily/{welcome,dashboard,vocab,speaking,writing}.jsx`
- **Tokens:** `colors_and_type.css` (this folder)
- **Font:** Plus Jakarta Sans + JetBrains Mono (Google Fonts — see substitution note)

> **Inferred / placeholder:** the illustrated background image is a user-supplied
> asset (drag-and-drop slot in the prototype). The logo mark is hand-built from
> a headphone glyph in a lime blob — flag/replace if a real EngDaily mark exists.

---

## Index

| File | What it is |
| --- | --- |
| `README.md` | This document — context, fundamentals, foundations, iconography, index |
| `SKILL.md` | Agent Skill entry point (for use in Claude Code) |
| `colors_and_type.css` | All design tokens as CSS custom properties (`--ed-*`) |
| `preview/` | Per-card HTML used by the Design System tab |
| `ui_kits/engdaily/` | The EngDaily UI kit — screens + components (JSX) + demo |
| `EngDaily.html` + `EngDaily/` | The working clickable prototype (5 screens + vocab modal) |

**Getting started:** read this file → load `colors_and_type.css` → open
`ui_kits/engdaily/index.html` (or `EngDaily.html`) for the live reference.

---

## Content Fundamentals

EngDaily copy is **warm, encouraging, and in Vietnamese** (the product's
primary audience). English appears only as the *content being learned*
(vocabulary words, example sentences, prompts).

- **Voice.** A friendly study companion — gentle, motivating, never strict or
  corporate. It celebrates small wins ("Tốt lắm!", "Cố thêm chút nữa nhé!")
  without being loud or childish.
- **Person.** Address the learner directly with *bạn* (you). Warm but
  respectful. First-person is rare.
- **Casing.** Sentence case everywhere in Vietnamese chrome. English learning
  content keeps its natural casing (word entries lowercase unless proper noun).
- **Length.** Short. A widget headline is one line; a card description is one
  sentence; an eyebrow label is 2–3 words.
- **Numbers & units.** Streaks "9 ngày", word counts "142 từ", scores "82 / 100",
  durations "5 phút". IPA and timers are set in the mono font (`/səˈriːn/`,
  `02:18:05`).
- **Encouragement, not pressure.** Empty states invite ("Hãy bắt đầu lưu từ
  mới nhé"); corrections are framed as hints ("Gợi ý sửa"), never failures.
- **Emoji.** Used *very sparingly* — a single 🌿 in a greeting is the ceiling.
  Status is carried by chips, color, and icons, not emoji.
- **Tone examples.**
  - ✅ *"Chào buổi sáng, Minh 🌿"* / *"Bạn đã học 20/30 phút hôm nay."*
  - ❌ *"WOW! Bạn thật tuyệt vời!!! 🎉🔥💯"*
  - ✅ *"Chạm để xem nghĩa"* / *"Khá tốt — tiến bộ rõ!"*
  - ❌ *"SAI RỒI! Làm lại đi."*

---

## Visual Foundations

### Material
The screen is a **warm illustrated background → dark overlay tint → floating
glass panels**. Three layers always present:
1. **Background image** (`z:0`) — a lo-fi room/café/rain scene. In the
   prototype it's a drag-drop slot; in production it's a hosted asset
   (`assets/images/dashboard_bg.gif`). A CSS gradient (warm green/olive)
   is the fallback behind it.
2. **Overlay** (`z:1`) — a vertical dark gradient (`rgba(10,16,6, --ed-overlay)`,
   darker at the bottom) so white text and glass read against any image.
   Tunable 0–0.7; default `0.34`.
3. **Glass panels** (`z:3`) — the UI itself.

### Glass — the core surface
Two families, used deliberately:
- **Light glass** (default, for content): `rgba(255,255,255,0.74)` + `blur(18px)
  saturate(1.25)`, 1px highlight border `rgba(255,255,255,0.65)`, `--ed-sh-md`
  + inset top highlight. **Dark ink text.** This is the readability decision
  that defines the system — content panels are bright and legible, not dim.
  A nested/secondary variant drops to `0.58` alpha.
- **Dark glass** (for chrome): `rgba(28,36,24,0.42)` + `blur(14px)`, faint white
  border, **white text**. Used only for the top nav pill, the right utility
  rail's round icon buttons, and the lo-fi music player.

> Rule: content lives on **light glass**; floating chrome (bars, rails, player)
> lives on **dark glass**. Never put body content on dark glass.

### Color vibe
**Warm-but-calm, single accent.** Lime green (`--ed-accent #d9e89d`) is the
only emphasis color — fills, primary buttons (with a glow shadow), the logo,
active nav, progress. Everything else is neutral ink on glass. Status colors
are muted and natural (sage `good`, amber `warn`, terracotta `bad`, dusty-blue
`info`) — **never** a harsh saturated red/green. Imagery is warm, softly lit,
slightly hazy; avoid cold/clinical or high-contrast B&W.

### Typography
**Plus Jakarta Sans** for everything, **JetBrains Mono** for IPA, timers, and
standalone figures. Weights: `400/500` body, `600` emphasis, `700/800` for
titles and emphatic numbers. Display headings are tight (`-0.025em`). Uppercase
eyebrow labels at 11px / `0.12em` tracking / weight 800 in `--ed-ink-3`.
Hero titles are kept to **one line** (`white-space: nowrap` + clamp) — wrapping
two lines breaks the calm rhythm.

### Spacing & layout
4px base rhythm. Page content is centered or capped at `~1080px`. Fixed chrome:
top bar (22/28px padding), bottom-left widget stack (`w≈268`, gap 11), bottom-
right utility rail (round buttons, gap 11). Cards group with `gap:16` grids,
never bare margins. Card padding `20–26px`.

### Corner radii
`12 / 18 / 26 / 34 / 9999`. Pills (`9999`) are for **buttons, chips, icon
buttons, nav** only — never cards. Primary cards use `26`; hero panels & modals
`34`; small tiles & list rows `12`.

### Borders
Hairlines only, all 1px. On light glass: inner highlight `rgba(255,255,255,0.65)`
+ edge divider `rgba(40,55,30,0.08)`. Depth comes from blur + shadow + the inset
top highlight, **not** from heavy strokes. Hover may step a border to accent.

### Shadow / elevation
Pick one recipe per surface: `--ed-sh-sm` (resting tiles), `--ed-sh-md`
(glass cards), `--ed-sh-lg` (modals, hovered cards), `--ed-sh-glow` (accent
buttons). Never mix two shadow recipes on one element.

### Hover & press
- **Cards:** lift `translateY(-4px)`, border → accent, shadow → `lg`. ~220ms.
- **Icon/nav buttons:** lift 1px, background deepens (dark glass → darker;
  light → brighter).
- **Press:** `translateY(1px)`. No scale springs.
- **Active nav / selected item:** filled accent background, dark ink.

### Motion
Gentle and purposeful. `150ms` control feedback; `220ms` toggles/lifts;
`600ms` content entrance; `900ms` progress ring. Easing `cubic-bezier(0.4,0,0.2,1)`.
**Critical rule:** entrance animations are **transform-only** (translateY / scale)
— never animate `opacity` from 0 as a persistent state, or content can get
stuck invisible if the runtime pauses the animation. `animate-pulse-soft` (a
1.025 scale breath) is reserved for the primary CTA and the recording mic.
A light **rain/particle** layer drifts behind the glass; it must be toggleable.

### Transparency & blur
Reserve `backdrop-filter` for the glass roles above. Don't blur the background
image for decoration — the overlay tint handles legibility.

---

## Iconography

EngDaily uses a **linear stroke** icon language — ~1.7px stroke on a 24×24
grid, round caps and joins, no fill (fill only for tiny status dots / play
triangles). In the prototype these are hand-defined as a small inline SVG set
(`Icon` in `EngDaily/lib.jsx`).

- **In production, use [Lucide](https://lucide.dev) (`lucide-react`).** The
  prototype's set was drawn to match Lucide's stroke language, so names map
  almost 1:1: `play, pause, mic, pencil, chat, user, settings, search, trophy,
  flame, clock, cards, headphones, sparkle, volume, check, chevron-right`, etc.
  The codebase also declares Material Symbols — either is acceptable; pick one
  and stay consistent.
- **Sizing.** 20px default in chrome, 16–18px in dense rows/list items, 24px in
  feature placements (empty states, card headers). Color inherits `currentColor`.
- **The accent-chip icon pattern.** Feature icons sit in a rounded square
  (`--ed-r-md`) filled with `--ed-accent`, dark-ink glyph, `--ed-sh-glow`.
- **Logo mark.** A headphone glyph inside an organic lime blob
  (`border-radius: 36% 64% 60% 40% / 50% 42% 58% 50%`, rotated -4°), wordmark
  "EngDaily" weight 800. Placeholder — replace with the real mark if one exists.
- **Emoji / unicode as icons.** Avoid (one decorative 🌿 in greeting copy is the
  only exception). Use the icon set for all functional iconography.

> **Substitution flagged:** the icon set is hand-rolled in the prototype and
> recommended to swap for Lucide in production. The logo is inferred. Re-attach
> real brand assets to refine.

---

## Cross-platform note

The target codebase is **Tauri (desktop)** built with web tech, so these tokens
port directly. If a mobile/RN version is ever built: keep token names stable,
and translate the rain/particle layer to a native paint rather than a DOM
animation. Glass `backdrop-filter` may need a solid-color fallback on platforms
without blur support.

---

## Font Substitution Notice

**Plus Jakarta Sans** and **JetBrains Mono** are loaded from Google Fonts.
The codebase already ships Plus Jakarta Sans. If EngDaily adopts a custom face,
drop it into `fonts/` and update `--ed-font` / `--ed-font-mono`. For offline
(Tauri) builds, self-host both rather than relying on the CDN.
