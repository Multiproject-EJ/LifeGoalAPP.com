import './ActivityProgress.css';

/** Read-only progress. Never owns completion, construction or rewards. */
export function ActivityProgress({ completed, total, unit = 'answer', buildLevel, saved = false, readyLabel = 'Ready to submit', landmarkRewardStatus }: {
  completed: number; total: number; unit?: string; buildLevel?: number; saved?: boolean; readyLabel?: string;
  landmarkRewardStatus?: 'locked' | 'earned' | 'legacy-complete';
}) {
  const target = Math.max(0, Math.trunc(total));
  const count = Math.min(target, Math.max(0, Math.trunc(completed)));
  const remaining = target - count;
  const level = Math.min(3, Math.max(0, Math.trunc(buildLevel ?? 0)));
  return <section className="activity-progress" aria-label="Activity and construction progress">
    <div className="activity-progress__label">
      <strong>{remaining ? `${remaining} ${unit}${remaining === 1 ? '' : 's'} to go` : saved ? 'Activity saved' : readyLabel}</strong>
      <span>{count}/{target}</span>
    </div>
    <progress aria-label={`${unit} progress`} value={count} max={Math.max(1, target)} />
    {buildLevel !== undefined ? <>
      <div className="activity-progress__label"><strong>Building</strong><span>Level {level} of 3</span></div>
      <progress className="activity-progress__build" aria-label="Building level" value={level} max={3} />
      {landmarkRewardStatus ? <div className="activity-progress__reward" data-status={landmarkRewardStatus}>
        <strong>{landmarkRewardStatus === 'earned' ? 'Reward earned' : landmarkRewardStatus === 'legacy-complete' ? 'Landmark complete' : 'Completion reward'}</strong>
        <span>{landmarkRewardStatus === 'legacy-complete' ? 'Complete' : '🎲 5 dice'}</span>
      </div> : null}
      <small>{landmarkRewardStatus === 'earned'
        ? 'Activity and Level 3 construction are complete. Your dice reward is saved.'
        : landmarkRewardStatus === 'legacy-complete'
          ? 'This landmark was already complete before the new dice reward was introduced.'
          : 'Finish both the activity and Level 3 construction to activate the dice reward.'}</small>
    </> : null}
  </section>;
}
