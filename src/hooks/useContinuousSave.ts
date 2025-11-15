import { useCallback, useEffect, useRef, useState } from 'react';

type ResetKey = string | number | boolean | null | undefined;

type UseContinuousSaveOptions<T> = {
  value: T;
  save: (value: T) => Promise<void>;
  enabled?: boolean;
  debounceMs?: number;
  resetKey?: ResetKey;
  isEqual?: (a: T | null, b: T | null) => boolean;
};

type UseContinuousSaveResult = {
  isSaving: boolean;
  hasPendingChanges: boolean;
  error: string | null;
  flush: () => Promise<void>;
};

const defaultIsEqual = <T,>(a: T | null, b: T | null) => Object.is(a, b);

export function useContinuousSave<T>({
  value,
  save,
  enabled = true,
  debounceMs = 1500,
  resetKey,
  isEqual = defaultIsEqual,
}: UseContinuousSaveOptions<T>): UseContinuousSaveResult {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<T | null>(null);
  const lastSavedRef = useRef<T | null>(null);
  const initializedRef = useRef(false);
  const resetTrackerRef = useRef<ResetKey>(resetKey);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const runSave = useCallback(
    async (valueToSave: T) => {
      if (!enabled) return;
      clearTimer();
      pendingRef.current = null;
      setIsSaving(true);
      setError(null);
      try {
        await save(valueToSave);
        lastSavedRef.current = valueToSave;
        setHasPendingChanges(false);
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : 'Unable to save your changes automatically.';
        setError(message);
        throw caught;
      } finally {
        setIsSaving(false);
      }
    },
    [clearTimer, enabled, save],
  );

  const flush = useCallback(async () => {
    if (!enabled) return;
    const pendingValue = pendingRef.current;
    if (pendingValue == null) {
      clearTimer();
      return;
    }
    await runSave(pendingValue);
  }, [clearTimer, enabled, runSave]);

  useEffect(() => {
    if (!enabled) {
      clearTimer();
      pendingRef.current = null;
      setHasPendingChanges(false);
      return;
    }

    if (!initializedRef.current || resetTrackerRef.current !== resetKey) {
      initializedRef.current = true;
      resetTrackerRef.current = resetKey;
      lastSavedRef.current = value;
      pendingRef.current = null;
      setHasPendingChanges(false);
      clearTimer();
    }
  }, [enabled, resetKey, value, clearTimer]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (lastSavedRef.current !== null && isEqual(value, lastSavedRef.current)) {
      pendingRef.current = null;
      setHasPendingChanges(false);
      clearTimer();
      return;
    }

    pendingRef.current = value;
    setHasPendingChanges(true);
    clearTimer();

    timerRef.current = setTimeout(() => {
      if (pendingRef.current == null) {
        return;
      }
      void runSave(pendingRef.current);
    }, debounceMs);

    return () => {
      clearTimer();
    };
  }, [value, enabled, debounceMs, isEqual, clearTimer, runSave]);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    isSaving,
    hasPendingChanges,
    error,
    flush,
  };
}
