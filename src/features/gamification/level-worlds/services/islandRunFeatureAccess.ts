import { resolveOpeningGamesAccess, resolveOpeningGamesCeremony, usesOpeningGamesCampaign } from './islandRunOpeningGames';
import type { IslandRunSignatureMissionProgressByIsland } from './islandRunSignatureMissions';
import { isVaultIslandCollectionUnlocked } from './islandRunVaultCollection';

/** This policy never enrols a save or infers its cohort from island progress. */
export interface IslandRunFeatureAccessContext {
  currentIslandNumber: number;
  signatureMissionProgressByIsland?: IslandRunSignatureMissionProgressByIsland;
}

export const GRADUAL_PUZZLE_INTRODUCTION_ISLAND = 3;
export const GRADUAL_EGG_INTRODUCTION_ISLAND = 4;

export function resolveIslandRunFeatureAccess(context: IslandRunFeatureAccessContext) {
  const ledger = context.signatureMissionProgressByIsland ?? {};
  const gradual = usesOpeningGamesCampaign(ledger);
  const island = Number.isFinite(context.currentIslandNumber)
    ? Math.floor(context.currentIslandNumber) : 0;
  const validIsland = island >= 1;
  const games = resolveOpeningGamesAccess(ledger, island);
  const ceremony = resolveOpeningGamesCeremony(ledger);
  const vault = isVaultIslandCollectionUnlocked(ledger);
  return {
    gradual,
    arenaOrientation: gradual && island === 1,
    welcomeCheckIn: gradual && validIsland && island < GRADUAL_EGG_INTRODUCTION_ISLAND,
    // Legacy reward-channel presentation still owns its original Island001
    // tutorial gate. This flag is an additional eligibility condition only.
    rewardChannel: !gradual || (validIsland && island >= 2 && ceremony.beaconLitAtMs !== null),
    eventLauncher: !gradual || (validIsland && island >= 2 && (games.ordinaryEvents || games.inauguralRound)),
    ordinaryEvents: !gradual || (validIsland && island >= 2 && games.ordinaryEvents),
    inauguralRound: gradual && validIsland && games.inauguralRound,
    puzzleCollection: gradual ? island >= GRADUAL_PUZZLE_INTRODUCTION_ISLAND : (!Number.isFinite(context.currentIslandNumber) || island >= 2),
    trafficLight: !gradual || island >= GRADUAL_PUZZLE_INTRODUCTION_ISLAND,
    eggs: !gradual || island >= GRADUAL_EGG_INTRODUCTION_ISLAND,
    dailyWheel: !gradual || vault,
    vault,
  } as const;
}
