# Island Run progression-marker QA checklist (M7F)

Use this checklist with:
- `/level-worlds.html?islandRunDev=1&islandRunEntryDebug=1&debugBoard=1&islandRunQa=1`
- Debug evidence export: `window.__islandRunEntryDebugEvidence()`

## 1) Baseline reset
1. Click **QA: Reset progression**.
2. Confirm header status shows `Island: 1`.
3. Export debug evidence and confirm recent persist events include:
   - `currentIslandNumber: 1`
   - `bossTrialResolvedIslandNumber: null`

## 2) Boss marker set
1. Click **QA: Mark boss resolved**.
2. Confirm landing text indicates QA boss marker set.
3. Export debug evidence and confirm persist payload includes:
   - `currentIslandNumber: 1`
   - `bossTrialResolvedIslandNumber: 1`

## 3) Island advance transition
1. Click **QA: Advance island**.
2. Confirm header status shows `Island: 2`.
3. Export debug evidence and confirm persist payload includes:
   - `currentIslandNumber: 2`
   - `bossTrialResolvedIslandNumber: null`

## 4) Refresh continuity check
1. Refresh the page.
2. Confirm hydrated island marker remains at island 2.
3. Export debug evidence and confirm hydrate success payload includes:
   - `currentIslandNumber: 2`
   - `bossTrialResolvedIslandNumber: null`

## 5) Failure-path sanity (optional)
If running without Supabase table/client, confirm fallback events include marker snapshots:
- `runtime_state_hydrate_skipped_remote`
- `runtime_state_hydrate_query_error`
- `runtime_state_hydrate_no_row`

Each should include fallback marker payload keys.


## 6) Assertion helper
After completing steps 1–4, run:

```js
window.__islandRunEntryDebugAssertProgressionSequence('table')
```

Expected:
- `passed: true`
- Each check has `passed: true` and a `matchedEventIndex`.


### Fallback preset
If running in fallback-only mode (no table/client), run:

```js
window.__islandRunEntryDebugAssertProgressionSequence('fallback')
```

Expected:
- `passed: true`
- `mode: 'fallback'`

## 7) Console summary helper (M7I)
Run either mode after step 6 to print a compact triage line:

```js
window.__islandRunEntryDebugAssertProgressionSummary('table')
window.__islandRunEntryDebugAssertProgressionSummary('fallback')
```

Expected output shape:
- `scope: 'full_buffer'` is always present for direct summary helper calls
- `passed` boolean mirrors `__islandRunEntryDebugAssertProgressionSequence(mode).passed`
- `failedChecks` contains failed check names (empty when passing)
- `summaryLine` is compact (`PASS ...` or `FAIL ... failed: ...`) for quick console sharing

## 8) QA export bundle helper (M7J)
Run one of the bundle helpers to capture summary + evidence in one payload:

```js
window.__islandRunEntryDebugExportProgressionBundle('table')
window.__islandRunEntryDebugExportProgressionBundle('fallback')
```

Expected output shape:
- `mode` matches the requested mode
- `summary` matches `__islandRunEntryDebugAssertProgressionSummary(mode)` semantics
- `evidence` includes the latest `events` and `network` arrays for copy/paste triage

## 9) Run-scoped progression filter helper (M7K)
When multiple repros exist in one buffer, filter progression events by run id or scenario:

```js
const runId = window.__islandRunEntryDebugStartRun('progression-m7k')
window.__islandRunEntryDebugFilterProgressionRun(runId, 'table')
window.__islandRunEntryDebugFilterProgressionRun('progression-m7k', 'fallback')
```

Expected output shape:
- `filterApplied` is `true` when a non-empty `ref` is provided
- `filterMatched` is `true` only when `ref` resolves to a repro window
- `scope` is normalized and explicit: `run_filtered` only when `filterMatched` is `true`, otherwise `full_buffer`
- `events` contains only progression-relevant runtime-state events from the matched run window
- `report` is assertion-compatible and mirrors pass/fail for the filtered event set
- `matchedRunId` / `matchedScenario` confirm which run window was selected

