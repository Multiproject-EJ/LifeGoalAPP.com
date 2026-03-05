# HabitGame Landing Page — Mobile-First Vision Spec

## Status: Planning (not yet implemented)

This document captures the target-state vision for the HabitGame landing page.
The hero section (Section 1) is live. Sections 2–8 will be built incrementally
as part of the DEVPLAN world-site slices.

---

## Brand Identity

- **Public-facing name:** HabitGame
- **Tagline:** Level Up Your Life  
- **Core message:** HabitGame is not a habit tracker — it is a life progression engine.
- **Tone:** Mobile game intro screen. Visual-first. Minimal text.

---

## Design Principles

- Mobile-first: design for 390×844 (modern iPhone), scale out
- Each section ≈ one phone screen
- Large visuals dominate; text is minimal (1–2 lines max per section)
- Large touch-friendly buttons (min 48px height)
- Smooth scroll transitions between sections
- Floating animated game elements (coins, particles, glow)
- Think: mobile game marketing page (Monopoly GO! style)
- Avoid: text walls, marketing paragraphs, static layouts

---

## Visual Style

- Large hero illustrations and 3D-style game artwork
- Floating UI elements and animated particles
- Coins, XP orbs, lotus flowers, and rewards floating in space
- Subtle parallax motion and glow effects
- Buttons styled as game buttons
- CSS-only animations preferred (lightweight, battery-friendly)
- Lottie as fallback for complex animations
- `prefers-reduced-motion` respected throughout

---

## Section Spec (vertical scroll — poster-to-poster)

### Section 1 — Hero Screen (LIVE)

Full-screen visual with atmospheric orbs, floating particles.

**Copy:**
- Title: HABITGAME
- Subtitle: Level Up Your Life
- Supporting: Turn real-world habits into a progression system.
- Primary CTA: Start Your Game
- Secondary: Log in
- Footer line: Build habits • Earn rewards • Unlock your future

**Visual elements:** Floating orbs, star field, cosmic sky background.

---

### Section 2 — Life Is A Game

**Visual:** XP coins flying into an animated progress bar. Level counter increases (1 → 29 → 50 → 100).

**Copy:**
- Title: Life Is The Ultimate Game
- Line: Every habit earns XP.

**Animation:** Progress bar fills with glowing particles. Character silhouette grows stronger.

---

### Section 3 — Build Momentum  

**Visual:** Energy bar filling with glowing particles.

**Copy:**
- Title: Small Actions Build Momentum

**Animation:** Subtle particle flow into energy bar.

---

### Section 4 — The Game Systems

**Visual:** Floating icons around a controller (or floating islands).

**Icons + labels:**
- 🎮 Game — Your life becomes a progression journey
- ⚡ Energy — Manage daily momentum
- 🏆 Score — Track growth and milestones
- 💰 Bank — Earn coins, rewards, items
- 🧘 Zen — Balance action with reflection

**Copy:**
- Title: Your Life, Gamified

**Animation:** Icons/islands float with subtle drift. Glow on approach.

---

### Section 5 — Progression

**Visual:** Character jumping between floating islands. XP coins trail behind. Level counter increases.

**Copy:**
- Title: Progress Like A Game Character
- Lines: Small habits become momentum. Momentum becomes growth. Growth becomes transformation.

---

### Section 6 — Rewards

**Visual:** Treasure chest opens. Coins and XP burst out.

**Copy:**
- Title: Earn Rewards For Real Progress

**Animation:** Burst particles on scroll-into-view.

---

### Section 7 — Zen Balance

**Visual:** Glowing lotus with calm particles.

**Copy:**
- Title: Balance Action With Reflection

**Animation:** Slow pulse glow, drifting particles.

---

### Section 8 — Final CTA

**Visual:** Controller hovering above glowing world. Energy particles flow upward.

**Copy:**
- Title: Ready To Start Your Game?
- Body: Your life is already happening. HabitGame simply makes the progress visible.
- Primary CTA: Start Your Game
- Footer: HabitGame — Level Up Your Life

---

## Fake Gameplay Screen Strategy

Mobile game landing pages typically include a fake gameplay screen near the top.
The existing controller UI / board game UI could serve as this.

Recommended flow:
1. Hero artwork
2. "Level Up Your Life"  
3. Actual app screenshot / gameplay preview
4. Game systems
5. Rewards
6. CTA

This combination converts extremely well for game-style products.

---

## Implementation Mapping to DEVPLAN Slices

| Landing Section | DEVPLAN Slice | Status |
|---|---|---|
| Section 1 (Hero) | Slice 1 + visual upgrade | ✅ Live |
| Section 2 (Life Is A Game) | Slice 5 (Journey preview) | ⬜ Planned |
| Section 3 (Build Momentum) | Slice 5 | ⬜ Planned |
| Section 4 (Game Systems) | Slice 4 (visual pack) or new | ⬜ Planned |
| Section 5 (Progression) | Slice 5 | ⬜ Planned |
| Section 6 (Rewards) | Slice 7 (Rewards tease) | ⬜ Planned |
| Section 7 (Zen) | New section | ⬜ Planned |
| Section 8 (Final CTA) | Slice 9 (Trust + SEO) | ⬜ Planned |

---

## Performance Constraints (from DEVPLAN)

- Additional world-route JS: ≤ 120KB gzip
- Hero background image: ≤ 250KB
- Non-critical assets: lazy loaded via IntersectionObserver
- Animations: CSS-only preferred, Lottie as exception
- Preload only Section 1 assets; everything else deferred
- `prefers-reduced-motion` disables all non-essential animation

---

## Mobile UX Requirements

- Buttons: min 48px height, thumb-friendly in lower half
- Safe areas: respect notch (top) and home indicator (bottom)  
- Section spacing: generous vertical padding between poster screens
- Typography: large bold titles, minimal supporting text
- Scroll: smooth, native. No scroll-jacking.
- Each section uses scroll-snap for clean phone-screen alignment

---

## Asset Pipeline (future)

When visual pack work begins, assets go in `/public/world-assets/`:

Priority list:
1. world-bg-main.webp (hero background)
2. panel-glass-xl.webp
3. btn-primary-start.webp  
4. fx-bottom-glow.webp
5. journey-node-active.webp
6. journey-path-glow.webp
7. role-philosopher-card.webp
8. reward-trait-card-pack.webp
9. reward-xp-orb.webp
10. world-bg-blur.webp

All WebP, compressed, lazy-loaded except #1.
