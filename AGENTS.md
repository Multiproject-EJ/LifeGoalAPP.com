# AGENTS.md

## Island Run rules for AI agents

Before modifying Island Run code, read:
- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
- `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`

### Never
- Add gameplay writes directly inside React UI components.
- Call `persistIslandRunRuntimeStatePatch` from UI for gameplay fields.
- Introduce new gameplay `runtimeState` mirrors in UI components.
- Duplicate dice/token/reward/stop progression logic locally in components.
- Re-couple stop progression semantics to board tile indices.

### Always
- Read gameplay state via canonical store hook/path (`useIslandRunState` etc.).
- Mutate gameplay through canonical action services (`islandRunStateActions`, roll/tile actions, mutex-protected services).
- Preserve user-facing behavior while migrating architecture.
- Add/update tests for gameplay behavior changes.

### Migration policy
- Legacy usage may exist during migration.
- Do not add new legacy gameplay write paths.
- Prefer small, reversible migration slices.