## 10) Filter-aware export bundle helper (M7L/M7M)
Use the same export helper with and without a run filter:

```js
window.__islandRunEntryDebugExportProgressionBundle('table')
window.__islandRunEntryDebugExportProgressionBundle('table', runId)
window.__islandRunEntryDebugExportProgressionBundle('fallback', 'progression-m7k')
```

Expected output shape:
- No filter: `scope: 'full_buffer'`, `filterApplied: false`, `filterMatched: false`, and bundle keeps full evidence event buffer behavior
- With a matched filter ref: `scope: 'run_filtered'`, `filterApplied: true`, `filterMatched: true`, and `evidence.events` is scoped to the matched run window progression events
- With an unmatched filter ref: `scope: 'full_buffer'`, `filterApplied: true`, `filterMatched: false`
- `summary.scope` mirrors top-level bundle `scope`
- Filter metadata keys (`runFilterRef`, `matchedRunId`, `matchedScenario`, `filteredEventCount`) describe the applied scope

### Scope verification spot-check commands (M7M)
Run these exact commands in sequence to confirm normalized scope metadata in unfiltered + filtered paths:

```js
window.__islandRunEntryDebugAssertProgressionSummary('table').scope
window.__islandRunEntryDebugFilterProgressionRun(undefined, 'table').scope
window.__islandRunEntryDebugFilterProgressionRun(runId, 'table').scope
window.__islandRunEntryDebugFilterProgressionRun('missing-run-ref', 'table').filterMatched
window.__islandRunEntryDebugExportProgressionBundle('table').scope
window.__islandRunEntryDebugExportProgressionBundle('table').filterApplied
window.__islandRunEntryDebugExportProgressionBundle('table', runId).scope
window.__islandRunEntryDebugExportProgressionBundle('table', runId).filterMatched
window.__islandRunEntryDebugExportProgressionBundle('table', runId).summary.scope
window.__islandRunEntryDebugExportProgressionBundle('table', 'missing-run-ref').scope
window.__islandRunEntryDebugExportProgressionBundle('table', 'missing-run-ref').filterMatched
```

Expected scope/filter values:
- Summary helper => `full_buffer`
- Filter helper with no ref => `full_buffer`
- Filter helper with ref => `run_filtered`
- Filter helper with unmatched ref => `filterMatched: false`
- Bundle with no ref => `full_buffer` and `filterApplied: false`
- Bundle with matched ref => `run_filtered` and `filterMatched: true` (including `summary.scope`)
- Bundle with unmatched ref => `full_buffer` and `filterMatched: false`

## 11) Market purchase marker verification (M8E)
Use this section after opening the Market stop modal in Island Run dev mode.

### A) Seed coin balance for success paths
Use boss resolve once to seed coins if needed:

```js
window.__islandRunEntryDebugMark('qa_market_seed_start')
```

Then in UI:
1. Open **Boss Stop** modal.
2. Click **Resolve Boss Trial** (adds +120 coins in prototype).
3. Close boss modal and open **Market Stop** modal.

### B) Trigger all Market marker outcomes
Run/perform in this order:

1. Click **Buy Dice Bundle** (expected `attempt` + `success`).
2. Click **Buy Dice Bundle** again (button disabled/owned; expected `already_owned` marker via repurchase-block path when invoked before disable in flow).
3. Click **Buy Heart Bundle** (expected `attempt` + `success`).
4. Click **Buy Heart Bundle** again (owned path).

### C) Console extraction commands
Run these exact commands to inspect Market markers from evidence buffer:

