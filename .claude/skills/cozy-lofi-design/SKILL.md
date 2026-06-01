---
name: "cozy-lofi-design"
description: "Apply Cozy Lofi web design style — anime illustration background, glassmorphism cards, floating bubble particles, warm color palette. Based on EngDaily-style UI."
argument-hint: "Optional: component name or screen to generate (e.g. 'hero section', 'sidebar cards', 'navbar')"
user-invocable: true
disable-model-invocation: false
---

## User Input

```text
$ARGUMENTS
```

Apply Cozy Lofi design system to the requested component or screen. If no argument is provided, output the full design token sheet and component library.

---

## Design System

### Color Tokens

```css
:root {
  --accent-primary:   #D4F56A;               /* CTA button, highlights */
  --accent-warm:      #F5C842;               /* streak icon, warm accents */
  --surface-glass:    rgba(255,255,255,0.08);/* card backgrounds */
  --surface-dark:     rgba(20,18,14,0.75);   /* sidebar, overlays */
  --text-primary:     #F5F0E8;               /* headings */
  --text-secondary:   rgba(245,240,232,0.65);/* sub-labels */
  --border-glass:     rgba(255,255,255,0.15);/* card borders */
}
```

### Typography

```
Font stack:
  Heading : "Be Vietnam Pro", "Nunito", sans-serif  — weight 600–700
  Body    : "Inter", "Be Vietnam Pro"               — weight 400–500

Scale:
  Hero text  : 2rem–2.4rem, letter-spacing -0.02em
  Sub-label  : 0.8rem, uppercase, letter-spacing 0.08em, opacity 0.7
  Button     : 1rem, font-weight 600
```

---

## Background System

```
Layer 1 — Illustrated Background (full-screen)
  - Anime-style scene: study room, desk, lamp, books, plants
  - Hand-painted look, soft brush strokes, muted warm palette
  - object-fit: cover; position: center
  - Only use illustration — never real photos

Layer 2 — Gradient Overlay
  - linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 100%)

Layer 3 — Ambient Particles (see Particle section below)
```

---

## Glassmorphism Card

```css
.glass-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px) saturate(160%);
  -webkit-backdrop-filter: blur(12px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
}

.glass-card--dark {
  background: rgba(15, 12, 8, 0.72);
  border-color: rgba(255, 255, 255, 0.08);
}
```

Firefox fallback: increase `background` opacity to 0.6 when `backdrop-filter` unsupported.

---

## Button System

```css
/* Primary CTA — lime pill */
.btn-primary {
  background: #D4F56A;
  color: #1a1a0f;
  padding: 14px 48px;
  border-radius: 9999px;
  font-weight: 700;
  font-size: 1.05rem;
  border: none;
  box-shadow: 0 4px 20px rgba(212, 245, 106, 0.35);
  transition: transform 0.15s, box-shadow 0.15s;
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(212, 245, 106, 0.5);
}
.btn-primary:active { transform: scale(0.97); }

/* Ghost outline (login) */
.btn-ghost {
  background: transparent;
  border: 1.5px solid rgba(255, 255, 255, 0.6);
  color: white;
  border-radius: 9999px;
  padding: 8px 24px;
}

/* Pill badge (time/tag) */
.badge-pill {
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(8px);
  border-radius: 9999px;
  padding: 4px 12px;
  font-size: 0.75rem;
  color: white;
}
```

---

## Particle / Bubble Animation

```css
@keyframes float-bubble {
  0%   { transform: translateY(0)    translateX(0);   opacity: 0.3; }
  50%  { transform: translateY(-15px) translateX(4px); opacity: 0.7; }
  100% { transform: translateY(-30px) translateX(-3px);opacity: 0.1; }
}

.bubble {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.04);
  animation: float-bubble linear infinite;
  pointer-events: none;
}
```

Generate 25–40 bubbles via JS — randomize: size 6–20px, duration 4–9s, delay 0–5s, top/left 0–100%.

---

## Layout Structure

```
┌────────────────────────────────────────────────────┐
│  NAVBAR  Logo ─────────────────── icon  btn-ghost  │  h:56px glass
├──────────┬────────────────────────┬─────────────────┤
│ LEFT     │      HERO CENTER       │  RIGHT ICON BAR │
│ PANEL    │                        │  (vertical)     │
│ ~200px   │  Headline (2rem)       │  48px wide      │
│ glass    │  CTA btn-primary       │                 │
│ cards    │  Sub-labels            │                 │
│ fixed    │  badge-pill (time)     │                 │
│ bottom   │                        │                 │
├──────────┴────────────────────────┴─────────────────┤
│  BOTTOM BAR  activity shortcuts                      │  h:52px dark glass
└────────────────────────────────────────────────────┘
```

---

## Left Sidebar Micro-Cards

```
Each card: glass-card--dark, width ~200px, padding 10px 14px
Structure:
  [LABEL small uppercase muted]
  [Title bold white]
  [Optional sub-line muted]

Stack vertically, gap: 8px
Position: fixed left, bottom-anchored, above particles (z-index)
```

---

## Bottom Navigation Bar

```css
.bottom-bar {
  position: fixed;
  inset: auto 0 0 0;
  height: 52px;
  background: rgba(20, 18, 14, 0.88);
  backdrop-filter: blur(16px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 16px;
}
/* Active tab: color var(--accent-primary), underline 2px */
```

---

## Micro-interactions

| Element | Interaction |
|---|---|
| Cards | hover: scale(1.02), box-shadow +4px |
| CTA button | hover: translateY(-2px) glow; active: scale(0.97) |
| Background | parallax: background-attachment fixed |
| Streak icon | pulse glow animation, color var(--accent-warm) |
| Timer badge | monospace digit flip transition |

---

## Responsive

| Breakpoint | Change |
|---|---|
| < 768px | Hide left sidebar; hero full width |
| < 480px | Button shrinks; font-scale 90% |
| Right icon bar | Always visible, shrinks on mobile |

---

## Implementation Checklist

- [ ] Preload background illustration: `<link rel="preload" as="image">`
- [ ] `backdrop-filter` fallback for Firefox (opaque background)
- [ ] Bubbles generated by JS loop — no hardcoded DOM
- [ ] All text on glass cards: contrast ratio ≥ 4.5:1
- [ ] Dark mode by default — no light mode toggle needed
- [ ] Fonts: load "Be Vietnam Pro" from Google Fonts with `display=swap`
