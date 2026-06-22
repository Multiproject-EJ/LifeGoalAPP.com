# Today Tab — Struggling-Habit Coach (in the expanded habit card)

_Date: 2026-06-22_
_Branch: `claude/gallant-volta-qrzkdh`_

## PASS — safe to merge

Adds a deterministic **coach panel** inside the expanded habit card on the Today tab. It appears only
for habits the existing health model flags as struggling (`at_risk` / `stalled` / `in_review`) and
gives an encouraging read of the situation plus up to three concrete, tap-here-now tips. No AI/edge
function required; AI-ready via the existing `onOpenAiCoach` hook. `tsc -b`, `npm run build`, and
`npm run test:habit-offer-sort` all green.

## What it does

When a habit in the Today checklist is expanded, a coach block renders **first** in the details panel
if (and only if) the habit is struggling:

- **Headline + badge** keyed to the health state (At risk / Stalled / Needs review).
- **Message** — a plain-language read derived from the live signals (e.g. "kept this going ~30% of the
  time lately", "it's been 18 days since the last rep").
- **Up to 3 ordered tips**, most impactful first:
  - *Shrink it* — use the smallest stage above / cut the target down (keep the streak alive).
  - *Anchor it* — add a "where & how" cue (omitted when one already exists).
  - State-specific close: *Protect the streak* (at_risk) / *Restart today* (stalled) / *Decide on
    purpose* (in_review).
- **"Ask the coach for a plan"** button — only shown when a parent supplies `onOpenAiCoach`; it hands
  the AI coach a ready starter prompt embedding the habit name + health rationale. Dormant today
  (no parent wires `onOpenAiCoach` yet), so it stays hidden and the deterministic coach stands alone.

## Why this shape

- **Reuses the existing health model.** `assessHabitHealth` already classifies every habit and is
  already computed per-habit in `DailyHabitTracker` (`habitHealthAssessmentsByHabitId`). The coach is a
  pure projection of that assessment + a couple of signals already in scope (adherence, downshift
  availability, environment cue) — no new data sources, no new queries.
- **Deterministic + offline-first.** Mirrors the rest of the Compass/AI arc: works with zero backend,
  upgrades to AI when the hook is present.
- **Pure, tested core.** `habitCoach.ts` is React-free and has a dedicated test (`habitCoach.test.ts`).

## Files

- **New `src/features/habits/habitCoach.ts`** — `buildHabitCoachCard(signals)` (returns `null` for
  healthy habits), `isStrugglingHealthState`, and the card/tip types.
- **New `src/features/habits/__tests__/habitCoach.test.ts`** — covers struggling/healthy split, tip
  capping, environment-cue suppression, per-state tips, adherence/day-count messaging, and the AI prompt.
- **`DailyHabitTracker.tsx`** — import + per-habit `coachCard` derivation + the coach `<section>` at the
  top of the expanded details panel. Hidden in compact private view. No change to completion, rewards,
  swipe, scaling, or the review queue.
- **`src/index.css`** — `.habit-checklist__coach*` styles (amber→orange→red tint per severity).
- **Test wiring** — `tsconfig.habit-offer-tests.json` + `scripts/run-habit-offer-tests.mjs`
  (runs under `npm run test:habit-offer-sort`).

## Safety

- **Additive & gated:** the block renders only for struggling habits and only inside the already-open
  details panel; healthy habits and the collapsed view are visually unchanged.
- **No behaviour change:** no edits to logging, XP/economy, auto-progression, swipe actions, or the
  existing review-fix queue. The AI button is opt-in via an existing, currently-unwired prop.
- **Privacy:** suppressed in compact private view so it never surfaces habit specifics there.

## Validation

- `npm run test:habit-offer-sort` — `habit-coach-tests: all assertions passed`.
- `tsc -b` clean; `npm run build` success.
- _The 12k-line tracker can't be exercised headlessly here; the change is one additive, gated section
  plus a pure helper with direct test coverage._

## Follow-up (out of scope)

- Wire a real AI coach surface to `onOpenAiCoach` (modal + `compass-help` edge function) so the
  "Ask the coach for a plan" button lights up. The prompt plumbing is already in place.
