import { GOAL_PILLAR_META, GOAL_PILLAR_ORDER, type GoalPillarSet } from './goalPillars';

type GoalPillarMeterProps = {
  pillars: GoalPillarSet;
  /** 'compact' renders icon + bar only (goal cards); 'full' adds labels + scores. */
  size?: 'compact' | 'full';
  className?: string;
};

/**
 * Tri-segment strength meter for one goal: Insight / Momentum / Support.
 * Pure presentation — scores come from computeGoalPillars.
 */
export function GoalPillarMeter({ pillars, size = 'compact', className }: GoalPillarMeterProps) {
  return (
    <div
      className={[
        'goal-pillar-meter',
        size === 'full' ? 'goal-pillar-meter--full' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="img"
      aria-label={`Goal strength — Insight ${pillars.insight.score}%, Momentum ${pillars.momentum.score}%, Support ${pillars.support.score}%`}
    >
      {GOAL_PILLAR_ORDER.map((key) => {
        const meta = GOAL_PILLAR_META[key];
        const pillar = pillars[key];
        return (
          <div
            key={key}
            className={`goal-pillar-meter__pillar goal-pillar-meter__pillar--${key} goal-pillar-meter__pillar--${pillar.level}`}
            title={`${meta.label} ${pillar.score}% — ${meta.question}`}
          >
            <span className="goal-pillar-meter__icon" aria-hidden="true">
              {meta.icon}
            </span>
            {size === 'full' ? (
              <span className="goal-pillar-meter__labels">
                <span className="goal-pillar-meter__label">{meta.label}</span>
                <span className="goal-pillar-meter__score">{pillar.score}%</span>
              </span>
            ) : null}
            <span className="goal-pillar-meter__track" aria-hidden="true">
              <span
                className="goal-pillar-meter__fill"
                style={{ width: `${pillar.score}%` }}
              />
            </span>
          </div>
        );
      })}
    </div>
  );
}