```js
const marketEvents = window.__islandRunEntryDebugEvidence().events
  .filter((event) => event.stage === 'island_run_market_purchase')

marketEvents.map((event) => ({
  status: event.payload?.status,
  bundle: event.payload?.bundle,
  cost_coins: event.payload?.costCoins,
  reward_dice: event.payload?.rewardDice,
  reward_hearts: event.payload?.rewardHearts,
  coins_before: event.payload?.coinsBefore,
  coins_after: event.payload?.coinsAfter,
  owned_dice_bundle: event.payload?.ownedDiceBundle,
  owned_heart_bundle: event.payload?.ownedHeartBundle,
}))
```

Expected marker coverage:
- Includes `attempt`, `success`, and `already_owned` statuses for both bundles after the sequence above.
- `already_owned` events include owned snapshot flags (`ownedDiceBundle` / `ownedHeartBundle`) set to `true` for the blocked bundle.
- Existing `insufficient_coins` status can be verified by attempting purchases before coin seeding.

### D) Deterministic dev-only helper path (M8F)
When `islandRunQa=1` is enabled, use these buttons to force owned-marker emission without timing dependency:

1. Click **QA: Market already-owned (dice)**.
2. Click **QA: Market already-owned (heart)**.

Then re-run the extraction command in section C.

Expected additions:
- New `island_run_market_purchase` entries with `status: 'already_owned'` for both `dice_bundle` and `heart_bundle`.
- Owned snapshot fields for the selected bundle are explicitly `true` in the emitted payload.

### E) Compact Market marker export helper (M8G)
Use the new helper to export compact marker rows without re-mapping evidence manually:

```js
window.__islandRunMarketDebugExportMarkers()
window.__islandRunMarketDebugExportMarkers(6)
```

Expected output shape:
- `generatedAt` timestamp for snapshot capture
- `totalMarkers` count for returned rows
- `rows[]` where each row includes:
  - `status`, `bundle`
  - `costCoins`, `rewardDice`, `rewardHearts`
  - `coinsBefore`, `coinsAfter`
  - `ownedDiceBundle`, `ownedHeartBundle`
  - `timestamp`

Cross-check:
- `rows` should match the latest `island_run_market_purchase` payloads from `window.__islandRunEntryDebugEvidence().events`.

## 12) Market marker reset helper (M8H)
Use this helper to create deterministic clean-slate export windows in the current session.

### A) Emit any marker(s)
Use either normal Market actions or QA helper buttons from section 11 to seed at least one marker.

### B) Reset Market marker baseline + local Market QA state
Run:

```js
window.__islandRunMarketDebugResetState()
```

Expected immediate result:
- Returns `{ baselineApplied: true, ownedBundles: [], feedbackCleared: true, resetAt }`
- Market owned-state/feedback is cleared for the current session
- Market marker export helper now uses `resetAt` as baseline cutoff

### C) Verify post-reset exports are clean
Run:

```js
window.__islandRunMarketDebugExportMarkers(20)
```

Expected before new actions:
- `baselineApplied: true`
- `totalMarkers: 0` (or only markers emitted after reset)

Then emit new Market markers and rerun export:
- Snapshot should include only post-reset marker rows for that sequence.

## 13) Market status coverage assertion helper (M8I)
Use the status assertion helper after running Market actions (or QA helper triggers) in sections 11–12.

Run:

```js
window.__islandRunMarketDebugAssertStatusCoverage()
window.__islandRunMarketDebugAssertStatusCoverage(['attempt', 'success'])
window.__islandRunMarketDebugAssertStatusCoverage(undefined, 12)
```

Expected output shape:
- `passed` indicates whether all expected statuses are covered in the selected marker window.
- `expectedStatuses` lists target statuses checked.
- `coveredStatuses` lists statuses found in exported marker rows.
- `missingStatuses` is empty when passing.
- `markerCount`, `baselineApplied`, and `baselineIso` mirror the export helper context used for evaluation.

Tip:
- Run `window.__islandRunMarketDebugResetState()` first for clean-slate status coverage checks in deterministic QA runs.

