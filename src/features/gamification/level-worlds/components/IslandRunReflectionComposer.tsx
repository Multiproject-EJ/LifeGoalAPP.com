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
};

const REFLECTION_PROMPTS: ReflectionPrompt[] = [
  {
    id: 'momentum',
    title: 'Momentum Check',
    prompt: 'What is going well on this island right now, and what is the next small move that would keep your momentum alive?',
    suggestedType: 'quick',
    category: null,
  },
  {
    id: 'health',
    title: 'Health Recalibration',
    prompt: 'How is your energy or physical well-being affecting this stretch of the journey, and what support would help most today?',
    suggestedType: 'life_wheel',
    category: 'Health',
  },
  {
    id: 'career',
    title: 'Career Focus',
    prompt: 'What work or purpose-related priority feels most important right now, and what would “good enough progress” look like today?',
    suggestedType: 'life_wheel',
    category: 'Career',
  },
  {
    id: 'relationships',
    title: 'Connection Check',
    prompt: 'Which relationship or conversation deserves attention, and what kind of presence do you want to bring into it?',
    suggestedType: 'life_wheel',
    category: 'Relationships',
  },
  {
    id: 'growth',
    title: 'Growth Lens',
    prompt: 'What are you learning about yourself during this island, and what belief or habit are you ready to strengthen next?',
    suggestedType: 'life_wheel',
    category: 'Personal Growth',
  },
  {
    id: 'finance',
    title: 'Resource Check',
    prompt: 'What would feeling a little more stable or intentional with your resources look like this week?',
    suggestedType: 'life_wheel',
    category: 'Finance',
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
  const [selectedPromptId, setSelectedPromptId] = useState(REFLECTION_PROMPTS[defaultPromptIndex].id);
  const [journalType, setJournalType] = useState<Extract<JournalEntryType, 'quick' | 'life_wheel'>>(
    REFLECTION_PROMPTS[defaultPromptIndex].suggestedType,
  );
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPrompt = useMemo(
    () => REFLECTION_PROMPTS.find((prompt) => prompt.id === selectedPromptId) ?? REFLECTION_PROMPTS[0],
    [selectedPromptId],
  );

  const minimumReflectionLength = 20;
  const trimmedLength = content.trim().length;
  const charsRemaining = Math.max(minimumReflectionLength - trimmedLength, 0);
  const canSave = trimmedLength >= minimumReflectionLength && !isSaving;

  const handlePromptChange = (promptId: string) => {
    const prompt = REFLECTION_PROMPTS.find((entry) => entry.id === promptId) ?? REFLECTION_PROMPTS[0];
    setSelectedPromptId(prompt.id);
    setJournalType(prompt.suggestedType);
  };

  const handleSave = async () => {
    const trimmedContent = content.trim();
    if (trimmedContent.length < minimumReflectionLength) {
      setError('Write at least 20 characters so this reflection is meaningful in your journal.');
      return;
    }

    setIsSaving(true);
    setError(null);

    const today = new Date().toISOString().split('T')[0];
    const title = `Island Run Reflection — ${selectedPrompt.title}`;
    const fullContent = `${selectedPrompt.prompt}\n\n${trimmedContent}`;

    const { error: saveError } = await createJournalEntry({
      user_id: session.user.id,
      entry_date: today,
      title,
      content: fullContent,
      mood: null,
      tags: ['island-run', 'dynamic-stop', 'checkin-reflection', `island-${islandNumber}`],
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
    onSaved('Reflection saved to your journal and stop completed.');
  };

  return (
    <div className="island-hatchery-card island-run-reflection-composer">
      <p>
        🧭 Save this stop as a real journal entry so the reflection lives in your main journal history instead of a
        temporary mini-game state.
      </p>

      <label className="journal-editor__field" style={{ marginTop: 12 }}>
        <span>Choose a reflection prompt</span>
        <select value={selectedPromptId} onChange={(event) => handlePromptChange(event.target.value)}>
          {REFLECTION_PROMPTS.map((prompt) => (
            <option key={prompt.id} value={prompt.id}>
              {prompt.title}
            </option>
          ))}
        </select>
      </label>

      <div
        style={{
          marginTop: 12,
          padding: '12px 14px',
          borderRadius: 14,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.08)',
          fontSize: '0.95rem',
          lineHeight: 1.5,
        }}
      >
        {selectedPrompt.prompt}
      </div>

      <label className="journal-editor__field" style={{ marginTop: 12 }}>
        <span>Save as</span>
        <select
          value={journalType}
          onChange={(event) => setJournalType(event.target.value as Extract<JournalEntryType, 'quick' | 'life_wheel'>)}
        >
          <option value="quick">Quick reflection</option>
          <option value="life_wheel">Life Wheel reflection</option>
        </select>
      </label>

      {journalType === 'life_wheel' && selectedPrompt.category ? (
        <p style={{ marginTop: 8, fontSize: '0.85rem', opacity: 0.78 }}>
          Category: <strong>{selectedPrompt.category}</strong>
        </p>
      ) : null}

      <label className="journal-editor__field" style={{ marginTop: 12 }}>
        <span>Your reflection</span>
        <textarea
          rows={6}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Write a few honest lines about what you’re noticing, what matters, and what your next move is."
        />
      </label>

      <p style={{ marginTop: 8, fontSize: '0.82rem', opacity: 0.72 }}>
        Tags: <code>island-run</code>, <code>dynamic-stop</code>, <code>checkin-reflection</code>
      </p>

      <p style={{ marginTop: 8, fontSize: '0.82rem', opacity: 0.76 }}>
        {charsRemaining > 0
          ? `Add ${charsRemaining} more character${charsRemaining === 1 ? '' : 's'} to enable save.`
          : 'Ready to save this reflection.'}
      </p>

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
          {isSaving ? 'Saving...' : 'Save Reflection & Complete Stop'}
        </button>
      </div>
    </div>
  );
}
