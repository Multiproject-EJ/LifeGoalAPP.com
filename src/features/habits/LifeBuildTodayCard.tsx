import { useEffect, useMemo, useState } from 'react';
import type { LifeWheelCategoryKey } from '../checkins/LifeWheelCheckins';
import { getLifeBuildSuggestion, type LifeBuildHabitInput } from './useLifeBuildSuggestion';

type LifeBuildTodayCardProps = {
  userId: string;
  dateISO: string;
  habits: LifeBuildHabitInput[];
  onPickOne: (domainKey: LifeWheelCategoryKey) => void;
};

function buildLifeBuildSnoozeKey(userId: string, dateISO: string): string {
  return `lifegoal:life-build-today-card:${userId}:${dateISO}`;
}

function readLifeBuildSnoozeState(userId: string, dateISO: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.localStorage.getItem(buildLifeBuildSnoozeKey(userId, dateISO)) === '1';
}

export function LifeBuildTodayCard({
  userId,
  dateISO,
  habits,
  onPickOne,
}: LifeBuildTodayCardProps) {
  const suggestion = useMemo(() => getLifeBuildSuggestion(habits), [habits]);
  const snoozeKey = useMemo(() => buildLifeBuildSnoozeKey(userId, dateISO), [dateISO, userId]);
  const [isSnoozed, setIsSnoozed] = useState(() => readLifeBuildSnoozeState(userId, dateISO));

  useEffect(() => {
    setIsSnoozed(readLifeBuildSnoozeState(userId, dateISO));
  }, [dateISO, userId]);

  if (!suggestion || isSnoozed) {
    return null;
  }

  const handleSnooze = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(snoozeKey, '1');
    }
    setIsSnoozed(true);
  };

  return (
    <section className="life-build-today-card" aria-label="Next Life Upgrade">
      <div className="life-build-today-card__copy">
        <p className="life-build-today-card__eyebrow">Life Build</p>
        <h3>Next Life Upgrade</h3>
        <p>Your {suggestion.shortLabel} area could use one tiny action.</p>
      </div>
      <div className="life-build-today-card__actions">
        <button
          type="button"
          className="life-build-today-card__primary"
          onClick={() => onPickOne(suggestion.domainKey)}
        >
          Pick one
        </button>
        <button type="button" className="life-build-today-card__secondary" onClick={handleSnooze}>
          Later
        </button>
      </div>
    </section>
  );
}
