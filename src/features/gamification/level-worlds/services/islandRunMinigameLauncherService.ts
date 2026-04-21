/**
 * islandRunMinigameLauncherService.ts — Phase 4 step 1.
 *
 * Pure resolver that turns a stop-launch context into a `MinigameLaunchDescriptor`
 * (or `null` when no minigame should be launched). Gated by the
 * `islandRunShooterBlitzBossEnabled` feature flag (default off) so while the flag
 * is off every call returns `null` and the renderer keeps its existing boss-stop
 * flow.
 *
 * Distinct from the existing `IslandRunMinigameLauncher.tsx` React shell: this
 * file owns the *decision* layer (which minigame + what config), the `.tsx`
 * component owns the *presentation* layer (Suspense + lazy manifest rendering).
 *
 * See `docs/gameplay/MINIGAME_EVENTS_CONSOLIDATION_PLAN.md` §3.2 / §12 Phase 4.
 */
import { getIslandRunFeatureFlags } from '../../../../config/islandRunFeatureFlags';
import { getBossTrialConfig, type BossType } from './bossService';

/**
 * Input describing a boss stop about to be opened. Phase 4 only resolves
 * boss stops; later phases (mystery / event minigames) will add sibling
 * context shapes.
 */
export interface BossStopLaunchContext {
  kind: 'fixed_boss';
  islandNumber: number;
}

/**
 * The shape the renderer hands to `IslandRunMinigameLauncher.tsx`. The
 * `minigameId` must match a registered manifest id (`getMinigame(id)`),
 * and `config` carries everything the game needs at launch — nothing more.
 */
export interface MinigameLaunchDescriptor {
  minigameId: 'shooter_blitz';
  config: {
    bossType: BossType;
    scoreTarget: number;
    trialDurationSec: number;
    islandNumber: number;
  };
}

/**
 * Resolve the boss-stop minigame launch for the given island.
 *
 * Returns `null` when the launcher is disabled (flag off) or when the boss
 * type doesn't route to Shooter Blitz. Only `bossType === 'fight'` routes
 * to `shooter_blitz` — that matches `bossService.featuredGame`, which
 * already labels fight bosses as "ShooterBlitz" and milestone bosses as
 * "Island Mini-Game". Milestone boss minigames will be wired in a later
 * phase; for now they stay on the existing inline boss-trial flow.
 *
 * Pure: no I/O, no side effects, deterministic for a given `islandNumber`
 * and flag snapshot.
 */
export function resolveBossStopMinigame(
  ctx: BossStopLaunchContext,
): MinigameLaunchDescriptor | null {
  const flags = getIslandRunFeatureFlags();
  if (!flags.islandRunShooterBlitzBossEnabled) return null;

  const trial = getBossTrialConfig(ctx.islandNumber);
  if (trial.type !== 'fight') return null;

  return {
    minigameId: 'shooter_blitz',
    config: {
      bossType: trial.type,
      scoreTarget: trial.scoreTarget,
      trialDurationSec: trial.trialDurationSec,
      islandNumber: ctx.islandNumber,
    },
  };
}
