# Sequential Landmark Building System and Build Modal Redesign Investigation

Date: 2026-06-25  
Status: investigation/design only; no product-code implementation in this PR.

## Executive verdict

**PASS WITH CONDITIONS** — it is safe to proceed with implementation PR 1 if the first PR is limited to pure derivation/compatibility helpers plus tests, with no modal rewrite, economy change, save-format change, migration, boss reward change, stop-ID change, or tile-index trigger.

Conditions:
1. Treat current runtime code as source of truth over prior narrative plans.
2. Do not add a permanent `islandRunNarrativePilotEnabled` gate for finished Island 1 story functionality.
3. Derive the active sequential target from existing canonical `stopBuildStateByIndex` where possible before considering persisted active-target fields.
4. Preserve old saves, including uneven build states, by deriving the first incomplete target in the canonical sequence rather than resetting completed progress.
5. Keep all gameplay writes inside canonical action/service boundaries.

## Files inspected

Required guardrails and plans:
- `AGENTS.md`
- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
- `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`
- `docs/investigations/holistic-island-storytelling-system-audit.md`
- `docs/design/island-001-narrative-vertical-slice.md`
- `docs/plans/island-001-narrative-implementation-plan.md`

Runtime and assets inspected:
- `src/features/gamification/level-worlds/components/BuildModalV2.tsx`
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
- `src/features/gamification/level-worlds/LevelWorlds.css`
- `src/features/gamification/level-worlds/services/islandRunContractV2EssenceBuild.ts`
- `src/features/gamification/level-worlds/services/islandRunStateActions.ts`
- `src/features/gamification/level-worlds/services/islandRunBossEncounter.ts`
- `src/features/gamification/level-worlds/services/islandRunStopCompletion.ts`
- `src/features/gamification/level-worlds/services/islandRunLuckyRollBoardConfig.ts`
- `src/features/gamification/level-worlds/components/board/IslandArtLayers.tsx`
- `public/assets/islands/island-001/island-art.json`
- `public/assets/islands/island-001/**`

## Confirmed facts vs recommendations

Confirmed facts are observations from current runtime code and assets. Recommendations are design choices proposed for future PRs. This report does not implement them.

## A. What the current modal really does

### Confirmed facts

1. The five bottom cards are one card per current Island Run stop/landmark. `BuildModalV2CardData` includes `stopIndex`, `stopId`, `title`, `buildLevel`, `spentEssence`, `requiredEssence`, and stop objective status. `BuildModalV2` renders `cards.map(...)` in the bottom tray.
2. Each card corresponds to one canonical stop index from `islandStopPlan`; the board adapter loops over `islandStopPlan.length`, reads `runtimeState.stopBuildStateByIndex[idx]`, and pushes one card per stop.
3. Tapping a card calls `onBuildTap(stopIndex)`, which queues that stop index and eventually calls `handleRepeatedBuildActivation(stopIndex)` and `handleSpendEssenceOnBuild(stopIndex, batchSteps)`.
4. Current build progression is not constrained to a sequential landmark order. The build service explicitly says build is decoupled from stop objective/sequencing and any stop can be funded at any time.
5. One purchase affects one selected stop. `spendIslandRunContractV2EssenceOnStopBuild` maps only the matching `normalizedStopIndex` to the next build state.
6. The modal appears to show all landmarks together because the tray is a five-stop overview, the artwork stage is based on count of fully built stops, and the progress rail is island-wide, not active-landmark-specific.
7. The three small progress marks inside each card are level pips for the three canonical build levels (`MAX_BUILD_LEVEL = 3`), with done/active styling based on `buildLevel`.
8. The right-side `Started / Halfway / Complete` rail is an island-wide aggregate: Started means any stop has `buildLevel >= 1`, Halfway means at least two stops are fully built, Complete means all five are fully built.
9. The large central area is currently an island-stage artwork/placeholder area, not a focused active-landmark hero. For Island 1 it loads `/assets/islands/island-001/build-modal/stage-${artworkStage}.webp`; otherwise it shows a generic placeholder.
10. Safely reusable modal elements: viewport modal shell/backdrop pattern, compact header, Essence balance, close button, bottom tray visual family, card completed/active/locked styling patterns, progress dots styling, and SFX/haptic hooks from the existing build path. The semantic meaning of tray cards, central artwork, and progress rail should change.

