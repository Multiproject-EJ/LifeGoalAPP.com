import type { IslandRunRuntimeState } from './islandRunRuntimeState';

export type IslandRunTimedEvent = NonNullable<IslandRunRuntimeState['activeTimedEvent']>;

export type IslandRunRewardBarRuntimeSlice = Pick<
  IslandRunRuntimeState,
  | 'rewardBarProgress'
  | 'rewardBarThreshold'
  | 'rewardBarClaimCountInEvent'
  | 'rewardBarEscalationTier'
  | 'rewardBarLastClaimAtMs'
  | 'rewardBarBoundEventId'
  | 'rewardBarLadderId'
  | 'activeTimedEvent'
  | 'activeTimedEventProgress'
  | 'stickerProgress'
  | 'stickerInventory'
>;

export type RewardBarProgressSource =
  | { kind: 'tile'; tileType: string }
  | { kind: 'creature_feed'; treatType: string };

/**
 * Reward type that rotates each time the bar is filled.
 * Single reward per fill — Monopoly GO style.
 */
export type RewardBarRewardKind = 'dice' | 'essence' | 'minigame_tokens' | 'sticker_fragments';

export type RewardBarClaimPayout = {
  /** Primary reward kind for this fill. */
  rewardKind: RewardBarRewardKind;
  minigameTokens: number;
  dice: number;
  essence: number;
  stickerFragments: number;
  stickerId: string;
  stickersGranted: number;
  /** Bonus dice + essence awarded when a full sticker is completed. */
  stickerCompletionBonusDice: number;
  stickerCompletionBonusEssence: number;
};

type TimedEventTemplate = {
  templateId: string;
  eventType: string;
  ladderId: string;
  stickerId: string;
  icon: string;
  durationMs: number;
};

export const TIMED_EVENT_SEQUENCE: readonly TimedEventTemplate[] = [
  {
    templateId: 'feeding_frenzy',
    eventType: 'feeding_frenzy',
    ladderId: 'feeding_frenzy_ladder_v1',
    stickerId: 'feeding_frenzy_sticker',
    icon: '🔥',
    durationMs: 8 * 60 * 60 * 1000, // 8 hours
  },
  {
    templateId: 'lucky_spin',
    eventType: 'lucky_spin',
    ladderId: 'lucky_spin_ladder_v1',
    stickerId: 'lucky_spin_sticker',
    icon: '🎰',
    durationMs: 24 * 60 * 60 * 1000, // 24 hours
  },
  {
    templateId: 'space_excavator',
    eventType: 'space_excavator',
    ladderId: 'space_excavator_ladder_v1',
    stickerId: 'space_excavator_sticker',
    icon: '🚀',
    durationMs: 2 * 24 * 60 * 60 * 1000, // 2 days
  },
  {
    templateId: 'companion_feast',
    eventType: 'companion_feast',
    ladderId: 'companion_feast_ladder_v1',
    stickerId: 'companion_feast_sticker',
    icon: '🐾',
    durationMs: 4 * 24 * 60 * 60 * 1000, // 4 days
  },
] as const;

/**
 * UI metadata for each timed-event banner (icon + human-readable display name).
 * Authoritative source — imported by `IslandRunBoardPrototype.tsx` and
 * `components/GameBoardOverlay.tsx`. Keep in sync with TIMED_EVENT_SEQUENCE above.
 */
export const EVENT_BANNER_META: Readonly<Record<string, { icon: string; displayName: string }>> = {
  feeding_frenzy: { icon: '🔥', displayName: 'Feeding Frenzy' },
  space_excavator: { icon: '🚀', displayName: 'Space Excavator' },
  companion_feast: { icon: '🐾', displayName: 'Companion Feast' },
  lucky_spin: { icon: '🎰', displayName: 'Lucky Spin' },
};

// ── Progress sources ─────────────────────────────────────────────────────────

const FEEDING_TILE_PROGRESS: Readonly<Record<string, number>> = {
  chest: 2,
  micro: 1,
  currency: 1,
};

