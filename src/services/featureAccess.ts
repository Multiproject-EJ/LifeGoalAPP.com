/**
 * Lightweight feature access resolver.
 *
 * Phase 1 (this PR): evaluates publicAccess only.
 * Phase 2 (next PR): add admin / creator / dev actor context and evaluate adminAccess.
 */
import {
  getFeatureAvailability,
  type FeatureAccessLevel,
  type FeatureAvailabilityId,
} from '../config/featureAvailability';

/**
 * Returns the effective access level for a public (non-admin) user.
 * Call this before navigating to a feature from the Score Hub.
 */
export function getPublicAccessLevel(id: FeatureAvailabilityId): FeatureAccessLevel {
  return getFeatureAvailability(id).publicAccess;
}

/**
 * Returns true when a public user should see the preview overlay instead of
 * entering the feature.
 */
export function isPubliclyGated(id: FeatureAvailabilityId): boolean {
  return getPublicAccessLevel(id) === 'previewOnly';
}
