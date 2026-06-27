# Implementation Plan — Wiring the Island 1 Narrative Beats

Status: implementation plan (ready to slice into PRs)
Date: 2026-06-27
Scope: Wire the remaining authored Island 1 (Luma Isle) narrative beats into the
live board, and refactor the beat dispatcher so it scales to the full 30-beat
slice and to islands 2–120.

> **Authority.** Subordinate to
> [`docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`](../gameplay/CANONICAL_GAMEPLAY_CONTRACT.md)
> and the narrative read-only rules in
> [`docs/gameplay/island-001-narrative-content-contract.md`](../gameplay/island-001-narrative-content-contract.md).
> Content source script: [`docs/design/island-001-narrative-vertical-slice.md`](../design/island-001-narrative-vertical-slice.md).
> **Story observes; it never drives.** No new gameplay writes, no stop-ID renames,
> no tile-index coupling, no reward/economy/persistence-of-gameplay changes.

---

## 1) Current reality (what is already built and wired)

This is **not** a greenfield task. The narrative pipeline is live for Island 1.

**Wired today (7 beats), driven by `useIslandNarrativeOpeningFlow.ts`:**

| Beat | Trigger (`IslandNarrativeTrigger`) | Surface | Speaker |
|---|---|---|---|
| `I001-B02` | `island_entered` | `story_reader` (arrival manifest) | — |
| `I001-B03` | `arrival_closed` | `dialogue_sheet` | Miri |
| `I001-B04` | `stop_opened:hatchery` | `dialogue_sheet` | Poko |
| `I001-B24` | `landmark_level_completed:hatchery:1` | `toast` | Miri |
| `I001-B26` | `boss_eligible` | `dialogue_sheet` | Elder Sava |
| `I001-B29` | `boss_resolved` | `story_reader` (resolution manifest) | — |
| `I001-B30` | `island_clear_travel_ready` | `dialogue_sheet` | Miri |

**Infrastructure that already exists (reuse, do not rebuild):**

- Types: `narrative/islandNarrativeTypes.ts` — `IslandNarrativeTrigger`,
  `IslandNarrativeBeat`, `IslandNarrativeDefinition`, surfaces
  (`story_reader | dialogue_sheet | toast`), 5 stop IDs.
- Content: `narrative/definitions/island001Narrative.ts` (only the 7 beats above).
- Registry + validation: `islandNarrativeRegistry.ts`,
  `islandNarrativeValidation.ts`, `islandStoryManifestValidation.ts`.
- Surfaces (live components): `IslandStoryReader.tsx`,
  `narrative/components/IslandNarrativeDialogue.tsx`,
  `narrative/components/IslandNarrativeToast.tsx`.
- Controller hook: `narrative/useIslandNarrativeOpeningFlow.ts` (queue,
  priority, seen-state, hydration baseline rules).
- Seen-state: localStorage key
  `island_run_narrative_seen_v1_<userId>_island_1` (beats + episodes maps).
- Board wiring: `IslandRunBoardPrototype.tsx` calls the hook (~L10037) and
  renders the three surfaces (~L14249–14280). It already feeds the hook
  `activeStopId`, `hatcheryBuildLevel` (`stopBuildStateByIndex[0].buildLevel`),
  `canChallengeCurrentBoss`, `isCurrentIslandBossDefeated`,
  `bossTrialResolvedIslandNumber`, `isIslandClearTravelReady`,
  `isNarrativeSurfaceBlocked`.
- Inhabitant/Caretaker flow: separately live (Island 1 top-ring tile). **Out of
  scope here** — different system (`inhabitants/`).

**The blocker to scaling:** the controller is **hard-coded per beat**. Beat IDs
live in TS string-literal unions (`ActiveIslandNarrativeDialogue.beatId`,
`IslandNarrativeControllerBeatId`, `QUEUE_PRIORITY`), and each beat has a
bespoke `useEffect` watcher + `if (beatId === 'I001-Bxx')` mapping branch.
Adding 23 more beats this way = 23 more hard-coded branches, and it cannot
generalize to islands 2–120.

---

