import { useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { JournalEntryType } from '../../../../lib/database.types';
import { createJournalEntry } from '../../../../services/journal';

type ReflectionPrompt = {
  id: string;
  title: string;
  prompt: string;
  suggestedType: Extract<JournalEntryType, 'quick' | 'life_wheel'>;
  category: string | null;
  buttonAnswers: [string, string];
  effortBonusHint: string;
};

const REFLECTION_PROMPTS: ReflectionPrompt[] = [
  {
    id: 'momentum',
    title: 'Momentum Check',
    prompt: 'Which island card feels most true right now: protecting your current momentum, or changing direction before the day drifts?',
    suggestedType: 'quick',
    category: null,
    buttonAnswers: ['Protect the spark ✨', 'Change the current 🌊'],
    effortBonusHint: 'Type what would make that answer feel real, and add one emotion you notice.',
  },
  {
    id: 'health',
    title: 'Health Recalibration',
    prompt: 'Which card deserves the check-in today: your body asking for care, or your energy asking for a smarter pace?',
    suggestedType: 'life_wheel',
    category: 'Health',
    buttonAnswers: ['Care for my body 🌿', 'Pace my energy 🔋'],
    effortBonusHint: 'Add what your body needs and the emotion underneath it.',
  },
  {
    id: 'career',
    title: 'Career Focus',
    prompt: 'Which card should win this round: one useful work step, or one boundary that makes better work possible?',
    suggestedType: 'life_wheel',
    category: 'Career',
    buttonAnswers: ['Ship one useful step 🚀', 'Protect the boundary 🛡️'],
    effortBonusHint: 'Type the step or boundary, then add how you want to feel after it.',
  },
  {
    id: 'relationships',
    title: 'Connection Check',
    prompt: 'Which card matters more today: reaching toward someone, or listening more honestly to what a relationship needs?',
    suggestedType: 'life_wheel',
    category: 'Relationships',
    buttonAnswers: ['Reach out warmly 🤝', 'Listen beneath words 💙'],
    effortBonusHint: 'Name the person or situation, and add the emotion you want to bring.',
  },
  {
    id: 'growth',
    title: 'Growth Lens',
    prompt: 'Which card is stronger right now: learning from what happened, or choosing the belief you want to practice next?',
    suggestedType: 'life_wheel',
    category: 'Personal Growth',
    buttonAnswers: ['Learn from the clue 🧭', 'Practice the belief 🌱'],
    effortBonusHint: 'Type the lesson or belief, and add the feeling you want to grow with it.',
  },
  {
    id: 'finance',
    title: 'Resource Check',
    prompt: 'Which card should guide your resources today: creating a little more stability, or spending attention with intention?',
    suggestedType: 'life_wheel',
    category: 'Finance',
    buttonAnswers: ['Create stability 🪙', 'Spend attention wisely 🎯'],
    effortBonusHint: 'Add one money/resource move and the emotion you want around it.',
  },
];

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
  const defaultPromptIndex = islandNumber % REFLECTION_PROMPTS.length;
  const [contenders, setContenders] = useState(() => {
    const rotated = [...REFLECTION_PROMPTS.slice(defaultPromptIndex), ...REFLECTION_PROMPTS.slice(0, defaultPromptIndex)];
    return rotated;
  });
  const [judgedCount, setJudgedCount] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isJudgingComplete = contenders.length === 1;
  const selectedPrompt = contenders[0];
  const challengerPrompt = contenders[1] ?? null;
  const journalType = selectedPrompt.suggestedType;
  const totalJudgements = REFLECTION_PROMPTS.length - 1;

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
          <p className="island-run-reflection-composer__progress">
            Judging {judgedCount + 1} of {totalJudgements}: which card fits better right now?
          </p>
          <div className="island-run-reflection-composer__card-grid">
            {[selectedPrompt, challengerPrompt].map((prompt) => (
              <button
                key={prompt.id}
                type="button"
                className="island-run-reflection-composer__judge-card"
                onClick={() => handleJudge(prompt.id)}
              >
                <strong>{prompt.title}</strong>
                <span>{prompt.prompt}</span>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <>
          <div className="island-run-reflection-composer__prompt">
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
