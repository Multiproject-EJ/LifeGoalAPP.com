import type { JourneyDiscArenaProgressEntry } from './islandRunGameStateStore';
import type { JourneyDiscWeaponId } from './journeyDiscArmory';

export type JourneyDiscArenaMilestoneReward = {
  dice?: number;
  essence?: number;
  eventTickets?: number;
  diamonds?: number;
  rank?: 2 | 3;
  armoryUpgrade?: JourneyDiscWeaponId;
};

export interface JourneyDiscArenaMilestone {
  id: string;
  points: number;
  icon: string;
  label: string;
  reward: JourneyDiscArenaMilestoneReward;
}

export const JOURNEY_DISC_ARENA_MILESTONES: readonly JourneyDiscArenaMilestone[] = Object.freeze([
  { id: 'disc_1', points: 60, icon: '🎲', label: '15 dice', reward: { dice: 15 } },
  { id: 'disc_2', points: 160, icon: 'Ⅱ', label: 'Resonant + Aegis', reward: { rank: 2, armoryUpgrade: 'aegis_ring' } },
  { id: 'disc_3', points: 300, icon: '◉', label: '2 discs + Comet level', reward: { eventTickets: 2, armoryUpgrade: 'ram_fin' } },
  { id: 'disc_4', points: 560, icon: 'Ⅲ', label: 'Ascendant + Pulse', reward: { rank: 3, armoryUpgrade: 'pulse_vane' } },
  { id: 'disc_5', points: 900, icon: '♜', label: 'Guardian gate + Aegis level', reward: { dice: 50, armoryUpgrade: 'aegis_ring' } },
  { id: 'disc_6', points: 1350, icon: '💎', label: 'End prize + Pulse level', reward: { diamonds: 1, armoryUpgrade: 'pulse_vane' } },
] as const);

export function createJourneyDiscArenaProgress(nowMs = Date.now()): JourneyDiscArenaProgressEntry {
  return {
    eventPoints: 0,
    bestRoundScore: 0,
    roundsStarted: 0,
    roundsCompleted: 0,
    victories: 0,
    totalDiscsDeployed: 0,
    rank: 1,
    claimedMilestoneIds: [],
    bankedRoundIds: [],
    updatedAtMs: Math.max(0, Math.floor(nowMs)),
  };
}

export function getJourneyDiscArenaMilestone(id: string): JourneyDiscArenaMilestone | null {
  return JOURNEY_DISC_ARENA_MILESTONES.find((milestone) => milestone.id === id) ?? null;
}

export function resolveJourneyDiscArenaClaimedMilestoneIds(input: {
  claimedMilestoneIds: readonly string[];
}): string[] {
  const validIds = new Set(JOURNEY_DISC_ARENA_MILESTONES.map((milestone) => milestone.id));
  return Array.from(new Set(input.claimedMilestoneIds.filter((id) => validIds.has(id))));
}

export function buildJourneyDiscArenaRewardTrack(progress: JourneyDiscArenaProgressEntry) {
  const claimed = new Set(progress.claimedMilestoneIds);
  const maximum = JOURNEY_DISC_ARENA_MILESTONES[JOURNEY_DISC_ARENA_MILESTONES.length - 1]!.points;
  return {
    points: progress.eventPoints,
    maximum,
    fillPercent: Math.min(100, Math.max(0, progress.eventPoints / maximum * 100)),
    milestones: JOURNEY_DISC_ARENA_MILESTONES.map((milestone) => ({
      ...milestone,
      state: claimed.has(milestone.id)
        ? 'claimed' as const
        : progress.eventPoints >= milestone.points
          ? 'claimable' as const
          : 'upcoming' as const,
      positionPercent: milestone.points / maximum * 100,
    })),
  };
}

export function applyJourneyDiscArenaRoundToProgress(options: {
  progress: JourneyDiscArenaProgressEntry;
  roundId: string;
  score: number;
  won: boolean;
  deployedDiscs: number;
  nowMs?: number;
}): { progress: JourneyDiscArenaProgressEntry; applied: boolean } {
  const roundId = options.roundId.trim();
  if (!roundId || options.progress.bankedRoundIds.includes(roundId)) {
    return { progress: options.progress, applied: false };
  }
  const score = Math.max(0, Math.floor(options.score));
  return {
    applied: true,
    progress: {
      ...options.progress,
      eventPoints: options.progress.eventPoints + score,
      bestRoundScore: Math.max(options.progress.bestRoundScore, score),
      roundsCompleted: options.progress.roundsCompleted + 1,
      victories: options.progress.victories + (options.won ? 1 : 0),
      bankedRoundIds: [...options.progress.bankedRoundIds, roundId].slice(-80),
      updatedAtMs: Math.max(0, Math.floor(options.nowMs ?? Date.now())),
    },
  };
}
