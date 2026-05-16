# Dev Clear Island Validation & Safety Note

Date: 2026-05-16
Branch: `copilot/add-dev-clear-island-button`

## 1) Build status

- `npm run build`: **PASS**.
- Vercel compile blocker from this branch is **fixed / not present** in current branch state.
- `MAX_BUILD_LEVEL` is resolved from the canonical V2 build module in `islandRunStateActions.ts`:
  - `import { ... MAX_BUILD_LEVEL, ... } from './islandRunContractV2EssenceBuild';`
- The source-guard test path in `islandRunStateActions.test.ts` avoids `process` usage in this file:
  - it reads sources by repo-relative string paths via `fs.readFileSync(...)` and does not call `process.cwd()`,
  - so this test no longer depends on Node global `process` type presence.

## 2) Test status

- `npm run test:island-run`: **PASS**.
- `git --no-pager diff --check`: **PASS**.

## 3) Reward safety

Confirmed for `applyDevClearCurrentIslandForTravel`:

- It does **not** grant normal egg rewards, island-clear rewards, dice, essence, shards, diamonds, or other production reward payouts.
- For ready eggs, it resolves through:
  - `resolveReadyEggTerminalTransition(... rewardDeltas: { essence: 0, essenceLifetimeEarned: 0, dicePool: 0, spinTokens: 0, shards: 0, diamonds: 0 })`
  - so reward deltas are explicitly zero.
- For missing/incubating/non-terminal egg ledger states, it writes a terminal hatchery entry (`status: 'sold'`) via `applyEggResolution(...)` only to satisfy hatchery gate state; this path does not mint dice/shards/diamonds/spin token rewards and does not add essence deltas unless explicitly supplied (none are supplied here).

## 4) Travel safety

- The dev clear button handler does **not** call direct travel (`performIslandTravel`) and does not call `handleTravelFromCelebration`.
- It only opens existing celebration flow:
  - `showIslandClearCelebrationFromAnywhere('dev_clear_island')`
- Actual travel still occurs only through existing celebration CTA:
  - CTA button calls `handleTravelFromCelebration`,
  - that function then runs existing travel overlay + `performIslandTravel(...)`.

## 5) Dev-only safety

- UI render-gating: the `🧹 Clear Island (Dev)` button is inside `{isDevModeEnabled && (...)}`.
- Handler guard: `handleDevClearCurrentIslandForTravel` returns immediately on `if (!isDevModeEnabled) return;`.
- Production exposure: no non-dev UI path renders this action; it is only available under the dev-gated controls.
