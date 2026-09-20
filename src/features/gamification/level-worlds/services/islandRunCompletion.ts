import type { IslandRunGameStateRecord } from './islandRunGameStateStore';
import { areAllEggSlotsTerminalForIsland } from './islandRunEggMania';
import { resolveIslandMissionObjectives, resolveLandmarkProgress } from './islandRunMissionObjectives';
import { getIslandTechnologyAccess } from './islandRunTechnologyUnlocks';
import {
  FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET,
  isLavaLabyrinthEscapeMissionComplete,
  resolveFirstLightAssemblyCraterProgress,
  resolveStagedRestorationMissionProgress,
} from './islandRunSignatureMissions';

export type IslandRunCompletionState = Pick<IslandRunGameStateRecord,
  'currentIslandNumber' | 'cycleIndex' | 'stopStatesByIndex' | 'stopBuildStateByIndex'
  | 'perIslandEggs' | 'signatureMissionProgressByIsland'>
  & Partial<Pick<IslandRunGameStateRecord, 'completedStopsByIsland' | 'technologyUnlocksById'>>;

export interface IslandCompletionRequirement {
  id: 'builds' | 'objectives' | 'egg' | 'assembly' | 'mandate' | 'concord' | 'extraction' | 'signature';
  label: string;
  value: number;
  target: number;
  complete: boolean;
}

/** One read-only definition for the board, mission phone, advisor and departure guard.
 * Construction never invents objective credit. Legacy completed-stop ledgers are
 * accepted, but a boss marker alone cannot silently bypass unfinished activities.
 */
export function resolveIslandRunCompletion(state: IslandRunCompletionState) {
  const islandNumber = state.currentIslandNumber;
  const assembly = resolveFirstLightAssemblyCraterProgress({
    ledger: state.signatureMissionProgressByIsland, cycleIndex: state.cycleIndex, islandNumber,
  });
  const assemblyComplete = islandNumber === 1 && assembly.completedAtMs !== null
    && assembly.chargesDetonated >= FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET;
  const legacyConcord = islandNumber === 1 && !assemblyComplete
    && assembly.chargesDetonated === 0
    && getIslandTechnologyAccess({ technologyUnlocksById: state.technologyUnlocksById ?? {} }, 'the-concord').active;
  const landmarkCount = islandNumber === 1 && !legacyConcord ? 4 : 5;
  const { buildsComplete, objectivesComplete } = resolveLandmarkProgress({
    islandNumber, state, landmarkCount,
  });
  const eggResolved = areAllEggSlotsTerminalForIsland(state.perIslandEggs, islandNumber);
  const requirements: IslandCompletionRequirement[] = [];
  const add = (id: IslandCompletionRequirement['id'], label: string, value: number, target = 1) => {
    requirements.push({ id, label, value, target, complete: value >= target });
  };
  add('builds', 'Build landmarks to Level 3', buildsComplete, landmarkCount);
  add('objectives', 'Complete landmark activities', objectivesComplete, landmarkCount);
  add('egg', 'Collect or sell all Hatchery eggs', eggResolved ? 1 : 0);
  if (islandNumber === 1) {
    if (legacyConcord) add('concord', 'Activate the Concord', 1);
    else add('assembly', 'Complete the Assembly', assembly.chargesDetonated, FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET);
  }
  // Every playable objective shown on the phone is required for departure.
  // Planned missions expose only the standard goals, so cannot strand players.
  if (islandNumber !== 1 && islandNumber !== 20) {
    const mission = resolveIslandMissionObjectives({ islandNumber, state, landmarkCount });
    if (mission.usesLiveSignatureProgress) {
      const signature = mission.objectives[0];
      add('signature', signature.label, signature.value, signature.target);
    }
  }
  // Base completion unlocks Island 020's extraction. It is not permission to leave.
  const baseComplete = requirements.every(item => item.complete);
  if (islandNumber === 1 && !legacyConcord) {
    add('mandate', 'Sign the peacekeeping mandate', assemblyComplete && assembly.mandateSignedAtMs != null ? 1 : 0);
  }
  if (islandNumber === 20) {
    const escape = resolveStagedRestorationMissionProgress({
      ledger: state.signatureMissionProgressByIsland, cycleIndex: state.cycleIndex, islandNumber,
    });
    add('extraction', 'Finish the Iron Skiff extraction', isLavaLabyrinthEscapeMissionComplete(escape) ? 1 : 0);
  }
  const complete = requirements.every(item => item.complete);
  const fraction = requirements.reduce((sum, item) => sum + Math.min(1, item.value / item.target), 0) / requirements.length;
  return {
    visitKey: `${state.cycleIndex}:${islandNumber}`,
    complete, baseComplete, requirements, buildsComplete, objectivesComplete, landmarkCount, eggResolved,
    // Never round an unfinished island to 100%.
    percent: complete ? 100 : Math.min(99, Math.floor(fraction * 100)),
    nextRequirement: requirements.find(item => !item.complete) ?? null,
  };
}

export function shouldAutoPresentIslandCompletion(options: {
  complete: boolean; visitKey: string; shownVisitKey: string | null;
  busy: boolean; isPreview: boolean;
}): boolean {
  return options.complete && !options.busy && !options.isPreview && options.shownVisitKey !== options.visitKey;
}
