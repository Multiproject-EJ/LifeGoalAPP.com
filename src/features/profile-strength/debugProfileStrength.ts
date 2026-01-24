import type { ProfileStrengthResult } from './profileStrengthTypes';
import { loadProfileStrengthSignals } from './profileStrengthData';
import { scoreProfileStrength } from './scoreProfileStrength';

export const PROFILE_STRENGTH_DEBUG_STORAGE_KEY = 'profileStrengthDebug';

export const isProfileStrengthDebugEnabled = (): boolean => {
  if (!import.meta.env.DEV) {
    return false;
  }
  if (typeof window === 'undefined') {
    return false;
  }
  return window.localStorage.getItem(PROFILE_STRENGTH_DEBUG_STORAGE_KEY) === 'true';
};

export const getProfileStrengthDebugSnapshot = async (
  userId?: string | null,
): Promise<ProfileStrengthResult> => {
  const input = await loadProfileStrengthSignals(userId);
  return scoreProfileStrength(input);
};

export const logProfileStrengthDebugSnapshot = (snapshot: ProfileStrengthResult): void => {
  const summary = {
    overallPercent: snapshot.overallPercent,
    usedFallbackData: snapshot.meta.usedFallbackData,
    globalNextTask: snapshot.globalNextTask,
    areaScores: snapshot.areaScores,
    reasonsByArea: snapshot.reasonsByArea,
  };

  // eslint-disable-next-line no-console
  console.info('[ProfileStrength][debug]', summary);
};
