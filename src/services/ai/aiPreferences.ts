/**
 * The player's AI choices, set in Settings → AI & privacy and kept on this
 * device. The shared AI runtime reads them on every request:
 *
 * - `aiEnabled`: AI suggestions at all (on-device or cloud). Off means every
 *   feature shows its written fallback.
 * - `cloudFallback`: whether a task may go to the cloud (`ai-task` edge
 *   function) when on-device AI is unavailable or the task is cloud-only.
 *   Off means no text from these features ever leaves the device.
 */

export type AiPreferences = {
  aiEnabled: boolean;
  cloudFallback: boolean;
};

const STORAGE_KEY = 'lifegoal.ai.preferences.v1';
const CHANGE_EVENT = 'lifegoal:ai-preferences-changed';
const DEFAULTS: AiPreferences = { aiEnabled: true, cloudFallback: true };

let memoryOverride: AiPreferences | null = null;

export function getAiPreferences(): AiPreferences {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<AiPreferences>;
    return {
      aiEnabled: typeof parsed.aiEnabled === 'boolean' ? parsed.aiEnabled : DEFAULTS.aiEnabled,
      cloudFallback: typeof parsed.cloudFallback === 'boolean' ? parsed.cloudFallback : DEFAULTS.cloudFallback,
    };
  } catch {
    return DEFAULTS;
  }
}

export function setAiPreferences(patch: Partial<AiPreferences>): AiPreferences {
  const next = { ...readAiPreferences(), ...patch };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    memoryOverride = null;
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }));
  } catch {
    // Storage can be unavailable (private mode); the choice then lasts for this page only.
    memoryOverride = next;
  }
  return next;
}

/** Current preferences, including a choice that could not be written to storage. */
export function readAiPreferences(): AiPreferences {
  return memoryOverride ?? getAiPreferences();
}

export function subscribeToAiPreferences(listener: (preferences: AiPreferences) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handler = () => listener(readAiPreferences());
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
