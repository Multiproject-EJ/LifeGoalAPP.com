/**
 * Rank & membership badge asset registry.
 *
 * Single point of truth mapping each rank id (and the two membership badges) to
 * a public asset path and alt text. Components MUST resolve badges through this
 * registry rather than hard-coding `/assets/ranks/...` strings, so the planned
 * asset rename/optimization (investigation §3, PR 6) is a one-file change.
 *
 * Paths are public-folder URLs (served from `public/`, referenced as
 * `/assets/...`), matching how other media is referenced across the app.
 *
 * NOTE: filenames below intentionally reflect the *current* repository state
 * (mixed PNG/WebP, inconsistent casing). PR 6 will normalize files and
 * thumbnails; only this map changes when it does.
 */

import { getRankById, type RankDefinition } from './rankModel';

const RANK_ASSET_BASE = '/assets/ranks';

/** Current on-disk badge filename per rank id. Normalized in PR 6. */
const RANK_BADGE_FILES: Readonly<Record<number, string>> = {
  1: '1_deckhand.png',
  2: '2_crewmate.webp',
  3: '3_pathfinder.webp',
  4: '4_Navigator.webp',
  5: '5_flight_operator.png',
  6: '6_senior-operator.webp',
  7: '7_lieutenant.png',
  8: '8_commander.webp',
  9: '9_wing-commander.png',
  10: '10_captain.png',
  11: '11_fleet-captain.webp',
  12: '12_sky-marshal.png',
};

/**
 * Membership status badges. These are account/entitlement status, NOT player
 * ranks (investigation §11) — kept in a separate registry so they never get
 * treated as ranks.
 */
export type MembershipBadge = 'member' | 'pro';

const MEMBERSHIP_BADGE_FILES: Readonly<Record<MembershipBadge, string>> = {
  member: 'Member_badge.webp',
  pro: 'Pro_memberbadge.webp',
};

const MEMBERSHIP_BADGE_LABELS: Readonly<Record<MembershipBadge, string>> = {
  member: 'Member',
  pro: 'Pro',
};

/** Public URL for a rank's badge image, or undefined for an unknown id. */
export function rankBadgeSrc(rankId: number): string | undefined {
  const file = RANK_BADGE_FILES[rankId];
  return file ? `${RANK_ASSET_BASE}/${file}` : undefined;
}

/**
 * Accessible alt text for a rank badge. The rank's meaning is always available
 * as text (investigation §13) — never communicated by the image alone.
 */
export function rankBadgeAlt(rank: RankDefinition): string {
  return `Rank: ${rank.title}`;
}

/** Public URL for a membership badge image. */
export function membershipBadgeSrc(badge: MembershipBadge): string {
  return `${RANK_ASSET_BASE}/${MEMBERSHIP_BADGE_FILES[badge]}`;
}

/** Accessible alt text / label for a membership badge. */
export function membershipBadgeLabel(badge: MembershipBadge): string {
  return MEMBERSHIP_BADGE_LABELS[badge];
}

export function membershipBadgeAlt(badge: MembershipBadge): string {
  return `${MEMBERSHIP_BADGE_LABELS[badge]} status`;
}

/** True when every rank in the model has a badge asset mapped. */
export function everyRankHasBadge(): boolean {
  for (let id = 1; id <= 12; id += 1) {
    if (!getRankById(id)) return false;
    if (!RANK_BADGE_FILES[id]) return false;
  }
  return true;
}
