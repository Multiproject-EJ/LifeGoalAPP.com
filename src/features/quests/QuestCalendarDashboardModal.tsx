import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '../../utils/scrollLock';
import type { Quest } from './questModel';
import { QuestCircularCalendar } from './QuestCircularCalendar';
import './QuestCalendarDashboardModal.css';

type DashboardGoal = {
  id: string;
  title: string;
  startsOn: string | null;
  targetDate: string | null;
};

type DashboardCampaign = {
  id: string;
  title: string;
  startsOn: string | null;
  endsOn: string | null;
  active: boolean;
};

type QuestCalendarDashboardModalProps = {
  open: boolean;
  referenceDate: string;
  goals: DashboardGoal[];
  campaigns: DashboardCampaign[];
  quests: Quest[];
  onClose: () => void;
  onCreateQuest: () => void;
  onOpenCampaign: () => void;
};

export function QuestCalendarDashboardModal({
  open,
  referenceDate,
  goals,
  campaigns,
  quests,
  onClose,
  onCreateQuest,
  onOpenCampaign,
}: QuestCalendarDashboardModalProps) {
  useEffect(() => {
    if (!open) return undefined;
    return lockPageScroll();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open || typeof document === 'undefined') return null;

  const activeQuests = quests.filter((quest) => quest.status === 'active');
  const activeCampaign = campaigns.find((campaign) => campaign.active) ?? campaigns[0] ?? null;

  return createPortal(
    <div className="quest-calendar-dashboard" role="presentation" onClick={onClose}>
      <div
        className="quest-calendar-dashboard__surface"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quest-calendar-dashboard-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="quest-calendar-dashboard__header">
          <div>
            <p>Chapter dashboard</p>
            <h2 id="quest-calendar-dashboard-title">See the whole journey</h2>
            <span>Your Goals set the horizon, Campaign sets the season, and Quests make the next steps visible.</span>
          </div>
          <button type="button" onClick={onClose} autoFocus aria-label="Close chapter dashboard">✕</button>
        </header>

        <div className="quest-calendar-dashboard__summary" aria-label="Chapter overview">
          <article>
            <span>◎</span>
            <div><strong>{goals.length}</strong><small>{goals.length === 1 ? 'Goal on the horizon' : 'Goals on the horizon'}</small></div>
          </article>
          <article>
            <span>⚑</span>
            <div><strong>{activeCampaign?.title ?? 'No campaign yet'}</strong><small>{activeCampaign ? 'Current season' : 'Choose a focused chapter'}</small></div>
          </article>
          <article>
            <span>✦</span>
            <div><strong>{activeQuests.length}</strong><small>{activeQuests.length === 1 ? 'Active Quest' : 'Active Quests'}</small></div>
          </article>
        </div>

        <div className="quest-calendar-dashboard__content">
          <QuestCircularCalendar
            referenceDate={referenceDate}
            goals={goals}
            campaigns={campaigns}
            quests={quests}
          />
        </div>

        <footer className="quest-calendar-dashboard__actions">
          <button type="button" className="quest-calendar-dashboard__secondary" onClick={onOpenCampaign}>
            ⚑ {activeCampaign ? 'Open Campaign HQ' : 'Start a Campaign'}
          </button>
          <button type="button" className="quest-calendar-dashboard__primary" onClick={onCreateQuest}>
            ✦ Forge a Quest
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