## 2) The gap (what is authored-in-the-slice but NOT wired)

The vertical slice defines **30 beats** (B01–B30). Beyond the 7 wired and B01
(the global prologue, already handled by the separate `storyPrologueSeen`
path), the missing beats fall into four trigger families:

| Family | Missing beats | New capability needed |
|---|---|---|
| **Non-hatchery stop opened** | B09 (habit), B14 (mystery), B19 (wisdom) | Hook must watch `activeStopId` transitions to **all** stops, not just hatchery. Trigger kind already exists (`stop_opened`). |
| **Stop completed** | B05 (hatchery), B10 (habit), B15 (mystery), B20 (wisdom) | **NEW trigger kind `stop_completed`** — not in the type union today. Needs a `completedStops` snapshot input. |
| **Landmark level reached** | B06–B08 (hatchery L1–3*), B11–B13 (habit), B16–B18 (mystery), B21–B23 (wisdom) | Hook must watch **per-stop** build levels (indices 1–4), not just index 0. Trigger kind exists (`landmark_level_completed`). |
| **Aggregate / boss in-fight** | B25 (majority restored = 3/5 at L3), B27 (boss challenge started), B28 (mid-finale reveal) | B25 needs an aggregate over `stopBuildStateByIndex`; B27/B28 need boss-trial start / mid hooks. |

\* Note a content discrepancy to reconcile: the implemented `I001-B24` is mapped
to **hatchery level 1** ("The island noticed"), whereas the slice's B24 is the
**first-any-landmark-L3** reaction and B06 is the hatchery-L1 reaction. Decide
in Phase 0 whether to (a) keep the implemented mapping and renumber the slice,
or (b) split them. Recommended: **(a)** keep B24 as-is (shipping), add B06 as the
Poko hatchery-L1 line, and let B24 stand for first-restoration ambient.

---

## 3) Core decision: refactor the controller to data-driven dispatch

**Recommendation: do the refactor first (Phase 1), before authoring more beats.**
Wiring 23 beats onto the current hard-coded hook would triple its size and bake
in island-1-only assumptions. Convert the controller to dispatch off the
**definition + a normalized snapshot**, so a new beat = a new entry in
`island001Narrative.ts` (content), not new controller code.

### 3.1 Extend the trigger union (`islandNarrativeTypes.ts`)

```ts
export type IslandNarrativeTrigger =
  | { kind: 'island_entered'; islandNumber: number }
  | { kind: 'arrival_closed'; islandNumber: number }
  | { kind: 'stop_opened'; islandNumber: number; stopId: IslandNarrativeStopId }
  | { kind: 'stop_completed'; islandNumber: number; stopId: IslandNarrativeStopId }   // NEW
  | { kind: 'landmark_level_completed'; islandNumber: number; stopId: IslandNarrativeStopId; level: 1 | 2 | 3 }
  | { kind: 'landmarks_restored_majority'; islandNumber: number; threshold: number }  // NEW (B25)
  | { kind: 'boss_challenge_started'; islandNumber: number }                          // NEW (B27)
  | { kind: 'boss_midpoint'; islandNumber: number }                                   // NEW (B28, optional)
  | { kind: 'boss_eligible'; islandNumber: number }
  | { kind: 'boss_resolved'; islandNumber: number }
  | { kind: 'island_clear_travel_ready'; islandNumber: number };
```

### 3.2 One normalized snapshot in, beats out

Replace the ~10 bespoke `useEffect` watchers with **one** snapshot type and a
single diffing reducer that emits `firedTriggers`:

```ts
export interface IslandNarrativeSnapshot {
  islandNumber: number;
  cycleIndex: number;
  hasHydrated: boolean;
  activeStopId: IslandNarrativeStopId | null;
  completedStopIds: ReadonlySet<string>;
  buildLevelByStopId: Record<IslandNarrativeStopId, number>;   // from stopBuildStateByIndex
  canChallengeBoss: boolean;
  bossChallengeActive: boolean;        // NEW board signal for B27
  bossResolvedIslandNumber: number | null;
  islandClearTravelReady: boolean;
  arrivalJustClosed: boolean;
}
```

