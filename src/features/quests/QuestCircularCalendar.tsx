import { useMemo, type CSSProperties } from 'react';
import type { Quest } from './questModel';
import { buildCircularCalendarDays } from './questModel';
import './QuestCircularCalendar.css';

type CalendarGoal = {
  id: string;
  title: string;
  startsOn: string | null;
  targetDate: string | null;
};

type CalendarCampaign = {
  id: string;
  title: string;
  startsOn: string | null;
  endsOn: string | null;
  active: boolean;
};

type QuestCircularCalendarProps = {
  referenceDate: string;
  goals: CalendarGoal[];
  campaigns: CalendarCampaign[];
  quests: Quest[];
  onCreateQuest?: () => void;
};

export function QuestCircularCalendar({
  referenceDate,
  goals,
  campaigns,
  quests,
  onCreateQuest,
}: QuestCircularCalendarProps) {
  const days = useMemo(() => buildCircularCalendarDays(referenceDate, {
    goals,
    campaigns,
    quests,
  }), [campaigns, goals, quests, referenceDate]);
  const goalById = useMemo(() => new Map(goals.map((goal) => [goal.id, goal])), [goals]);
  const campaignById = useMemo(() => new Map(campaigns.map((item) => [item.id, item])), [campaigns]);
  const questById = useMemo(() => new Map(quests.map((quest) => [quest.id, quest])), [quests]);
  const reference = new Date(`${referenceDate}T12:00:00`);
  const dateLabel = reference.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const activeQuestCount = quests.filter((quest) => quest.status === 'active').length;

  return (
    <div className="quest-ring-container">
      <section className="quest-ring" aria-label="Goal, campaign, and quest calendar">
        <div className="quest-ring__copy">
          <div>
            <p className="quest-ring__eyebrow">The next chapter</p>
            <h3>Circular calendar</h3>
          </div>
          <p>See long-term Goal milestones, your current Campaign season, and every active Quest on one 28-day ring.</p>
          {onCreateQuest ? (
            <button type="button" className="quest-ring__create" onClick={onCreateQuest}>＋ Forge a Quest</button>
          ) : null}
        </div>
        <div className="quest-ring__layout">
          <div className="quest-ring__orbit" aria-label="28 day calendar ring">
            <div className="quest-ring__center">
              <strong>{dateLabel}</strong>
              <span>{activeQuestCount} active {activeQuestCount === 1 ? 'quest' : 'quests'}</span>
            </div>
            {days.map((day, index) => {
              const angle = (360 / days.length) * index;
              const goalLabels = [...day.goalStartIds, ...day.goalTargetIds]
                .map((id) => goalById.get(id)?.title)
                .filter(Boolean);
              const questLabels = day.questIds.map((id) => questById.get(id)?.title).filter(Boolean);
              const campaignLabels = day.campaignIds.map((id) => campaignById.get(id)?.title).filter(Boolean);
              const titleParts = [
                day.date,
                goalLabels.length ? `Goal: ${goalLabels.join(', ')}` : '',
                campaignLabels.length ? `Campaign: ${campaignLabels.join(', ')}` : '',
                questLabels.length ? `Quest: ${questLabels.join(', ')}` : '',
              ].filter(Boolean);
              return (
                <span
                  key={day.date}
                  className={`quest-ring__day${day.isToday ? ' quest-ring__day--today' : ''}`}
                  style={{ '--quest-ring-angle': `${angle}deg` } as CSSProperties}
                  title={titleParts.join('\n')}
                  aria-label={titleParts.join('. ')}
                >
                  <span className="quest-ring__day-number">{day.dayNumber}</span>
                  <span className="quest-ring__signals" aria-hidden="true">
                    {day.campaignIds.length ? <i className="quest-ring__signal quest-ring__signal--campaign" /> : null}
                    {day.questIds.length ? <i className="quest-ring__signal quest-ring__signal--quest" /> : null}
                    {(day.goalStartIds.length || day.goalTargetIds.length) ? <i className="quest-ring__signal quest-ring__signal--goal" /> : null}
                  </span>
                </span>
              );
            })}
          </div>
          <div className="quest-ring__legend">
            <span><i className="quest-ring__signal quest-ring__signal--goal" /> Goal milestone</span>
            <span><i className="quest-ring__signal quest-ring__signal--campaign" /> Campaign days</span>
            <span><i className="quest-ring__signal quest-ring__signal--quest" /> Quest days</span>
          </div>
        </div>
      </section>
    </div>
  );
}
