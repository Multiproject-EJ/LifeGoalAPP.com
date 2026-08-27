import type { IslandRunGameStateRecord } from './islandRunGameStateStore';
import { MAX_BUILD_LEVEL } from './islandRunBuildConstants';
import { areAllEggSlotsTerminalForIsland } from './islandRunEggMania';
import {
  getIslandMissionBriefingPresentation,
  type IslandMissionBriefingPresentation,
} from './islandRunMissionBriefing';
import {
  CACTUS_CANYON_SPIRAL_MAX_SEGMENTS,
  CELESTIAL_REDOCKING_PLATFORM_COUNT,
  CELESTIAL_REDOCKING_ROLL_TARGET,
  FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET,
  FROSTWELL_DEPTH_METERS,
  FISHERMANS_VILLAGE_FISH_TARGET_KG,
  ROOTHEART_POWER_COMPONENTS,
  ROOTHEART_POWERWORKS_MAX_STAGE,
  SUNKEN_SANDS_TREASURE_ROLL_TARGET,
  getCelestialRedockingDockedPlatformCount,
  resolveCactusCanyonSpiralProgress,
  resolveCelestialRedockingProgress,
  resolveFirstLightAssemblyCraterProgress,
  resolveFrostwellIceworksProgress,
  resolveFishermansVillageFishingProgress,
  resolveRootheartPowerworksProgress,
  resolveSunkenSandsTreasureProgress,
} from './islandRunSignatureMissions';

export const ISLAND_MISSION_TRACKER_REGISTRY_VERSION = 1 as const;

export interface IslandMissionTrackerObjective {
  label: string;
  value: number;
  target: number;
  displayValue?: string;
  completeLabel: string;
}

export interface IslandMissionTrackerPresentation {
  registryVersion: typeof ISLAND_MISSION_TRACKER_REGISTRY_VERSION;
  briefing: IslandMissionBriefingPresentation;
  objectives: readonly [IslandMissionTrackerObjective, IslandMissionTrackerObjective];
  overallProgressPercent: number;
  complete: boolean;
  usesLiveSignatureProgress: boolean;
}

type MissionTrackerState = Pick<
  IslandRunGameStateRecord,
  | 'currentIslandNumber'
  | 'cycleIndex'
  | 'bossTrialResolvedIslandNumber'
  | 'perIslandEggs'
  | 'signatureMissionProgressByIsland'
  | 'stopStatesByIndex'
  | 'stopBuildStateByIndex'
>;

const completeLabel = 'Complete';

function clampProgress(value: number, target: number): number {
  return Math.max(0, Math.min(target, Number.isFinite(value) ? value : 0));
}

function objective(label: string, value: number, target: number, displayValue?: string): IslandMissionTrackerObjective {
  const safeTarget = Math.max(1, Number.isFinite(target) ? target : 1);
  return {
    label,
    value: clampProgress(value, safeTarget),
    target: safeTarget,
    displayValue,
    completeLabel,
  };
}

function isObjectiveComplete(item: IslandMissionTrackerObjective): boolean {
  return item.value >= item.target;
}

function getOverallPercent(items: readonly IslandMissionTrackerObjective[]): number {
  if (items.length === 0) return 0;
  const total = items.reduce((sum, item) => sum + clampProgress(item.value, item.target) / item.target, 0);
  return Math.max(0, Math.min(100, Math.round((total / items.length) * 100)));
}

function resolveLandmarkProgress(options: {
  islandNumber: number;
  state: MissionTrackerState;
  landmarkCount: number;
}) {
  const isCurrentIsland = options.state.currentIslandNumber === options.islandNumber;
  const eggResolved = isCurrentIsland
    && areAllEggSlotsTerminalForIsland(options.state.perIslandEggs, options.islandNumber);
  let objectivesComplete = 0;
  let buildsComplete = 0;
  let fullyRestored = 0;

  for (let index = 0; index < options.landmarkCount; index += 1) {
    const stopObjectiveComplete = isCurrentIsland
      && options.state.stopStatesByIndex[index]?.objectiveComplete === true
      && (index !== 0 || eggResolved);
    const buildComplete = isCurrentIsland
      && (options.state.stopBuildStateByIndex[index]?.buildLevel ?? 0) >= MAX_BUILD_LEVEL;
    if (stopObjectiveComplete) objectivesComplete += 1;
    if (buildComplete) buildsComplete += 1;
    if (stopObjectiveComplete && buildComplete) fullyRestored += 1;
  }

  return { objectivesComplete, buildsComplete, fullyRestored };
}

