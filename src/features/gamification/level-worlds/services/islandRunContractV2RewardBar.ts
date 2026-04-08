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

export type RewardBarClaimPayout = {
  minigameTokens: number;
  dice: number;
  stickerFragments: number;
  stickerId: string;
  stickersGranted: number;
};

type TimedEventTemplate = {
  templateId: string;
  eventType: string;
  ladderId: string;
  stickerId: string;
  durationMs: number;
};

const TIMED_EVENT_SEQUENCE: readonly TimedEventTemplate[] = [
  {
    templateId: 'feeding_frenzy',
    eventType: 'feeding_frenzy',
    ladderId: 'feeding_frenzy_ladder_v1',
    stickerId: 'feeding_frenzy_sticker',
    durationMs: 8 * 60 * 60 * 1000,
  },
  {
    templateId: 'harvest_sprint',
    eventType: 'harvest_sprint',
    ladderId: 'harvest_sprint_ladder_v1',
    stickerId: 'harvest_sprint_sticker',
    durationMs: 8 * 60 * 60 * 1000,
  },
  {
    templateId: 'companion_feast',
    eventType: 'companion_feast',
    ladderId: 'companion_feast_ladder_v1',
    stickerId: 'companion_feast_sticker',
    durationMs: 8 * 60 * 60 * 1000,
  },
] as const;

const FEEDING_TILE_PROGRESS: Readonly<Record<string, number>> = {
  egg_shard: 4,
};

const NON_FEEDING_TILE_PROGRESS: Readonly<Record<string, number>> = {
  chest: 1,
  micro: 1,
};

function getDefaultThreshold(value: number): number {
  if (Number.isFinite(value) && value > 0) return Math.floor(value);
  return 10;
}

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
    rewardBarThreshold: getDefaultThreshold(options.state.rewardBarThreshold),
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
    state: {
      ...options.state,
      rewardBarThreshold: getDefaultThreshold(options.state.rewardBarThreshold),
    },
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

  const feedingProgress = FEEDING_TILE_PROGRESS[source.tileType] ?? 0;
  if (feedingProgress > 0) {
    return { progressDelta: feedingProgress, feedingActionDelta: 1 };
  }

  return {
    progressDelta: NON_FEEDING_TILE_PROGRESS[source.tileType] ?? 0,
    feedingActionDelta: 0,
  };
}

export function applyIslandRunContractV2RewardBarProgress(options: {
  state: IslandRunRewardBarRuntimeSlice;
  source: RewardBarProgressSource;
  nowMs: number;
}): IslandRunRewardBarRuntimeSlice {
  const ensured = ensureIslandRunContractV2ActiveTimedEvent({ state: options.state, nowMs: options.nowMs }).state;
  const delta = resolveIslandRunContractV2RewardBarProgressDelta(options.source);
  if (delta.progressDelta < 1) return ensured;

  return {
    ...ensured,
    rewardBarProgress: Math.max(0, Math.floor(ensured.rewardBarProgress)) + delta.progressDelta,
    activeTimedEventProgress: {
      ...ensured.activeTimedEventProgress,
      feedingActions: Math.max(0, Math.floor(ensured.activeTimedEventProgress.feedingActions)) + delta.feedingActionDelta,
    },
  };
}

export function canClaimIslandRunContractV2RewardBar(state: IslandRunRewardBarRuntimeSlice): boolean {
  return state.rewardBarProgress >= getDefaultThreshold(state.rewardBarThreshold);
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

  const payout: RewardBarClaimPayout = {
    minigameTokens: 2 + tier,
    dice: nextClaimNumber % 3 === 0 ? 1 + Math.floor(tier / 2) : 0,
    stickerFragments: 1 + (tier % 2),
    stickerId: template.stickerId,
    stickersGranted: 0,
  };

  const existingFragments = Math.max(0, Math.floor(ensured.stickerProgress.fragments));
  const combinedFragments = existingFragments + payout.stickerFragments;
  const stickersGranted = Math.floor(combinedFragments / 5);
  const nextFragments = combinedFragments % 5;
  payout.stickersGranted = stickersGranted;

  const nextStickerInventory = { ...ensured.stickerInventory };
  if (stickersGranted > 0) {
    nextStickerInventory[payout.stickerId] = Math.max(0, Math.floor(nextStickerInventory[payout.stickerId] ?? 0)) + stickersGranted;
  }

  return {
    payout,
    state: {
      ...ensured,
      rewardBarProgress: 0,
      rewardBarClaimCountInEvent: nextClaimNumber,
      rewardBarEscalationTier: tier + 1,
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
