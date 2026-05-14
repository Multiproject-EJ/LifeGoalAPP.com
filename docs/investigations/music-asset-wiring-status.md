# Music Asset Wiring Status (Island Run)

## 1. Current music asset wiring status

At runtime, only one Island Run music track is wired into live behavior: the market lounge loop used during shop/market panel playback.

## 2. Runtime-referenced tracks

- `/assets/audio/music/market-lounge-loop-v1.mp3`

Referenced via:

- `src/features/gamification/level-worlds/services/islandRunMusic.ts`

Consumed by:

- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`

## 3. Unused uploaded tracks

The following uploaded tracks are registered or present but not currently triggered by runtime playback paths:

- `public/assets/audio/music/luxury-reward-loop-v1.mp3`
- `public/assets/audio/music/event-jackpot-loop-v1.mp3`
- `public/assets/audio/music/new-island-celebration-loop-v1.mp3`
- `public/assets/audio/music/boss-rhythm-duel-loop-v1.mp3`

## 4. Current `islandRunMusic` architecture summary

Current design is a small named-track controller with lazy `HTMLAudioElement` creation per registered track, looped playback, fixed low volume, autoplay rejection handling (`play().catch(...)`), explicit start/stop calls, and single-owner loop arbitration.

## 5. Best next integration order

1. Add new-island celebration wiring.
2. Add event jackpot wiring.
3. Add boss rhythm duel wiring after lifecycle ownership is finalized.

## 6. Recommended next PR

Create a small architecture PR that:

- Wires new-island celebration playback through the existing named-track controller.
- Keeps single active loop ownership (no overlap).
- Preserves Market/Shop playback through `market-lounge`.
- Leaves jackpot and boss playback disabled until lifecycle hooks are finalized.

## 7. Exact files needing edits

Primary:

- `src/features/gamification/level-worlds/services/islandRunMusic.ts`
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`

Likely follow-up integration points:

- `src/features/gamification/level-worlds/services/islandRunEventEngine.ts`
- `src/features/gamification/level-worlds/services/islandRunContractV2RewardBar.ts`
- `src/features/gamification/level-worlds/services/islandRunMinigameLauncherService.ts`
- `src/features/gamification/level-worlds/components/IslandRunMinigameLauncher.tsx`
- `src/features/gamification/games/shooter-blitz/ShooterBlitz.tsx`

## 8. Risks/gotchas

- Browser autoplay restrictions may block background-triggered playback.
- Track overlap can occur without centralized arbitration.
- Cleanup must be consistent on modal close, unmount, route change, and mute toggle.
- Mobile/PWA lifecycle transitions may interrupt loop continuity.
- Keep gameplay state mutation out of UI components; route integration through canonical services/actions.

## 9. Final recommendation

Proceed with lifecycle-scoped follow-up PRs: wire new-island celebration first, then jackpot, then boss rhythm duel. Keep all follow-up playback routed through the named-track, single-owner music controller.
