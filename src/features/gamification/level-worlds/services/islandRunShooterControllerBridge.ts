import type { IslandRunControllerInputProvider, IslandRunControllerIntent } from './islandRunMinigameTypes';

export interface ShooterControllerBridge {
  controllerInput: IslandRunControllerInputProvider;
  emit: (intent: IslandRunControllerIntent) => void;
  reset: () => void;
  listenerCount: () => number;
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
