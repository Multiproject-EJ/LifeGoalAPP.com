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
import { openEventMinigame, type EventId, type EventMinigameId } from './islandRunEventEngine';
import type { MysteryStopContentKind } from './islandRunStops';

/**
 * Input describing a boss stop about to be opened. Phase 4 only resolves
 * boss stops; later phases (mystery / event minigames) will add sibling
 * context shapes.
 */
export interface BossStopLaunchContext {
  kind: 'fixed_boss';
  islandNumber: number;
}

export interface MysteryStopLaunchContext {
  kind: 'fixed_mystery';
  mysteryContentKind: MysteryStopContentKind;
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
  minigameId: 'lucky_spin' | 'space_excavator' | 'partner_wheel';
  ticketCost: number;
  ticketsSpent: number;
  spendMode: 'entry' | 'per_action';
  config:
    | {
        source: 'timed_event';
        eventId: 'feeding_frenzy';
        mode: 'feeding_frenzy';
        sessionDurationSec: 120;
        targetRowsCleared: 10;
      }
    | {
        source: 'timed_event';
        eventId: 'lucky_spin';
        mode: 'lucky_spin';
        spinMode: 'free_daily' | 'ticket_extra';
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
        teamSize: 4;
        aiPartnerCount: 3;
      };
}

export type MinigameLaunchDescriptor = BossMinigameLaunchDescriptor;
export type AnyMinigameLaunchDescriptor =
  | BossMinigameLaunchDescriptor
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
  if (options.minigameId === 'lucky_spin') return 'lucky_spin';
  if (options.minigameId === 'space_excavator') return 'space_excavator';
  if (options.minigameId === 'partner_wheel') return 'partner_wheel';
  return null;
}

/**
 * Feeding Frenzy currently has no dedicated Island Run minigame surface.
 * This resolver intentionally returns `null` so callers show their safe
 * unavailable placeholder/fallback UI while keeping players in Island Run.
 */
export function resolveFeedingFrenzyEventMinigame(
  ctx: EventMinigameLaunchContext,
): EventMinigameLaunchDescriptor | null {
  if (ctx.eventId !== 'feeding_frenzy') return null;
  return null;
}

/**
 * Phase 6 step 2: Lucky Spin event surface now routes through a dedicated
 * resolver that explicitly tags launch mode:
 * - `free_daily` when the caller indicates a remaining free daily spin
 * - `ticket_extra` otherwise (ticket-funded event spins)
 */
export function resolveLuckySpinEventMinigame(
  ctx: EventMinigameLaunchContext & { freeDailySpinRemaining?: number },
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
    spendMode: 'entry',
    ticketCost: launch.ticketCost,
    ticketsSpent: launch.ticketsSpent,
    config: {
      source: 'timed_event',
      eventId: 'lucky_spin',
      mode: 'lucky_spin',
      spinMode: (ctx.freeDailySpinRemaining ?? 0) > 0 ? 'free_daily' : 'ticket_extra',
    },
  };
}

/**
 * Phase 6 step 3: Space Excavator event surface routes through Shooter Blitz
 * using an event-mode config tuned for longer campaign-style sessions.
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
 * Phase 6 step 4: Companion Feast event surface routes to the Partner Wheel
 * placeholder. This is intentionally a launcher-contract skeleton only: no
 * multiplayer transport or persistent partner state in this step.
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
  if (!launch || launch.minigameId !== 'partner_wheel') return null;

  return {
    minigameId: 'partner_wheel',
    spendMode: 'entry',
    ticketCost: launch.ticketCost,
    ticketsSpent: launch.ticketsSpent,
    config: {
      source: 'timed_event',
      eventId: 'companion_feast',
      mode: 'companion_feast',
      teamSize: 4,
      aiPartnerCount: 3,
    },
  };
}