A pure `diffNarrativeSnapshot(prev, next): IslandNarrativeTrigger[]` (fully
unit-testable, no React) replaces the per-beat refs. The hook keeps the
**hydration-baseline rule** (first hydrated observation seeds the ref, never
fires a stale catch-up) — that logic is good and must be preserved generically.

### 3.3 Generic beat→surface mapping

Drive the surface from the **beat definition**, removing the hard-coded
`beatId === 'I001-Bxx'` branches:

- `surface: 'story_reader'` → `setActiveStoryEpisode({ kind, manifestPath: beat.episodePath })`
- `surface: 'dialogue_sheet'` → build `ActiveIslandNarrativeDialogue` from
  `beat.speakerId` → character `displayName`, `beat.text`, `beat.secondaryText`,
  `beat.displayCtaText ?? defaultContinueLabel`, and a `tone` derived from
  speaker/priority (sava→`wisdom`, noctyra→`guardian`, else `standard`).
- `surface: 'toast'` → build `ActiveIslandNarrativeToast` from `beat.text` +
  optional `supportingLabel` (add an optional field to the beat type, or derive).

`QUEUE_PRIORITY` becomes a function of `beat.priority` (`major < short < ambient`)
with trigger-kind tiebreak, instead of a hard-coded per-ID map.

### 3.4 Keep island-gating, generalize it

`isEligibleForIsland001OpeningFlow(island, cycle)` → keep, but the dispatcher
should select the definition via `getIslandNarrativeDefinition(islandNumber)`.
For this plan we still **only ship Island 1 content**, but the controller stops
being island-1-shaped so islands 2+ are a content-only add later.

---

## 4) Phased delivery (PR-sized slices)

Each PR is independently shippable and additive. Feature-flag the new beats
(`islandNarrativeBeatsV2`) so they can land dark and be QA'd before exposure.

### PR 0 — Content/numbering reconciliation (docs only)
- Resolve the B24/B06 discrepancy (§2). Lock the final Island-1 beat list and
  speakers against the slice §7 table.
- No code. Output: an updated beat checklist in this doc / the slice.

### PR 1 — Controller refactor to data-driven dispatch (no new beats)
- Add `stop_completed` + aggregate/boss trigger kinds to `islandNarrativeTypes.ts`.
- Introduce `IslandNarrativeSnapshot` + pure `diffNarrativeSnapshot`.
- Rewrite `useIslandNarrativeOpeningFlow` internals to: build snapshot → diff →
  enqueue by `beat.priority` → generic surface mapping. **Behavior parity**: the
  same 7 beats must still fire identically.
- Board: replace the discrete inputs with one `snapshot` memo (add
  `buildLevelByStopId` from `stopBuildStateByIndex`, `completedStopIds` from
  `completedStops`).
- **Acceptance:** all existing narrative tests pass unchanged
  (`__tests__/islandNarrativeOpeningFlow.test.ts`,
  `islandNarrativeDialogueComponent.test.ts`, etc.); 7 beats fire as before;
  no new beats yet.

### PR 2 — Stop-open + stop-complete beats for habit / mystery / wisdom
- Author B09/B14/B19 (`stop_opened`) and B05/B10/B15/B20 (`stop_completed`) in
  `island001Narrative.ts` with slice copy (Miri/Poko/Sava/companion).
- Board: ensure `completedStopIds` and `activeStopId` feed the snapshot (mostly
  already present via `completedStops`/`activeStopId`).
- **Acceptance:** opening each landmark and completing each objective fires the
  right one-time dialogue; never blocks `handleCompleteActiveStop`; suppressed on
  replay; demo + Supabase parity.

### PR 3 — Landmark level-up reactions (all stops, L1–L3)
- Author B06–B08, B11–B13, B16–B18, B21–B23 (mix of `toast` + short
  `dialogue_sheet` per slice §9).
- Board: snapshot already carries `buildLevelByStopId`; the build-level-up site
  (`IslandRunBoardPrototype` ~L8265, `leveledUp`) needs no change — the diff
  reducer detects the rise. Confirm hydration-baseline rule prevents stale
  catch-up on already-built saves (mirror the existing hatchery-L1 guard).