function resolveStandardObjectives(options: {
  islandNumber: number;
  state: MissionTrackerState;
  landmarkCount: number;
}): readonly [IslandMissionTrackerObjective, IslandMissionTrackerObjective] {
  const progress = resolveLandmarkProgress(options);
  return [
    objective('Complete Landmarks', progress.objectivesComplete, options.landmarkCount),
    objective('Build Landmarks', progress.buildsComplete, options.landmarkCount),
  ];
}

export function resolveIslandMissionTrackerPresentation(options: {
  islandNumber: number;
  state: MissionTrackerState;
}): IslandMissionTrackerPresentation {
  const islandNumber = Math.max(1, Math.floor(options.islandNumber));
  const { state } = options;
  const briefing = getIslandMissionBriefingPresentation(islandNumber);
  const landmarkCount = islandNumber === 1 ? 4 : 5;
  const landmarkProgress = resolveLandmarkProgress({ islandNumber, state, landmarkCount });
  let usesLiveSignatureProgress = true;
  let objectives: readonly [IslandMissionTrackerObjective, IslandMissionTrackerObjective];

  switch (briefing.progressKind) {
    case 'first_light_assembly': {
      const progress = resolveFirstLightAssemblyCraterProgress({
        ledger: state.signatureMissionProgressByIsland,
        cycleIndex: state.cycleIndex,
        islandNumber,
      });
      objectives = [
        objective('Use Dynamite', progress.chargesDetonated, FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET),
        objective('Build Landmarks', landmarkProgress.fullyRestored, landmarkCount),
      ];
      break;
    }
    case 'celestial_redocking': {
      const progress = resolveCelestialRedockingProgress({
        ledger: state.signatureMissionProgressByIsland,
        cycleIndex: state.cycleIndex,
        islandNumber,
      });
      const dockedPlatforms = getCelestialRedockingDockedPlatformCount(progress);
      objectives = [
        objective(
          'Dock Platforms',
          progress.rollsCompleted,
          CELESTIAL_REDOCKING_ROLL_TARGET,
          `${dockedPlatforms} / ${CELESTIAL_REDOCKING_PLATFORM_COUNT}`,
        ),
        objective('Build Landmarks', landmarkProgress.fullyRestored, landmarkCount),
      ];
      break;
    }
    case 'frostwell_iceworks': {
      const progress = resolveFrostwellIceworksProgress({
        ledger: state.signatureMissionProgressByIsland,
        cycleIndex: state.cycleIndex,
        islandNumber,
      });
      const drilledFraction = clampProgress(progress.metersDrilled, FROSTWELL_DEPTH_METERS) / FROSTWELL_DEPTH_METERS;
      const missionValue = Math.round(drilledFraction * 9_000) + (progress.builtAtMs === null ? 0 : 1_000);
      const drillingComplete = progress.metersDrilled >= FROSTWELL_DEPTH_METERS;
      objectives = [
        objective(
          drillingComplete ? 'Build Iceworks' : 'Drill to Water',
          missionValue,
          10_000,
          progress.builtAtMs !== null
            ? 'Done'
            : drillingComplete
              ? 'Ready'
              : `${progress.metersDrilled} / ${FROSTWELL_DEPTH_METERS}m`,
        ),
        objective('Build Landmarks', landmarkProgress.fullyRestored, landmarkCount),
      ];
      break;
    }
    case 'arena_guardian': {
      const guardianDefeated = state.currentIslandNumber === islandNumber
        && (
          state.bossTrialResolvedIslandNumber === islandNumber
          || state.stopStatesByIndex[4]?.objectiveComplete === true
        );
      objectives = [
        objective('Defeat Guardian', guardianDefeated ? 1 : 0, 1),
        objective('Build Landmarks', landmarkProgress.fullyRestored, landmarkCount),
      ];
      break;
    }
    case 'rootheart_powerworks': {
      const progress = resolveRootheartPowerworksProgress({
        ledger: state.signatureMissionProgressByIsland,
        cycleIndex: state.cycleIndex,
        islandNumber,
      });
      const collectedParts = Math.min(ROOTHEART_POWER_COMPONENTS.length, progress.collectedComponentIds.length);
      const partsComplete = collectedParts >= ROOTHEART_POWER_COMPONENTS.length;
      objectives = [
        objective(
          partsComplete ? 'Build Powerworks' : 'Collect Parts',
          collectedParts + progress.buildStage,
          ROOTHEART_POWER_COMPONENTS.length + ROOTHEART_POWERWORKS_MAX_STAGE,
          partsComplete
            ? `${progress.buildStage} / ${ROOTHEART_POWERWORKS_MAX_STAGE}`
            : `${collectedParts} / ${ROOTHEART_POWER_COMPONENTS.length}`,
        ),
        objective('Build Landmarks', landmarkProgress.fullyRestored, landmarkCount),
      ];
      break;
    }
    case 'sunken_sands_treasure': {
      const progress = resolveSunkenSandsTreasureProgress({
        ledger: state.signatureMissionProgressByIsland,
        cycleIndex: state.cycleIndex,
        islandNumber,
      });
      const searchComplete = progress.rollsCompleted >= SUNKEN_SANDS_TREASURE_ROLL_TARGET;
      objectives = [
        objective(
          searchComplete ? 'Claim Sunscarab' : 'Search the Ruins',
          Math.min(SUNKEN_SANDS_TREASURE_ROLL_TARGET, progress.rollsCompleted) + (progress.claimedAtMs === null ? 0 : 1),
          SUNKEN_SANDS_TREASURE_ROLL_TARGET + 1,
          progress.claimedAtMs !== null
            ? 'Done'
            : searchComplete
              ? 'Ready'
              : `${progress.rollsCompleted} / ${SUNKEN_SANDS_TREASURE_ROLL_TARGET}`,
        ),
        objective('Build Landmarks', landmarkProgress.fullyRestored, landmarkCount),
      ];
      break;
    }
    case 'cactus_canyon_spiral': {
      const progress = resolveCactusCanyonSpiralProgress({
        ledger: state.signatureMissionProgressByIsland,
        cycleIndex: state.cycleIndex,
        islandNumber,
      });
      objectives = [
        objective('Blast Rail Sections', progress.segmentsExcavated, CACTUS_CANYON_SPIRAL_MAX_SEGMENTS),
        objective('Build Landmarks', landmarkProgress.fullyRestored, landmarkCount),
      ];
      break;
    }
    case 'fishermans_fishing': {
      const progress = resolveFishermansVillageFishingProgress({
        ledger: state.signatureMissionProgressByIsland,
        cycleIndex: state.cycleIndex,
        islandNumber,
      });
      const pounds = progress.fishCaughtKg * 2.2046226218;
      objectives = [
        objective(
          progress.rodCollectedAtMs === null ? 'Find the Fishing Rod' : 'Catch Fish',
          progress.fishCaughtKg,
          FISHERMANS_VILLAGE_FISH_TARGET_KG,
          progress.rodCollectedAtMs === null
            ? 'Find rod'
            : `${progress.fishCaughtKg} kg / ${pounds.toFixed(1)} lb`,
        ),
        objective('Build Landmarks', landmarkProgress.fullyRestored, landmarkCount),
      ];
      break;
    }
    case 'planned_signature':
      // The header records the approved mission direction, but the phone must
      // not expose an unfinishable counter before canonical gameplay exists.
      usesLiveSignatureProgress = false;
      objectives = resolveStandardObjectives({ islandNumber, state, landmarkCount });
      break;
    case 'standard_landmarks':
    default:
      usesLiveSignatureProgress = false;
      objectives = resolveStandardObjectives({ islandNumber, state, landmarkCount });
      break;
  }

  return {
    registryVersion: ISLAND_MISSION_TRACKER_REGISTRY_VERSION,
    briefing,
    objectives,
    overallProgressPercent: getOverallPercent(objectives),
    complete: objectives.every(isObjectiveComplete),
    usesLiveSignatureProgress,
  };
}
