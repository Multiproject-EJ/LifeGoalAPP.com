/**
 * RankJourneyModal — the popup opened by tapping the rank badge.
 *
 * Structure (per design decision): current-rank hero, a 3-column grid of all 12
 * ranks (earned / current / locked), and a tap-to-expand detail for any rank.
 * Pure presentational — all rank data comes from the rank model; no network.
 */

import { useState } from 'react';
import { RANKS, getRankById, type RankDefinition } from '../rankModel';
import type { RankProgressView } from '../rankProgressView';
import { RankBadge } from './RankBadge';
import './RankJourneyModal.css';

export interface RankJourneyModalProps {
  /** The player's current progression level (Combined Journey Level). */
  level: number;
  /** Rank-band progress, for the hero's "X XP to next" line. */
  progress: RankProgressView;
  onClose: () => void;
}

function rankLevelRangeLabel(rank: RankDefinition): string {
  const next = getRankById(rank.id + 1);
  if (!next) return `Level ${rank.minLevel}+`;
  if (next.minLevel - 1 <= rank.minLevel) return `Level ${rank.minLevel}`;
  return `Levels ${rank.minLevel}–${next.minLevel - 1}`;
}

export function RankJourneyModal({ level, progress, onClose }: RankJourneyModalProps) {
  const current = progress.current;
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = selectedId ? getRankById(selectedId) : null;

  const heroLine = progress.next
    ? `${progress.xpRemaining.toLocaleString()} XP to ${progress.next.title}`
    : 'Highest rank reached';

  return (
    <div className="rank-journey" role="dialog" aria-modal="true" aria-label="Rank journey">
      <div className="rank-journey__backdrop" onClick={onClose} role="presentation" />
      <div className="rank-journey__panel">
        <button type="button" className="rank-journey__close" aria-label="Close rank journey" onClick={onClose}>
          ×
        </button>

        <header className="rank-journey__hero">
          <RankBadge rank={current} size={96} />
          <div className="rank-journey__hero-text">
            <p className="rank-journey__hero-eyebrow">Your rank</p>
            <h2 className="rank-journey__hero-title">{current.title}</h2>
            <p className="rank-journey__hero-meta">Level {level}</p>
            <div className="rank-journey__hero-bar" aria-hidden="true">
              <span className="rank-journey__hero-bar-fill" style={{ width: `${progress.percent}%` }} />
            </div>
            <p className="rank-journey__hero-next">{heroLine}</p>
          </div>
        </header>

        <ul className="rank-journey__grid" aria-label="All ranks">
          {RANKS.map((rank) => {
            const locked = rank.minLevel > level;
            const isCurrent = rank.id === current.id;
            const isSelected = rank.id === selectedId;
            return (
              <li key={rank.id}>
                <button
                  type="button"
                  className={`rank-journey__cell${isCurrent ? ' rank-journey__cell--current' : ''}${
                    isSelected ? ' rank-journey__cell--selected' : ''
                  }${locked ? ' rank-journey__cell--locked' : ''}`}
                  aria-pressed={isSelected}
                  aria-label={`${rank.title}, ${locked ? 'locked' : 'unlocked'}, ${rankLevelRangeLabel(rank)}`}
                  onClick={() => setSelectedId(rank.id)}
                >
                  <RankBadge rank={rank} size={56} locked={locked} />
                  <span className="rank-journey__cell-title">{rank.title}</span>
                  <span className="rank-journey__cell-level">Lv {rank.minLevel}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="rank-journey__nextrank">
          <RankBadge rank={progress.next ?? current} size={36} locked={Boolean(progress.next)} />
          <div className="rank-journey__nextrank-text">
            <span className="rank-journey__nextrank-eyebrow">{progress.next ? 'Next Rank' : 'Top Rank'}</span>
            <span className="rank-journey__nextrank-title">{progress.next ? progress.next.title : current.title}</span>
          </div>
          <div className="rank-journey__nextrank-bar-wrap">
            <span className="rank-journey__nextrank-xp">
              {progress.next
                ? `${progress.xpIntoRank.toLocaleString()} / ${progress.xpForRank.toLocaleString()} XP`
                : 'Max rank reached'}
            </span>
            <span className="rank-journey__nextrank-bar" aria-hidden="true">
              <span
                className="rank-journey__nextrank-fill"
                style={{ width: `${progress.percent}%` }}
              />
            </span>
          </div>
          <span className="rank-journey__nextrank-percent">{progress.percent}%</span>
        </div>

        {selected ? (
          <div className="rank-journey__detail-modal" role="dialog" aria-modal="true" aria-label={`${selected.title} rank details`}>
            <div className="rank-journey__detail-backdrop" onClick={() => setSelectedId(null)} role="presentation" />
            <section className="rank-journey__detail" aria-live="polite">
              <button
                type="button"
                className="rank-journey__detail-close"
                aria-label="Close rank details"
                onClick={() => setSelectedId(null)}
              >
                ×
              </button>
              <div className="rank-journey__detail-badge-wrap">
                <RankBadge rank={selected} size={208} locked={selected.minLevel > level} />
              </div>
              <div className="rank-journey__detail-head">
                <h3 className="rank-journey__detail-title">{selected.title}</h3>
                <span className="rank-journey__detail-range">{rankLevelRangeLabel(selected)}</span>
              </div>
              {selected.insignia === 'stars' && selected.stars ? (
                <p className="rank-journey__detail-stars" aria-label={`${selected.stars} stars`}>
                  {'★'.repeat(selected.stars)}
                </p>
              ) : null}
              <p className="rank-journey__detail-desc">{selected.description}</p>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
