/**
 * RankIdentityHeader — the player-menu identity block.
 *
 * Avatar · earned rank badge · name · "{Rank} · Level {n}" · single current-tier
 * membership pill, with a "progress to next rank" bar beneath. Tapping the rank
 * badge opens the rank journey modal. Presentational; all values are passed in.
 */

import type { MembershipTier } from '../../membership';
import { membershipBadgeForTier } from '../../membership';
import { membershipBadgeSrc, membershipBadgeLabel } from '../rankAssets';
import type { RankProgressView } from '../rankProgressView';
import { RankBadge } from './RankBadge';
import './RankIdentityHeader.css';

export interface RankIdentityHeaderProps {
  displayName: string;
  avatarUrl?: string | null;
  initials?: string;
  isOnline?: boolean;
  /** Combined Journey Level. */
  level: number;
  progress: RankProgressView;
  /** Membership tier; drives the single current-tier pill (free → no pill). */
  tier: MembershipTier;
  /** When true, the rank badge pulses to signal an unacknowledged promotion. */
  hasPendingPromotion?: boolean;
  onOpenRank: () => void;
  onTierClick?: () => void;
}

export function RankIdentityHeader({
  displayName,
  avatarUrl,
  initials,
  isOnline = false,
  level,
  progress,
  tier,
  hasPendingPromotion = false,
  onOpenRank,
  onTierClick,
}: RankIdentityHeaderProps) {
  const { current, next } = progress;
  const membershipBadge = membershipBadgeForTier(tier);

  return (
    <div className="rank-identity">
      <div className="rank-identity__top">
        <span className="rank-identity__avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="rank-identity__avatar-img" />
          ) : (
            <span className="rank-identity__avatar-initials" aria-hidden="true">
              {initials || displayName.charAt(0)}
            </span>
          )}
          {isOnline ? <span className="rank-identity__online" aria-label="Online" /> : null}
        </span>

        <button
          type="button"
          className={`rank-identity__badge-btn${hasPendingPromotion ? ' rank-identity__badge-btn--pulse' : ''}`}
          onClick={onOpenRank}
          aria-label={`Rank: ${current.title}.${hasPendingPromotion ? ' New rank earned.' : ''} Open rank journey`}
        >
          <RankBadge rank={current} size={84} />
        </button>

        <div className="rank-identity__id">
          <p className="rank-identity__name">{displayName}</p>
          <p className="rank-identity__rankline">
            <span className="rank-identity__rank-title">{current.title}</span>
            <span className="rank-identity__dot" aria-hidden="true">·</span>
            <span className="rank-identity__level">Level {level}</span>
          </p>
          {membershipBadge ? (
            <button
              type="button"
              className={`rank-identity__tier rank-identity__tier--${membershipBadge}`}
              onClick={onTierClick}
              aria-label={`${membershipBadgeLabel(membershipBadge)} membership`}
            >
              <img
                src={membershipBadgeSrc(membershipBadge)}
                alt=""
                className="rank-identity__tier-icon"
              />
              <span className="rank-identity__tier-label">{membershipBadgeLabel(membershipBadge)}</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="rank-identity__nextrank">
        <RankBadge rank={next ?? current} size={36} locked={Boolean(next)} />
        <div className="rank-identity__nextrank-text">
          <span className="rank-identity__nextrank-eyebrow">{next ? 'Next Rank' : 'Top Rank'}</span>
          <span className="rank-identity__nextrank-title">{next ? next.title : current.title}</span>
        </div>
        <div className="rank-identity__nextrank-bar-wrap">
          <span className="rank-identity__nextrank-xp">
            {next
              ? `${progress.xpIntoRank.toLocaleString()} / ${progress.xpForRank.toLocaleString()} XP`
              : 'Max rank reached'}
          </span>
          <span className="rank-identity__nextrank-bar" aria-hidden="true">
            <span
              className="rank-identity__nextrank-fill"
              style={{ width: `${progress.percent}%` }}
            />
          </span>
        </div>
        <span className="rank-identity__nextrank-percent">{progress.percent}%</span>
      </div>
    </div>
  );
}
