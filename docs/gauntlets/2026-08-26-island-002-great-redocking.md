# Island 002 — The Great Re-Docking

Status: active implementation slice  
Date: 2026-08-26  
Runtime island: 002 — Celestial Sky Kingdom

## Outcome

Turn the approved Island 002 story into a small, canonical mission: every accepted board roll winches one of four outer landmark platforms toward the central kingdom. Platforms lock at rolls 5, 10, 15 and 20. The phone shows only `Dock Platforms`, `Build Landmarks`, and the shared progress bar.

## Authority and scope

- Roll progress lives only in `signatureMissionProgressByIsland` and advances inside `islandRunRollAction`.
- The Three.js world receives a read-only presentation projection. It cannot write gameplay state.
- The 36-tile route, landmark hit targets, camera presets, stop order, wallets, rewards and island-clear rules remain canonical and fixed.
- Outer shelf and landmark visual roots may move. Their gameplay proxies remain at the approved final positions.
- Missing or legacy mission records start at zero. Historical rolls are not inferred.
- This slice grants no separate reward and does not add another island-clear gate. Reward and gating remain explicit future decisions.

## Mission state

Cycle-scoped record:

```ts
{
  missionId: 'celestial-great-redocking';
  version: 1;
  rollsCompleted: number; // 0..20
  completedAtMs: number | null;
  updatedAtMs: number;
}
```

The docked-platform count is derived as `floor(rollsCompleted / 5)` and capped at four. Conflict merge keeps the greatest roll count and earliest completion time.

## Visual contract

- At 0 rolls all four outer shelf and landmark presentation roots begin radially offset from their final positions.
- Rolls 1–5 move platform 1, 6–10 platform 2, 11–15 platform 3, and 16–20 platform 4.
- Each fifth roll ends at the approved final position and pulses a symmetrical docking collar.
- Sagged energy tethers visibly connect the central kingdom to each moving platform.
- Reduced motion snaps directly to the persisted readable state.
- At 20 rolls the existing approved Island 002 composition is restored exactly.

## Acceptance evidence

- Pure tests cover all four thresholds, completion idempotency, cycle scoping, sanitization and merge.
- Roll-action test proves the twentieth accepted roll persists once and emits the fourth lock edge once.
- Mission-phone test proves the live two-row copy and `2 / 4` milestone display.
- 3D contract evidence proves platform, tether, collar, reduced-motion and board-to-renderer wiring.
- Island Run service suite and architecture guard pass.
- Phone screenshots capture at least an in-progress state and the completed composition.

## Rollback

Remove the Island 002 mission union branch, roll-action advancement, phone progress kind and Three.js presentation projection. No stop, wallet, route or completion data requires migration.
