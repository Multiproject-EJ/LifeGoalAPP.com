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
}

export function LevelWorldsHub({
  session,
  onClose,
  initialPanel = 'default',
  showTopBackButton = true,
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
      {showTopBackButton ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Back to main app"
          className="level-worlds-island-run-shell__back-button level-worlds-island-run-shell__back-button--top"
        >
          ← Back
        </button>
      ) : null}
      <IslandRunBoardPrototype session={session} initialPanel={initialPanel} />
    </div>
  );
}
