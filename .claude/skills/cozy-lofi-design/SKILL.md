---
name: engdaily-design
description: Use this skill to generate well-branded interfaces and assets for EngDaily — a lo-fi English-learning desktop app — either for production or throwaway prototypes/mocks. Contains design guidelines, color/type/spacing tokens, fonts, iconography, and a full UI kit of components and screens.
user-invocable: true
---

Read `README.md` in this skill first — it covers the product context, content
voice, full visual foundations, and iconography. Then load `colors_and_type.css`
for the exact `--ed-*` tokens, and open `ui_kits/engdaily/index.html` for the
live component + screen reference.

Core rules to honor:
- Warm illustrated background → dark overlay → **light-glass content panels**
  (dark ink, readable) with **dark-glass chrome** (white text) for bars/rails/player.
- One accent only: lime `--ed-accent` (#d9e89d), dark ink on it, glow shadow on
  primary buttons.
- Plus Jakarta Sans everywhere; JetBrains Mono for IPA, timers, figures.
- Radii 12/18/26/34/pill (pills = buttons & chips only). 4px spacing rhythm.
- Gentle motion, transform-only entrances (never persist opacity:0). Toggleable rain layer.
- Vietnamese chrome, warm & encouraging tone, emoji almost never.
- Linear icons (~1.7px stroke); use Lucide in production.

If creating visual artifacts (slides, mocks, throwaway prototypes), copy assets
out and produce static HTML files for the user to view. If working in production
code (the Tauri + React + Vite + Tailwind codebase), copy tokens/components and
apply the rules above.

If invoked with no other guidance, ask what to build, ask a few focused
questions, then act as an expert EngDaily designer and output HTML artifacts or
production code as needed.
