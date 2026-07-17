import { useCallback, useEffect, useState } from 'react';
import { fetchQuests, QUESTS_CHANGED_EVENT } from '../../../services/quests';
import { assessQuestReadiness, type Quest } from '../../quests/questModel';

type CompassLiveQuestsProps = {
  userId: string;
};

/** Live evidence layer. It reads canonical quests but never rewrites sealed book answers. */
export function CompassLiveQuests({ userId }: CompassLiveQuestsProps) {
  const [quests, setQuests] = useState<Quest[]>([]);

  const refresh = useCallback(() => {
    void fetchQuests(userId, ['active', 'paused']).then(({ data }) => setQuests(data ?? []));
  }, [userId]);

  useEffect(() => {
    refresh();
    window.addEventListener(QUESTS_CHANGED_EVENT, refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener(QUESTS_CHANGED_EVENT, refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);

  return (
    <section className="compass-live-quests" aria-label="Goals, campaigns, quests, and habits explained">
      <div className="compass-live-quests__heading">
        <div>
          <p>From direction to daily action</p>
          <h2>Your living map</h2>
        </div>
        <span>{quests.length} live</span>
      </div>
      <div className="compass-live-quests__definitions">
        <article><strong>Compass Book</strong><span>Your field guide for discovering what matters and learning from what happens.</span></article>
        <article><strong>Goal</strong><span>A meaningful long-term destination — the change you want in your life.</span></article>
        <article><strong>Campaign</strong><span>The game’s name for a focused season of effort toward one Goal.</span></article>
        <article><strong>Quest</strong><span>A time-bounded, SMART chunk inside a Campaign: habits, environment changes, experiments, and reflections.</span></article>
        <article><strong>Habit</strong><span>The repeatable move. Keystone habits change several other loops at once.</span></article>
      </div>
      {quests.length ? (
        <div className="compass-live-quests__list">
          {quests.slice(0, 3).map((quest) => {
            const readiness = assessQuestReadiness(quest);
            return (
              <article key={quest.id} className="compass-live-quest">
                <div className="compass-live-quest__topline">
                  <span>{quest.status === 'paused' ? 'Paused Quest' : 'Active Quest'}</span>
                  <span>SMART {readiness.smartScore}/{readiness.smartTotal}</span>
                </div>
                <h3>{quest.title}</h3>
                {quest.outcome ? <p>{quest.outcome}</p> : null}
                <div className="compass-live-quest__loop">
                  <span><small>Current loop</small>{quest.behaviorDesign.currentLoop.routine || 'Observe what happens now'}</span>
                  <b aria-hidden="true">→</b>
                  <span><small>Better loop</small>{quest.behaviorDesign.betterLoop.routine || 'Design the next experiment'}</span>
                </div>
                {quest.behaviorDesign.experimentQuestion ? (
                  <p className="compass-live-quest__question">Test: {quest.behaviorDesign.experimentQuestion}</p>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="compass-live-quests__empty">Your active Quests will appear here as living experiments beside the reflections that shaped them.</p>
      )}
    </section>
  );
}
