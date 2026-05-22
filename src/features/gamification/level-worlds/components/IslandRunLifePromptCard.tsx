import { useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  createIslandRunHabitFromLifePrompt,
  type IslandRunHabitSize,
} from '../services/islandRunLifeIntakeService';
import {
  ISLAND_RUN_HABIT_TIMING_CHOICES,
  ISLAND_RUN_LIFE_WHEEL_AREAS,
  type IslandRunHabitTimingChoice,
  type IslandRunLifeWheelArea,
} from '../services/islandRunLifePromptTemplates';
import { getSuggestedHabitsByLifeWheelArea, type SuggestedHabit } from '../../../habits/suggestedHabitLibrary';

interface IslandRunLifePromptCardProps {
  session: Session;
  onComplete: (message: string) => void;
}

const HABIT_SIZES: readonly IslandRunHabitSize[] = ['Tiny', 'Normal', 'Stretch'];

export function IslandRunLifePromptCard({ session, onComplete }: IslandRunLifePromptCardProps) {
  const [area, setArea] = useState<IslandRunLifeWheelArea | null>(null);
  const [selectedHabit, setSelectedHabit] = useState<SuggestedHabit | null>(null);
  const [selectedSize, setSelectedSize] = useState<IslandRunHabitSize | null>(null);
  const [timing, setTiming] = useState<IslandRunHabitTimingChoice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  const suggestedHabits = useMemo(() => (area ? getSuggestedHabitsByLifeWheelArea(area).slice(0, 3) : []), [area]);

  const handleSkip = () => {
    onComplete('Habit stop skipped. You can create your habit later in Habits.');
  };

  const handleCreateHabit = async () => {
    if (!selectedHabit || !selectedSize || !timing) return;
    setIsSubmitting(true);
    setError(null);

    const result = await createIslandRunHabitFromLifePrompt({
      userId: session.user.id,
      selectedHabit,
      selectedSize,
      selectedTiming: timing,
    });

    if (!result.ok) {
      setError(`Could not save habit right now (${result.message}). You can still complete this stop.`);
      setIsSubmitting(false);
      return;
    }

    const successMessage = `✅ ${result.message}`;
    setDoneMessage(successMessage);
    setIsSubmitting(false);
    onComplete(successMessage);
  };

  return (
    <div className="island-hatchery-card">
      <p className="island-stop-modal__copy"><strong>✅ Habit Landmark</strong></p>
      <p className="island-stop-modal__copy">A small action can change an island.</p>

      {!area ? (
        <>
          <p><strong>Choose your next tiny quest.</strong> Pick one life area:</p>
          <div className="island-hatchery-card__actions" style={{ marginTop: '0.75rem', flexWrap: 'wrap' }}>
            {ISLAND_RUN_LIFE_WHEEL_AREAS.map((choice) => (
              <button key={choice} type="button" className="island-stop-modal__btn island-stop-modal__btn--action" onClick={() => setArea(choice)}>
                {choice}
              </button>
            ))}
          </div>
        </>
      ) : !selectedHabit ? (
        <>
          <p><strong>{area}</strong>: pick one suggested quest habit.</p>
          <div className="island-hatchery-card__actions" style={{ marginTop: '0.75rem', flexDirection: 'column', alignItems: 'stretch' }}>
            {suggestedHabits.map((habit) => (
              <button
                key={habit.suggestedHabitId}
                type="button"
                className="island-stop-modal__btn island-stop-modal__btn--action"
                onClick={() => setSelectedHabit(habit)}
                style={{ textAlign: 'left' }}
              >
                <div><strong>{habit.emoji} {habit.title}</strong></div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>Tiny: {habit.tinyVersion}</div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>Default: {habit.defaultTiming}</div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>Cue: {habit.cueSuggestions[0] ?? 'No cue suggestion'}</div>
              </button>
            ))}
          </div>
          <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary" onClick={() => setArea(null)}>
            Back
          </button>
        </>
      ) : !selectedSize || !timing ? (
        <>
          <p><strong>Plant this habit.</strong> Tune the quest size and timing.</p>
          <p><strong>{selectedHabit.emoji} {selectedHabit.title}</strong></p>
          {!selectedSize ? (
            <div className="island-hatchery-card__actions" style={{ marginTop: '0.75rem', flexWrap: 'wrap' }}>
              {HABIT_SIZES.map((size) => (
                <button key={size} type="button" className="island-stop-modal__btn island-stop-modal__btn--action" onClick={() => setSelectedSize(size)}>
                  {size}
                </button>
              ))}
            </div>
          ) : null}

          {selectedSize ? (
            <>
              <p style={{ marginTop: '0.5rem' }}>
                Version preview:{' '}
                <strong>{selectedSize === 'Tiny' ? selectedHabit.tinyVersion : selectedSize === 'Normal' ? selectedHabit.normalVersion : selectedHabit.stretchVersion}</strong>
              </p>
              <div className="island-hatchery-card__actions" style={{ marginTop: '0.75rem', flexWrap: 'wrap' }}>
                {ISLAND_RUN_HABIT_TIMING_CHOICES.map((choice) => (
                  <button key={choice} type="button" className="island-stop-modal__btn island-stop-modal__btn--action" onClick={() => setTiming(choice)}>
                    {choice}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          <button
            type="button"
            className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary"
            onClick={() => (timing ? setTiming(null) : selectedSize ? setSelectedSize(null) : setSelectedHabit(null))}
          >
            Back
          </button>
        </>
      ) : (
        <>
          <p>
            Create this quest habit: <strong>{selectedHabit.emoji} {selectedHabit.title}</strong>
          </p>
          <p>
            {selectedSize} · {timing}
          </p>
          <div className="island-hatchery-card__actions" style={{ marginTop: '0.75rem' }}>
            <button
              type="button"
              className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
              onClick={() => void handleCreateHabit()}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Planting…' : 'Plant this habit & Complete Stop'}
            </button>
            <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action" onClick={() => setTiming(null)} disabled={isSubmitting}>
              Back
            </button>
          </div>
        </>
      )}

      {error ? <p className="journal__status journal__status--error" style={{ marginTop: 10 }}>{error}</p> : null}
      {doneMessage ? <p style={{ marginTop: 10 }}>{doneMessage}</p> : null}

      <div className="island-hatchery-card__actions" style={{ marginTop: '0.75rem' }}>
        <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary" onClick={handleSkip}>
          Skip for now
        </button>
      </div>
    </div>
  );
}
