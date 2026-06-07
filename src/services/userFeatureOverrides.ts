/**
 * Per-user localStorage overrides for demo feature unlocks.
 * When a user enables a demo feature toggle in the Experiments modal, the
 * feature's access level is treated as admin-open for that user on this device.
 */
import type { FeatureAvailabilityId } from '../config/featureAvailability';

export const USER_FEATURE_OVERRIDES_UPDATED_EVENT = 'lifegoal:user-feature-overrides-updated';

const STORAGE_PREFIX = 'lifegoal_user_feature_overrides';

function getStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

export function getUserEnabledFeatures(userId: string): Set<FeatureAvailabilityId> {
  try {
    const stored = localStorage.getItem(getStorageKey(userId));
    if (!stored) return new Set();
    const parsed = JSON.parse(stored) as string[];
    return new Set(parsed as FeatureAvailabilityId[]);
  } catch {
    return new Set();
  }
}

export function isUserFeatureEnabled(userId: string, featureId: FeatureAvailabilityId): boolean {
  return getUserEnabledFeatures(userId).has(featureId);
}

export function setUserFeatureEnabled(
  userId: string,
  featureId: FeatureAvailabilityId,
  enabled: boolean,
): void {
  const features = getUserEnabledFeatures(userId);
  if (enabled) {
    features.add(featureId);
  } else {
    features.delete(featureId);
  }
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify([...features]));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(USER_FEATURE_OVERRIDES_UPDATED_EVENT, {
          detail: { userId, featureId, enabled },
        }),
      );
    }
  } catch {
    // Ignore storage errors
  }
}
