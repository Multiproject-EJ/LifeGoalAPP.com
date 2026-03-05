import { useState } from 'react';

/**
 * Like useState but the value is kept in localStorage under `key`.
 * Falls back to in-memory state when storage is unavailable.
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T,
): [T, (value: T) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        return JSON.parse(raw) as T;
      }
    } catch {
      // Storage unavailable or parse error — use default.
    }
    return defaultValue;
  });

  const set = (value: T) => {
    setState(value);
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage unavailable — keep in-memory state only.
    }
  };

  return [state, set];
}