// ── Escalating threshold ladder (Monopoly GO style) ──────────────────────────
// Fast start → slowing progression → big rewards near top → reset cycle.
// Tier 0 starts very low (easy first fill) and escalates.

const ESCALATING_THRESHOLDS: readonly number[] = [
  4,    // tier 0: very easy first fill (hook)
  6,    // tier 1: still fast
  8,    // tier 2: moderate
  12,   // tier 3: slowing
  16,   // tier 4: engagement wall
  24,   // tier 5: harder
  32,   // tier 6: big commitment
  48,   // tier 7: retention push
  64,   // tier 8: near-top
  80,   // tier 9: hard cap before event reset
];

/**
 * Resolve threshold for the given escalation tier.
 * After the ladder is exhausted, the last value repeats.
 */
export function resolveEscalatingThreshold(tier: number): number {
  const safeTier = Math.max(0, Math.floor(tier));
  if (safeTier < ESCALATING_THRESHOLDS.length) return ESCALATING_THRESHOLDS[safeTier]!;
  return ESCALATING_THRESHOLDS[ESCALATING_THRESHOLDS.length - 1]!;
}

// ── Reward rotation (single reward per bar fill) ─────────────────────────────

const REWARD_ROTATION: readonly RewardBarRewardKind[] = [
  'dice',
  'essence',
  'minigame_tokens',
  'sticker_fragments',
];

/** Icon for the upcoming reward displayed on the bar endcap. */
export const REWARD_KIND_ICON: Readonly<Record<RewardBarRewardKind, string>> = {
  dice: '🎲',
  essence: '🟣',
  minigame_tokens: '🎫',
  sticker_fragments: '🧩',
};

export function resolveNextRewardKind(claimCount: number): RewardBarRewardKind {
  return REWARD_ROTATION[Math.max(0, Math.floor(claimCount)) % REWARD_ROTATION.length]!;
}

// ── Multiplier support (Monopoly GO-style dice-pool gating) ──────────────────
//
// The multiplier scales with the player's current dice stash.
// More dice = higher multiplier options unlocked.
// Higher multiplier = more dice cost per roll (risk/reward).
//
// Key design goals (mirroring Monopoly GO):
//  1. Prevent early burn-out — new players can't nuke their dice instantly.
//  2. Create "power feeling" later — big stacks = big plays = casino energy.
//  3. Encourage hoarding → then spending — save dice, burst during events.
//  4. Faster reward bar progression, but faster dice burn + higher variance.

/**
 * Each tier defines a multiplier and the minimum dice pool required to unlock it.
 * The base cost per roll is DICE_PER_ROLL (1). At multiplier ×N, cost = 1×N.
 *
 * Tier gates are tuned for a prototype with regen ceiling ~30–160 dice:
 *  - ×1 is always available (0 dice).
 *  - Early game: ×2, ×3, ×5 unlock at modest thresholds.
 *  - Mid game: ×10, ×20, ×50 for players who have been hoarding.
 *  - Late / whale: ×100, ×200 for very large stashes.
 */
export type MultiplierTier = {
  multiplier: number;
  /** Minimum dice in pool to unlock this tier. */
  minDice: number;
};

export const MULTIPLIER_TIERS: readonly MultiplierTier[] = [
  { multiplier: 1,   minDice: 0 },
  { multiplier: 2,   minDice: 20 },
  { multiplier: 3,   minDice: 50 },
  { multiplier: 5,   minDice: 100 },
  { multiplier: 10,  minDice: 200 },
  { multiplier: 20,  minDice: 500 },
  { multiplier: 50,  minDice: 1_000 },
  { multiplier: 100, minDice: 2_000 },
  { multiplier: 200, minDice: 5_000 },
] as const;

/**
 * Base dice deducted per roll (before multiplier scaling). Softened from 2 → 1
 * on 2026-04-19 per playtest feedback — low-multiplier play now burns the
 * pool at half the previous rate, keeping ×1 sessions accessible while high
 * multipliers still scale linearly (×3 = 3 dice, ×10 = 10 dice, …).
 *
 * Mirrored by `DICE_PER_ROLL` in `islandRunRollAction.ts`; both constants must
 * stay in sync. Source of truth for `resolveDiceCostForMultiplier` below.
 */
