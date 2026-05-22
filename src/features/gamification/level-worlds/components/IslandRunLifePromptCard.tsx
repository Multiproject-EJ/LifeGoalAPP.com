import { useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  createIslandRunHabitFromLifePrompt,
} from '../services/islandRunLifeIntakeService';
import {
  getHabitPresetsForArea,
  ISLAND_RUN_HABIT_TIMING_CHOICES,
  ISLAND_RUN_LIFE_WHEEL_AREAS,
  type IslandRunHabitTimingChoice,
  type IslandRunLifeWheelArea,
} from '../services/islandRunLifePromptTemplates';

interface IslandRunLifePromptCardProps {
  session: Session;
  onComplete: (message: string) => void;
}

export function IslandRunLifePromptCard({ session, onComplete }: IslandRunLifePromptCardProps) {
  const [area, setArea] = useState<IslandRunLifeWheelArea | null>(null);
  const [preset, setPreset] = useState<string | null>(null);
  const [timing, setTiming] = useState<IslandRunHabitTimingChoice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  const presets = useMemo(() => (area ? getHabitPresetsForArea(area) : []), [area]);

  const handleSkip = () => {
    onComplete('Habit stop skipped. You can create your habit later in Habits.');
  };

  const handleCreateHabit = async () => {
    if (!area || !preset || !timing) return;
    setIsSubmitting(true);
    setError(null);

    const result = await createIslandRunHabitFromLifePrompt({
      userId: session.user.id,
      area,
      preset,
      timing,
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
      <p className="island-stop-modal__copy"><strong>✅ Habit Setup</strong></p>
      {!area ? (
        <>
          <p>Pick one life area to focus for this stop:</p>
          <div className="island-hatchery-card__actions" style={{ marginTop: '0.75rem', flexWrap: 'wrap' }}>
            {ISLAND_RUN_LIFE_WHEEL_AREAS.map((choice) => (
              <button key={choice} type="button" className="island-stop-modal__btn island-stop-modal__btn--action" onClick={() => setArea(choice)}>
                {choice}
              </button>
            ))}
          </div>
        </>
      ) : !preset ? (
        <>
          <p><strong>{area}</strong>: choose one tiny habit preset.</p>
          <div className="island-hatchery-card__actions" style={{ marginTop: '0.75rem', flexWrap: 'wrap' }}>
            {presets.map((choice) => (
              <button key={choice} type="button" className="island-stop-modal__btn island-stop-modal__btn--action" onClick={() => setPreset(choice)}>
                {choice}
              </button>
            ))}
          </div>
          <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary" onClick={() => setArea(null)}>
            Back
          </button>
        </>
      ) : !timing ? (
        <>
          <p>When do you want to do: <strong>{preset}</strong>?</p>
          <div className="island-hatchery-card__actions" style={{ marginTop: '0.75rem', flexWrap: 'wrap' }}>
            {ISLAND_RUN_HABIT_TIMING_CHOICES.map((choice) => (
              <button key={choice} type="button" className="island-stop-modal__btn island-stop-modal__btn--action" onClick={() => setTiming(choice)}>
                {choice}
              </button>
            ))}
          </div>
          <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary" onClick={() => setPreset(null)}>
            Back
          </button>
        </>
      ) : (
        <>
          <p>
            Create this habit: <strong>{preset}</strong> ({timing})
          </p>
          <div className="island-hatchery-card__actions" style={{ marginTop: '0.75rem' }}>
            <button
              type="button"
              className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
              onClick={() => void handleCreateHabit()}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating…' : 'Create Habit & Complete Stop'}
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
