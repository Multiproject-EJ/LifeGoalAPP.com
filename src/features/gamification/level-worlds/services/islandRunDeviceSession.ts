const STORAGE_KEY_PREFIX = 'island_run_device_session_id';

function buildStorageKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}_${userId}`;
}

function createDeviceSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `island-run-device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getIslandRunDeviceSessionId(userId: string): string {
  if (!userId) {
    return createDeviceSessionId();
  }

  if (typeof window === 'undefined') {
    return createDeviceSessionId();
  }

  const storageKey = buildStorageKey(userId);

  try {
    const existing = window.localStorage.getItem(storageKey);
    if (existing && existing.trim().length > 0) {
      return existing;
    }

    const next = createDeviceSessionId();
    window.localStorage.setItem(storageKey, next);
    return next;
  } catch {
    return createDeviceSessionId();
  }
}
