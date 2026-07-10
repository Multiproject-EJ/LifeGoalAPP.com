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
import { BOSS_RHYTHM_ENTRY_TICKET_COST } from './bossRhythmGame';
import { getBossTrialConfig, type BossType } from './bossService';
import { openEventMinigame, type EventId, type EventMinigameId } from './islandRunEventEngine';

/**
 * Input describing a boss stop about to be opened. Phase 4 only resolves
 * boss stops; later phases (mystery / event minigames) will add sibling
 * context shapes.
 */
export interface BossStopLaunchContext {
  kind: 'fixed_boss';
  islandNumber: number;
}

export type LegacyMysteryMinigameContentKind = 'habit_action' | 'checkin_reflection' | 'breathing' | 'vision_quest' | 'event_minigame';

export interface MysteryStopLaunchContext {
  kind: 'fixed_mystery';
  mysteryContentKind: LegacyMysteryMinigameContentKind;
}

/**
 * The shape the renderer hands to `IslandRunMinigameLauncher.tsx`. The
 * `minigameId` must match a registered manifest id (`getMinigame(id)`),
 * and `config` carries everything the game needs at launch — nothing more.
 */
export interface BossMinigameLaunchDescriptor {
  minigameId: 'shooter_blitz';
  config: {
    bossType: BossType;
    scoreTarget: number;
    trialDurationSec: number;
    islandNumber: number;
  };
}

/**
 * Boss Rhythm Battle launch descriptor. Unlike the legacy Shooter Blitz boss
 * route it covers every boss type (fight AND milestone) — the rhythm battle
 * is the canonical Boss-stop encounter when its flag is on. Entry costs
 * `entryTicketCost` event tickets, spent by the caller at launch.
 */
export interface BossRhythmMinigameLaunchDescriptor {
  minigameId: 'boss_rhythm';
  entryTicketCost: number;
  config: {
    source: 'boss_stop';
    islandNumber: number;
    bossType: BossType;
    difficulty: string;
  };
}

export interface MysteryMinigameLaunchDescriptor {
  minigameId: 'vision_quest';
  config: {
    source: 'mystery_stop';
  };
}

export interface EventMinigameLaunchContext {
  kind: 'timed_event';
  eventId: EventId;
  ticketsAvailable: number;
  ticketsToSpend?: number;
}

export interface EventMinigameLaunchDescriptor {
  minigameId: 'island_workshop' | 'lucky_spin' | 'space_excavator' | 'companion_feast';
  ticketCost: number;
  ticketsSpent: number;
  spendMode: 'entry' | 'per_action';
  config:
    | {
        source: 'timed_event';
        eventId: 'feeding_frenzy';
        mode: 'island_workshop';
      }
    | {
        source: 'timed_event';
        eventId: 'lucky_spin';
        mode: 'fortune_engine';
      }
    | {
        source: 'timed_event';
        eventId: 'space_excavator';
        mode: 'space_excavator';
        campaignDurationSec: 180;
        scoreTargetMultiplier: 1.5;
        ticketCost: number;
        ticketsSpent: number;
      }
    | {
        source: 'timed_event';
        eventId: 'companion_feast';
        mode: 'companion_feast';
      };
}

export type MinigameLaunchDescriptor = BossMinigameLaunchDescriptor;
export type AnyMinigameLaunchDescriptor =
  | BossMinigameLaunchDescriptor
  | BossRhythmMinigameLaunchDescriptor
  | MysteryMinigameLaunchDescriptor
  | EventMinigameLaunchDescriptor;

/**
 * Phase 6 launch-spend helper: timed-event launches consume the exact number of
 * tickets emitted by the resolver contract. Returns a clamped negative delta so
 * caller state writes can stay simple (`spinTokens += delta` semantics).
 */
