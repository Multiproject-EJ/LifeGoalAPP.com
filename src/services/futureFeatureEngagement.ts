import type { FeatureAvailabilityId } from '../config/featureAvailability';

export const FUTURE_FEATURE_ENGAGEMENT_EVENT = 'future-feature-engagement-change';

const SEEN_FUTURE_FEATURES_STORAGE_KEY = 'seenFutureFeatures';

export type FutureFeatureEngagementEventDetail = {
  featureId: FeatureAvailabilityId;
  seen?: boolean;
  voted?: boolean;
};

function isBrowserStorageAvailable() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function dispatchFutureFeatureEngagementChange(detail: FutureFeatureEngagementEventDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<FutureFeatureEngagementEventDetail>(FUTURE_FEATURE_ENGAGEMENT_EVENT, { detail }));
}

export function readSeenFutureFeatures(): Set<FeatureAvailabilityId> {
  if (!isBrowserStorageAvailable()) {
    return new Set();
  }

  try {
    const rawValue = window.localStorage.getItem(SEEN_FUTURE_FEATURES_STORAGE_KEY);
    const parsed = rawValue ? JSON.parse(rawValue) : [];
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.filter((value): value is FeatureAvailabilityId => typeof value === 'string'));
  } catch (error) {
    console.warn('Failed to read seen Future Features:', error);
    return new Set();
  }
}

export function markFutureFeatureSeen(featureId: FeatureAvailabilityId) {
  if (!isBrowserStorageAvailable()) {
    return;
  }

  try {
    const seenFeatures = readSeenFutureFeatures();
    if (seenFeatures.has(featureId)) {
      return;
    }
    seenFeatures.add(featureId);
    window.localStorage.setItem(SEEN_FUTURE_FEATURES_STORAGE_KEY, JSON.stringify([...seenFeatures]));
    dispatchFutureFeatureEngagementChange({ featureId, seen: true });
  } catch (error) {
    console.warn('Failed to mark Future Feature as seen:', error);
  }
}

export function notifyFutureFeatureVoteSaved(featureId: FeatureAvailabilityId) {
  dispatchFutureFeatureEngagementChange({ featureId, voted: true });
}
