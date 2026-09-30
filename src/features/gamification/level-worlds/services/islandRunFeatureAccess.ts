import { resolveOpeningGamesAccess, resolveOpeningGamesCeremony, usesOpeningGamesCampaign } from './islandRunOpeningGames';
import type { IslandRunSignatureMissionProgressByIsland } from './islandRunSignatureMissions';
import { isVaultIslandCollectionUnlocked } from './islandRunVaultCollection';

/** This policy never enrols a save or infers its cohort from island progress. */
export interface IslandRunFeatureAccessContext {
  currentIslandNumber: number;
  signatureMissionProgressByIsland?: IslandRunSignatureMissionProgressByIsland;
}

/** The Puzzle Collection opens on Island 015 for every save (user request
 * 2026-09-30); traffic lights keep their own Island 003 introduction. */
export const GRADUAL_PUZZLE_INTRODUCTION_ISLAND = 15;
export const GRADUAL_TRAFFIC_LIGHT_INTRODUCTION_ISLAND = 3;
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
    // The caretaker is a story actor, not a persistent board NPC. Island008's
    // Compass handover owns his future ceremony-only presentation separately.
    caretakerBoard: false,
    arenaOrientation: gradual && island === 1,
    welcomeCheckIn: validIsland && island < GRADUAL_EGG_INTRODUCTION_ISLAND,
    // Presentation, progress accumulation and claims share this policy.
    rewardChannel: validIsland && !beginnerIsland && (!gradual || (island >= 2 && ceremony.beaconLitAtMs !== null)),
    eventLauncher: validIsland && !beginnerIsland && (!gradual || (island >= 2 && (games.ordinaryEvents || games.inauguralRound))),
    ordinaryEvents: validIsland && !beginnerIsland && (!gradual || (island >= 2 && games.ordinaryEvents)),
    inauguralRound: gradual && validIsland && games.inauguralRound,
    puzzleCollection: !Number.isFinite(context.currentIslandNumber) ? !gradual : island >= GRADUAL_PUZZLE_INTRODUCTION_ISLAND,
    trafficLight: !beginnerIsland && (!gradual || island >= GRADUAL_TRAFFIC_LIGHT_INTRODUCTION_ISLAND),
    eggs: island >= GRADUAL_EGG_INTRODUCTION_ISLAND,
    dailyWheel: !beginnerIsland && (!gradual || vault),
    vault,
  } as const;
}
