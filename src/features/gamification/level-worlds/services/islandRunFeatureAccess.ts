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
  // Island001 is always the quiet beginner island, including existing saves.
  const beginnerIsland = island === 1;
  const games = resolveOpeningGamesAccess(ledger, island);
  const ceremony = resolveOpeningGamesCeremony(ledger);
  const vault = isVaultIslandCollectionUnlocked(ledger);
  return {
    gradual,
    caretakerBoard: validIsland && island >= 8,
    arenaOrientation: gradual && island === 1,
    welcomeCheckIn: validIsland && island < GRADUAL_EGG_INTRODUCTION_ISLAND,
    // Presentation, progress accumulation and claims share this policy.
    rewardChannel: !beginnerIsland && (!gradual || (validIsland && island >= 2 && ceremony.beaconLitAtMs !== null)),
    eventLauncher: !beginnerIsland && (!gradual || (validIsland && island >= 2 && (games.ordinaryEvents || games.inauguralRound))),
    ordinaryEvents: !gradual || (validIsland && island >= 2 && games.ordinaryEvents),
    inauguralRound: gradual && validIsland && games.inauguralRound,
    puzzleCollection: gradual ? island >= GRADUAL_PUZZLE_INTRODUCTION_ISLAND : (!Number.isFinite(context.currentIslandNumber) || island >= 2),
    trafficLight: !beginnerIsland && (!gradual || island >= GRADUAL_PUZZLE_INTRODUCTION_ISLAND),
    eggs: island >= GRADUAL_EGG_INTRODUCTION_ISLAND,
    dailyWheel: !beginnerIsland && (!gradual || vault),
    vault,
  } as const;
}