- **Acceptance:** each landmark level-up shows its one-time reaction; reduced to
  toast where the slice marks "construction reaction"; no full-screen modal
  except the all-builds-complete case.

### PR 4 — Aggregate + boss in-fight beats
- B25 (`landmarks_restored_majority`, threshold 3/5 at L3) — Poko "People are
  coming outside."
- B27 (`boss_challenge_started`) and optional B28 (`boss_midpoint`) — requires a
  small board signal: set `bossChallengeActive` when the boss trial UI opens, and
  (for B28) a midpoint callback from the boss component. If midpoint is not
  cheaply available, fold B28's reveal into the resolution episode (B29) per the
  slice's stated fallback.
- **Acceptance:** majority-restored fires once; boss-start framing shows before
  the trial; mid-reveal either fires or is gracefully merged into B29.

### PR 5 — Durable seen-state ✅ SHIPPED (product-approved)
- **Done.** Cross-device story memory is implemented. A `narrativeSeenState`
  jsonb (`narrative_seen_state`, migration `0265`) now lives on the runtime
  record and is read/written via the canonical persistence path
  (`applyNarrativeSeenStateMarker`) — never from React directly. localStorage
  (`island_run_narrative_seen_v1_*`) remains the offline-immediate mirror; the
  two layers are **unioned** on hydration (a beat seen anywhere stays
  suppressed), keeping the most-recent timestamp per key.
- Files: `narrative/islandNarrativeSeenState.ts` (shape + pure helpers),
  `islandRunGameStateStore.ts`, `islandRunRuntimeStateBackend.ts`,
  `islandRunRuntimeState.ts`, `islandRunStateActions.ts`,
  `islandRunProgressReset.ts`, `useIslandNarrativeOpeningFlow.ts`,
  `IslandRunBoardPrototype.tsx`, migration `0265`, tests in
  `narrative/__tests__/islandNarrativeSeenState.test.ts`.
- **Acceptance (met):** a beat seen on device A is suppressed on device B;
  offline falls back to localStorage; no gameplay field touched; `tsc -b` clean;
  island-run suite green.
- This shipped **ahead of** the controller refactor (PR 1) because it is
  additive and works for the 7 live beats today and any future beats
  automatically. PR 1–4 still follow to wire the remaining ~23 beats.

### PR 6 — QA, fallbacks, accessibility polish
- Media-fail → text-only panel; audio-off → captions; reduced-motion → stills.
- Mobile limits: dialogue ≤110 chars, ≤2 bubbles/beat (4 only in finale),
  one story modal at a time, 44×44px targets (per slice §19).
- Manual QA matrix below.

---

## 5) Files touched (map)

| File | Change |
|---|---|
| `narrative/islandNarrativeTypes.ts` | Add `stop_completed`, `landmarks_restored_majority`, `boss_challenge_started`, `boss_midpoint` triggers; optional `supportingLabel` on beat. |
| `narrative/definitions/island001Narrative.ts` | Author ~23 new beats (PRs 2–4). |
| `narrative/useIslandNarrativeOpeningFlow.ts` | Refactor to snapshot+diff+generic mapping (PR 1); preserve hydration-baseline + queue/seen logic. |
| `narrative/diffNarrativeSnapshot.ts` (new) | Pure trigger-diff reducer + unit tests. |
| `narrative/islandNarrativeValidation.ts` | Extend validation for new trigger kinds. |
| `components/IslandRunBoardPrototype.tsx` | Build one `snapshot` memo (add `buildLevelByStopId`, `completedStopIds`, `bossChallengeActive`); pass to hook. Render surfaces unchanged. |
| `components/IslandNarrativeDialogue.tsx` / `IslandNarrativeToast.tsx` | No change expected (already generic on speaker/text/tone). |
| `narrative/__tests__/*` | Add coverage for new triggers + diff reducer; keep parity tests green. |
| `supabase/migrations/02xx_*` | **Only if PR 5** is approved (durable seen-state). |

---

## 6) Test plan