export const BASE_DICE_PER_ROLL = 1;

/**
 * Resolve all multiplier tiers available given the current dice pool.
 * Returns entries sorted ascending. Always includes ×1.
 * Each entry includes an `unlocked` flag for UI display of locked tiers.
 */
export function resolveAvailableMultiplierTiers(dicePool: number): (MultiplierTier & { unlocked: boolean })[] {
  const safeDice = Math.max(0, Math.floor(dicePool));
  return MULTIPLIER_TIERS.map((tier) => ({
    ...tier,
    unlocked: safeDice >= tier.minDice,
  }));
}

/**
 * Resolve the highest multiplier the player can currently select.
 * Only tiers where dicePool ≥ minDice are eligible.
 * Optional `eventBoostMax` temporarily raises the ceiling during events.
 */
export function resolveMaxMultiplierForPool(dicePool: number, eventBoostMax?: number): number {
  const safeDice = Math.max(0, Math.floor(dicePool));
  let maxMult = 1;
  for (const tier of MULTIPLIER_TIERS) {
    if (safeDice >= tier.minDice) {
      maxMult = tier.multiplier;
    }
  }
  // Event boost: raise ceiling by one extra tier (if active)
  if (eventBoostMax !== undefined && eventBoostMax > 0) {
    const boostedIdx = MULTIPLIER_TIERS.findIndex((t) => t.multiplier === maxMult);
    if (boostedIdx >= 0 && boostedIdx + 1 < MULTIPLIER_TIERS.length) {
      maxMult = Math.min(MULTIPLIER_TIERS[boostedIdx + 1]!.multiplier, eventBoostMax);
    }
  }
  return maxMult;
}

/**
 * Dice cost for a single roll at the given multiplier.
 * Cost = BASE_DICE_PER_ROLL × multiplier. With BASE=1, ×10 costs 10 dice per roll.
 */
export function resolveDiceCostForMultiplier(multiplier: number): number {
  return BASE_DICE_PER_ROLL * Math.max(1, Math.floor(multiplier));
}

/**
 * Clamp the selected multiplier down if the player no longer has enough dice.
 * Returns the highest eligible multiplier ≤ the current selection.
 * Falls back to ×1 if pool is too low for anything else.
 */
export function clampMultiplierToPool(selectedMultiplier: number, dicePool: number): number {
  const safeDice = Math.max(0, Math.floor(dicePool));
  const safeMult = Math.max(1, Math.floor(selectedMultiplier));
  let best = 1;
  for (const tier of MULTIPLIER_TIERS) {
    if (tier.multiplier <= safeMult && safeDice >= tier.minDice) {
      best = tier.multiplier;
    }
  }
  // Also check player can actually afford at least one roll at this multiplier
  const cost = resolveDiceCostForMultiplier(best);
  if (safeDice < cost) {
    // Fall back to the highest affordable tier
    let fallback = 1;
    for (const tier of MULTIPLIER_TIERS) {
      const tierCost = resolveDiceCostForMultiplier(tier.multiplier);
      if (safeDice >= tierCost && safeDice >= tier.minDice) {
        fallback = tier.multiplier;
      }
    }
    return fallback;
  }
  return best;
}

/**
 * Apply a dice multiplier to reward bar progress.
 * The multiplier increases: progress contributed, essence earned from tiles,
 * and coins earned from tiles. This is the engine that lets a x5 multiplier
 * roll cause 3-4 bar fills in a single landing (Monopoly GO style).
 */
export function applyMultiplierToProgress(baseProgress: number, multiplier: number): number {
  const safeMultiplier = Math.max(1, Math.floor(multiplier));
  return Math.floor(baseProgress * safeMultiplier);
}

// ── Sticker completion bonus ─────────────────────────────────────────────────

