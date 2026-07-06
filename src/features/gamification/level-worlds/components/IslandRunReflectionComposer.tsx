import { useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { createJournalEntry } from '../../../../services/journal';
import { getReflectionCardsForIsland } from '../services/islandRunReflectionCurriculum';

interface IslandRunReflectionComposerProps {
  session: Session;
  islandNumber: number;
  onSaved: (message: string) => void;
}

export function IslandRunReflectionComposer({
  session,
  islandNumber,
  onSaved,
}: IslandRunReflectionComposerProps) {
  // Per-island check-in cards sourced from the 120-island Compass Book
  // curriculum (with a legacy fallback for out-of-range islands). Captured once
  // so the tournament's total-round count stays stable as `contenders` shrinks.
  const islandCards = useMemo(() => getReflectionCardsForIsland(islandNumber), [islandNumber]);
  const [contenders, setContenders] = useState(islandCards);
  const [judgedCount, setJudgedCount] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isJudgingComplete = contenders.length === 1;
  const selectedPrompt = contenders[0];
  const challengerPrompt = contenders[1] ?? null;
  const journalType = selectedPrompt.suggestedType;
  const totalJudgements = islandCards.length - 1;

  const categoryLabel = useMemo(() => selectedPrompt.category ?? 'Momentum', [selectedPrompt.category]);
  // The written effort bonus answer is optional — selecting an effort answer
  // button is all that is required to complete this stop. No minimum length.
  const canSave = isJudgingComplete && Boolean(selectedAnswer) && !isSaving;

  const handleJudge = (winnerId: string) => {
    if (!challengerPrompt) return;

    const winner = contenders.find((prompt) => prompt.id === winnerId) ?? selectedPrompt;
    const remaining = contenders.slice(2);
    setContenders([winner, ...remaining]);
    setJudgedCount((count) => count + 1);
    setSelectedAnswer(null);
    setError(null);
  };

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
    setError(null);
  };

  const handleSave = async () => {
    const trimmedContent = content.trim();
    if (!selectedAnswer) {
      setError('Choose one of the two effort answer buttons before saving.');
      return;
    }

    setIsSaving(true);
    setError(null);

    const today = new Date().toISOString().split('T')[0];
    const title = `Island Run Effort Bonus — ${selectedPrompt.title}`;
    const effortAnswerSection = trimmedContent ? `\n\nEffort bonus answer:\n${trimmedContent}` : '';
    const fullContent = `${selectedPrompt.prompt}\n\nChosen effort answer: ${selectedAnswer}${effortAnswerSection}`;

    const { error: saveError } = await createJournalEntry({
      user_id: session.user.id,
      entry_date: today,
      title,
      content: fullContent,
      mood: null,
      tags: ['island-run', 'dynamic-stop', 'effort-bonus-answer', `island-${islandNumber}`],
      linked_goal_ids: null,
      linked_habit_ids: null,
      is_private: true,
      type: journalType,
      mood_score: null,
      category: journalType === 'life_wheel' ? selectedPrompt.category : null,
      unlock_date: null,
      goal_id: null,
    });

    if (saveError) {
      setError(saveError.message);
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    onSaved('Effort bonus answer saved to your journal and stop completed.');
  };

  return (
    <div className="island-hatchery-card island-run-reflection-composer">
      <p className="island-run-reflection-composer__intro">
        🧭 Judge the check-in cards first. No dropdowns: keep picking the card that fits until one wins, then add an
        effort bonus answer with a little emotional detail.
      </p>

      {!isJudgingComplete && challengerPrompt ? (
        <section className="island-run-reflection-composer__judge" aria-label="Judge check-in cards">
          <div className="island-run-reflection-composer__progress">
            <span className="island-run-reflection-composer__progress-label">
              Round {judgedCount + 1} of {totalJudgements} — which card fits better right now?
            </span>
            <span className="island-run-reflection-composer__pips" aria-hidden="true">
              {Array.from({ length: totalJudgements }).map((_, index) => (
                <span
                  key={index}
                  className={`island-run-reflection-composer__pip ${
                    index < judgedCount
                      ? 'is-done'
                      : index === judgedCount
                        ? 'is-active'
                        : ''
                  }`}
                />
              ))}
            </span>
          </div>
          {/* key by round so the entry animation replays each time a winner advances */}
          <div className="island-run-reflection-composer__card-grid" key={judgedCount}>
            {[selectedPrompt, challengerPrompt].map((prompt) => (
              <button
                key={prompt.id}
                type="button"
                className="island-run-reflection-composer__judge-card"
                onClick={() => handleJudge(prompt.id)}
              >
                {prompt.category ? (
                  <span className="island-run-reflection-composer__judge-tag">{prompt.category}</span>
                ) : null}
                <strong>{prompt.title}</strong>
                <span>{prompt.prompt}</span>
                <span className="island-run-reflection-composer__judge-pick" aria-hidden="true">
                  Pick this card
                </span>
              </button>
            ))}
            <span className="island-run-reflection-composer__vs" aria-hidden="true">VS</span>
          </div>
        </section>
      ) : (
        <>
          <div className="island-run-reflection-composer__prompt island-run-reflection-composer__prompt--winner">
            <span className="island-run-reflection-composer__winner-badge" aria-hidden="true">
              🏆 Winning card
            </span>
            <strong>{selectedPrompt.title}</strong>
            <span>{selectedPrompt.prompt}</span>
          </div>

          <p className="island-run-reflection-composer__category">
            Category chosen: <strong>{categoryLabel}</strong> · Save as{' '}
            <strong>{journalType === 'life_wheel' ? 'Life Wheel reflection' : 'Quick reflection'}</strong>
          </p>

          <div className="island-run-reflection-composer__answer-buttons" role="group" aria-label="Choose effort answer">
            {selectedPrompt.buttonAnswers.map((answer) => (
              <button
                key={answer}
                type="button"
                className={`island-stop-modal__btn island-stop-modal__btn--action ${
                  selectedAnswer === answer ? 'island-stop-modal__btn--primary' : ''
                }`}
                onClick={() => handleAnswerSelect(answer)}
              >
                {answer}
              </button>
            ))}
          </div>

          <label className="journal-editor__field" style={{ marginTop: 12 }}>
            <span>Effort bonus answer</span>
            <textarea
              className="island-run-reflection-composer__textarea"
              rows={6}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={selectedPrompt.effortBonusHint}
            />
          </label>

          <p className="island-run-reflection-composer__tags">
            Tags: <code>island-run</code>, <code>dynamic-stop</code>, <code>effort-bonus-answer</code>
          </p>

          <p className="island-run-reflection-composer__requirement" aria-live="polite">
            Optional: add a sentence if you like. Picking an effort answer above is enough to complete this stop.
          </p>
        </>
      )}

      {error ? (
        <p className="journal__status journal__status--error" style={{ marginTop: 12 }}>
          {error}
        </p>
      ) : null}

      <div className="island-stop-modal__actions island-stop-modal__actions--balanced" style={{ marginTop: 14 }}>
        <button
          type="button"
          className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
          onClick={handleSave}
          disabled={!canSave}
        >
          {isSaving ? 'Saving...' : 'Save Effort Bonus & Complete Stop'}
        </button>
      </div>
    </div>
  );
}
