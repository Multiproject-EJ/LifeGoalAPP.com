# Compass Book — PR 11 (Optional AI "Help me think") Report

_Date: 2026-06-21_
_Branch: `claude/gallant-volta-qrzkdh`_

## PASS / PARTIAL / FAIL

**PASS — safe to merge.** Adds an optional, privacy-respecting per-question AI assist with a
dedicated narrow endpoint, explicit player application, and graceful failure fallbacks. Verified
with `tsc -b` and a full `npm run build` (both green). No Island Run / economy / Quest Pulse / goals
/ habits / curriculum changes. AI is additive and degrades silently to fixed-guided.

## Summary

A "Help me think" affordance appears under supported questions when a backend is available. Tapping
it calls a dedicated `compass-help` edge function with ONLY that one question (prompt + options + the
current draft) and shows a tentative suggestion. The player may **Use this** (fills the draft) or
**Dismiss** — nothing is ever saved, confirmed, or auto-applied.

## Product behaviour

- Under choice/text questions, an unobtrusive **✦ Help me think** button.
- It returns a short, tentative reflection ("One way to think about it — a suggestion, not an
  answer"). For choice questions it may propose an option; for text it may offer an example draft.
- **Use this** applies the suggestion to the draft exactly as if the player had selected/typed it —
  still requiring the normal Save & confirm. **Dismiss** closes it.
- On no key / timeout / error / empty / refusal, it shows a one-line fallback and the player
  continues unaffected.

## Data authority

- AI **proposes only**. It never writes answers, goals, habits, scores, or `confirmed_output`.
- **Privacy**: requests carry only the single question (prompt, options, current draft) — never
  other answers, other chapters, or wider Compass data (enforced by `buildCompassHelpRequest`).
- Dedicated narrow endpoint (`compass-help`), not the general AI Coach. Per-user `ai_settings` key →
  app key fallback, mirroring `suggest-goal`. System prompt forbids declaring facts/diagnoses.

## Changed files

**New**
- `supabase/functions/compass-help/index.ts` (dedicated narrow endpoint)
- `src/features/compass-book/services/compassAiCore.ts` (pure: request build / parse / apply)
- `src/features/compass-book/services/compassAi.ts` (invoke wrapper: timeout + graceful fallback)
- `src/features/compass-book/components/CompassAIHelper.tsx` (button + suggestion panel)
- `docs/implementation/compass-book-pr11-ai-help.md`

**Edited**
- `src/features/compass-book/components/CompassActivityRenderer.tsx` — optional `renderHelp` slot (stays AI-agnostic)
- `src/features/compass-book/components/CompassGuidedFlow.tsx` — injects the helper for supported blocks when AI is available
- `src/features/compass-book/components/compassBook.css` — AI helper styles
- `src/features/compass-book/__tests__/compassBook.test.ts` + `tsconfig.compass-book-tests.json` — AI core tests

## Schema

None. Uses the existing `ai_settings` table read inside the edge function (as `suggest-goal` does).

## Validation

- **Tests:** `npm run test:compass-book` — all pass, incl. AI core coverage: privacy (request carries
  only the block, never other answers), defensive parsing (null / non-JSON / empty / empty-suggestion
  / partial → safe shapes, never throws, non-string option ids filtered), and apply mapping (valid
  recommendation → value; **invalid option id → null, never auto-applies junk**; draftText → text;
  no draftText → null).
- **Typecheck:** `tsc -b` clean. **Build:** `npm run build` success (12.0s).
- **Not runnable here:** the edge function (no Deno/OpenAI/Supabase deploy in this environment). It
  mirrors `suggest-goal` exactly and the client degrades gracefully if it is absent or errors, so a
  missing/undeployed function cannot break the flow.

## Hard-constraint confirmation

AI never silently updates answers; every suggestion requires an explicit "Use this" and still goes
through normal Save & confirm. AI does not diagnose or declare purpose; language is tentative. No
auto-writes of goals/habits. No wider Compass data is sent. No changes to Island Run, economy, Quest
Pulse, goals, habits, legacy Compass, or feature availability.

## Blockers and deferred work

- **Deploy step:** `compass-help` must be deployed (and an `OPENAI_API_KEY` or per-user key present)
  for live suggestions; until then the affordance falls back silently.
- **PR 12:** Quest Leaps (uses the PR 8 proposal seam).
- Concept-art images still absent from the repo.
