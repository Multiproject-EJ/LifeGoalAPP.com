# Compass Book — In-Game Answering Integration Plan

_Date: 2026-06-21_
_Branch: `claude/gallant-volta-qrzkdh`_

This plan covers the new direction: **Compass Book fragments are answered in-game at the Island Run
landmark Wisdom stop (with the Habit stop as overflow), and answering is required to complete the
stop.** It supersedes two earlier guardrails by explicit product decision (see §5).

## 1. Decisions (confirmed)

| Question | Decision |
|---|---|
| Answer surface | **Wisdom stop primary + Habit stop overflow** |
| Heavy Living-Wheel islands (8 inputs) | **Re-author Chapter 1** to cap inputs per island |
| Completion gating | **Answering is required to complete the Wisdom stop** |
| Today-tab "habit coach idea" | **Separate task — after this** (not in scope here) |

## 2. Per-island input analysis (measured)

199 input blocks across 120 islands. **96 islands need 1 input.** Outliers are all in Chapter 1
(78 blocks; seven islands at 8 inputs). Chapters 2–6 average ~1.1–1.4 inputs/island — already a
clean fit for a single Wisdom stop.

| Chapter (islands) | inputs/island avg | heaviest |
|---|---|---|
| Living Wheel (1–20) | 3.9 | 8 ×7 |
| Inner Compass (21–40) | 1.1 | 3 |
| Living Horizon (41–60) | 1.1 | 3 |
| Ikigai Map (61–80) | 1.3 | 3 |
| Quest Forge (81–100) | 1.4 | 6 |
| Personal Playbook (101–120) | 1.1 | 3 |

## 3. Wisdom/Habit split rule

Per island, the activity's blocks are split deterministically:

- **Wisdom stop** collects the first `WISDOM_CAPACITY` (= 2) blocks.
- **Habit stop** collects any remaining blocks (overflow). Most islands have ≤2 → Habit overflow
  rarely triggers; after the Chapter 1 re-author (§4) the max is 4, so overflow is at most 2.
- A pure helper `splitIslandInputs(activity)` returns `{ wisdom: Block[], habit: Block[] }`.
- An island's fragment is **complete** only when all required blocks across both stops are answered.

## 4. Chapter 1 re-author (cap = 4 inputs/island, all 8 areas, projector unchanged)

The Living Wheel projector reads answers by **questionId**, not by island, so we can redistribute
blocks freely as long as questionIds are preserved. We drop projector-irrelevant blocks (`desired`,
`energising_area`, `warning_area`, `overinvested`/`underinvested`, `accept_*`, the optional pattern
note) and split each 8-area activity into two islands of 4 (Group A = Health, Mind, Work, Money;
Group B = Love, Connections, Home, Fun).

New 20-island layout (every island ≤ 4 inputs; Wisdom takes 2, Habit takes the rest):

| Island | Activity | Inputs |
|---|---|---|
| 1–4 | strongest / strained / mental-space / avoided area | 1 each |
| 5–6 | current levels — Group A / Group B | 4 / 4 |
| 7–8 | good-enough — Group A / Group B | 4 / 4 |
| 9–10 | minimum-safe — Group A / Group B | 4 / 4 |
| 11–12 | emotional weather — Group A / Group B | 4 / 4 |
| 13–14 | momentum — Group A / Group B | 4 / 4 |
| 15–16 | spillover — Group A / Group B | 4 / 4 |
| 17 | dominant emotional pattern + candidate Engine | 2 |
| 18 | candidate Brake + candidate Fragile Spoke | 2 |
| 19 | candidate Lever + next-move area + next move | 3 |
| 20 | Wheel statement + review + confirm | 3 |

Preserved questionIds (projector + graphic unaffected): `current.*`, `good_enough.*`,
`minimum_safe.*`, `spillover.*`, `momentum.*`, `emotion.*`, `candidate_engine/brake/fragile/lever`,
`emotional_pattern`, `next_move_area`, `next_move`, `wheel_statement`, `wheel_confirm`. Total
Chapter 1 blocks drop 78 → ~62; `desired` becomes always-null (graphic already tolerant).

Test updates: `testGuidedFlowAnswering` hardcodes a05=8 scales and a19=choice+text — update to the
new shapes (a05 = 4 scales; a19 includes `candidate_lever`).

## 5. Guardrail overrides (explicit)

The original brief said *"Do not block Island Run progression on reflection completion"* and *"Do not
couple full-book UI directly to Island Run runtime internals."* Both are intentionally overridden for
the **in-game fragment path** by product decision:

- Completing the Wisdom stop now **requires** answering that island's fragment.
- The Wisdom/Habit stops render a **compact fragment input** (reusing `CompassActivityRenderer`), not
  the full book. The full book in the Player Menu remains the review/edit/graphic surface and stays
  decoupled.

Still honored: no economy changes; no mutation of Island Run *gameplay* state beyond the existing
stop-completion flow; the legacy `compass_state` path is left intact (we write the NEW
`compass_chapter_states`).

## 6. Component / data plan

- `logic/islandFragment.ts` (pure): `getIslandFragment(islandNumber)` → `{ activity, wisdom[],
  habit[], requiredCount }`; `splitIslandInputs(activity)`; `isIslandFragmentComplete(islandNumber,
  answers)`.
- `components/CompassStopFragment.tsx`: compact renderer for a stop's slice of inputs (reuses
  `CompassActivityRenderer`), with a Save handler that writes via `useCompassBook.saveActivityAnswers`
  (so the Player Menu book and the in-game path share one store).
- Board wiring (`IslandRunBoardPrototype` / `WisdomTreeCardEncounter`): mount `CompassStopFragment`
  in the Wisdom stop; gate stop completion on `isIslandFragmentComplete`; mount the overflow slice in
  the Habit stop when present. Reads `islandNumber` only; writes only `compass_chapter_states`.

## 7. PR sequence

- **PR 12 — Chapter 1 rebalance** (curriculum only): re-author per §4; keep projector/graphic; update
  tests. Self-contained, no gameplay coupling. _(do first)_
- **PR 13 — Island fragment model + stop fragment component**: pure `islandFragment` logic +
  `CompassStopFragment` UI + tests. Not yet wired to the board.
- **PR 14 — Wisdom-stop wiring + Habit overflow + required gating**: mount in the board; gate stop
  completion; write to `compass_chapter_states`. The sensitive gameplay-touching PR.
- **(later) Today-tab struggling-habit coach** — separate investigation + PR.

## 8. Open risks

- Required gating changes Island Run pacing; we should keep each Wisdom stop to ≤2 inputs (Habit
  overflow handles the rest) so it stays quick.
- Returning players past an island must be able to answer earlier fragments — the Player Menu book
  already covers this; in-game we only present the current island's fragment.
- The legacy Wisdom→`compass_state` contribution can remain or be retired; default is to **keep** it
  (no behavior change) and add the new write alongside.
