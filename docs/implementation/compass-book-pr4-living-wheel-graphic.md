# Compass Book — PR 4 (Living Wheel Projector + Graphic + Seal) Report

_Date: 2026-06-21_
_Branch: `claude/gallant-volta-qrzkdh`_

## PASS / PARTIAL / FAIL

**PASS — safe to merge.** Adds the Chapter 1 projector, the app-rendered Living Wheel graphic, and
chapter sealing. Verified locally with `tsc -b` and a full `npm run build` (both green). No Island
Run / economy / Quest Pulse / goals / habits / AI changes.

## Summary

Chapter 1 now produces a real one-page artifact. A pure, deterministic projector turns answers into
proposed outputs (Engine / Brake / Fragile Spoke / Lever, season, emotional pattern, next move,
Wheel statement); an SVG Living Wheel renders them and fills in as the player answers; and confirming
activity 20 seals the chapter by snapshotting the projected output to `confirmed_output`.

## Product behaviour

- The chapter detail and the activity-20 step show an **evolving Living Wheel**: eight segments whose
  radial fill encodes current score and whose colour encodes emotional weather, with momentum glyphs
  and Engine/Brake/Fragile/Lever markers, plus a mechanics summary, season, next move, and statement.
- The wheel is **partially complete throughout** — it grows as fragments are answered, not only at the end.
- Outputs are **proposals**: when the player explicitly chose mechanics at activity 16, those win;
  otherwise the projector derives suggestions from the scored/emotional data. Nothing is auto-declared.
- **Sealing:** confirming the activity-20 confirmation completes the chapter (status → `complete`,
  `confirmed_output` snapshot, `confirmed_at`). The chapter card shows **Sealed**; fragments remain
  editable afterward.

## Data authority

- Projector is **pure and AI-free**; lives in `logic/projectors/`. Reads only chapter answers.
- Seal writes only `compass_chapter_states.confirmed_output` (+ status/confirmed_at), via the same
  best-effort Supabase + local-mirror path. Reads only `currentIslandNumber` for unlock.
- No goals/habits/Island Run/legacy-Compass interaction.

## Changed files

**New**
- `src/features/compass-book/logic/projectors/livingWheelProjector.ts` (adapter + projector + output types)
- `src/features/compass-book/logic/projectors/index.ts` (chapter projector registry)
- `src/features/compass-book/components/chapter-graphics/LivingWheelGraphic.tsx`
- `src/features/compass-book/components/chapter-graphics/CompassChapterGraphic.tsx` (shared dispatcher)
- `docs/implementation/compass-book-pr4-living-wheel-graphic.md`

**Edited**
- `src/features/compass-book/hooks/useCompassBook.ts` — `persist` helper, auto-seal on confirmation, `sealChapter`
- `src/features/compass-book/components/CompassChapterScreen.tsx` — renders the wheel; "sealed" note; takes `getChapterState`
- `src/features/compass-book/components/CompassBookScreen.tsx` — threads `getChapterState`
- `src/features/compass-book/components/CompassGuidedFlow.tsx` — live wheel preview on the seal step
- `src/features/compass-book/components/CompassActivityRenderer.tsx` — review-block copy
- `src/features/compass-book/components/compassBook.css` — wheel styles
- `src/features/compass-book/__tests__/compassBook.test.ts` + `tsconfig.compass-book-tests.json` — projector tests

## Schema

None. Uses `compass_chapter_states.confirmed_output` from migration 0256.

## Validation

- **Tests:** `npm run test:compass-book` — all pass, incl. new projector coverage: Engine/Brake/
  Fragile/Lever derivation, candidate override, action gap (goodEnough − current), season from
  momentum, explicit emotional pattern, empty-answers → null, registry snapshot vs unimplemented chapter.
- **Typecheck:** `tsc -b` → clean. **Build:** `npm run build` → success (12.7s). Run with the repo's
  real toolchain (TS 5.9.3) this time.

## Hard-constraint confirmation

No changes to Island Run progression, economy, Quest Pulse, goals, habits, AI, legacy Compass, or
feature availability. Projector is deterministic and AI-free; outputs are proposals, never declared
as fact; no user text is baked into an image (the wheel is app-rendered SVG from structured data).

## Blockers and deferred work

- **PR 5:** in-game Compass button → compact current-chapter panel (reuses `CompassChapterGraphic`
  in `mode="compact"`, already supported).
- Editable overrides for the four mechanics at the seal step (currently uses activity-16 choices +
  derivation) could be added later if desired.
- `html2canvas` export deferred. Concept-art images still absent from the repo.
