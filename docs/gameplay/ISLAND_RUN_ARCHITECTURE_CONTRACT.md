# Island Run Architecture Contract

Status: **Active policy** (migration-safe, guardrail-first)

## Purpose
Prevent split-authority regressions while Island Run converges to canonical state architecture.

## Canonical rule

### Reads (gameplay state)
Gameplay state should be read through the canonical Island Run store/hook path:

- `useIslandRunState(...)`
- store snapshot/selectors from `islandRunStateStore` where appropriate

### Writes (gameplay state)
Gameplay state must be mutated through canonical action services:

- `islandRunStateActions`
- `islandRunRollAction`
- `islandRunTileRewardAction`
- other mutex-protected Island Run action services

## Forbidden patterns (for new code)

1. UI/components calling `persistIslandRunRuntimeStatePatch` for gameplay fields.
2. UI/components creating new gameplay `runtimeState` mirrors.
3. Duplicating dice/token/reward/stop progression logic in local component code.
4. Coupling stop progression semantics to board tile indices.

## Allowed local component state
UI-only transient state is allowed in React components, including:

- modal open/close
- animation and camera state
- hover/focus/selection state
- pending button/loading flags
- debug panel visibility
- visual particle/FX toggles

## Migration-safe policy

- Existing legacy paths may remain temporarily during migration.
- New code must not add additional legacy gameplay write paths.
- Prefer replacing legacy usage with canonical actions in small slices.
- Each migration PR should reduce legacy surface area or keep it flat; never increase it.

## Guardrail enforcement model

- CI/script guard runs in allowlist mode initially:
  - known legacy sites are temporary exceptions,
  - new forbidden usages fail checks.
- As migrations land, remove files from allowlist.
- Final state target: no UI gameplay writes via compatibility patch APIs.

## Required references before Island Run edits

- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md` (this file)
- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
- `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`

