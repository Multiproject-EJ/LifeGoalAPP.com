import { DEMO_FEATURE_LABEL, getFeatureAvailability, type FeatureAvailabilityId } from '../../config/featureAvailability';
import { resolveFeatureAccess } from '../../services/featureAccess';

export type EnergyMobileTab = 'breathing' | 'meditation' | 'conflict' | 'yoga' | 'food' | 'exercise';
export type EnergyMobileCategory = 'mind' | 'body';
export type EnergyBodyTab = Extract<EnergyMobileTab, 'yoga' | 'food' | 'exercise'>;
export type GatedEnergyMobileTab = Extract<EnergyMobileTab, 'meditation' | 'conflict' | EnergyBodyTab>;

export const ENERGY_MOBILE_CATEGORY_TABS: Record<EnergyMobileCategory, EnergyMobileTab[]> = {
  mind: ['breathing', 'meditation', 'conflict'],
  body: ['yoga', 'food', 'exercise'],
};

export const BODY_TAB_FEATURE_IDS: Record<EnergyBodyTab, FeatureAvailabilityId> = {
  yoga: 'body.yoga',
  food: 'body.food',
  exercise: 'body.exercise',
};

export const GATED_ENERGY_MOBILE_TAB_FEATURE_IDS: Record<GatedEnergyMobileTab, FeatureAvailabilityId> = {
  meditation: 'mind.meditation',
  conflict: 'mind.conflictResolver',
  ...BODY_TAB_FEATURE_IDS,
};

export function getEnergyMobileCategoryForTab(tab: EnergyMobileTab): EnergyMobileCategory {
  if (ENERGY_MOBILE_CATEGORY_TABS.body.includes(tab)) {
    return 'body';
  }
  return 'mind';
}

export function isGatedEnergyMobileTab(tab: EnergyMobileTab | null): tab is GatedEnergyMobileTab {
  return Boolean(tab && tab in GATED_ENERGY_MOBILE_TAB_FEATURE_IDS);
}

export function getEnergyMobileTabFeatureId(tab: EnergyMobileTab): FeatureAvailabilityId | null {
  return isGatedEnergyMobileTab(tab) ? GATED_ENERGY_MOBILE_TAB_FEATURE_IDS[tab] : null;
}

export function getGatedEnergyMobileTabFeatureId(tab: GatedEnergyMobileTab): FeatureAvailabilityId {
  return GATED_ENERGY_MOBILE_TAB_FEATURE_IDS[tab];
}

export function getEnergyMobileTabAccess(tab: EnergyMobileTab, isAdminOrCreator = false) {
  const featureId = getEnergyMobileTabFeatureId(tab);
  if (!featureId) {
    return 'open';
  }

  return resolveFeatureAccess(featureId, { isAdminOrCreator });
}

export function canRenderEnergyMobileTab(tab: EnergyMobileTab, isAdminOrCreator = false): boolean {
  return getEnergyMobileTabAccess(tab, isAdminOrCreator) === 'open';
}

export function getEnergyMobileTabStatusLabel(tab: EnergyMobileTab, isAdminOrCreator = false): string | null {
  const featureId = getEnergyMobileTabFeatureId(tab);
  if (!featureId) {
    return null;
  }

  const availability = getFeatureAvailability(featureId);
  const access = getEnergyMobileTabAccess(tab, isAdminOrCreator);

  if (access === 'previewOnly') {
    return availability.publicLabel ?? DEMO_FEATURE_LABEL;
  }

  if (access === 'open' && !isAdminOrCreator) {
    return null;
  }

  if (isAdminOrCreator && availability.publicAccess !== 'open') {
    return availability.adminLabel ?? 'Demo Mode';
  }

  return null;
}
