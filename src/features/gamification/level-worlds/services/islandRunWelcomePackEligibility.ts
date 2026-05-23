import type { IslandRunGameStateRecord } from './islandRunGameStateStore';

export type WelcomePackEligibility = 'eligible' | 'already_claimed';

export function isWelcomePackClaimed(record: Pick<IslandRunGameStateRecord, 'welcomePackClaimed'>): boolean {
  return record.welcomePackClaimed;
}

export function getWelcomePackEligibility(
  record: Pick<IslandRunGameStateRecord, 'welcomePackClaimed'>,
): WelcomePackEligibility {
  return isWelcomePackClaimed(record) ? 'already_claimed' : 'eligible';
}
