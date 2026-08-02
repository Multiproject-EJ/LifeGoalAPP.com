// LevelWorldsHub Component
// Main entry point for Level Worlds campaign mode

import { useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { IslandRunBoardPrototype } from './components/IslandRunBoardPrototype';
import { logIslandRunEntryDebug } from './services/islandRunEntryDebug';
import type { IslandRunGuestClaimSource } from './services/islandRunGuestClaimService';

import './LevelWorlds.css';

interface LevelWorldsHubProps {
  session: Session;
  onClose: () => void;
  initialPanel?: 'default' | 'sanctuary';
  showTopBackButton?: boolean;
  isAdmin?: boolean;
  onOpenSaveAccountSignup?: (source?: IslandRunGuestClaimSource) => void;
  onOpenDailySpinWheel?: () => void;
  dailySpinAvailable?: boolean;
  dailySpinCount?: number;
  isPro?: boolean;
}

export function LevelWorldsHub({
  session,
  onClose,
  initialPanel = 'default',
  showTopBackButton = false,
  isAdmin = false,
  onOpenSaveAccountSignup,
  onOpenDailySpinWheel,
  dailySpinAvailable = false,
  dailySpinCount = 0,
  isPro = false,
}: LevelWorldsHubProps) {
  const userId = session.user.id;

  useEffect(() => {
    logIslandRunEntryDebug('level_worlds_hub_mount', {
      userId,
      isIslandRunPrototype: true,
    });

    return () => {
      logIslandRunEntryDebug('level_worlds_hub_unmount', {
        userId,
      });
    };
  }, [userId]);

  return (
    <div className="level-worlds-island-run-shell">
      <IslandRunBoardPrototype
        session={session}
        initialPanel={initialPanel}
        onExitBoard={onClose}
        showTopBackButton={showTopBackButton}
        isAdmin={isAdmin}
        onOpenSaveAccountSignup={onOpenSaveAccountSignup}
        onOpenDailySpinWheel={onOpenDailySpinWheel}
        dailySpinAvailable={dailySpinAvailable}
        dailySpinCount={dailySpinCount}
        isPro={isPro}
      />
    </div>
  );
}
