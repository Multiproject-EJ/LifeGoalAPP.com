/**
 * Lightweight feature access resolver.
 */
import {
  getFeatureAvailability,
  type FeatureAccessLevel,
  type FeatureAvailabilityId,
} from '../config/featureAvailability';

export type FeatureAccessActorContext = {
  /**
   * True only after the caller has positively resolved the actor as admin /
   * creator. Omit or pass false while loading to preserve public-safe access.
   */
  isAdminOrCreator?: boolean;
};

/**
 * Returns the effective access level for the actor.
 */
export function resolveFeatureAccess(
  id: FeatureAvailabilityId,
  actor: FeatureAccessActorContext = {},
): FeatureAccessLevel {
  const availability = getFeatureAvailability(id);
  return actor.isAdminOrCreator ? availability.adminAccess : availability.publicAccess;
}

/**
 * Returns the effective access level for a public (non-admin) user.
 * Call this before navigating to a feature from the Score Hub.
 */
export function getPublicAccessLevel(id: FeatureAvailabilityId): FeatureAccessLevel {
  return resolveFeatureAccess(id);
}

/**
 * Returns true when a public user should see the preview overlay instead of
 * entering the feature.
 */
export function isPubliclyGated(id: FeatureAvailabilityId): boolean {
  return getPublicAccessLevel(id) === 'previewOnly';
}
