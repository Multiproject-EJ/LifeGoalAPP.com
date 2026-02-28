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
- `events` contains only progression-relevant runtime-state events from the matched run window
- `report` is assertion-compatible and mirrors pass/fail for the filtered event set
- `matchedRunId` / `matchedScenario` confirm which run window was selected

## 10) Filter-aware export bundle helper (M7L)
Use the same export helper with and without a run filter:

```js
window.__islandRunEntryDebugExportProgressionBundle('table')
window.__islandRunEntryDebugExportProgressionBundle('table', runId)
window.__islandRunEntryDebugExportProgressionBundle('fallback', 'progression-m7k')
```

Expected output shape:
- No filter: bundle keeps full evidence event buffer behavior
- With filter: `evidence.events` is scoped to the matched run window progression events
- Filter metadata keys (`runFilterRef`, `matchedRunId`, `matchedScenario`, `filteredEventCount`) describe the applied scope