const STICKER_COMPLETION_BONUS_DICE = 100;
const STICKER_COMPLETION_BONUS_ESSENCE = 50;
const STICKER_FRAGMENTS_PER_STICKER = 5;

// ── Core functions ───────────────────────────────────────────────────────────

function getTemplateIndexFromEventId(eventId: string | null | undefined): number {
  if (!eventId) return -1;
  const templateId = eventId.split(':')[0];
  return TIMED_EVENT_SEQUENCE.findIndex((template) => template.templateId === templateId);
}

function buildTimedEvent(template: TimedEventTemplate, nowMs: number, version: number): IslandRunTimedEvent {
  return {
    eventId: `${template.templateId}:${nowMs}`,
    eventType: template.eventType,
    startedAtMs: nowMs,
    expiresAtMs: nowMs + template.durationMs,
    version: Math.max(1, Math.floor(version)),
  };
}

function getTemplateForEvent(event: IslandRunTimedEvent | null): TimedEventTemplate {
  const idx = getTemplateIndexFromEventId(event?.eventId);
  if (idx >= 0) return TIMED_EVENT_SEQUENCE[idx]!;
  return TIMED_EVENT_SEQUENCE[0]!;
}

function resetEventBoundRewardBarState(options: {
  state: IslandRunRewardBarRuntimeSlice;
  event: IslandRunTimedEvent;
}): IslandRunRewardBarRuntimeSlice {
  const template = getTemplateForEvent(options.event);
  return {
    ...options.state,
    rewardBarProgress: 0,
    rewardBarThreshold: resolveEscalatingThreshold(0),
    rewardBarClaimCountInEvent: 0,
    rewardBarEscalationTier: 0,
    rewardBarLastClaimAtMs: null,
    rewardBarBoundEventId: options.event.eventId,
    rewardBarLadderId: template.ladderId,
    activeTimedEventProgress: {
      feedingActions: 0,
      tokensEarned: 0,
      milestonesClaimed: 0,
    },
  };
}

export function ensureIslandRunContractV2ActiveTimedEvent(options: {
  state: IslandRunRewardBarRuntimeSlice;
  nowMs: number;
}): { state: IslandRunRewardBarRuntimeSlice; eventChanged: boolean } {
  const nowMs = Math.floor(options.nowMs);
  const current = options.state.activeTimedEvent;

  if (!current) {
    const nextEvent = buildTimedEvent(TIMED_EVENT_SEQUENCE[0]!, nowMs, 1);
    const nextState = resetEventBoundRewardBarState({ state: { ...options.state, activeTimedEvent: nextEvent }, event: nextEvent });
    return { state: nextState, eventChanged: true };
  }

  if (current.expiresAtMs <= nowMs) {
    const previousIdx = getTemplateIndexFromEventId(current.eventId);
    const nextIdx = previousIdx < 0
      ? 0
      : (previousIdx + 1) % TIMED_EVENT_SEQUENCE.length;
    const nextEvent = buildTimedEvent(TIMED_EVENT_SEQUENCE[nextIdx]!, nowMs, current.version + 1);
    const nextState = resetEventBoundRewardBarState({ state: { ...options.state, activeTimedEvent: nextEvent }, event: nextEvent });
    return { state: nextState, eventChanged: true };
  }

  if (options.state.rewardBarBoundEventId !== current.eventId) {
    return {
      state: resetEventBoundRewardBarState({ state: options.state, event: current }),
      eventChanged: true,
    };
  }

  const template = getTemplateForEvent(current);
  if (options.state.rewardBarLadderId !== template.ladderId) {
    return {
      state: {
        ...options.state,
        rewardBarLadderId: template.ladderId,
      },
      eventChanged: false,
    };
  }

  return {
    state: options.state,
    eventChanged: false,
  };
}

