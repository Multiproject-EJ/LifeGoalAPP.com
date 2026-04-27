import { useMemo, useRef, useState } from 'react';
import { LIFE_WHEEL_CATEGORIES, type LifeWheelCategoryKey } from '../checkins/LifeWheelCheckins';
import { quickAddDailyHabit } from '../../services/habitsV2';
import {
  DEFAULT_STARTER_DOMAIN_KEY,
  STARTER_HABIT_CATALOG,
  type StarterHabit,
} from './starterHabitCatalog';
import { StarterHabitDetailSheet } from './StarterHabitDetailSheet';

type StarterHabitPickerProps = {
  userId: string;
  initialDomainKey?: string;
  onCreated?: () => void;
  onClose?: () => void;
  compact?: boolean;
};

export function StarterHabitPicker({
  userId,
  initialDomainKey,
  onCreated,
  onClose,
  compact = false,
}: StarterHabitPickerProps) {
  const initialKey = useMemo<LifeWheelCategoryKey>(() => {
    const found = LIFE_WHEEL_CATEGORIES.find((category) => category.key === initialDomainKey);
    return (found?.key ?? DEFAULT_STARTER_DOMAIN_KEY) as LifeWheelCategoryKey;
  }, [initialDomainKey]);

  const [selectedDomainKey, setSelectedDomainKey] = useState<LifeWheelCategoryKey>(initialKey);
  const [creatingTitle, setCreatingTitle] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exploringStarter, setExploringStarter] = useState<StarterHabit | null>(null);
  const isCreatingRef = useRef(false);

  // Catalog may contain more than 3 habits per domain; Phase 1 picker displays
  // the first 3 to keep mobile UI compact.
  const starterHabits = (STARTER_HABIT_CATALOG[selectedDomainKey] ?? []).slice(0, 3);

  const createStarterHabit = async (starter: StarterHabit) => {
    if (creatingTitle) return;
    if (isCreatingRef.current) return;
    isCreatingRef.current = true;
    setCreatingTitle(starter.title);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const { data, error } = await quickAddDailyHabit(
        {
          title: starter.title,
          domainKey: selectedDomainKey,
          goalId: null,
          emoji: starter.emoji ?? null,
        },
        userId,
      );
      if (error) throw error;
      if (!data) throw new Error('Starter quest could not be created.');
      setStatusMessage(`Started: ${starter.title}`);
      setExploringStarter(null);
      onCreated?.();
      onClose?.();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create starter quest right now.');
    } finally {
      isCreatingRef.current = false;
      setCreatingTitle(null);
    }
  };

  return (
    <section className={`starter-quest-picker${compact ? ' starter-quest-picker--compact' : ''}`} aria-label="Starter quest picker">
      <header className="starter-quest-picker__header">
        <p className="starter-quest-picker__eyebrow">Starter Quest</p>
        <h3>Choose a starter quest</h3>
        <p>Pick a Life Wheel area, then choose one tiny habit to begin today.</p>
      </header>

      <label className="starter-quest-picker__field" htmlFor="starter-quest-domain">
        <span>Life Wheel area</span>
        <select
          id="starter-quest-domain"
          value={selectedDomainKey}
          onChange={(event) => setSelectedDomainKey(event.target.value as LifeWheelCategoryKey)}
          disabled={Boolean(creatingTitle)}
        >
          {LIFE_WHEEL_CATEGORIES.map((category) => (
            <option key={category.key} value={category.key}>
              {category.label}
            </option>
          ))}
        </select>
      </label>

      <div className="starter-quest-picker__cards" role="list">
        {starterHabits.map((starter) => {
          const isCreating = creatingTitle === starter.title;
          return (
            <article key={`${selectedDomainKey}-${starter.title}`} className="starter-quest-picker__card" role="listitem">
              <div className="starter-quest-picker__card-copy">
                <p className="starter-quest-picker__card-title">
                  {starter.emoji ? `${starter.emoji} ` : ''}
                  {starter.title}
                </p>
                <p className="starter-quest-picker__card-description">{starter.description}</p>
              </div>
              <button
                type="button"
                className="starter-quest-picker__card-action"
                onClick={() => void createStarterHabit(starter)}
                disabled={Boolean(creatingTitle)}
                aria-label={`Start starter quest: ${starter.title}`}
              >
                {isCreating ? 'Adding…' : 'Add to My Quest'}
              </button>
              <button
                type="button"
                className="starter-quest-picker__card-link"
                onClick={() => setExploringStarter(starter)}
                disabled={Boolean(creatingTitle)}
                aria-label={`Explore starter quest: ${starter.title}`}
              >
                Explore
              </button>
            </article>
          );
        })}
      </div>

      {statusMessage ? <p className="starter-quest-picker__status starter-quest-picker__status--success">{statusMessage}</p> : null}
      {errorMessage ? <p className="starter-quest-picker__status starter-quest-picker__status--error">{errorMessage}</p> : null}

      {exploringStarter ? (
        <StarterHabitDetailSheet
          habit={exploringStarter}
          isAdding={creatingTitle === exploringStarter.title}
          onAdd={() => void createStarterHabit(exploringStarter)}
          onClose={() => setExploringStarter(null)}
        />
      ) : null}
    </section>
  );
}
