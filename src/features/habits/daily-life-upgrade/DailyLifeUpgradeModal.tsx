import type { DailyLifeUpgradeCandidate } from '../../../services/dailyLifeUpgradeCandidate';

export function DailyLifeUpgradeModal(props: {
  candidate: DailyLifeUpgradeCandidate | null;
  open: boolean;
  onClose: () => void;
  onPrimary: () => void;
  onAlternative: (alternative: DailyLifeUpgradeCandidate['alternatives'][number]) => void;
}) {
  if (!props.open || !props.candidate) return null;
  return (
    <div className="habit-day-nav__vision-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="daily-life-upgrade-title" onClick={props.onClose}>
      <div className="habit-day-nav__vision-modal habit-day-nav__daily-life-upgrade-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="habit-day-nav__vision-modal-close habit-day-nav__todays-offer-close" onClick={props.onClose} aria-label="Close Daily Life Upgrade">×</button>
        <div className="habit-day-nav__daily-life-upgrade-body">
          <p className="habit-day-nav__daily-life-upgrade-eyebrow">Daily Life Upgrade</p>
          <p id="daily-life-upgrade-title" className="habit-day-nav__daily-life-upgrade-title">{props.candidate.promptTitle}</p>
          <p className="habit-day-nav__daily-life-upgrade-subtitle">One tiny improvement for today.</p>
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
          <button type="button" className="habit-day-nav__daily-life-upgrade-button" onClick={props.onPrimary}>{props.candidate.suggestedActionLabel}</button>
          <button type="button" className="habit-day-nav__daily-life-upgrade-button habit-day-nav__daily-life-upgrade-button--secondary" onClick={props.onClose}>Later</button>
        </div>
      </div>
    </div>
  );
}
