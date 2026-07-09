// LevelWorldsHub Component
// Main entry point for Level Worlds campaign mode

import { useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { IslandRunBoardPrototype } from './components/IslandRunBoardPrototype';
import { logIslandRunEntryDebug } from './services/islandRunEntryDebug';

import './LevelWorlds.css';

interface LevelWorldsHubProps {
  session: Session;
  onClose: () => void;
  initialPanel?: 'default' | 'sanctuary';
  showTopBackButton?: boolean;
  isAdmin?: boolean;
  onOpenSaveAccountSignup?: () => void;
}

export function LevelWorldsHub({
  session,
  onClose,
  initialPanel = 'default',
  showTopBackButton = false,
  isAdmin = false,
  onOpenSaveAccountSignup,
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
      />
    </div>
  );
}
