# Music Asset Wiring Status (Island Run)

## 1. Current music asset wiring status

At runtime, only one Island Run music track is wired into live behavior: the luxury reward loop used during shop/market panel playback.

## 2. Runtime-referenced tracks

- `/assets/audio/music/luxury-reward-loop-v1.mp3`

Referenced via:

- `/home/runner/work/LifeGoalAPP.com/LifeGoalAPP.com/src/features/gamification/level-worlds/services/islandRunMusic.ts`

Consumed by:

- `/home/runner/work/LifeGoalAPP.com/LifeGoalAPP.com/src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`

## 3. Unused uploaded tracks

The following uploaded tracks are currently not wired into runtime playback paths:

- `/home/runner/work/LifeGoalAPP.com/LifeGoalAPP.com/public/assets/audio/music/market-lounge-loop-v1.mp3`
- `/home/runner/work/LifeGoalAPP.com/LifeGoalAPP.com/public/assets/audio/music/event-jackpot-loop-v1.mp3`
- `/home/runner/work/LifeGoalAPP.com/LifeGoalAPP.com/public/assets/audio/music/new-island-celebration-loop-v1.mp3`
- `/home/runner/work/LifeGoalAPP.com/LifeGoalAPP.com/public/assets/audio/music/boss-rhythm-duel-loop-v1.mp3`

## 4. Current `islandRunMusic` architecture summary

Current design is a single-track, hardcoded service with one module-level `HTMLAudioElement`, looped playback, fixed volume, autoplay rejection handling (`play().catch(...)`), and explicit start/stop calls. It is not yet a generalized multi-track controller with central arbitration.

## 5. Best next integration order

1. Migrate market/shop playback to `market-lounge-loop-v1.mp3`.
2. Add new-island celebration wiring.
3. Add event jackpot wiring.
4. Add boss rhythm duel wiring after lifecycle ownership is finalized.

## 6. Recommended next PR

Create a small architecture PR that:

- Refactors `islandRunMusic.ts` into a named-track controller/registry.
- Enforces single active loop ownership (no overlap).
- Switches current shop playback from luxury loop to market lounge loop.
- Registers remaining tracks without enabling them until lifecycle hooks are finalized.

## 7. Exact files needing edits

Primary:

- `/home/runner/work/LifeGoalAPP.com/LifeGoalAPP.com/src/features/gamification/level-worlds/services/islandRunMusic.ts`
- `/home/runner/work/LifeGoalAPP.com/LifeGoalAPP.com/src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`

Likely follow-up integration points:

- `/home/runner/work/LifeGoalAPP.com/LifeGoalAPP.com/src/features/gamification/level-worlds/services/islandRunEventEngine.ts`
- `/home/runner/work/LifeGoalAPP.com/LifeGoalAPP.com/src/features/gamification/level-worlds/services/islandRunContractV2RewardBar.ts`
- `/home/runner/work/LifeGoalAPP.com/LifeGoalAPP.com/src/features/gamification/level-worlds/services/islandRunMinigameLauncherService.ts`
- `/home/runner/work/LifeGoalAPP.com/LifeGoalAPP.com/src/features/gamification/level-worlds/components/IslandRunMinigameLauncher.tsx`
- `/home/runner/work/LifeGoalAPP.com/LifeGoalAPP.com/src/features/gamification/games/shooter-blitz/ShooterBlitz.tsx`

## 8. Risks/gotchas

- Browser autoplay restrictions may block background-triggered playback.
- Track overlap can occur without centralized arbitration.
- Cleanup must be consistent on modal close, unmount, route change, and mute toggle.
- Mobile/PWA lifecycle transitions may interrupt loop continuity.
- Keep gameplay state mutation out of UI components; route integration through canonical services/actions.

## 9. Final recommendation

Proceed with one focused MVP audio architecture PR: introduce a named-track, single-owner music controller and migrate shop playback to `market-lounge-loop-v1.mp3`. Defer jackpot/celebration/boss wiring to separate lifecycle-scoped follow-up PRs.
