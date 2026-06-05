import { useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { fetchCheckinsForUser } from '../../services/checkins';
import { fetchGoals } from '../../services/goals';
import { fetchStepsForGoal } from '../../services/lifeGoals';
import { listHabitsV2, listTodayHabitLogsV2 } from '../../services/habitsV2';
import { getQuestHabit, refreshQuestHabit, type QuestHabit } from '../../services/questHabit';
import type { Database } from '../../lib/database.types';
import type { LifeWheelCategoryKey } from '../checkins/LifeWheelCheckins';
import {
  buildQuestCompassForceDetail,
  buildQuestCompassViewModel,
  getPrimaryCategoryForForce,
  type QuestCompassForceDetail,
  type QuestCompassForceScore,
  type QuestCompassRecommendedAction,
} from './questCompassViewModel';

type CheckinRow = Database['public']['Tables']['checkins']['Row'];
type GoalRow = Database['public']['Tables']['goals']['Row'];
type StepRow = Database['public']['Tables']['life_goal_steps']['Row'];
type HabitRow = Database['public']['Tables']['habits_v2']['Row'];
type HabitLogRow = Database['public']['Tables']['habit_logs_v2']['Row'];

type QuestCompassModalProps = {
  session: Session | null;
  onClose: () => void;
  onAskAiGuide: () => void;
  onRefreshAlignment: () => void;
  onStartNextQuest: (initialDomainKey?: LifeWheelCategoryKey) => void;
  onOpenGoals: () => void;
  onOpenJournal: () => void;
};

export function QuestCompassModal({
  session,
  onClose,
  onAskAiGuide,
  onRefreshAlignment,
  onStartNextQuest,
  onOpenGoals,
  onOpenJournal,
}: QuestCompassModalProps) {
  const [checkins, setCheckins] = useState<CheckinRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [goalSteps, setGoalSteps] = useState<StepRow[]>([]);
  const [habits, setHabits] = useState<HabitRow[]>([]);
  const [todayHabitLogs, setTodayHabitLogs] = useState<HabitLogRow[]>([]);
  const [questHabit, setQuestHabit] = useState<QuestHabit | null>(null);
  const [selectedForceKey, setSelectedForceKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(session?.user.id));
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!session?.user.id) {
      setCheckins([]);
      setGoals([]);
      setGoalSteps([]);
      setHabits([]);
      setTodayHabitLogs([]);
      setQuestHabit(null);
      setLoading(false);
      setLoadError(null);
      return () => {
        isMounted = false;
      };
    }

    const loadCheckins = async () => {
      setLoading(true);
      setLoadError(null);
      setQuestHabit(getQuestHabit(session.user.id));
      const [checkinResult, goalsResult, habitsResult, logsResult, refreshedQuestHabit] =
        await Promise.all([
          fetchCheckinsForUser(session.user.id, 6),
          fetchGoals(),
          listHabitsV2(),
          listTodayHabitLogsV2(session.user.id),
          refreshQuestHabit(session.user.id),
        ]);
      const relatedGoalSteps = await Promise.all(
        (goalsResult.data ?? [])
          .filter((goal) => goal.status_tag !== 'completed' && goal.status_tag !== 'archived')
          .map((goal) => fetchStepsForGoal(goal.id)),
      );

      if (!isMounted) return;

      setCheckins(checkinResult.data ?? []);
      setGoals(goalsResult.data ?? []);
      setHabits(habitsResult.data ?? []);
      setTodayHabitLogs(logsResult.data ?? []);
      setQuestHabit(refreshedQuestHabit);
      setGoalSteps(relatedGoalSteps.flatMap((result) => result.data ?? []));
      setLoadError(
        checkinResult.error?.message ??
          goalsResult.error?.message ??
          habitsResult.error?.message ??
          logsResult.error?.message ??
          relatedGoalSteps.find((result) => result.error)?.error?.message ??
          null,
      );
      setLoading(false);
    };

    void loadCheckins();

    return () => {
      isMounted = false;
    };
  }, [session?.user.id]);

  const viewModel = useMemo(
    () => buildQuestCompassViewModel(checkins),
    [checkins],
  );
  const strongestForce = viewModel.strongestForce;
  const focusForce = viewModel.focusForce;
  const selectedForce =
    viewModel.forces.find((force) => force.key === selectedForceKey) ?? null;
  const selectedForceDetail = useMemo(
    () =>
      selectedForce
        ? buildQuestCompassForceDetail({
            force: selectedForce,
            goals,
            habits,
            todayHabitLogs,
            goalSteps,
            questHabit,
          })
        : null,
    [selectedForce, goals, habits, todayHabitLogs, goalSteps, questHabit],
  );

  useEffect(() => {
    if (!selectedForceDetail) return undefined;
    const originalOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedForceKey(null);
      }
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedForceDetail]);

  const openForceDetailFromKeyboard = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    force: QuestCompassForceScore,
  ) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    setSelectedForceKey(force.key);
  };

  return (
    <div
      className="mobile-menu-overlay__hold-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Quest Compass"
    >
      <button
        type="button"
        className="mobile-menu-overlay__hold-backdrop"
        aria-label="Close Quest Compass"
        onClick={onClose}
      />
      <div className="mobile-menu-overlay__hold-panel mobile-menu-overlay__submenu-sheet quest-compass">
        <div className="mobile-menu-overlay__hold-header">
          <div>
            <p className="mobile-menu-overlay__hold-eyebrow">Life Realm Compass</p>
            <h3 className="mobile-menu-overlay__hold-title">Quest Compass</h3>
          </div>
          <button
            type="button"
            className="mobile-menu-overlay__hold-close"
            aria-label="Close Quest Compass"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <p className="quest-compass__copy">
          Read today’s alignment across your six life forces from your latest
          Life Wheel check-in, then choose one small real-life quest.
        </p>

        {loading ? (
          <p className="quest-compass__status">Loading your latest alignment…</p>
        ) : null}
        {loadError ? (
          <p className="quest-compass__status quest-compass__status--warning">
            {loadError}
          </p>
        ) : null}

        <section className="quest-compass__overview" aria-label="Compass overview">
          <div className="quest-compass__orb" aria-hidden="true">
            <span className="quest-compass__orb-center">🧭</span>
            {viewModel.forces.map((force, index) => (
              <span
                key={force.key}
                className={`quest-compass__orb-point quest-compass__orb-point--${index + 1} quest-compass__orb-point--${force.trend}`}
              >
                {force.icon}
              </span>
            ))}
          </div>
          <div className="quest-compass__signal">
            <span className="quest-compass__signal-label">
              {viewModel.hasCheckinData ? 'Latest alignment' : 'No signal yet'}
            </span>
            <strong>
              {viewModel.hasCheckinData
                ? viewModel.summary
                : 'Refresh alignment to wake up your Compass.'}
            </strong>
            <p>
              {viewModel.latestCheckinDateLabel
                ? `Latest check-in: ${viewModel.latestCheckinDateLabel}`
                : 'Complete a Life Wheel check-in to score Fire, Strength, Connection, Wealth, Growth, and Direction.'}
            </p>
          </div>
        </section>

        <div className="quest-compass__spotlight-grid" aria-label="Compass highlights">
          <CompassSpotlightCard
            label="Strongest force"
            force={strongestForce}
            fallback="No strongest force yet"
          />
          <CompassSpotlightCard
            label="Focus force"
            force={focusForce}
            fallback="No focus force yet"
          />
        </div>

        <div className="quest-compass__force-grid" aria-label="Six life forces">
          {viewModel.forces.map((force) => (
            <button
              key={force.key}
              type="button"
              className={`quest-compass__force-card quest-compass__force-card--${force.key}`}
              onClick={() => setSelectedForceKey(force.key)}
              onKeyDown={(event) => openForceDetailFromKeyboard(event, force)}
              aria-label={`Open ${force.name} force details`}
            >
              <span className="quest-compass__force-icon" aria-hidden="true">
                {force.icon}
              </span>
              <div>
                <div className="quest-compass__force-heading">
                  <h4>{force.name}</h4>
                  <span>{force.scoreLabel}</span>
                </div>
                <p className={`quest-compass__trend quest-compass__trend--${force.trend}`}>
                  {force.trendLabel}
                </p>
                <p>{force.summary}</p>
                <small>
                  Signals: {force.contributingCategories.map((category) => category.label).join(', ')}
                </small>
              </div>
            </button>
          ))}
        </div>

        <div className="mobile-menu-overlay__submenu mobile-menu-overlay__submenu--open quest-compass__actions">
          <button
            type="button"
            className="mobile-menu-overlay__submenu-button"
            aria-label="Ask AI Guide about your Quest Compass"
            onClick={onAskAiGuide}
          >
            <span className="mobile-menu-overlay__submenu-icon" aria-hidden="true">🧠</span>
            <span>Ask AI Guide</span>
          </button>
          <button
            type="button"
            className="mobile-menu-overlay__submenu-button"
            aria-label="Refresh your Quest Compass alignment with a check-in"
            onClick={onRefreshAlignment}
          >
            <span className="mobile-menu-overlay__submenu-icon" aria-hidden="true">📊</span>
            <span>Refresh alignment/check-in</span>
          </button>
          <button
            type="button"
            className="mobile-menu-overlay__submenu-button"
            aria-label="Start the next quest from your Quest Compass"
            onClick={() => onStartNextQuest()}
          >
            <span className="mobile-menu-overlay__submenu-icon" aria-hidden="true">🔁</span>
            <span>Start next quest</span>
          </button>
          <button
            type="button"
            className="mobile-menu-overlay__submenu-button"
            aria-label="Open goals from your Quest Compass"
            onClick={onOpenGoals}
          >
            <span className="mobile-menu-overlay__submenu-icon" aria-hidden="true">🎯</span>
            <span>Open goals</span>
          </button>
          <button
            type="button"
            className="mobile-menu-overlay__submenu-button"
            aria-label="Open journal from your Quest Compass"
            onClick={onOpenJournal}
          >
            <span className="mobile-menu-overlay__submenu-icon" aria-hidden="true">📝</span>
            <span>Open journal</span>
          </button>
        </div>
      </div>
      {selectedForceDetail ? (
        <ForceDetailSheet
          detail={selectedForceDetail}
          onClose={() => setSelectedForceKey(null)}
          onAskAiGuide={onAskAiGuide}
          onRefreshAlignment={onRefreshAlignment}
          onStartNextQuest={onStartNextQuest}
          onOpenGoals={onOpenGoals}
        />
      ) : null}
    </div>
  );
}

