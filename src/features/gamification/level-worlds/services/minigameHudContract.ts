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

export interface MinigameHudReward {
  /** 0..1 fill of the progress track. */
  fillRatio: number;
  /** Short label for the next milestone's exact prize, e.g. "+8 Dice". */
  nextRewardLabel: string | null;
  /** Points still needed to reach it, when the scale is meaningful. */
  remainingLabel: string | null;
  /** Number of milestones ready to open right now. */
  openableCount: number;
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
  }>;
  /** Unit rendered after remaining counts, e.g. "pts". Omit to hide. */
  remainingUnit?: string | null;
}): MinigameHudReward {
  const points = Number.isFinite(options.points) ? Math.max(0, options.points) : 0;
  const ordered = [...options.milestones].sort((a, b) => a.pointsRequired - b.pointsRequired);
  const totalPoints = ordered.length > 0 ? ordered[ordered.length - 1].pointsRequired : 0;

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

  const remaining = next ? Math.max(0, next.pointsRequired - points) : 0;
  const unit = options.remainingUnit === undefined ? 'pts' : options.remainingUnit;
  return {
    fillRatio: totalPoints > 0 ? Math.min(1, points / totalPoints) : 0,
    nextRewardLabel: next?.rewardLabel ?? null,
    remainingLabel: next && unit !== null ? `${remaining} ${unit} to go` : null,
    openableCount,
  };
}
