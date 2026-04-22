import type { IslandRunControllerInputProvider, IslandRunControllerIntent } from './islandRunMinigameTypes';

export interface ShooterControllerBridge {
  controllerInput: IslandRunControllerInputProvider;
  emit: (intent: IslandRunControllerIntent) => void;
  reset: () => void;
  listenerCount: () => number;
}

export function mapKeyboardEventToShooterIntent(key: string): IslandRunControllerIntent | null {
  if (key === 'ArrowLeft') return 'left';
  if (key === 'ArrowRight') return 'right';
  if (key === ' ' || key === 'Space' || key === 'Spacebar') return 'fire';
  return null;
}

export function bindKeyboardToShooterBridge(
  bridge: Pick<ShooterControllerBridge, 'emit'>,
  target: Pick<Window, 'addEventListener' | 'removeEventListener'>,
): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    const intent = mapKeyboardEventToShooterIntent(event.key);
    if (!intent) return;

    event.preventDefault();
    bridge.emit(intent);
  };

  target.addEventListener('keydown', onKeyDown);
  return () => {
    target.removeEventListener('keydown', onKeyDown);
  };
}

export function createShooterControllerBridge(): ShooterControllerBridge {
  const listeners = new Set<(intent: IslandRunControllerIntent) => void>();

  return {
    controllerInput: {
      subscribe(listener) {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    },
    emit(intent) {
      listeners.forEach((listener) => listener(intent));
    },
    reset() {
      listeners.clear();
    },
    listenerCount() {
      return listeners.size;
    },
  };
}