## B. Current build data model

### Representative current types

```ts
export type IslandRunContractV2StopState = {
  objectiveComplete: boolean;
  buildComplete: boolean;
  completedAtMs?: number;
};

export type IslandRunContractV2BuildState = {
  requiredEssence: number;
  spentEssence: number;
  buildLevel: number;
};
```

`stopBuildStateByIndex` is a length-5 array initialized with one `IslandRunContractV2BuildState` per stop. Each entry stores:
- `requiredEssence`: cost of the current target level.
- `spentEssence`: partial progress toward that current target level.
- `buildLevel`: completed build level, from 0 to `MAX_BUILD_LEVEL`.

`stopStatesByIndex` is a parallel length-5 array with `objectiveComplete` and `buildComplete`. `buildComplete` is set when the build level reaches Level 3.

### Answers

1. Partial progress is already persisted as `spentEssence` in each stop build state.
2. Progress is stored as numeric Essence spent toward the current level, not as percentage or named parts.
3. Three levels are already represented canonically by `MAX_BUILD_LEVEL = 3` and `STOP_UPGRADE_BASE_COSTS = [50, 120, 300]`.
4. Five construction portions can reuse the existing partial-progress field by deriving five thresholds across `requiredEssence`. No five-part persisted nested model is required for MVP.
5. The proposed sequential MVP does not inherently require a schema/save-format change if the active target and part state are derived from existing build states.
6. Derivable values include active landmark index, target level, sequence position 1–15, current part 1–5, completed parts, next landmark, round completion, final build completion, and UI lock state.
7. Canonical state is `runtimeState.stopBuildStateByIndex` and `runtimeState.stopStatesByIndex` committed through `islandRunStateActions`. `BuildModalV2CardData`, aggregate artwork stage, milestones, disabled flags, and local landing text are UI/view-model mirrors.

## C. Current build algorithm

Current path:
1. User opens Build modal; board renders `BuildModalV2` when contract v2 is enabled and passes cards plus `onBuildTap`.
2. User taps a tray card; `BuildModalV2Card` calls `onBuildTap(stopIndex)`.
3. `handleBuildCardTap` pushes `{ stopIndex, requestedAtMs }` into a queue and starts `processBuildTapQueue`.
4. `processBuildTapQueue` drains taps one at a time and calls `handleRepeatedBuildActivation`.
5. `handleRepeatedBuildActivation` resolves repeated-tap batch size with `resolveRepeatedBuildBatchSteps`; tutorial guidance clamps it to one step.
6. `handleSpendEssenceOnBuild` snapshots canonical runtime state, rejects invalid/fully built stops, computes the spend step with `resolveBuildSpendStepForTier(requiredEssence)` where `TARGET_TAPS_PER_BUILD_LEVEL = 5` and floor is 10 Essence.
7. It preflights `spendIslandRunContractV2EssenceOnStopBuild` for affordability and rules.
8. It commits through `applyStopBuildSpendBatch`, which repeats the per-step spend operation in memory and commits one canonical record.
9. The board assigns the returned record to runtime state, plays `build_upgrade`, and updates landing text.
10. If the spend completed a level, `spendIslandRunContractV2EssenceOnStopBuild` increments `buildLevel`; if not fully complete it resets `spentEssence` and computes the next `requiredEssence`; at Level 3 it sets `buildComplete` on the corresponding stop state.
11. Boss eligibility and island-clear calculations later observe the resulting canonical build states.

Existing batch behavior: repeated taps can batch through `applyStopBuildSpendBatch`; legacy hold-to-build code exists but is not wired into the v2 tray because of horizontal-scroll gesture conflicts.

## D. Current economy

### Formulas

- Level base costs: `[50, 120, 300]` for stop 0 on Island 1.
- Stop scale: stop 0 = 1.0, stop 1 = 1.4, stop 2 = 1.8, stop 3 = 2.2, stop 4/boss = 4.0.
- Island multiplier: `1.5 ** floor((islandNumber - 1) / 10)`.
- Next-level cost: `floor(baseCost[level] * stopScale * islandMultiplier)`.
- Spend step: `max(10, ceil(requiredEssence / 5))`, so most levels are approximately five taps, with small levels floored to 10 Essence/tap.

