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
  if (!props.open || !props.candidate) return null;
  const questCopy = getQuestCopy(props.candidate);

  return (
    <div className="habit-day-nav__vision-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="daily-life-upgrade-title" onClick={props.onClose}>
      <div className="habit-day-nav__vision-modal habit-day-nav__daily-life-upgrade-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="habit-day-nav__vision-modal-close habit-day-nav__todays-offer-close" onClick={props.onClose} aria-label="Close quest adjustment">×</button>
        <div className="habit-day-nav__daily-life-upgrade-body">
          <p className="habit-day-nav__daily-life-upgrade-eyebrow">Quest adjustment</p>
          <p id="daily-life-upgrade-title" className="habit-day-nav__daily-life-upgrade-title">{questCopy.title}</p>
          <p className="habit-day-nav__daily-life-upgrade-habit">{questCopy.context}</p>
          <p className="habit-day-nav__daily-life-upgrade-subtitle">{props.candidate.promptTitle}</p>
          <p className="habit-day-nav__daily-life-upgrade-copy">{props.candidate.promptBody}</p>
          {props.candidate.alternatives.length > 0 ? (
            <div className="habit-day-nav__daily-life-upgrade-alternatives" aria-label="Supportive alternative options">
              {props.candidate.alternatives.slice(0, 3).map((alternative) => (
                <button key={alternative.suggestedHabitId} type="button" className="habit-day-nav__daily-life-upgrade-option-card" onClick={() => props.onAlternative(alternative)} aria-label={`Try alternative habit: ${alternative.title}`}>
                  <p className="habit-day-nav__daily-life-upgrade-option-title">{alternative.title}</p>
                  <p className="habit-day-nav__daily-life-upgrade-option-copy">{alternative.supportiveCopy}</p>
                </button>
              ))}
            </div>
          ) : null}
          <button type="button" className="habit-day-nav__daily-life-upgrade-button habit-day-nav__daily-life-upgrade-button--secondary" onClick={props.onClose}>Full quest</button>
          <button type="button" className="habit-day-nav__daily-life-upgrade-button" onClick={props.onPrimary}>{props.candidate.suggestedActionLabel}</button>
          <button type="button" className="habit-day-nav__daily-life-upgrade-button habit-day-nav__daily-life-upgrade-button--secondary" onClick={props.onClose}>Later</button>
        </div>
      </div>
    </div>
  );
}
