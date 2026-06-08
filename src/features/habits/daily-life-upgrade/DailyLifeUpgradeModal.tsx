import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import type { DailyLifeUpgradeCandidate } from '../../../services/dailyLifeUpgradeCandidate';

function toQuestDisplayName(value: string): string {
  return value
    .trim()
    .replace(/[!?.]+$/u, '')
    .replace(/\s+/gu, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => {
      const cleaned = word.trim();
      if (!cleaned) return cleaned;
      if (cleaned.length <= 3 && cleaned === cleaned.toUpperCase()) return cleaned;
      return `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1).toLowerCase()}`;
    })
    .join(' ');
}

function getQuestCopy(candidate: DailyLifeUpgradeCandidate): { title: string; context: string } {
  const [rawTitle, rawContext] = candidate.habitTitle.split(/\s[-–—:]\s|[-–—:]/u, 2);
  const title = toQuestDisplayName(rawTitle || candidate.habitTitle) || candidate.habitTitle;
  const contextBase = rawContext?.replace(/^gpt\s+/iu, '').trim();
  const context = contextBase ? `${toQuestDisplayName(contextBase)} Quest` : 'Adaptive Habit Quest';

  return { title, context };
}

export function DailyLifeUpgradeModal(props: {
  candidate: DailyLifeUpgradeCandidate | null;
  open: boolean;
  onClose: () => void;
  onPrimary: () => void;
  onAlternative: (alternative: DailyLifeUpgradeCandidate['alternatives'][number]) => void;
}) {
  useEffect(() => {
    if (!props.open || !props.candidate) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [props.open, props.candidate]);

  if (!props.open || !props.candidate) return null;
  const questCopy = getQuestCopy(props.candidate);
  const modal = (
    <div className="habit-day-nav__vision-modal-backdrop habit-day-nav__daily-life-upgrade-backdrop" role="dialog" aria-modal="true" aria-labelledby="daily-life-upgrade-title" onClick={props.onClose}>
      <div className="habit-day-nav__vision-modal habit-day-nav__daily-life-upgrade-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="habit-day-nav__vision-modal-close habit-day-nav__daily-life-upgrade-close" onClick={props.onClose} aria-label="Close quest adjustment">×</button>
        <div className="habit-day-nav__daily-life-upgrade-body">
          <div className="habit-day-nav__daily-life-upgrade-heading">
            <p className="habit-day-nav__daily-life-upgrade-eyebrow">Quest adjustment</p>
            <p id="daily-life-upgrade-title" className="habit-day-nav__daily-life-upgrade-title">Morning Brief</p>
            <p className="habit-day-nav__daily-life-upgrade-habit">{questCopy.context}</p>
          </div>
          <div className="habit-day-nav__daily-life-upgrade-prompt">
            <p className="habit-day-nav__daily-life-upgrade-subtitle">{props.candidate.promptTitle}</p>
          </div>
          {props.candidate.alternatives.length > 0 ? (
            <div className="habit-day-nav__daily-life-upgrade-alternatives" aria-label="Supportive alternative options">
              {props.candidate.alternatives.slice(0, 2).map((alternative) => (
                <button key={alternative.suggestedHabitId} type="button" className="habit-day-nav__daily-life-upgrade-option-card" onClick={() => props.onAlternative(alternative)} aria-label={`Try alternative habit: ${alternative.title}`}>
                  <p className="habit-day-nav__daily-life-upgrade-option-title">{alternative.title}</p>
                  <p className="habit-day-nav__daily-life-upgrade-option-copy">{alternative.supportiveCopy}</p>
                </button>
              ))}
            </div>
          ) : null}
          <div className="habit-day-nav__daily-life-upgrade-actions">
            <button type="button" className="habit-day-nav__daily-life-upgrade-button habit-day-nav__daily-life-upgrade-button--secondary" onClick={props.onClose}>
              <span className="habit-day-nav__daily-life-upgrade-button-icon" aria-hidden="true">✦</span>
              <span><strong>Full quest</strong><small>Take on the complete challenge</small></span>
            </button>
            <button type="button" className="habit-day-nav__daily-life-upgrade-button" onClick={props.onPrimary}>
              <span className="habit-day-nav__daily-life-upgrade-button-icon" aria-hidden="true">☄</span>
              <span><strong>{props.candidate.suggestedActionLabel}</strong><small>A lighter path for today</small></span>
            </button>
            <button type="button" className="habit-day-nav__daily-life-upgrade-button habit-day-nav__daily-life-upgrade-button--secondary" onClick={props.onClose}>
              <span className="habit-day-nav__daily-life-upgrade-button-icon" aria-hidden="true">⌛</span>
              <span><strong>Later</strong><small>Choose this quest another time</small></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
