import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '../../utils/scrollLock';
import {
  deleteQuest,
  fetchQuestHabitLinks,
  fetchQuests,
  saveQuestBundle,
  type QuestHabitLink,
} from '../../services/quests';
import {
  assessQuestReadiness,
  questToDraft,
  type Quest,
  type QuestStatus,
} from './questModel';
import { QuestSetupModal } from './QuestSetupModal';
import './QuestManagerModal.css';

type ManagerGoal = { id: string; title: string; lifeWheelCategory: string | null };
type ManagerHabit = { id: string; name: string; goalId: string | null };
type ManagerCampaign = { id: string; title: string; goalId: string | null };

type QuestManagerModalProps = {
  open: boolean;
  userId: string;
  goals: ManagerGoal[];
  habits: ManagerHabit[];
  campaign: ManagerCampaign | null;
  onClose: () => void;
  onChanged: () => void;
};

const STATUS_ORDER: QuestStatus[] = ['active', 'draft', 'paused', 'completed', 'archived'];

function statusLabel(status: QuestStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function QuestManagerModal({
  open,
  userId,
  goals,
  habits,
  campaign,
  onClose,
  onChanged,
}: QuestManagerModalProps) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [links, setLinks] = useState<QuestHabitLink[]>([]);
  const [editingQuest, setEditingQuest] = useState<Quest | 'new' | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingQuestId, setPendingQuestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [questsResult, linksResult] = await Promise.all([
      fetchQuests(userId),
      fetchQuestHabitLinks(userId),
    ]);
    setLoading(false);
    if (questsResult.error || linksResult.error) {
      setError(questsResult.error?.message ?? linksResult.error?.message ?? 'Could not load Quests.');
      return;
    }
    setError(null);
    setQuests(questsResult.data ?? []);
    setLinks(linksResult.data ?? []);
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    void refresh();
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return undefined;
    return lockPageScroll(['body', 'documentElement']);
  }, [open]);

  useEffect(() => {
    if (!open || editingQuest) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingQuest, onClose, open]);

  const sortedQuests = useMemo(() => [...quests].sort((a, b) => {
    const statusDifference = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    return statusDifference || b.updatedAt.localeCompare(a.updatedAt);
  }), [quests]);

  if (!open || typeof document === 'undefined') return null;

  const transition = async (quest: Quest, status: QuestStatus) => {
    if (status === 'active' && !assessQuestReadiness(quest).readyToActivate) {
      setError('Finish this Quest’s SMART promise and behavior loops before activating it.');
      setEditingQuest(quest);
      return;
    }
    setPendingQuestId(quest.id);
    setError(null);
    const result = await saveQuestBundle(userId, {
      questId: quest.id,
      draft: { ...questToDraft(quest), status },
      links: links
        .filter((link) => link.quest_id === quest.id)
        .map((link) => ({ habitId: link.habit_id, role: link.role })),
    });
    setPendingQuestId(null);
    if (result.error || !result.data) {
      setError(result.error?.message ?? 'Could not update this Quest.');
      return;
    }
    await refresh();
    onChanged();
  };

  const remove = async (quest: Quest) => {
    if (!window.confirm(`Permanently delete “${quest.title}” and its Quest reflections? Its habits will remain.`)) return;
    setPendingQuestId(quest.id);
    setError(null);
    const result = await deleteQuest(userId, quest.id);
    setPendingQuestId(null);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    await refresh();
    onChanged();
  };

  if (editingQuest) {
    const quest = editingQuest === 'new' ? null : editingQuest;
    return (
      <QuestSetupModal
        key={quest?.id ?? 'new-quest'}
        open
        userId={userId}
        goals={goals}
        habits={habits}
        campaign={campaign}
        quest={quest}
        initialHabitLinks={quest ? links.filter((link) => link.quest_id === quest.id) : []}
        onClose={() => setEditingQuest(null)}
        onSaved={() => {
          setEditingQuest(null);
          void refresh();
          onChanged();
        }}
      />
    );
  }

  const content = (
    <div className="quest-manager" role="presentation" onClick={onClose}>
      <div className="quest-manager__dialog" role="dialog" aria-modal="true" aria-label="Manage Quests" onClick={(event) => event.stopPropagation()}>
        <header className="quest-manager__header">
          <div><p>Quest Log</p><h2>Manage your experiments</h2><span>Draft, refine, pause, finish, and learn without losing the thread.</span></div>
          <button type="button" onClick={onClose} aria-label="Close Quest Log">✕</button>
        </header>
        <div className="quest-manager__toolbar">
          <span>{quests.filter((quest) => quest.status === 'active').length} active · {quests.filter((quest) => quest.status === 'draft').length} drafts</span>
          <button type="button" onClick={() => setEditingQuest('new')}>＋ Forge a Quest</button>
        </div>
        <div className="quest-manager__body">
          {error ? <p className="quest-manager__error">{error}</p> : null}
          {loading ? <p className="quest-manager__empty">Opening the Quest Log…</p> : null}
          {!loading && sortedQuests.length === 0 ? (
            <div className="quest-manager__empty"><strong>No Quests yet</strong><span>Forge one focused experiment instead of trying to change everything at once.</span></div>
          ) : null}
          {sortedQuests.map((quest) => {
            const readiness = assessQuestReadiness(quest);
            const habitCount = links.filter((link) => link.quest_id === quest.id).length;
            const pending = pendingQuestId === quest.id;
            return (
              <article key={quest.id} className={`quest-manager-card quest-manager-card--${quest.status}`}>
                <div className="quest-manager-card__topline"><span>{statusLabel(quest.status)}</span><span>SMART {readiness.smartScore}/5 · {habitCount} {habitCount === 1 ? 'habit' : 'habits'}</span></div>
                <h3>{quest.title}</h3>
                <p>{quest.outcome || 'Outcome not defined yet.'}</p>
                <div className="quest-manager-card__loop"><span>{quest.behaviorDesign.currentLoop.routine || 'Observe current loop'}</span><b>→</b><span>{quest.behaviorDesign.betterLoop.routine || 'Design better loop'}</span></div>
                <div className="quest-manager-card__actions">
                  <button type="button" disabled={pending} onClick={() => setEditingQuest(quest)}>Edit</button>
                  {quest.status === 'draft' ? <button type="button" disabled={pending || !readiness.readyToActivate} onClick={() => void transition(quest, 'active')}>Start</button> : null}
                  {quest.status === 'active' ? <><button type="button" disabled={pending} onClick={() => void transition(quest, 'paused')}>Pause</button><button type="button" disabled={pending} onClick={() => void transition(quest, 'completed')}>Complete</button></> : null}
                  {quest.status === 'paused' ? <button type="button" disabled={pending} onClick={() => void transition(quest, 'active')}>Resume</button> : null}
                  {quest.status !== 'archived' ? <button type="button" disabled={pending} onClick={() => void transition(quest, 'archived')}>Archive</button> : <button type="button" disabled={pending} onClick={() => void transition(quest, 'draft')}>Restore draft</button>}
                  {quest.status === 'archived' ? <button type="button" className="quest-manager-card__delete" disabled={pending} onClick={() => void remove(quest)}>Delete permanently</button> : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
