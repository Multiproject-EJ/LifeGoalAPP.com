import React, { Suspense, useEffect, useRef, useState } from 'react';
import { getMinigame } from '../services/islandRunMinigameRegistry';
import type {
  IslandRunControllerInputProvider,
  IslandRunMinigameResult,
} from '../services/islandRunMinigameTypes';
import type { ErrorInfo, ReactNode } from 'react';

interface IslandRunMinigameLauncherProps {
  minigameId: string;
  islandNumber: number;
  ticketBudget?: number;
  controllerInput?: IslandRunControllerInputProvider;
  launchConfig?: Record<string, unknown>;
  onComplete: (result: IslandRunMinigameResult) => void;
}

function LauncherFallback(props: {
  title: string;
  body: string;
  ctaLabel: string;
  onClose: () => void;
}) {
  return (
    <div style={{ color: '#fff', padding: '2rem', textAlign: 'center', background: 'rgba(5, 10, 24, 0.92)', minHeight: '100%' }}>
      <h3 style={{ marginTop: 0 }}>{props.title}</h3>
      <p>{props.body}</p>
      <button onClick={props.onClose}>{props.ctaLabel}</button>
    </div>
  );
}

interface LauncherErrorBoundaryProps {
  children: ReactNode;
  onClose: () => void;
  minigameId: string;
}

interface LauncherErrorBoundaryState {
  hasError: boolean;
}

class LauncherErrorBoundary extends React.Component<LauncherErrorBoundaryProps, LauncherErrorBoundaryState> {
  constructor(props: LauncherErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): LauncherErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('IslandRunMinigameLauncher render failed:', this.props.minigameId, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <LauncherFallback
          title="🎮 Minigame Unavailable"
          body={`Minigame "${this.props.minigameId}" failed to load. This safe fallback keeps you inside Island Run.`}
          ctaLabel="Close and return to board"
          onClose={this.props.onClose}
        />
      );
    }
    return this.props.children;
  }
}

export function IslandRunMinigameLauncher({
  minigameId,
  islandNumber,
  ticketBudget,
  controllerInput,
  launchConfig,
  onComplete,
}: IslandRunMinigameLauncherProps) {
  const entry = getMinigame(minigameId);
  const gameManagesArenaTimer = launchConfig?.arenaTimerManagedByGame === true;
  const sessionSeconds = !gameManagesArenaTimer && typeof launchConfig?.arenaSessionSeconds === 'number'
    ? Math.max(1, Math.floor(launchConfig.arenaSessionSeconds))
    : null;
  const sessionPace = launchConfig?.arenaSessionPace === 'flash'
    || launchConfig?.arenaSessionPace === 'fast'
    || launchConfig?.arenaSessionPace === 'full'
    ? launchConfig.arenaSessionPace
    : null;
  const [secondsRemaining, setSecondsRemaining] = useState(sessionSeconds);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    completedRef.current = false;
    setSecondsRemaining(sessionSeconds);
  }, [minigameId, sessionSeconds]);

  useEffect(() => {
    if (sessionSeconds === null) return undefined;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      const next = Math.max(0, sessionSeconds - elapsedSeconds);
      setSecondsRemaining(next);
      if (next === 0 && !completedRef.current) {
        completedRef.current = true;
        window.clearInterval(timer);
        onCompleteRef.current({ completed: false });
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [minigameId, sessionSeconds]);

  const completeOnce = (result: IslandRunMinigameResult) => {
    if (completedRef.current) return;
    completedRef.current = true;
    onCompleteRef.current(result);
  };

  if (!entry) {
    // Safe fallback: unknown minigame stays in-board and offers explicit close.
    return (
      <LauncherFallback
        title="🎮 Minigame Unavailable"
        body={`Minigame "${minigameId}" is missing. This safe placeholder keeps you inside Island Run.`}
        ctaLabel="Close and return to board"
        onClose={() => completeOnce({ completed: false })}
      />
    );
  }

  const Component = entry.component;
  const isWorkshop = minigameId === 'island_workshop';
  const isIslandConcourse = minigameId === 'journey_disc_arena';
  return (
    <div className={`arena-session-shell${sessionPace ? ` arena-session-shell--${sessionPace}` : ''}${isWorkshop ? ' arena-session-shell--workshop' : ''}${isIslandConcourse ? ' arena-session-shell--island-concourse' : ''}`}>
      {sessionPace && !gameManagesArenaTimer ? (
        <div className="arena-session-pacing" role="status" aria-live="polite">
          <span>{sessionPace === 'full' ? 'Full mission' : sessionPace === 'fast' ? 'Quick fight' : 'Flash fight'}</span>
          <strong>{secondsRemaining === null ? 'Open play' : `${secondsRemaining}s`}</strong>
        </div>
      ) : null}
      <div className="arena-session-shell__game">
        <LauncherErrorBoundary
          minigameId={minigameId}
          onClose={() => completeOnce({ completed: false })}
          key={minigameId}
        >
          <Suspense
            fallback={(
              <LauncherFallback
                title="⏳ Loading minigame..."
                body={`Preparing "${minigameId}". If this takes too long, close and return to the board.`}
                ctaLabel="Close and return to board"
                onClose={() => completeOnce({ completed: false })}
              />
            )}
          >
            <Component
              islandNumber={islandNumber}
              ticketBudget={ticketBudget}
              controllerInput={controllerInput}
              launchConfig={launchConfig}
              onComplete={completeOnce}
            />
          </Suspense>
        </LauncherErrorBoundary>
      </div>
    </div>
  );
}
