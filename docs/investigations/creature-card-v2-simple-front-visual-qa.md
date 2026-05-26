# Creature Card v2 Slice 6D — Visual QA (Simple Front in Sanctuary)

Date: 2026-05-26 (UTC)

## Scope
Reviewed the Sanctuary roster grid implementation that now renders the Creature Card Simple Front in `ScoreTab` and its corresponding styles in `gamification.css`.

## Method
- Static visual QA pass from render markup and CSS tokens for Sanctuary cards.
- Focused checks against requested criteria:
  1. Card size/spacing on mobile
  2. Creature art scale/cropping
  3. Name readability
  4. Rarity/star visibility
  5. Active companion state clarity
  6. Locked card consistency vs unlocked cards
  7. Cozy/magical feel vs battle-card tone
  8. Overflow/clipping/safe-area behavior
- Validation commands:
  - `npm run test:island-run`
  - `npm run build`

## Screenshots
- Not captured in this pass (no dedicated visual capture workflow was available in this run).
- Recommend a tiny follow-up QA pass with explicit mobile viewport screenshots (e.g., iPhone SE/13/15 Pro Max widths).

## Findings (PASS / ISSUE)

### 1) Card size/spacing on mobile
- **PASS:** 2-column grid with reduced mobile padding and min-height at small screens appears intentionally compact and scannable.
- **ISSUE:** At very narrow widths, fixed card min-height + two-column layout can make each card feel text-dense and slightly cramped for long names/metadata.

### 2) Creature art scale/cropping
- **PASS:** Art uses `object-fit: contain`, preventing aggressive crop; avatar mask and drop shadow preserve illustration silhouette.
- **ISSUE:** Fixed `4.25rem` avatar can under-emphasize art detail for higher-tier cards; feels slightly “icon chip” vs “featured companion”.

### 3) Name readability
- **PASS:** Name has centered presentation and strong dark indigo text color.
- **ISSUE:** No line-clamp/overflow strategy on card title (`h3`) may create inconsistent card rhythm for long localized names.

### 4) Rarity/star visibility
- **PASS:** Star badge + rarity text both exist and have tier-specific chroma variants (common/rare/mythic), so rarity encoding is redundant and resilient.
- **ISSUE:** Upper row can become busy when active state is present; rarity label may compete with active pill on smaller cards.

### 5) Active companion state clarity
- **PASS:** Active state has three reinforcement channels: highlighted border/shadow, dedicated top-right pill, and layout adjustment.
- **ISSUE:** Mobile fallback removes right-padding and shifts topline downward; while functional, it introduces a denser “stacked” feel.

### 6) Locked card consistency vs unlocked cards
- **PASS:** Locked cards retain same structure but switch to dashed border, muted palette, lock glyph, and locked-copy semantics.
- **ISSUE:** Because locked cards preserve most decorative framing, locked vs unlocked differentiation is good but could be stronger at a glance in fast scroll.

### 7) Cozy/magical feel vs battle-card tone
- **PASS:** Rounded corners, soft gradients, orb avatar treatment, and pastel shadows land clearly on cozy/magical rather than battle/competitive.
- **ISSUE:** Minor: border + badge density can read a little “system card” under information-heavy states (active + rarity + metadata).

### 8) Overflow/clipping/safe-area
- **PASS:** Small-screen safe-area insets are explicitly handled with `env(safe-area-inset-left/right)` and sanctuary container padding.
- **PASS:** Card `overflow: hidden` prevents decorative bleed.
- **ISSUE:** `overflow: hidden` plus fixed internal spacing may clip edge-case long strings or translated labels in some locales.

## Recommended tiny follow-up PRs
1. **Mobile spacing polish:** Add a sub-380px breakpoint to slightly reduce typography and tighten metadata gap, or switch to single-column fallback for ultra-narrow devices.
2. **Title resilience:** Add 2-line clamp + fallback ellipsis for `h3` name field to stabilize card rhythm.
3. **Active/rarity coexistence:** Slightly shrink or de-emphasize rarity label when active pill is present (mobile only).
4. **Locked quick-scan clarity:** Increase locked-state contrast separation (e.g., lighter saturation for background + stronger lock badge prominence).
5. **Art presence tweak:** Increase avatar diameter by a small amount on discovered cards (or conditional by rarity) while keeping contain behavior.

## Validation results
- `npm run test:island-run` → PASS (757 passed, 0 failed).
- `npm run build` → PASS (production build succeeded).
- Build emitted non-blocking Vite chunk-size/dynamic-import warnings (existing baseline, not specific to this slice).

## Overall recommendation
Proceed with targeted visual micro-polish before broader card adoption. The current simple front is functionally strong and stylistically aligned, with most risks concentrated in small-screen density and information hierarchy under active states.
