/**
 * The player's AI choices, set in Settings → AI & privacy and kept on this
 * device. The shared AI runtime reads them on every request:
 *
 * - `aiEnabled`: AI suggestions at all (on-device or cloud). Off means every
 *   feature shows its written fallback.
 * - `cloudFallback`: whether AI may use the cloud: the `ai-task` edge
 *   function when on-device AI is unavailable, and the coach chats
 *   (`ai-coach-chat`, `goal-coach-chat`), which only run in the cloud.
 *   Off means none of these send text off the device; the coaches pause.
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

/** Whether cloud AI may be used right now (AI on, and cloud AI allowed). */
export function isCloudAiAllowed(): boolean {
  const preferences = readAiPreferences();
  return preferences.aiEnabled && preferences.cloudFallback;
}

/** Short reason for features that are unavailable while cloud AI is turned off. */
export const CLOUD_AI_OFF_REASON = 'Cloud AI is turned off in Settings → AI & privacy.';

/** Shown by the coach chats while cloud AI is turned off. */
export const CLOUD_AI_OFF_MESSAGE =
  'Cloud AI is turned off in Settings → AI & privacy, so the coach is paused. Turn on "Allow cloud AI" there to chat again.';