### Sample current full-build costs

| Effective island | Multiplier | Hatchery L1/L2/L3 | Habit L1/L2/L3 | Mystery L1/L2/L3 | Wisdom L1/L2/L3 | Boss L1/L2/L3 | Total all builds |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 1.0 | 50 / 120 / 300 | 70 / 168 / 420 | 90 / 216 / 540 | 110 / 264 / 660 | 200 / 480 / 1200 | 4,888 |
| 4 | 1.0 | 50 / 120 / 300 | 70 / 168 / 420 | 90 / 216 / 540 | 110 / 264 / 660 | 200 / 480 / 1200 | 4,888 |
| 20 | 1.5 | 75 / 180 / 450 | 105 / 252 / 630 | 135 / 324 / 810 | 165 / 396 / 990 | 300 / 720 / 1800 | 7,332 |
| 120 | 86.4976 | 4,324 / 10,379 / 25,949 | 6,054 / 14,531 / 36,328 | 7,784 / 18,683 / 46,708 | 9,514 / 22,835 / 57,088 | 17,299 / 41,518 / 103,797 | 422,791 |

Current taps/purchases per island are approximately 75: five stops × three levels × about five spend steps per level. Some levels can require fewer than five taps when the 10-Essence floor exactly fills a small cost, but the design target is five taps per level.

Major Essence sources observed:
- Contract v2 tile earnings by tile type: currency, chest, hazard, micro.
- Lucky Roll essence tiles, whose budget is a ratio of the next island total cost depending on reward tier.
- Dormant Door minigame prizes, based on remaining or total island build cost.
- Welcome/onboarding grants and specific reward actions.

Approximate expected Essence during an island cannot be stated as a single deterministic number from static source inspection because it depends on roll outcomes, board landings, event participation, stop completion, and reward claims. The safest economy conclusion is ratio-based: current Lucky Roll budgets scale from next-island total cost and current build costs scale by the same island multiplier family, while tile earnings use the island multiplier plus late-game earn bonus.

## Design comparison

| Model | Persistence | Economy | UX/tapping | Save compatibility | Risk |
|---|---|---|---|---|---|
| A — 75 separately persisted part purchases | Requires new nested part state or equivalent ledger. | Easy to tune but risks overfitting economy to storage. | Clear parts, but arbitrary part selection adds complexity and may feel like bookkeeping. | Hardest; old saves need conversion into 75 part objects. | High; unnecessary schema and migration risk. |
| B — Reuse current partial progress | Uses existing `spentEssence`, `requiredEssence`, `buildLevel`. | Can tune per-level cost and derive five thresholds. | Matches current five-tap target; simple left-to-right portions. | Strong; old partial progress maps naturally to thresholds. | Low/medium; must avoid UI mirrors and inactive-stop writes. |
| C — Five visual phases, simpler canonical writes | Stores only numeric progress; completed parts are derived. | Most flexible; can keep or tune spend step without named parts. | Best if only next unfinished part is actionable; five controls remain visible. | Strong if backed by current fields. | Low if implemented as helpers + canonical action boundary. |

## Recommendation: Model C implemented on current fields

Recommend the smallest safe model: five visual phases derived from `spentEssence / requiredEssence` for the single active target, with canonical writes continuing to update only that target stop’s numeric build progress. The five bottom controls should show five portions, but not persist five named part objects. A tap should buy the next unfinished portion; inactive/future portions can be inspectable visually but not independently buildable in MVP.

## Sequential progression rules

Canonical sequence:
`H1 → A1 → M1 → W1 → B1 → H2 → A2 → M2 → W2 → B2 → H3 → A3 → M3 → W3 → B3`.

Derivation:
1. Define landmark order by stop index: 0 hatchery, 1 habit, 2 mystery, 3 wisdom, 4 boss.
2. Iterate target levels 1 through 3.
3. For each level, iterate stop indices 0 through 4.
4. The first `(stopIndex, targetLevel)` where `buildLevel < targetLevel` is the active target.
5. Current part is `floor(clamp(spentEssence / requiredEssence, 0, 0.999) * 5) + 1`; completed parts are `floor(clamp(spentEssence / requiredEssence, 0, 1) * 5)`.
6. If no such target exists, all build work is complete.

