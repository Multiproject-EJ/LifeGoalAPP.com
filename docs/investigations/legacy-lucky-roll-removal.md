# Legacy Lucky Roll removal investigation

## Scope checked
Search terms investigated:
- `LuckyRollBoard`
- `LuckyRollDiceShop`
- `useLuckyRollStatus`
- `luckyRollStatus`
- `lucky_roll`
- `Lucky Roll`

## Classification summary

### 1) Delete legacy standalone
- `src/features/gamification/daily-treats/LuckyRollBoard.tsx` — deleted (legacy standalone Lucky Roll modal board).
- `src/features/gamification/daily-treats/LuckyRollDiceShop.tsx` — deleted (legacy standalone board sub-screen).
- `src/hooks/useLuckyRollStatus.ts` — deleted (legacy standalone overlay availability hook).
- `src/features/gamification/daily-treats/luckyRollState.ts` — deleted (standalone board state/persistence only).
- `src/features/gamification/daily-treats/luckyRollSounds.ts` — deleted (standalone board SFX only).
- `src/features/gamification/daily-treats/luckyRollBoard.css` — deleted (standalone board styling only).
- `scripts/validate-lucky-roll.mjs` — deleted (obsolete standalone Lucky Roll implementation validator).

### 2) Keep compatibility ID
Keep `lucky_roll` IDs and keys where used for economy/state compatibility, telemetry/event source continuity, and persistence mapping:
- `src/services/gameRewards.ts`
- `src/types/habitGames.ts`
- `src/constants/economy.ts`
- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts` (`lucky_roll_sessions_by_milestone` mapping)
- `src/features/gamification/level-worlds/services/islandRunLuckyRollAction.ts` (trigger source IDs)
- `src/services/luckyRollAccess.ts` (`gol_lucky_roll_access` key)

No internal `lucky_roll` storage/economy IDs were changed.

### 3) Rename user-facing label
User-facing wording should prefer **Treasure Path** for Island Run-owned flow, while compatibility IDs remain `lucky_roll`.
- Current Treasure Path owner surfaces already use Treasure Path copy in canonical overlay/debug flows (for example `IslandRunLuckyRollDevOverlay.tsx`, post-rare Treasure Path tests).
- Remaining `Lucky Roll` strings in legacy helper contexts (for example in `luckyRollTileEffects.ts`) are no longer tied to a standalone launcher/modal path.

### 4) Keep Island Run Treasure Path implementation
Retained canonical Island Run Treasure Path files and flow:
- `src/features/gamification/level-worlds/components/lucky-roll/IslandRunLuckyRollDevOverlay.tsx`
- `src/features/gamification/level-worlds/services/islandRunPostRareTreasurePathAction.ts`
- Treasure Path start/resume/collect/travel orchestration in Island Run services and board wiring (`islandRunPostRareTreasurePathAction.ts`, `islandRunLuckyRollAction.ts`, `IslandRunBoardPrototype.tsx`).

## Outcome check
- Legacy standalone Lucky Roll board/dice shop/hook path is removed from source.
- Treasure Path remains Island Run-owned.
- No global standalone Lucky Roll board/modal can be opened from App overlay wiring.
