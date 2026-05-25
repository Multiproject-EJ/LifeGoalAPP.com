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
import {
  rankSuggestedHabitsByFeedback,
  type HabitFeedbackEnergy,
  type HabitFeedbackStyle,
  type HabitFeedbackTime,
} from '../services/islandRunHabitSuggestionEngine';

interface IslandRunLifePromptCardProps {
  session: Session;
  onComplete: (message: string) => void;
}

const HABIT_SIZES: readonly IslandRunHabitSize[] = ['Tiny', 'Normal', 'Stretch'];

export function IslandRunLifePromptCard({ session, onComplete }: IslandRunLifePromptCardProps) {
  const [area, setArea] = useState<IslandRunLifeWheelArea | null>(null);
  const [selectedHabit, setSelectedHabit] = useState<SuggestedHabit | null>(null);
  const [feedbackEnergy, setFeedbackEnergy] = useState<HabitFeedbackEnergy | null>(null);
  const [feedbackTime, setFeedbackTime] = useState<HabitFeedbackTime | null>(null);
  const [feedbackStyle, setFeedbackStyle] = useState<HabitFeedbackStyle | null>(null);
  const [selectedSize, setSelectedSize] = useState<IslandRunHabitSize | null>(null);
  const [timing, setTiming] = useState<IslandRunHabitTimingChoice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  const suggestedHabits = useMemo(() => {
    if (!area) return [];
    const habits = getSuggestedHabitsByLifeWheelArea(area);
    if (!feedbackEnergy || !feedbackTime || !feedbackStyle) return [];
    return rankSuggestedHabitsByFeedback(habits, {
      energy: feedbackEnergy,
      time: feedbackTime,
      style: feedbackStyle,
    }).slice(0, 3);
  }, [area, feedbackEnergy, feedbackTime, feedbackStyle]);

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
      ) : !feedbackEnergy || !feedbackTime || !feedbackStyle ? (
        <>
          <p><strong>{area}</strong>: let us learn what feels easy first.</p>
          <p style={{ fontSize: 13, opacity: 0.9 }}>Quick feedback first — then suggestions get smarter.</p>
          {!feedbackEnergy ? (
            <div className="island-hatchery-card__actions" style={{ marginTop: '0.75rem', flexWrap: 'wrap' }}>
              <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action" onClick={() => setFeedbackEnergy('low')}>Low energy day</button>
              <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action" onClick={() => setFeedbackEnergy('medium')}>Medium energy</button>
              <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action" onClick={() => setFeedbackEnergy('high')}>High energy</button>
            </div>
          ) : null}
          {feedbackEnergy && !feedbackTime ? (
            <div className="island-hatchery-card__actions" style={{ marginTop: '0.75rem', flexWrap: 'wrap' }}>
              <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action" onClick={() => setFeedbackTime('under_2')}>Under 2 min</button>
              <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action" onClick={() => setFeedbackTime('two_to_five')}>2 to 5 min</button>
              <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action" onClick={() => setFeedbackTime('over_five')}>Over 5 min</button>
            </div>
          ) : null}
          {feedbackEnergy && feedbackTime && !feedbackStyle ? (
            <div className="island-hatchery-card__actions" style={{ marginTop: '0.75rem', flexWrap: 'wrap' }}>
              <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action" onClick={() => setFeedbackStyle('physical')}>Body / movement</button>
              <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action" onClick={() => setFeedbackStyle('mental')}>Calm / focus</button>
              <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action" onClick={() => setFeedbackStyle('planning')}>Planning / work</button>
              <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action" onClick={() => setFeedbackStyle('social')}>Connection</button>
            </div>
          ) : null}
          <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary" onClick={() => (feedbackStyle ? setFeedbackStyle(null) : feedbackTime ? setFeedbackTime(null) : feedbackEnergy ? setFeedbackEnergy(null) : setArea(null))}>
            Back
          </button>
        </>
      ) : !selectedHabit ? (
        <>
          <p><strong>{area}</strong>: here are better-fit starter habits based on your feedback.</p>
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