function CompassSpotlightCard({
  label,
  force,
  fallback,
}: {
  label: string;
  force: QuestCompassForceScore | null;
  fallback: string;
}) {
  return (
    <article className="quest-compass__spotlight-card">
      <span className="quest-compass__signal-label">{label}</span>
      {force ? (
        <>
          <strong>
            {force.icon} {force.name} · {force.scoreLabel}
          </strong>
          <p>{force.prompt}</p>
        </>
      ) : (
        <p>{fallback}</p>
      )}
    </article>
  );
}

function ForceDetailSheet({
  detail,
  onClose,
  onAskAiGuide,
  onRefreshAlignment,
  onStartNextQuest,
  onOpenGoals,
}: {
  detail: QuestCompassForceDetail;
  onClose: () => void;
  onAskAiGuide: () => void;
  onRefreshAlignment: () => void;
  onStartNextQuest: (initialDomainKey?: LifeWheelCategoryKey) => void;
  onOpenGoals: () => void;
}) {
  const { force, relatedGoals, supportingHabits, recommendedAction } = detail;
  const handlePrimaryAction = () => {
    if (recommendedAction.type === 'refresh_alignment') {
      onRefreshAlignment();
      return;
    }
    if (recommendedAction.type === 'goal_step') {
      onOpenGoals();
      return;
    }
    onStartNextQuest(recommendedAction.categoryKey ?? getPrimaryCategoryForForce(force.key));
  };

  return (
    <div className="quest-compass-detail" role="dialog" aria-modal="true" aria-label={`${force.name} details`}>
      <button
        type="button"
        className="quest-compass-detail__backdrop"
        aria-label={`Close ${force.name} details`}
        onClick={onClose}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          onClose();
        }}
      />
      <div className={`quest-compass-detail__sheet quest-compass-detail__sheet--${force.key}`}>
        <div className="quest-compass-detail__handle" aria-hidden="true" />
        <div className="quest-compass-detail__header">
          <div className="quest-compass-detail__title">
            <span className="quest-compass-detail__icon" aria-hidden="true">{force.icon}</span>
            <div>
              <h3>{force.name}</h3>
              <p>Score: {force.scoreLabel} · Trend: {force.trendLabel}</p>
            </div>
          </div>
          <button type="button" className="quest-compass-detail__close" onClick={onClose} aria-label="Close force details">
            ✕
          </button>
        </div>

        <div className={`quest-compass-detail__health quest-compass-detail__health--${force.healthStatus}`}>
          {force.healthLabel}
        </div>

        <section className="quest-compass-detail__section">
          <h4>{force.name} represents</h4>
          <div className="quest-compass-detail__chips">
            {force.description.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </section>

        <section className="quest-compass-detail__section">
          <h4>What’s influencing this?</h4>
          <ul className="quest-compass-detail__list">
            {force.contributingCategories.map((category) => (
              <li key={category.key}>
                <span>{category.label}</span>
                <strong>{category.scoreLabel}</strong>
              </li>
            ))}
          </ul>
        </section>

        <section className="quest-compass-detail__section">
          <h4>Related Goals</h4>
          {relatedGoals.length ? (
            <ul className="quest-compass-detail__stack-list">
              {relatedGoals.map((goal) => (
                <li key={goal.id}>
                  <strong>{goal.title}</strong>
                  <span>{goal.statusLabel}</span>
                  {goal.progressLabel ? <small>Progress: {goal.progressLabel}</small> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="quest-compass-detail__empty">No active goals supporting this force yet.</p>
          )}
        </section>

        <section className="quest-compass-detail__section">
          <h4>Supporting Habits</h4>
          {supportingHabits.length ? (
            <ul className="quest-compass-detail__stack-list">
              {supportingHabits.map((habit) => (
                <li key={habit.id}>
                  <strong>{habit.emoji ? `${habit.emoji} ` : ''}{habit.title}</strong>
                  <span>{habit.completionLabel}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="quest-compass-detail__empty">No active habits supporting this force.</p>
          )}
        </section>

        <section className="quest-compass-detail__recommendation">
          <span>{recommendedAction.label}</span>
          <strong>{recommendedAction.title}</strong>
          <p>{recommendedAction.description}</p>
          <button type="button" onClick={handlePrimaryAction}>
            {getRecommendationButtonLabel(recommendedAction)}
          </button>
        </section>

        <div className="quest-compass-detail__actions">
          <button type="button" onClick={onAskAiGuide}>Ask AI Guide</button>
          <button type="button" onClick={onRefreshAlignment}>Refresh Alignment</button>
          <button type="button" onClick={() => onStartNextQuest(getPrimaryCategoryForForce(force.key))}>Start Next Quest</button>
          <button type="button" onClick={onOpenGoals}>Open Goals</button>
        </div>
      </div>
    </div>
  );
}

function getRecommendationButtonLabel(action: QuestCompassRecommendedAction): string {
  switch (action.type) {
    case 'goal_step':
      return 'Open Goals';
    case 'refresh_alignment':
      return 'Refresh Alignment';
    case 'quest_habit':
    case 'starter_quest':
      return 'Start Next Quest';
  }
}