export function resolveIslandRunContractV2RewardBarProgressDelta(source: RewardBarProgressSource): {
  progressDelta: number;
  feedingActionDelta: number;
} {
  if (source.kind === 'creature_feed') {
    return { progressDelta: 4, feedingActionDelta: 1 };
  }

  const tileProgress = FEEDING_TILE_PROGRESS[source.tileType] ?? 0;
  if (tileProgress > 0) {
    return { progressDelta: tileProgress, feedingActionDelta: 1 };
  }

  return { progressDelta: 0, feedingActionDelta: 0 };
}

export function applyIslandRunContractV2RewardBarProgress(options: {
  state: IslandRunRewardBarRuntimeSlice;
  source: RewardBarProgressSource;
  nowMs: number;
  /** Dice multiplier (default 1). Multiplies progress contributed. */
  multiplier?: number;
}): IslandRunRewardBarRuntimeSlice {
  const ensured = ensureIslandRunContractV2ActiveTimedEvent({ state: options.state, nowMs: options.nowMs }).state;
  const delta = resolveIslandRunContractV2RewardBarProgressDelta(options.source);
  if (delta.progressDelta < 1) return ensured;

  const effectiveProgress = applyMultiplierToProgress(delta.progressDelta, options.multiplier ?? 1);

  return {
    ...ensured,
    rewardBarProgress: Math.max(0, Math.floor(ensured.rewardBarProgress)) + effectiveProgress,
    activeTimedEventProgress: {
      ...ensured.activeTimedEventProgress,
      feedingActions: Math.max(0, Math.floor(ensured.activeTimedEventProgress.feedingActions)) + delta.feedingActionDelta,
    },
  };
}

export function canClaimIslandRunContractV2RewardBar(state: IslandRunRewardBarRuntimeSlice): boolean {
  const threshold = resolveEscalatingThreshold(Math.max(0, Math.floor(state.rewardBarEscalationTier)));
  return state.rewardBarProgress >= threshold;
}

/**
 * Resolve the progressive payout for the given escalation tier and claim number.
 * Single reward per fill — the primary reward rotates between dice, essence,
 * minigame tokens, and sticker fragments. All payouts escalate with tier.
 */
function resolveProgressivePayout(options: {
  tier: number;
  claimNumber: number;
  template: TimedEventTemplate;
}): RewardBarClaimPayout {
  const { tier, claimNumber, template } = options;
  const rewardKind = resolveNextRewardKind(claimNumber - 1);

  // Base amounts that scale with tier (progressive rewards get bigger)
  const diceBase = 5 + tier * 3;           // 5, 8, 11, 14, 17, 20, ...
  const essenceBase = 3 + tier * 2;        // 3, 5, 7, 9, 11, ...
  const minigameTokensBase = 2 + tier;     // 2, 3, 4, 5, ...
  const fragmentsBase = 1 + Math.floor(tier / 2);  // 1, 1, 2, 2, 3, ...

  const payout: RewardBarClaimPayout = {
    rewardKind,
    dice: 0,
    essence: 0,
    minigameTokens: 0,
    stickerFragments: 0,
    stickerId: template.stickerId,
    stickersGranted: 0,
    stickerCompletionBonusDice: 0,
    stickerCompletionBonusEssence: 0,
  };

  // Primary reward is the big one; others get a small bonus
  switch (rewardKind) {
    case 'dice':
      payout.dice = diceBase;
      payout.essence = Math.floor(essenceBase / 3);
      break;
    case 'essence':
      payout.essence = essenceBase;
      payout.dice = Math.floor(diceBase / 4);
      break;
    case 'minigame_tokens':
      payout.minigameTokens = minigameTokensBase;
      payout.dice = Math.floor(diceBase / 4);
      break;
    case 'sticker_fragments':
      payout.stickerFragments = fragmentsBase;
      payout.dice = Math.floor(diceBase / 3);
      payout.essence = Math.floor(essenceBase / 3);
      break;
  }

  return payout;
}

