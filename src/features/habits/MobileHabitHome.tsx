import type { Session } from '@supabase/supabase-js';
import type { ProfileStrengthSignalSnapshot } from '../profile-strength/profileStrengthData';
import type { ProfileStrengthResult } from '../profile-strength/profileStrengthTypes';
import { DailyHabitTracker } from './DailyHabitTracker';
import type { ArchetypeHand } from '../identity/archetypes/archetypeHandBuilder';
import type { ActiveAdventMetaResult } from '../../services/treatCalendarService';

type MobileHabitHomeProps = {
  session: Session;
  showPointsBadges?: boolean;
  onVisionRewardOpenChange?: (isOpen: boolean) => void;
  profileStrengthSnapshot?: ProfileStrengthResult | null;
  profileStrengthSignals?: ProfileStrengthSignalSnapshot | null;
  personalitySummary?: string | null;
  onOpenDailyTreat?: () => void;
  onOpenHolidayCalendar?: () => void;
  onOpenIslandRunStop?: (stopId: 'boss' | 'hatchery' | 'dynamic') => void;
  onOpenDailySpinWheel?: () => void;
  forceCompactView?: boolean;
  preferredCompactView?: boolean;
  hideTimeBoundOffers?: boolean;
  activeHolidaySeason?: ActiveAdventMetaResult | null;
  hasOpenedDailyTreatsToday?: boolean;
  hasOpenedHolidayCalendarToday?: boolean;
  hiddenHabitIds?: string[];
  onHideStandaloneHabitsChange?: (habitIds: string[]) => void;
  onOpenStarterQuest?: () => void;
  archetypeHand?: ArchetypeHand | null;
};

export function MobileHabitHome({
  session,
  showPointsBadges = false,
  onVisionRewardOpenChange,
  profileStrengthSnapshot,
  profileStrengthSignals,
  personalitySummary,
  onOpenDailyTreat,
  onOpenHolidayCalendar,
  onOpenIslandRunStop,
  onOpenDailySpinWheel,
  forceCompactView = false,
  preferredCompactView,
  hideTimeBoundOffers = false,
  activeHolidaySeason = null,
  hasOpenedDailyTreatsToday = false,
  hasOpenedHolidayCalendarToday = false,
  hiddenHabitIds = [],
  onHideStandaloneHabitsChange,
  onOpenStarterQuest,
  archetypeHand,
}: MobileHabitHomeProps) {
  void onHideStandaloneHabitsChange;
  return (
    <div className="mobile-habit-home">
      <DailyHabitTracker
        session={session}
        variant="compact"
        showPointsBadges={showPointsBadges}
        onVisionRewardOpenChange={onVisionRewardOpenChange}
        profileStrengthSnapshot={profileStrengthSnapshot}
        profileStrengthSignals={profileStrengthSignals}
        personalitySummary={personalitySummary}
        onOpenDailyTreat={onOpenDailyTreat}
        onOpenHolidayCalendar={onOpenHolidayCalendar}
        onOpenIslandRunStop={onOpenIslandRunStop}
        onOpenDailySpinWheel={onOpenDailySpinWheel}
        forceCompactView={forceCompactView}
        preferredCompactView={preferredCompactView}
        hideTimeBoundOffers={hideTimeBoundOffers}
        activeHolidaySeason={activeHolidaySeason}
        hasOpenedDailyTreatsToday={hasOpenedDailyTreatsToday}
        hasOpenedHolidayCalendarToday={hasOpenedHolidayCalendarToday}
        hiddenHabitIds={hiddenHabitIds}
        collapseCheckboxUntilExpanded
        onOpenStarterQuest={onOpenStarterQuest}
        archetypeHand={archetypeHand}
      />
    </div>
  );
}
