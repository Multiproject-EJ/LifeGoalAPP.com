# Actions Tab UI Analysis (Background Cards & Containers)

## Scope
This analysis focuses on the **Actions launcher view** shown in the provided screenshot, with emphasis on:
- Outer/background containers
- Inner cards and panel layering
- Contrast, depth, and spacing behavior

## UI Layer Breakdown (from screenshot)

### 1) Scene background layer
- Uses a dark, game-like gradient canvas (blue/teal to indigo) behind the primary Actions content.
- Visual intent: establish immersion and keep the Actions module floating above the game HUD.

### 2) Outer Actions module container
- Large rounded rectangle with subtle border glow.
- Semi-transparent dark/blue fill (not flat white).
- Acts as a frame around all Actions content.
- Visual role: creates clear separation from the underlying game controller image.

### 3) Inner light workspace card
- Prominent light-gray/white rounded card nested inside the outer container.
- Provides high readability for input and CTA tiles.
- Includes soft shadow and clean edge treatment.
- Visual role: “functional surface” where interaction happens.

### 4) Input strip container
- Distinct darker strip just below subtitle and above action tiles.
- Appears as a nested panel with its own shadow and contrast.
- Text field itself is darker still, creating a layered inset effect.

### 5) Action tile cards (Projects / Timer)
- Tall rounded cards, white/light background.
- Equal width, fixed rhythm, centered icon and label.
- Ample internal whitespace; card edges and spacing are consistent.

## Current Code Mapping (existing implementation)

The launcher hierarchy in code is:
- `actions-tab actions-tab--launcher`
- `actions-tab__launcher-card`
- `QuickAddAction`
- `actions-tab__launcher-actions` with `actions-tab__launcher-button` cards.

Relevant implementation files:
- `src/features/actions/ActionsTab.tsx`
- `src/features/actions/ActionsTab.css`

## Key Observations vs Screenshot

1. **Outer container tone mismatch**
- Screenshot: darker outer panel with stronger visual boundary.
- Current CSS: `actions-tab__launcher-card` uses a lighter glass treatment (`rgba(255,255,255,...)`) and reads more “frosted white” than “dark framed panel”.

2. **Insufficient container separation**
- Screenshot has clear *two-stage* nesting (dark shell + light inner board).
- Current launcher card blends card/background more than desired, reducing hierarchy clarity.

3. **Input panel depth could be stronger**
- Screenshot shows pronounced stacked depths (dark strip + darker input field).
- Current quick-add styling is cleaner/minimal and less game-console-like.

4. **Action cards are close but not fully matched**
- Current `actions-tab__launcher-button` cards are square via `aspect-ratio: 1 / 1`.
- Screenshot cards look slightly taller with more vertical breathing room.

5. **Background/HUD overlap management**
- Screenshot includes bottom HUD overlap and translucent foreground circles.
- Existing Actions layout is structurally sound, but would benefit from stronger safe bottom spacing and z-layer discipline when HUD overlays are visible.

## Recommendations (design-first)

### A) Establish explicit 3-surface hierarchy
1. **Outer shell** (dark translucent): high radius, subtle bright border.
2. **Inner workspace** (light card): high contrast for readability.
3. **Control surfaces** (input strip + tiles): medium contrast, consistent radii.

### B) Adjust card/container radii system
- Outer shell radius: ~28–32px
- Inner workspace radius: ~22–24px
- Input strip radius: ~14–16px
- Tile radius: ~18–20px

Use a tokenized radius scale to keep all nested surfaces visually coherent.

### C) Improve depth via controlled shadows
- Outer shell: low-opacity broad shadow.
- Inner workspace: medium shadow.
- Input strip and tiles: short-distance shadow for touch affordance.

Avoid heavy blur stacking; use 2–3 consistent shadow recipes.

### D) Strengthen spacing rhythm
- Increase separation between subtitle → input strip → tiles.
- Preserve equal tile widths while allowing slightly taller card ratio.
- Maintain consistent edge padding around all inner content.

### E) Accessibility/contrast checks
- Ensure subtitle contrast remains readable on dark shell.
- Ensure label text contrast on tile cards meets WCAG AA.
- Keep focus ring visibility strong on all interactive cards/buttons.

## Implementation Priorities (low risk)

1. Introduce a dedicated **outer launcher shell** wrapper class (dark surface).
2. Keep existing launcher card as **inner light workspace**.
3. Update quick-add input strip to include explicit container background and inset depth.
4. Shift launcher tile ratio from perfect square to slightly vertical cards.
5. Validate in mobile viewport with bottom navigation/HUD overlap.

## Expected UX Outcome

After these adjustments, the Actions launcher should feel:
- More consistent with the game-themed visual language
- More legible due to stronger surface hierarchy
- More tactile/interactive due to clearer container depth and card affordances