**Unit (pure, no React):**
- `diffNarrativeSnapshot`: every trigger kind fires on the correct prev→next
  edge and **only** on a live transition (hydration baseline = no stale fire).
- Priority ordering: `major` before `short` before `ambient`; tiebreak stable.

**Hook/integration (existing harness):**
- Parity: the original 7 beats fire identically after the PR-1 refactor.
- New beats: stop-open, stop-complete, per-stop level-up, majority, boss-start
  each fire once and are suppressed after `markSeen`.
- Non-blocking invariant: queued beats never gate `handleCompleteActiveStop`,
  boss launch, island clear, or travel (assert surfaces are overlay-only).
- Surface-blocked rule: a beat waiting behind a celebration overlay resumes
  (reuse existing `isNarrativeSurfaceBlockingBeat` semantics).

**Manual QA matrix (Island 1, cycle 0, fresh `island_run_narrative_seen_v1_*`):**

| Step | Expect |
|---|---|
| First entry | Prologue (global) → Arrival → Miri B03 |
| Open Hatchery | Poko B04 |
| Hatchery → L1 | "The island noticed" toast (B24) |
| Complete Hatchery objective | B05 |
| Open Habit / complete | B09 / B10 |
| Habit/Mystery/Wisdom level-ups | B11–13 / B16–18 / B21–23 |
| 3rd landmark hits L3 | B25 once |
| Boss eligible | Sava B26 |
| Boss challenge opens | B27 |
| Boss resolved | Resolution episode B29 |
| Travel ready | Miri B30 → travel CTA |
| Reload mid-island | No replays; correct status; no stale catch-up |

Run the existing persistence smoke scripts after wiring
(`scripts/check-day-zero-onboarding-persistence.mjs` style) and `npm run build`.

---

## 7) Risks & guardrails

- **Largest risk: re-introducing gameplay authority.** The diff reducer reads
  snapshots only; all enqueue/mark-seen stays in the hook; **zero** gameplay
  writes from narrative code. Validation rejects reward/tile/build/boss/travel
  fields on beats (already enforced — keep it).
- **Board is a very large component.** Add only a memoized `snapshot` and keep
  surfaces where they are; do not thread new logic through unrelated board code.
- **Stale catch-up on existing saves.** Every new watcher must follow the
  established `previous === null → seed only` baseline rule, or returning players
  get a burst of old beats.
- **Modal stacking on mobile.** One story modal at a time; dialogue/toast must
  yield to story_reader and to clear/celebration overlays (existing rule).
- **Content fidelity.** Lock copy against slice §7/§9 in PR 0 to avoid drift; keep
  dialogue within the mobile char limits.
- **Boss midpoint (B28) may be expensive.** If the boss component has no cheap
  mid hook, take the slice-sanctioned fallback and merge the reveal into B29.

---

## 8) Definition of done

1. The data-driven controller fires all locked Island-1 beats from
   `island001Narrative.ts` with **no per-beat-ID branches** remaining.
2. Adding a future beat to Island 1 (or starting Island 2) is a **content-only**
   change — no controller edits.
3. Story never blocks stop open/complete, build, boss, island clear, or travel.
4. One-time beats are suppressed on reload (localStorage; Supabase if PR 5).
5. Accessibility + mobile limits honored; graceful media/audio/motion fallbacks.
6. Existing narrative tests stay green; new triggers + diff reducer covered;
   `npm run build` clean.

---

## 9) Related documents

- [`docs/design/island-001-narrative-vertical-slice.md`](../design/island-001-narrative-vertical-slice.md) — full 30-beat script (content source).
- [`docs/gameplay/island-001-narrative-content-contract.md`](../gameplay/island-001-narrative-content-contract.md) — read-only authority rules.
- [`docs/investigations/holistic-island-storytelling-system-audit.md`](../investigations/holistic-island-storytelling-system-audit.md) — system inventory + phased architecture.
- [`docs/NEW_PLAYER_GAME_LOOP.md`](../NEW_PLAYER_GAME_LOOP.md) §14 — how the story layer wraps the new-player loop.
</content>
</invoke>
