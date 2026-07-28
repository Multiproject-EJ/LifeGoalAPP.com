/**
 * minigameHudContract.ts — the shared persistent-HUD contract for the four
 * event mini-games.
 *
 * `docs/investigations/monopoly-go-loop-observation-2026-07-23.md` asks that
 * the next exact prize and secured/at-risk progress stay visible *during*
 * play, and that a small persistent reward bar replace repeatedly opening the
 * reward panel. Before this contract each game solved (or skipped) that
 * independently: tickets sat top-left, bottom, or nowhere; two games hid
 * their reward bar during play entirely.
 *
 * The contract, applied to every game's play phase:
 * - tickets pinned upper-RIGHT, always;
 * - reward progress + the next exact prize spanning the top strip beside it;
 * - claims are labelled "Open reward" (never "Claim"/"Collect").
 *
 * This module is the pure half — building the view model from each game's
 * progress shape — so the suite can pin the contract. The rendering half is
 * `games/_shared/MinigameHudStrip.tsx`.
 */

export const MINIGAME_OPEN_REWARD_LABEL = 'Open reward';

export interface MinigameHudTickets {
  /** Current spendable count. */
  count: number;
  /** Icon shown beside the count (🎟️ for tickets, 🧱 for workshop blocks). */
  icon: string;
  /** Accessible noun, e.g. "tickets", "blocks". */
  noun: string;
  /** True renders the low-warning state. */
  low: boolean;
}

export type MinigameHudNodeState = 'claimed' | 'openable' | 'next' | 'upcoming';

export interface MinigameHudRewardNode {
  id: string;
  /** 0..100 position along the track, so nodes can be absolutely placed. */
  positionPercent: number;
  /** Glyph shown on the node itself. */
  icon: string;
  /** Full reward text, for the node's title/aria. */
  label: string;
  state: MinigameHudNodeState;
}

export interface MinigameHudReward {
  /** 0..1 fill of the progress track. */
  fillRatio: number;
  /** Short label for the next milestone's exact prize, e.g. "+8 Dice". */
  nextRewardLabel: string | null;
  /** Points still needed to reach it, when the scale is meaningful. */
  remainingLabel: string | null;
  /** Number of milestones ready to open right now. */
  openableCount: number;
  /**
   * Milestone markers sitting on the track. This is the Island Workshop
   * pattern generalised: showing the upcoming prizes *on* the bar is what
   * makes the incentive legible at a glance, rather than a bare fill.
   */
  nodes: MinigameHudRewardNode[];
  /** Current points, rendered at the head of the row. */
  pointsLabel: string;
}

/**
 * Pick a glyph for a reward when the game does not supply one, keyed off the
 * currency named in its label. Falls back to a generic prize icon.
 */
export function resolveMinigameRewardIcon(label: string): string {
  const text = label.toLowerCase();
  if (text.includes('shard')) return '💎';
  if (text.includes('dice')) return '🎲';
  if (text.includes('essence')) return '🟣';
  if (text.includes('ticket')) return '🎟️';
  return '🎁';
}

export interface MinigameHudViewModel {
  tickets: MinigameHudTickets;
  reward: MinigameHudReward;
}

/** Tickets at or below this render the low-warning state. */
export const MINIGAME_HUD_LOW_TICKETS = 3;

export function buildMinigameHudTickets(options: {
  count: number;
  icon?: string;
  noun?: string;
}): MinigameHudTickets {
  const count = Number.isFinite(options.count) ? Math.max(0, Math.floor(options.count)) : 0;
  return {
    count,
    icon: options.icon ?? '🎟️',
    noun: options.noun ?? 'tickets',
    low: count <= MINIGAME_HUD_LOW_TICKETS,
  };
}

/**
 * Build the reward summary from a generic milestone list. Each game maps its
 * own progression shape into `{ pointsRequired, rewardLabel, claimed }` plus
 * the current points; this keeps the HUD ignorant of per-game progress types.
 */
export function buildMinigameHudReward(options: {
  points: number;
  milestones: ReadonlyArray<{
    pointsRequired: number;
    rewardLabel: string;
    claimed: boolean;
    /** Optional glyph; derived from the label when omitted. */
    icon?: string;
  }>;
  /** Unit rendered after remaining counts, e.g. "pts". Omit to hide. */
  remainingUnit?: string | null;
}): MinigameHudReward {
  const points = Number.isFinite(options.points) ? Math.max(0, options.points) : 0;
  const ordered = [...options.milestones].sort((a, b) => a.pointsRequired - b.pointsRequired);

  let openableCount = 0;
  let next: { pointsRequired: number; rewardLabel: string } | null = null;
  for (const milestone of ordered) {
    if (milestone.claimed) continue;
    if (points >= milestone.pointsRequired) {
      openableCount += 1;
    } else if (next === null) {
      next = milestone;
    }
  }

  /*
   * Nodes are spaced EVENLY rather than proportionally to their thresholds.
   *
   * Proportional spacing looks correct in a spreadsheet and fails on a phone:
   * ladders that start cheap and end expensive (Fortune Engine opens at 50 and
   * runs to 2000) bunch their first several nodes into the leftmost few pixels,
   * where they overlap each other and the score. Even spacing guarantees every
   * upcoming prize stays legible, and the fill interpolates *within* the
   * current segment so progress toward the next reward still reads truthfully.
   */
  const count = ordered.length;
  const nodes: MinigameHudRewardNode[] = ordered.map((milestone, index) => {
    let state: MinigameHudNodeState;
    if (milestone.claimed) state = 'claimed';
    else if (points >= milestone.pointsRequired) state = 'openable';
    else if (next !== null && milestone.pointsRequired === next.pointsRequired) state = 'next';
    else state = 'upcoming';
    return {
      id: `${index}:${milestone.pointsRequired}`,
      positionPercent: ((index + 1) / count) * 100,
      icon: milestone.icon ?? resolveMinigameRewardIcon(milestone.rewardLabel),
      label: milestone.rewardLabel,
      state,
    };
  });

  // Fill in the same evenly-spaced space the nodes live in.
  let fillRatio = 0;
  if (count > 0) {
    const reachedIndex = ordered.findIndex((m) => points < m.pointsRequired);
    if (reachedIndex === -1) {
      fillRatio = 1;
    } else {
      const previousThreshold = reachedIndex === 0 ? 0 : ordered[reachedIndex - 1].pointsRequired;
      const span = ordered[reachedIndex].pointsRequired - previousThreshold;
      const within = span > 0 ? Math.max(0, Math.min(1, (points - previousThreshold) / span)) : 0;
      fillRatio = (reachedIndex + within) / count;
    }
  }

  const remaining = next ? Math.max(0, next.pointsRequired - points) : 0;
  const unit = options.remainingUnit === undefined ? 'pts' : options.remainingUnit;
  return {
    fillRatio,
    nextRewardLabel: next?.rewardLabel ?? null,
    remainingLabel: next && unit !== null ? `${remaining} ${unit} to go` : null,
    openableCount,
    nodes,
    pointsLabel: String(Math.round(points)),
  };
}
