import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '../../utils/scrollLock';
import {
  saveQuestBundle,
  type QuestHabitLink,
} from '../../services/quests';
import {
  assessQuestReadiness,
  emptyReflectionPlan,
  type BehaviorDesign,
  type Quest,
  type QuestDraft,
  type SmartDefinition,
} from './questModel';
import './QuestSetupModal.css';

type QuestSetupGoal = { id: string; title: string; lifeWheelCategory: string | null };
type QuestSetupHabit = { id: string; name: string; goalId: string | null };
type QuestSetupCampaign = { id: string; title: string; goalId: string | null };

type QuestSetupModalProps = {
  open: boolean;
  userId: string;
  goals: QuestSetupGoal[];
  habits: QuestSetupHabit[];
  campaign: QuestSetupCampaign | null;
  quest?: Quest | null;
  initialHabitLinks?: QuestHabitLink[];
  onClose: () => void;
  onSaved: (quest: Quest) => void;
};

const isoToday = () => new Date().toISOString().slice(0, 10);

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

export function QuestSetupModal({
  open,
  userId,
  goals,
  habits,
  campaign,
  quest = null,
  initialHabitLinks = [],
  onClose,
  onSaved,
}: QuestSetupModalProps) {
  const today = isoToday();
  const [title, setTitle] = useState(quest?.title ?? '');
  const [outcome, setOutcome] = useState(quest?.outcome ?? '');
  const [goalId, setGoalId] = useState(quest?.goalId ?? campaign?.goalId ?? '');
  const [startsOn, setStartsOn] = useState(quest?.startsOn ?? today);
  const [endsOn, setEndsOn] = useState(quest?.endsOn ?? addDays(today, 27));
  const [metric, setMetric] = useState(quest?.smartDefinition.metric ?? 'successful days');
  const [targetValue, setTargetValue] = useState(quest?.smartDefinition.targetValue?.toString() ?? '20');
  const [targetUnit, setTargetUnit] = useState(quest?.smartDefinition.targetUnit ?? 'days');
  const [achievable, setAchievable] = useState(quest?.smartDefinition.achievable ?? 'The minimum version is small enough for a difficult day.');
  const [relevant, setRelevant] = useState(quest?.smartDefinition.relevant ?? 'This supports the life change I want now.');
  const [currentCue, setCurrentCue] = useState(quest?.behaviorDesign.currentLoop.cue ?? '');
  const [currentRoutine, setCurrentRoutine] = useState(quest?.behaviorDesign.currentLoop.routine ?? '');
  const [currentReward, setCurrentReward] = useState(quest?.behaviorDesign.currentLoop.reward ?? '');
  const [underlyingNeed, setUnderlyingNeed] = useState(quest?.behaviorDesign.currentLoop.underlyingNeed ?? '');
  const [betterCue, setBetterCue] = useState(quest?.behaviorDesign.betterLoop.cue ?? '');
  const [betterRoutine, setBetterRoutine] = useState(quest?.behaviorDesign.betterLoop.routine ?? '');
  const [betterReward, setBetterReward] = useState(quest?.behaviorDesign.betterLoop.reward ?? '');
  const [experimentQuestion, setExperimentQuestion] = useState(quest?.behaviorDesign.experimentQuestion ?? '');
  const [environmentChanges, setEnvironmentChanges] = useState(quest?.behaviorDesign.environmentChanges.join('\n') ?? '');
  const [minimumMove, setMinimumMove] = useState(quest?.behaviorDesign.minimumMove ?? '');
  const [recoveryRule, setRecoveryRule] = useState(quest?.behaviorDesign.recoveryRule ?? 'Return at the next opportunity without punishment or catching up.');
  const [allyLettersEnabled, setAllyLettersEnabled] = useState(quest?.reflectionPlan.allyLettersEnabled ?? false);
  const [selectedHabitIds, setSelectedHabitIds] = useState<Set<string>>(
    () => new Set(initialHabitLinks.map((link) => link.habit_id)),
  );
  const [keystoneHabitId, setKeystoneHabitId] = useState(
    quest?.behaviorDesign.keystoneHabitId
      ?? initialHabitLinks.find((link) => link.role === 'keystone')?.habit_id
      ?? '',
  );
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    return lockPageScroll(['body', 'documentElement']);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  const smartDefinition: SmartDefinition = useMemo(() => ({
    specific: outcome.trim(),
    metric: metric.trim(),
    targetValue: targetValue.trim() && Number.isFinite(Number(targetValue)) ? Number(targetValue) : null,
    targetUnit: targetUnit.trim(),
    achievable: achievable.trim(),
    relevant: relevant.trim(),
  }), [achievable, metric, outcome, relevant, targetUnit, targetValue]);

  const behaviorDesign: BehaviorDesign = useMemo(() => ({
    currentLoop: { cue: currentCue.trim(), routine: currentRoutine.trim(), reward: currentReward.trim(), underlyingNeed: underlyingNeed.trim() },
    betterLoop: { cue: betterCue.trim(), routine: betterRoutine.trim(), reward: betterReward.trim(), underlyingNeed: underlyingNeed.trim() },
    experimentQuestion: experimentQuestion.trim(),
    environmentChanges: environmentChanges.split('\n').map((item) => item.trim()).filter(Boolean),
    minimumMove: minimumMove.trim(),
    recoveryRule: recoveryRule.trim(),
    keystoneHabitId: keystoneHabitId || null,
  }), [betterCue, betterReward, betterRoutine, currentCue, currentReward, currentRoutine, environmentChanges, experimentQuestion, keystoneHabitId, minimumMove, recoveryRule, underlyingNeed]);

  const selectedGoal = goals.find((goal) => goal.id === goalId) ?? null;
  const baseDraft: QuestDraft = {
    goalId: goalId || null,
    campaignId: campaign?.id ?? null,
    title: title.trim(),
    outcome: outcome.trim(),
    kind: 'behavior_experiment',
    status: 'draft',
    startsOn: startsOn || null,
    endsOn: endsOn || null,
    lifeWheelCategory: selectedGoal?.lifeWheelCategory ?? null,
    smartDefinition,
    behaviorDesign,
    reflectionPlan: { ...emptyReflectionPlan(), allyLettersEnabled },
    sourceCompassChapterId: null,
    sourceCompassActivityId: null,
  };
  const readiness = assessQuestReadiness(baseDraft);

  if (!open || typeof document === 'undefined') return null;

  const toggleHabit = (habitId: string) => {
    setSelectedHabitIds((current) => {
      const next = new Set(current);
      if (next.has(habitId)) {
        next.delete(habitId);
        if (keystoneHabitId === habitId) setKeystoneHabitId('');
      } else next.add(habitId);
      return next;
    });
  };

  const save = async (status: Quest['status']) => {
    if (!title.trim()) return setError('Name the Quest before saving it.');
    if (status === 'active' && !readiness.readyToActivate) {
      return setError('Finish the SMART promise and both behavior loops before starting this Quest. You can save it as a draft now.');
    }
    setSaving(true);
    setError(null);
    try {
      const saveResult = await saveQuestBundle(userId, {
        questId: quest?.id,
        draft: {
          ...baseDraft,
          status,
        },
        links: Array.from(selectedHabitIds, (habitId) => ({
          habitId,
          role: habitId === keystoneHabitId ? 'keystone' as const : 'supporting' as const,
        })),
        newHabitTitle: newHabitTitle.trim() || undefined,
      });
      if (saveResult.error || !saveResult.data) {
        throw saveResult.error ?? new Error('Could not save the Quest.');
      }
      onSaved(saveResult.data.quest);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save this Quest.');
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <div className="quest-setup" role="presentation" onClick={onClose}>
      <div className="quest-setup__dialog" role="dialog" aria-modal="true" aria-label="Create a Quest" onClick={(event) => event.stopPropagation()}>
        <header className="quest-setup__header">
          <div><p>Quest Forge</p><h2>{quest ? 'Refine this Quest' : 'Design a useful experiment'}</h2><span>A Quest should change a loop, not merely add pressure.</span></div>
          <button type="button" onClick={onClose} aria-label="Close Quest setup">✕</button>
        </header>
        <div className="quest-setup__body">
          <section>
            <h3>1. Choose the promise</h3>
            <label>Quest name<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Build an energising morning" /></label>
            <label>Specific outcome<textarea value={outcome} onChange={(event) => setOutcome(event.target.value)} rows={2} placeholder="Complete the better loop on 20 mornings" /></label>
            <div className="quest-setup__pair">
              <label>Goal<select value={goalId} onChange={(event) => setGoalId(event.target.value)}><option value="">No Goal yet</option>{goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></label>
              <label>Campaign<input value={campaign?.title ?? 'No active Campaign'} disabled /></label>
            </div>
            <div className="quest-setup__pair"><label>Starts<input type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} /></label><label>Ends<input type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} /></label></div>
            <div className="quest-setup__metric"><label>Measure<input value={metric} onChange={(event) => setMetric(event.target.value)} /></label><label>Target<input type="number" value={targetValue} onChange={(event) => setTargetValue(event.target.value)} /></label><label>Unit<input value={targetUnit} onChange={(event) => setTargetUnit(event.target.value)} /></label></div>
            <label>Why is this achievable?<input value={achievable} onChange={(event) => setAchievable(event.target.value)} /></label>
            <label>Why does it matter now?<input value={relevant} onChange={(event) => setRelevant(event.target.value)} /></label>
          </section>
          <section>
            <h3>2. Observe, then improve the loop</h3>
            <p className="quest-setup__hint">Name what the old loop gives you. The better loop should meet the same need with a healthier move.</p>
            <div className="quest-setup__loop-grid">
              <fieldset><legend>Current loop</legend><input value={currentCue} onChange={(event) => setCurrentCue(event.target.value)} placeholder="Cue" /><input value={currentRoutine} onChange={(event) => setCurrentRoutine(event.target.value)} placeholder="Routine" /><input value={currentReward} onChange={(event) => setCurrentReward(event.target.value)} placeholder="Reward" /></fieldset>
              <fieldset><legend>Better loop</legend><input value={betterCue} onChange={(event) => setBetterCue(event.target.value)} placeholder="Cue" /><input value={betterRoutine} onChange={(event) => setBetterRoutine(event.target.value)} placeholder="New routine" /><input value={betterReward} onChange={(event) => setBetterReward(event.target.value)} placeholder="Reward" /></fieldset>
            </div>
            <label>Underlying need<input value={underlyingNeed} onChange={(event) => setUnderlyingNeed(event.target.value)} placeholder="Relief, belonging, stimulation, rest…" /></label>
            <label>Experiment question<input value={experimentQuestion} onChange={(event) => setExperimentQuestion(event.target.value)} placeholder="Does preparing the cue the night before make starting easier?" /></label>
            <label>Environment changes, one per line<textarea value={environmentChanges} onChange={(event) => setEnvironmentChanges(event.target.value)} rows={3} placeholder={'Put shoes by the door\nCharge phone outside the room'} /></label>
            <div className="quest-setup__pair"><label>Minimum move<input value={minimumMove} onChange={(event) => setMinimumMove(event.target.value)} placeholder="The tiny version" /></label><label>Recovery rule<input value={recoveryRule} onChange={(event) => setRecoveryRule(event.target.value)} /></label></div>
          </section>
          <section>
            <h3>3. Give the Quest its habits</h3>
            <div className="quest-setup__habit-list">
              {habits.map((habit) => (
                <label key={habit.id} className={selectedHabitIds.has(habit.id) ? 'is-selected' : ''}>
                  <input type="checkbox" checked={selectedHabitIds.has(habit.id)} onChange={() => toggleHabit(habit.id)} />
                  <span>{habit.name}</span>
                  {selectedHabitIds.has(habit.id) ? <button type="button" className={keystoneHabitId === habit.id ? 'is-keystone' : ''} onClick={() => setKeystoneHabitId(habit.id)}>◆ Keystone</button> : null}
                </label>
              ))}
            </div>
            <label>Create a new daily Quest habit<input value={newHabitTitle} onChange={(event) => setNewHabitTitle(event.target.value)} placeholder="Prepare tomorrow’s breakfast" /></label>
            <label className="quest-setup__check"><input type="checkbox" checked={allyLettersEnabled} onChange={(event) => setAllyLettersEnabled(event.target.checked)} />Invite a Quest Ally <small>Your Ally occasionally writes inside the Quest journal. Your replies stay private in the game and become useful reflection evidence.</small></label>
          </section>
        </div>
        <footer className="quest-setup__footer">
          <div><strong>SMART {readiness.smartScore}/5</strong><span>{readiness.loopReady ? 'Loops ready' : `${readiness.loopMissing.length} loop pieces left`}</span></div>
          {error ? <p>{error}</p> : null}
          <button type="button" disabled={saving} onClick={() => void save(quest?.status ?? 'draft')}>{quest ? 'Save changes' : 'Save draft'}</button>
          {(!quest || quest.status === 'draft') ? (
            <button type="button" className="quest-setup__start" disabled={saving || !readiness.readyToActivate} onClick={() => void save('active')}>{saving ? 'Forging…' : 'Start Quest'}</button>
          ) : null}
        </footer>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
