# Compass Book — PR 1 (Foundation) Report

_Date: 2026-06-21_
_Branch: `claude/gallant-volta-qrzkdh`_

## PASS / PARTIAL / FAIL

**PASS — safe to merge.** Fully additive foundation. No visible entry points wired, no
changes to Island Run, economy, Quest Pulse, goals, habits, AI, or the legacy Compass.

## Summary

Adds the Compass Book foundation: a new isolated `src/features/compass-book/` namespace with
the curriculum data model, the full Chapter 1 (Living Wheel) content, reserved 20-slot
definitions for chapters 2–6, versioned answer/output types, pure unlock/progress/completion
logic, a Supabase persistence layer with owner-only RLS, and a deterministic test suite.

## Product behaviour

No user-visible change yet. The Compass Book hero still opens the feature preview; the in-game
Compass still opens the legacy modal. This PR only lays the data/logic substrate that PR 2–5
build the UI on top of.

## Data authority

- **New (canonical for Compass Book):** `compass_books`, `compass_chapter_states` — answers,
  draft output, confirmed output. Owned by this feature.
- **Read-only:** Island Run position (`currentIslandNumber`, `cycleIndex`) drives unlock via pure
  functions; no game-state writes.
- **Untouched legacy:** `compass_state` (11-phase Island Run Compass) is not read or written here.
- **Not touched:** goals, habits, Life Wheel taxonomy (referenced only by stable area-key ids).

## Changed files

**New — feature code**
- `src/features/compass-book/types.ts`
- `src/features/compass-book/content/chapter1LivingWheel.ts` (full Chapter 1)
- `src/features/compass-book/content/reservedChapter.ts`
- `src/features/compass-book/content/chapter2InnerCompass.ts`
- `src/features/compass-book/content/chapter3LivingHorizon.ts`
- `src/features/compass-book/content/chapter4IkigaiMap.ts`
- `src/features/compass-book/content/chapter5QuestForge.ts`
- `src/features/compass-book/content/chapter6PersonalPlaybook.ts`
- `src/features/compass-book/content/compassBookCurriculum.ts`
- `src/features/compass-book/logic/unlock.ts`
- `src/features/compass-book/logic/progress.ts`
- `src/features/compass-book/services/compassBookSerialization.ts` (pure)
- `src/features/compass-book/services/compassBookService.ts` (Supabase CRUD)
- `src/features/compass-book/index.ts`

**New — tests & tooling**
- `src/features/compass-book/__tests__/compassBook.test.ts`
- `tsconfig.compass-book-tests.json`
- `scripts/run-compass-book-tests.mjs`
- `package.json` — adds `test:compass-book` script

**New — schema**
- `supabase/migrations/0256_compass_book.sql`

**Edited**
- `src/lib/database.types.ts` — adds `compass_books` + `compass_chapter_states` table types
  (inserted directly after `compass_state`; no existing types modified)

**Docs**
- `docs/implementation/compass-book-pr1-foundation.md` (this report)

## Schema

Migration `0256_compass_book.sql`:
- `compass_books` — one active book per `(user_id, curriculum_version)`; `gen_random_uuid()` PK;
  unique `(user_id, curriculum_version)`.
- `compass_chapter_states` — one row per `(book_id, chapter_id)`; FK to `compass_books`
  (`ON DELETE CASCADE`); `answers`/`draft_output`/`confirmed_output` JSONB; unique `(book_id, chapter_id)`.
- Indexes: `compass_books(user_id)`, `compass_chapter_states(book_id)`, `compass_chapter_states(user_id)`.
- RLS: owner-only `select/insert/update/delete` (`auth.uid() = user_id`) on both tables, mirroring
  the `compass_state` policy style.
- **Rollback:** drop the two new tables only. No effect on `compass_state`, goals, or habits.

## Validation

- **Tests:** `npm run test:compass-book` — all assertions pass (curriculum: 6 chapters × 20 = 120,
  islands 1–120 unique, ids unique, validation ok; unlock: islands 1/20/21/40/60/80/100/120, <1,
  >120, NaN, `cycleIndex>0`, unlock≠completion; progress: locked/unlocked/started/answered/complete,
  chapter incomplete without `confirmedOutput`, complete with it; answers: valid parse, malformed
  entries dropped, non-array fallback, upsert add/edit with `answeredAt` preserved).
  - Note: the repo's pinned TypeScript is 5.x; this environment only had a global tsc 6.0.2, under
    which the existing `test:quest-compass` runner fails identically on the `node10` deprecation.
    The committed `tsconfig.compass-book-tests.json` matches `tsconfig.quest-compass-tests.json`
    exactly, so it runs under the repo's pinned compiler in CI. The suite was verified locally by
    compiling with `--ignoreDeprecations 6.0` and running the emitted JS.
- **Typecheck:** the compiled test bundle (types, content, logic, serialization) typechecks under
  `strict`. The Supabase service file follows the existing `compassState.ts` pattern.
- **Build/lint:** not run in this environment (`node_modules` not installed). Code is additive and
  imported by nothing yet, so it cannot affect existing build output.

## Hard-constraint confirmation

No changes to: Island Run progression, economy, Quest Pulse, goals, habits, AI, legacy Compass
(`compass_state`/`compassCurriculum`), feature availability, or unrelated gameplay. No automatic
goal/habit creation. No AI. Life Wheel taxonomy not duplicated (area ids referenced as the stable
contract; labels resolved from the canonical taxonomy at render time in later PRs).

## Blockers and deferred work

- **Deferred to PR 2+:** all UI (book shell, chapter screen, graphic, in-game compact panel) and
  wiring of the hero card / in-game Compass seam.
- **Deferred to PR 6–10:** full block content for chapters 2–6 (currently reserved 20-slot stubs
  marked `authored: false`).
- **Deferred to PR 4:** the Chapter 1 projector (answers → draft Engine/Brake/Fragile/Lever) and
  the Living Wheel graphic.
- **Note:** the six chapter concept-art images are still absent from the repo.
