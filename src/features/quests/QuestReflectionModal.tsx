import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { addQuestReflection, fetchQuestReflections } from '../../services/quests';
import { lockPageScroll } from '../../utils/scrollLock';
import {
  buildQuestAllyLetter,
  summarizeQuestEvidence,
  type Quest,
  type QuestReflection,
  type QuestReflectionType,
} from './questModel';
import './QuestReflectionModal.css';

type Props = {
  open: boolean;
  userId: string;
  quest: Quest;
  onClose: () => void;
  onChanged: () => void;
  habitCompletionCount?: number;
};

const MODES: Array<{ id: QuestReflectionType; label: string; prompt: string }> = [
  { id: 'check_in', label: 'Quick check-in', prompt: 'What happened when you tried the better loop?' },
  { id: 'loop_review', label: 'Weekly loop review', prompt: 'Which cue, environment change, or reward helped—and what created friction?' },
  { id: 'completion', label: 'Completion reflection', prompt: 'What changed, what evidence matters, and what will you carry forward?' },
];

export function QuestReflectionModal({ open, userId, quest, onClose, onChanged, habitCompletionCount = 0 }: Props) {
  const [reflections, setReflections] = useState<QuestReflection[]>([]);
  const [mode, setMode] = useState<QuestReflectionType>('check_in');
  const [content, setContent] = useState('');
  const [nextExperiment, setNextExperiment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const result = await fetchQuestReflections(userId, quest.id);
    if (result.error) setError(result.error.message);
    else setReflections(result.data ?? []);
  };

  useEffect(() => {
    if (!open) return;
    void load();
    return lockPageScroll(['body', 'documentElement']);
  }, [open, quest.id, userId]);

  const evidence = useMemo(() => summarizeQuestEvidence(quest, reflections), [quest, reflections]);
  const letter = useMemo(() => buildQuestAllyLetter(quest, reflections.length), [quest, reflections.length]);
  const latestAllyReply = reflections.find((reflection) => reflection.reflectionType === 'ally_reply');
  const allyLetterDue = !latestAllyReply || (Date.now() - new Date(latestAllyReply.createdAt).getTime()) >= 7 * 24 * 60 * 60 * 1000;
  const selectedPrompt = MODES.find((item) => item.id === mode)?.prompt ?? letter.question;

  if (!open || typeof document === 'undefined') return null;

  const save = async () => {
    if (!content.trim()) return setError('Write a short, honest answer first.');
    setSaving(true);
    setError(null);
    const result = await addQuestReflection(userId, quest.id, mode, content, {
      nextExperiment,
      loopObservation: {
        currentRoutine: quest.behaviorDesign.currentLoop.routine,
        betterRoutine: quest.behaviorDesign.betterLoop.routine,
      },
    });
    setSaving(false);
    if (result.error) return setError(result.error.message);
    setContent('');
    setNextExperiment('');
    await load();
    onChanged();
  };

  return createPortal(
    <div className="quest-reflection" role="presentation" onMouseDown={onClose}>
      <section className="quest-reflection__dialog" role="dialog" aria-modal="true" aria-labelledby="quest-reflection-title" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><p>Quest field journal</p><h2 id="quest-reflection-title">{quest.title}</h2><span>Collect evidence. Improve the loop. Keep what works.</span></div><button type="button" onClick={onClose} aria-label="Close Quest journal">×</button></header>
        <div className="quest-reflection__evidence">
          <span><strong>{evidence.reflectionCount}</strong> observations</span>
          <span><strong>{evidence.loopReviewCount}</strong> loop reviews</span>
          <span><strong>{habitCompletionCount}</strong> linked habit completions</span>
          <span><strong>Next</strong> {evidence.nextExperiment}</span>
        </div>
        {quest.reflectionPlan.allyLettersEnabled && allyLetterDue ? (
          <article className="quest-reflection__letter">
            <small>Letter from your Quest Ally</small><h3>{letter.subject}</h3><p>{letter.body}</p><blockquote>{letter.question}</blockquote>
            <button type="button" onClick={() => { setMode('ally_reply'); setContent(''); }}>Reply in the journal</button>
          </article>
        ) : null}
        <nav aria-label="Reflection type">
          {MODES.map((item) => <button key={item.id} type="button" className={mode === item.id ? 'is-active' : ''} onClick={() => setMode(item.id)}>{item.label}</button>)}
          {quest.reflectionPlan.allyLettersEnabled && allyLetterDue ? <button type="button" className={mode === 'ally_reply' ? 'is-active' : ''} onClick={() => setMode('ally_reply')}>Ally reply</button> : null}
        </nav>
        <div className="quest-reflection__composer">
          <label>{selectedPrompt}<textarea rows={5} value={content} onChange={(event) => setContent(event.target.value)} placeholder="Notice what actually happened—not what should have happened." /></label>
          <label>Next experiment <input value={nextExperiment} onChange={(event) => setNextExperiment(event.target.value)} placeholder="One small change to test next" /></label>
          {error ? <p role="alert">{error}</p> : null}
          <button type="button" disabled={saving} onClick={() => void save()}>{saving ? 'Saving…' : mode === 'ally_reply' ? 'Send reply to journal' : 'Save reflection'}</button>
        </div>
        <div className="quest-reflection__history">
          <h3>Evidence trail</h3>
          {reflections.length === 0 ? <p>No evidence yet. Your first honest observation starts the trail.</p> : reflections.map((reflection) => (
            <article key={reflection.id}><small>{reflection.reflectionType.replace('_', ' ')} · {new Date(reflection.createdAt).toLocaleDateString()}</small><p>{reflection.content}</p>{reflection.nextExperiment ? <span>Next: {reflection.nextExperiment}</span> : null}</article>
          ))}
        </div>
      </section>
    </div>, document.body,
  );
}