## 14) Home Island hatchery event verification (M9G)

**Setup:**
```
/level-worlds.html?islandRunDev=1&islandRunEntryDebug=1&islandRunQa=1
```

**A) Trigger home egg set**
1. In the Home Island panel (top of the Island Run HUD), confirm the slot shows `0/1` (available).
2. Click **Set egg** button.
3. Confirm slot updates to `1/1` and the hatching stage indicator appears.

**B) Verify home_egg_set telemetry via debug evidence**
```js
window.__islandRunEntryDebugEvidence().events
  .filter(e => e.stage === 'home_egg_set')
  .map(e => ({ tier: e.payload?.tier, source: e.payload?.source }))
```
Expected:
- At least one entry with `source: 'home_hatchery'` and `tier` matching the egg type set.

**C) Wait for egg to reach stage 4 (or use dev fast-hatch if available) then open**
1. Confirm Home Island panel shows "Open egg 🥚" button.
2. Click **Open egg 🥚**.
3. Confirm hearts counter increments by 1 and landing text shows "Egg opened! +1 heart reward".

**D) Verify home_egg_open telemetry via debug evidence**
```js
window.__islandRunEntryDebugEvidence().events
  .filter(e => e.stage === 'home_egg_open')
  .map(e => ({ tier: e.payload?.tier, source: e.payload?.source, heartsAwarded: e.payload?.heartsAwarded }))
```
Expected:
- At least one entry with `source: 'home_hatchery'`, correct `tier`, and `heartsAwarded: 1`.

**E) Demo parity note**
- Telemetry fires in both live and demo sessions via the shared `recordTelemetryEvent` path.

## 15) Audio/haptic event coverage spot-check (M10D/M10E)

**Setup:**
```
/level-worlds.html?islandRunDev=1&islandRunEntryDebug=1&islandRunQa=1
```

**A) Market stop completion audio**
1. Open the Market Stop modal (land on market stop or open via QA controls).
2. Click **Complete Market Stop**.
3. Confirm market stop is marked completed.
4. Expected: `market_stop_complete` sound and haptic fire on completion.

**B) Island travel completion audio**
1. Complete all 5 stops including boss (or use QA advance shortcut).
2. Trigger island travel (confirm travel overlay appears).
3. Wait for travel to complete / click through travel overlay.
4. Confirm new island loads and island number increments.
5. Expected: `island_travel_complete` sound and haptic fire on arrival at new island.

**C) Audio toggle verification**
1. Click the 🔇 audio toggle to disable audio.
2. Trigger any stop completion.
3. Expected: no sound or haptic fires while disabled.
4. Re-enable with 🔊 toggle — confirm events fire again.

**D) Coverage summary**
All Island Run audio/haptic events (M10A–M10D) now covered:

| Event | Sound | Haptic | Slice |
|-------|-------|--------|-------|
| roll | ✅ | ✅ | M10A |
| token_move | ✅ | — | M10A |
| stop_land | ✅ | ✅ | M10A |
| island_travel (departure) | ✅ | ✅ | M10A |
| reward_claim | — | ✅ | M10A |
| egg_set | ✅ | ✅ | M10B |
| egg_ready | ✅ | — | M10B |
| egg_open | ✅ | ✅ | M10B |
| market_purchase_attempt | ✅ | — | M10B |
| market_purchase_success | ✅ | ✅ | M10B |
| market_insufficient_coins | ✅ | — | M10B |
| boss_trial_start | ✅ | — | M10C |
| boss_trial_resolve | ✅ | ✅ | M10C |
| boss_island_clear | ✅ | ✅ | M10C |
| encounter_trigger | ✅ | — | M10C |
| encounter_resolve | ✅ | ✅ | M10C |
| market_stop_complete | ✅ | ✅ | M10D |
| island_travel_complete (arrival) | ✅ | ✅ | M10D |
