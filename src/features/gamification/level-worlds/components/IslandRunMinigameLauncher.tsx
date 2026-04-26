import React, { Suspense } from 'react';
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

  if (!entry) {
    // Safe fallback: unknown minigame stays in-board and offers explicit close.
    return (
      <LauncherFallback
        title="🎮 Minigame Unavailable"
        body={`Minigame "${minigameId}" is missing. This safe placeholder keeps you inside Island Run.`}
        ctaLabel="Close and return to board"
        onClose={() => onComplete({ completed: false })}
      />
    );
  }

  const Component = entry.component;
  return (
    <LauncherErrorBoundary
      minigameId={minigameId}
      onClose={() => onComplete({ completed: false })}
      key={minigameId}
    >
      <Suspense
        fallback={(
          <LauncherFallback
            title="⏳ Loading minigame..."
            body={`Preparing "${minigameId}". If this takes too long, close and return to the board.`}
            ctaLabel="Close and return to board"
            onClose={() => onComplete({ completed: false })}
          />
        )}
      >
        <Component
          islandNumber={islandNumber}
          ticketBudget={ticketBudget}
          controllerInput={controllerInput}
          launchConfig={launchConfig}
          onComplete={onComplete}
        />
      </Suspense>
    </LauncherErrorBoundary>
  );
}