Answers:
1. Fresh island: Hatchery Level 1, part 1.
2. After Hatchery Level 1 completes: active target becomes Habit Level 1.
3. After Boss Level 1 completes: Level 1 round completes; active target becomes Hatchery Level 2.
4. Hatchery Level 2 becomes active by derivation once all five landmarks have `buildLevel >= 1` and hatchery has `buildLevel < 2`.
5. Future landmarks may be inspected in read-only mode, but not built.
6. Completed landmarks may be reviewed.
7. Player should not build inactive landmarks in the sequential system.
8. Uneven legacy states should be preserved; derive the first incomplete target in canonical order. Do not reset completed levels. If a later landmark is ahead, let it remain ahead but only allow builds on the earliest missing target.
9. Already completed islands should remain complete and show review/complete state; no new work should be imposed.

## Build modal redesign specification

### Header

Keep icon, `Island [number] Buildings`, Essence balance, and close button. Recommendation: retain `Island 4 Buildings` as the title and show active landmark below in the hero. This avoids title churn and preserves current modal recognition.

### Hero area

Hero should display:
- Active landmark name: e.g. `Hatchery`.
- Target level: e.g. `Building Level 1`.
- Overall position: e.g. `Step 1 of 15`.
- Large landmark artwork occupying most of the current center.
- Construction status: e.g. `Part 2 of 5 funded` or `40% restored`.
- One-line restoration copy.
- Insufficient Essence state, including required shortfall.
- Completed-level state after fifth portion.

### Right-side progress rail

Options:
1. Five current construction portions: duplicates the bottom controls.
2. Three levels of the active landmark: useful but too narrow for island sequence.
3. Overall 15-step island sequence: best communicates sequential system but may be dense on mobile.
4. Combination: compact three-level rail plus small sequence text.

Recommendation: Option 4. Use a compact three-level rail for the active landmark and a `Step X of 15` label in the hero. Keep the five portions in the bottom controls.

### Five bottom controls

- Meaning: Part 1–Part 5 of the current active landmark level.
- Labels: generic for MVP (`Part 1`, `Part 2`, etc.), optionally landmark-flavored later.
- Cost: each control shows next threshold cost or “Done”.
- Completed: filled/check state.
- Active: highlighted next unfinished portion.
- Locked: later portions shown locked/queued until previous portions complete.
- Tap: only active/next unfinished portion spends; tapping future locked portion can nudge “Complete Part N first.”
- Insufficient Essence: active part remains visible with shortfall state; no spend.
- Order: left to right.

Mobile: the existing horizontal tray can remain, but five cards on narrow iPhones need either smaller labels, horizontal scroll, or compact equal-width chips. Do not remove the controls unless device testing proves overflow cannot be solved.

### Landmark completion moment

After fifth portion:
- Large hero image changes to the newly completed level state.
- Level label updates.
- Completion animation/SFX/haptic reuses `build_upgrade` initially.
- Show short story/character reaction if narrative system is ready; otherwise a toast/landing text.
- Show Next Landmark state.
- Recommend user-confirmed advance for first implementation, not automatic modal jump, so the completion moment is legible.

### Round completion

After all five landmarks reach Level 1/2/3, show a small round-complete milestone. After Level 3 round, boss/island completion gates can proceed normally.

## Art and asset audit: Island 1

Manifest facts:
- `hatchery` has Level 1 placeholder, Level 2 placeholder, Level 3 non-placeholder `hatchery-l3.webp`.
- `habit`, `mystery`, and `wisdom` have Level 1–3 placeholder files only.
- Boss has idle and defeated images, but is not represented as a three-level landmark in the `landmarks` array. Boss arena/scenery exists as `battle-arena-crystal.webp`.
- Dormant/current state is not explicitly provided as per-landmark dormant art in the manifest.