export function claimIslandRunContractV2RewardBar(options: {
  state: IslandRunRewardBarRuntimeSlice;
  nowMs: number;
}): { state: IslandRunRewardBarRuntimeSlice; payout: RewardBarClaimPayout | null } {
  const ensured = ensureIslandRunContractV2ActiveTimedEvent({ state: options.state, nowMs: options.nowMs }).state;
  if (!canClaimIslandRunContractV2RewardBar(ensured) || !ensured.activeTimedEvent) {
    return { state: ensured, payout: null };
  }

  const nextClaimNumber = Math.max(0, Math.floor(ensured.rewardBarClaimCountInEvent)) + 1;
  const tier = Math.max(0, Math.floor(ensured.rewardBarEscalationTier));
  const template = getTemplateForEvent(ensured.activeTimedEvent);
  const currentThreshold = resolveEscalatingThreshold(tier);

  const payout = resolveProgressivePayout({ tier, claimNumber: nextClaimNumber, template });

  // Carry over excess progress beyond threshold (supports multi-fill chains)
  const overflowProgress = Math.max(0, Math.floor(ensured.rewardBarProgress) - currentThreshold);

  // Sticker fragment → sticker completion
  const existingFragments = Math.max(0, Math.floor(ensured.stickerProgress.fragments));
  const combinedFragments = existingFragments + payout.stickerFragments;
  const stickersGranted = Math.floor(combinedFragments / STICKER_FRAGMENTS_PER_STICKER);
  const nextFragments = combinedFragments % STICKER_FRAGMENTS_PER_STICKER;
  payout.stickersGranted = stickersGranted;

  // Full sticker completion bonus: 100 dice + 50 essence
  if (stickersGranted > 0) {
    payout.stickerCompletionBonusDice = STICKER_COMPLETION_BONUS_DICE * stickersGranted;
    payout.stickerCompletionBonusEssence = STICKER_COMPLETION_BONUS_ESSENCE * stickersGranted;
    payout.dice += payout.stickerCompletionBonusDice;
    payout.essence += payout.stickerCompletionBonusEssence;
  }

  const nextStickerInventory = { ...ensured.stickerInventory };
  if (stickersGranted > 0) {
    nextStickerInventory[payout.stickerId] = Math.max(0, Math.floor(nextStickerInventory[payout.stickerId] ?? 0)) + stickersGranted;
  }

  const nextTier = tier + 1;

  return {
    payout,
    state: {
      ...ensured,
      rewardBarProgress: overflowProgress,
      rewardBarThreshold: resolveEscalatingThreshold(nextTier),
      rewardBarClaimCountInEvent: nextClaimNumber,
      rewardBarEscalationTier: nextTier,
      rewardBarLastClaimAtMs: Math.floor(options.nowMs),
      activeTimedEventProgress: {
        feedingActions: ensured.activeTimedEventProgress.feedingActions,
        tokensEarned: Math.max(0, Math.floor(ensured.activeTimedEventProgress.tokensEarned)) + payout.minigameTokens,
        milestonesClaimed: Math.max(0, Math.floor(ensured.activeTimedEventProgress.milestonesClaimed)) + 1,
      },
      stickerProgress: {
        ...ensured.stickerProgress,
        fragments: nextFragments,
      },
      stickerInventory: nextStickerInventory,
    },
  };
}

/**
 * Resolve all chained claims from a single progress application.
 * When progress exceeds threshold, the bar fills, claims, carries overflow,
 * and may fill again — producing the Monopoly GO "rapid cascade" effect.
 */
export function resolveChainedRewardBarClaims(options: {
  state: IslandRunRewardBarRuntimeSlice;
  nowMs: number;
  maxChain?: number;
}): { state: IslandRunRewardBarRuntimeSlice; payouts: RewardBarClaimPayout[] } {
  const maxChain = Math.max(1, Math.min(options.maxChain ?? 5, 10));
  let current = options.state;
  const payouts: RewardBarClaimPayout[] = [];

  for (let i = 0; i < maxChain; i++) {
    if (!canClaimIslandRunContractV2RewardBar(current)) break;
    const result = claimIslandRunContractV2RewardBar({ state: current, nowMs: options.nowMs });
    if (!result.payout) break;
    payouts.push(result.payout);
    current = result.state;
  }

  return { state: current, payouts };
}