export function resolveTimedEventLaunchTicketDelta(
  descriptor: EventMinigameLaunchDescriptor | null | undefined,
): number {
  if (!descriptor || descriptor.spendMode === 'per_action') return 0;
  const spend = Math.floor(descriptor.ticketsSpent ?? 0);
  if (!Number.isFinite(spend) || spend <= 0) return 0;
  return -spend;
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

/**
 * Resolve the Boss Rhythm Battle launch for a boss stop. Covers every island
 * and every boss type — when `islandRunRhythmBossEnabled` is on this is the
 * canonical boss encounter (checked BEFORE the legacy Shooter Blitz route).
 * Returns `null` when the flag is off so callers fall back to older flows.
 *
 * Pure: no I/O, no side effects, deterministic for a given `islandNumber`
 * and flag snapshot. The entry ticket spend happens in the caller (the board
 * owns wallet state); this resolver only advertises the cost.
 */
export function resolveBossRhythmStopMinigame(
  ctx: BossStopLaunchContext,
): BossRhythmMinigameLaunchDescriptor | null {
  const flags = getIslandRunFeatureFlags();
  if (!flags.islandRunRhythmBossEnabled) return null;

  const trial = getBossTrialConfig(ctx.islandNumber);
  return {
    minigameId: 'boss_rhythm',
    entryTicketCost: BOSS_RHYTHM_ENTRY_TICKET_COST,
    config: {
      source: 'boss_stop',
      islandNumber: ctx.islandNumber,
      bossType: trial.type,
      difficulty: trial.difficulty,
    },
  };
}

/**
 * Resolve mystery-stop minigame launches for the two gated Phase 5 variants.
 * Non-minigame mystery content (breathing / habit_action / checkin_reflection)
 * returns `null` so the existing inline flow remains active.
 */
export function resolveMysteryStopMinigame(
  ctx: MysteryStopLaunchContext,
): MysteryMinigameLaunchDescriptor | null {
  const flags = getIslandRunFeatureFlags();

  if (ctx.mysteryContentKind === 'vision_quest') {
    if (!flags.islandRunVisionQuestMysteryEnabled) return null;
    return {
      minigameId: 'vision_quest',
      config: { source: 'mystery_stop' },
    };
  }

  return null;
}

export function shouldResolveMysteryStopOnMinigameComplete(options: {
  launchSource: MinigameLaunchSource;
  minigameId: string;
  completed: boolean;
}): boolean {
  if (!options.completed || options.launchSource !== 'mystery_stop') return false;
  return options.minigameId === 'vision_quest';
}

export type MinigameLaunchSource =
  | 'boss_trial'
  | 'mystery_stop'
  | 'shop_button'
  | 'event_button'
  | 'timed_event';

/**
 * Phase 6 step 2/3 wiring guard: only successful timed-event launches should
 * feed completion progress into `recordEventMinigameCompletion`.
 */
export function resolveEventMinigameCompletionId(options: {
  launchSource: MinigameLaunchSource | null | undefined;
  minigameId: string | null | undefined;
  completed: boolean;
}): EventMinigameId | null {
  if (!options.completed || options.launchSource !== 'timed_event') return null;
  if (options.minigameId === 'island_workshop') return 'island_workshop';
  if (options.minigameId === 'lucky_spin') return 'lucky_spin';
  if (options.minigameId === 'space_excavator') return 'space_excavator';
  if (options.minigameId === 'companion_feast') return 'companion_feast';
  return null;
}

/**
 * Island Workshop (the `feeding_frenzy` rotation slot's player-facing surface)
 * routes to the dedicated block-placement puzzle. Event tickets are material
 * blocks: the surface opens without spending, and each successful placement
 * spends one ticket through the canonical `applyTimedEventTicketSpend` action.
 */
export function resolveIslandWorkshopEventMinigame(
  ctx: EventMinigameLaunchContext,
): EventMinigameLaunchDescriptor | null {
  if (ctx.eventId !== 'feeding_frenzy') return null;
  const launch = openEventMinigame({
    eventId: ctx.eventId,
    ticketsAvailable: ctx.ticketsAvailable,
    ticketsToSpend: ctx.ticketsToSpend,
  });
  if (!launch || launch.minigameId !== 'island_workshop') return null;

  return {
    minigameId: 'island_workshop',
    spendMode: 'per_action',
    ticketCost: launch.ticketCost,
    ticketsSpent: launch.ticketsSpent,
    config: {
      source: 'timed_event',
      eventId: 'feeding_frenzy',
      mode: 'island_workshop',
    },
  };
}

/**
 * The `lucky_spin` slot's player-facing surface is The Fortune Engine. The
 * surface opens without spending; each run launch spends 1 event ticket (or
 * uses the free daily Golden Launch) through the canonical
 * `applyFortuneEngineLaunch` action, so a ticketless player can still play
 * their golden run.
 */
export function resolveLuckySpinEventMinigame(
  ctx: EventMinigameLaunchContext,
): EventMinigameLaunchDescriptor | null {
  if (ctx.eventId !== 'lucky_spin') return null;
  const launch = openEventMinigame({
    eventId: ctx.eventId,
    ticketsAvailable: ctx.ticketsAvailable,
    ticketsToSpend: ctx.ticketsToSpend,
  });
  if (!launch || launch.minigameId !== 'lucky_spin') return null;

  return {
    minigameId: 'lucky_spin',
    spendMode: 'per_action',
    ticketCost: launch.ticketCost,
    ticketsSpent: launch.ticketsSpent,
    config: {
      source: 'timed_event',
      eventId: 'lucky_spin',
      mode: 'fortune_engine',
    },
  };
}

/**
 * Phase 6 step 3: Space Excavator event surface opens for free; event tickets
 * are spent per dig through the Space Excavator action service.
 */
export function resolveSpaceExcavatorEventMinigame(
  ctx: EventMinigameLaunchContext,
): EventMinigameLaunchDescriptor | null {
  if (ctx.eventId !== 'space_excavator') return null;
  const launch = openEventMinigame({
    eventId: ctx.eventId,
    ticketsAvailable: ctx.ticketsAvailable,
    ticketsToSpend: ctx.ticketsToSpend,
  });
  if (!launch || launch.minigameId !== 'space_excavator') return null;

  return {
    minigameId: 'space_excavator',
    spendMode: 'per_action',
    ticketCost: launch.ticketCost,
    ticketsSpent: launch.ticketsSpent,
    config: {
      source: 'timed_event',
      eventId: 'space_excavator',
      mode: 'space_excavator',
      campaignDurationSec: 180,
      scoreTargetMultiplier: 1.5,
      ticketCost: launch.ticketCost,
      ticketsSpent: launch.ticketsSpent,
    },
  };
}


/**
 * Companion Feast event surface routes to the dedicated fruit-drop-and-merge
 * Companion Feast mini-game. The surface opens for free; every fruit dropped
 * into the bowl spends 1 event ticket through the canonical
 * `applyCompanionFeastDrop` action (Space Excavator-style per-action spend).
 */
export function resolveCompanionFeastEventMinigame(
  ctx: EventMinigameLaunchContext,
): EventMinigameLaunchDescriptor | null {
  if (ctx.eventId !== 'companion_feast') return null;
  const launch = openEventMinigame({
    eventId: ctx.eventId,
    ticketsAvailable: ctx.ticketsAvailable,
    ticketsToSpend: ctx.ticketsToSpend,
  });
  if (!launch || launch.minigameId !== 'companion_feast') return null;

  return {
    minigameId: 'companion_feast',
    spendMode: 'per_action',
    ticketCost: launch.ticketCost,
    ticketsSpent: launch.ticketsSpent,
    config: {
      source: 'timed_event',
      eventId: 'companion_feast',
      mode: 'companion_feast',
    },
  };
}