| Landmark | Dormant/current | Level 1 | Level 2 | Level 3 | Classification |
|---|---|---|---|---|---|
| Hatchery | Missing explicit dormant | Placeholder | Placeholder | Usable/final-looking | Partial; MVP can use placeholder-to-L3 transition. |
| Habit | Missing explicit dormant | Placeholder | Placeholder | Placeholder | Placeholder only. |
| Mystery | Missing explicit dormant | Placeholder | Placeholder | Placeholder | Placeholder only. |
| Wisdom | Missing explicit dormant | Placeholder | Placeholder | Placeholder | Placeholder only. |
| Boss | Hidden/idle boss image plus arena scenery | Missing build-level art | Missing build-level art | Idle/defeated boss usable after arena built/defeated | Needs build-level representation decision. |

MVP visual behavior: use UI progress for five sub-build portions and swap hero images only at landmark-level boundaries. Do not require five intermediate construction images per level.

## Boss and island-clear implications

Confirmed:
1. Boss eligibility currently depends on Boss stop build being fully complete (`Boss Level 3`) and boss not defeated.
2. Sequential order naturally makes Boss Level 3 the final build target.
3. Sequential order means all other landmarks reach Level 3 before Boss Level 3 can be completed.
4. Current island-clear v2 requires stop objectives, build completion, and hatchery egg resolution.
5. A user can currently reach/open boss-related UI before Boss build target is active, because stop progression and build progression are separate systems. Current boss lock copy says to build the Boss Arena to Level 3.
6. Recommended lock copy: “Restore all Island Heart landmarks, then finish the Boss Arena to Level 3 to awaken the boss.”
7. Player-facing “Island Heart” concept fits well as the Level 3 round/finale wrapper, but should not alter boss rewards or mechanics.

Recommendation: boss challenge should become available only after Boss Level 3 is complete, which under sequential construction also means every other landmark is Level 3.

## Save compatibility

Cases:
- Fresh users: derive Hatchery L1.
- Even Level 1 users: derive Hatchery L2.
- Uneven users: preserve all progress; target the earliest missing sequence step.
- Partial progress: map `spentEssence` to current part thresholds for the active target if that stop is active; otherwise preserve and wait until sequence catches up.
- Boss eligible users: if Boss is Level 3 and not defeated, keep eligibility.
- Fully completed islands: keep complete; no new work.
- Later-cycle islands: use effective island number for costs; derivation works the same.
- Local fallback and Supabase canonical state: no schema change needed if current fields remain source of truth.

Recommendation: no migration is necessary for MVP. Add pure helpers that derive sequential target from existing states and enforce future write selection through canonical actions.

## Economy modeling

Baseline Island 1 current total: 4,888 Essence.

| Model | Purchases per island | Cost per purchase/formula | Cost per landmark level | Total Island 1 cost | Multiplier vs current | Sufficiency/pacing | Boss timing | Fatigue risk |
|---|---:|---|---|---:|---:|---|---|---|
| 1. Current system | ~75 spend steps | `max(10, ceil(required/5))` | Current stop/level cost | 4,888 | 1.0x | Existing tuned baseline | Boss can be built independently to L3 | Medium but accelerated taps help |
| 2. Current exact cost repeated for every landmark | ~75 | Same per-level formula, sequential order only | Same as current | 4,888 | 1.0x | More understandable but not larger | Boss last if enforced | Medium |
| 3. Five equal-cost sub-builds per level | 75 explicit portions | `ceil(levelCost/5)` | Same if levelCost unchanged | 4,888 | 1.0x | Good UX, not more substantial economically | Boss last | Medium |
| 4. Reduced sub-build cost | 75 | Less than `levelCost/5` | Lower than current | <4,888 | <1.0x | Too fast for desired direction | Boss last but too easy | Low |
| 5. Recommended | 75 visible portions, optionally fewer backend commits if batching | Derived thresholds over tuned per-level costs; later PR may increase level costs after playtest | Start with current formulas, then tune total to target 3–5x only with earnings review | Phase 1: 4,888; later candidate: ~14,664–24,440 | Phase 1 1.0x; later 3–5x | Avoid blind 4–5x until expected earnings are instrumented | Boss last | Mitigate with buy-next/multi-buy/hold later |

Economy conclusion: do not blindly multiply costs in the first implementation. The current system already targets about five spends per landmark level. The redesign can deliver the visible five-part experience with current fields first; economy expansion should be a later, measured PR after confirming Essence inflows.

## Narrative-plan amendments

Amend the merged narrative plan as follows:
- Remove the permanent `islandRunNarrativePilotEnabled` requirement for finished functionality.
- Allow temporary development/debug safeguards only during implementation.
- Change `I001-B24` from “first build level increase on any stop” to a meaningful sequential restoration event, preferably Hatchery Level 1 completion or first active-landmark level completion.
- Align Hatchery-first story beats with the new sequence.
- Align finale trigger with Boss/Island Heart reaching the final required state and boss eligibility, not tile indices.
- Narrative implementation should begin after PR 1 derivation helpers and ideally after PR 2 modal semantics are stable, so story triggers do not bind to deprecated parallel-build UI.

## Proposed implementation PR stack

### PR 1 — Sequential build derivation and compatibility helpers
- Scope: pure helpers/tests deriving active target, completed parts, sequence position, and inactive build lock reason from existing states.
- Likely files: new service helper near `islandRunContractV2EssenceBuild.ts`; tests under services tests.
- Dependencies: none.
- Tests: fresh, even, uneven, partial, boss-complete, fully complete, cycle islands.
- Rollback: remove helper/tests.
- Non-goals: no modal, economy, persistence, migration, or boss change.

### PR 2 — Focused single-landmark build modal UI
- Scope: presentation redesign using derived helper and current canonical state.
- Likely files: `BuildModalV2.tsx`, `IslandRunBoardPrototype.tsx`, `LevelWorlds.css`.
- Dependencies: PR 1.
- Tests: component/source tests, mobile QA screenshot.
- Rollback: revert modal adapter changes.
- Non-goals: no economy or schema change.

### PR 3 — Five-part construction interaction and economy
- Scope: enforce active-target-only build writes; tune part costs only if approved by modeled earnings.
- Likely files: board build handler and canonical action wrapper/helper tests.
- Dependencies: PR 1–2.
- Tests: inactive tap rejected, active tap spends, level completion advances target.
- Rollback: restore previous card tap behavior.
- Non-goals: no boss reward changes.

### PR 4 — Boss, island-clear, and legacy-save validation
- Scope: regression hardening for Boss Level 3 last, island clear, old saves.
- Likely files: boss encounter tests, stop completion tests, derivation tests.
- Dependencies: PR 3.
- Tests: boss lock/eligible, complete island, uneven saves.
- Rollback: revert validation-only copy/helpers.
- Non-goals: no reward changes.

### PR 5 — Updated Island 1 narrative content foundation
- Scope: story content/triggers aligned to sequential build; no permanent user-facing feature flag.
- Likely files: narrative manifests/observer helpers.
- Dependencies: PR 1 at minimum; PR 2–4 preferred.
- Tests: trigger derivation, no gameplay writes.
- Rollback: disable content surface/debug guard.
- Non-goals: no gameplay state mutation.

## Risk register

| Risk | Likelihood | Impact | Mitigation | Validation |
|---|---|---|---|---|
| Canonical-state duplication | Medium | High | Derive active target; do not persist UI mirrors | Source tests for no UI persistence writes |
| Save incompatibility | Medium | High | No schema change; derive from existing fields | Legacy fixtures |
| Uneven old build states | High | Medium | Preserve and target earliest missing step | Uneven-state tests |
| Island cost inflation | Medium | High | Separate economy PR; instrument/compare inflows | Economy table + playtest telemetry |
| Excessive tapping | Medium | Medium | Buy-next, batching, hold only after mobile gesture QA | Tap-count QA |
| Boss unreachable | Low/medium | High | Boss Level 3 last by derivation; regression tests | Boss eligibility tests |
| Island clear regression | Medium | High | Keep `isIslandRunFullyClearedV2` semantics | Clear tests |
| Mobile overflow | Medium | Medium | Compact chips/horizontal scroll; screenshot QA | Narrow iPhone screenshot |
| Missing landmark art | High | Medium | Use placeholders and UI progress; no intermediate art requirement | Asset validation |
| Stale mirrored UI state | Medium | Medium | Build modal remains presentational | State derivation tests |
| Narrative trigger mismatch | Medium | Medium | Amend plan; trigger on sequential completion | Narrative observer tests |

## Final verdict

**PASS WITH CONDITIONS** — safe to proceed with implementation PR 1 only if it is pure derivation/compatibility helpers with tests and no product behavior change.
