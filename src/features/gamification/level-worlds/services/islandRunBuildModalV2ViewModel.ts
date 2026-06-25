import type { IslandArtManifest } from './islandArtManifest';
import { getIslandArtLandmarkImageSrc } from './islandArtManifest';
import type { IslandRunContractV2BuildState } from './islandRunContractV2EssenceBuild';
import { MAX_BUILD_LEVEL, resolveBuildSpendStepForTier } from './islandRunContractV2EssenceBuild';
import type { IslandStopPlanEntry } from './islandRunStops';
import {
  deriveIslandRunSequentialBuildView,
  type IslandRunSequentialBuildPartNumber,
  type IslandRunSequentialBuildPartStatus,
  type IslandRunSequentialBuildStopId,
  type IslandRunSequentialBuildTargetLevel,
  type IslandRunSequentialBuildView,
} from './islandRunSequentialBuild';

export type BuildModalV2PartViewModel = {
  partNumber: IslandRunSequentialBuildPartNumber;
  status: IslandRunSequentialBuildPartStatus;
  remainingEssence: number;
};

export type BuildModalV2LevelRailItemViewModel = {
  level: IslandRunSequentialBuildTargetLevel;
  status: 'complete' | 'current' | 'locked';
  ariaLabel: string;
};

export type BuildModalV2ActiveLandmarkViewModel = {
  stopIndex: number;
  stopId: IslandRunSequentialBuildStopId;
  title: string;
  targetLevel: IslandRunSequentialBuildTargetLevel;
  sequencePosition: number;
  totalSequenceSteps: 15;
  currentBuildLevel: number;
  spentEssence: number;
  requiredEssence: number;
  activePart: IslandRunSequentialBuildPartNumber | null;
  completedParts: number;
  progressRatio: number;
  nextTapCost: number;
  canAffordNextTap: boolean;
  imageSrc?: string;
  imageAlt: string;
  imageIsPlaceholder: boolean;
};

export type BuildModalV2ViewModel = {
  sequentialBuildView: IslandRunSequentialBuildView;
  activeLandmark: BuildModalV2ActiveLandmarkViewModel | null;
  parts: BuildModalV2PartViewModel[];
  levelRail: [BuildModalV2LevelRailItemViewModel, BuildModalV2LevelRailItemViewModel, BuildModalV2LevelRailItemViewModel];
};

const STOP_ID_BY_INDEX: readonly IslandRunSequentialBuildStopId[] = ['hatchery', 'habit', 'mystery', 'wisdom', 'boss'];
const BATTLE_CENTER_SCENERY_ID = 'battle-center';

export function deriveBuildModalV2ViewModel(options: {
  stopBuildStateByIndex: ReadonlyArray<IslandRunContractV2BuildState | null | undefined>;
  islandStopPlan: ReadonlyArray<Pick<IslandStopPlanEntry, 'stopId' | 'title'>>;
  essenceAvailable: number;
  islandArtManifest: IslandArtManifest | null;
}): BuildModalV2ViewModel {
  const sequentialBuildView = deriveIslandRunSequentialBuildView(options.stopBuildStateByIndex);
  const levelRail = deriveLevelRail(sequentialBuildView.activeTarget?.targetLevel ?? MAX_BUILD_LEVEL);

  if (!sequentialBuildView.activeTarget) {
    return {
      sequentialBuildView,
      activeLandmark: null,
      parts: [],
      levelRail,
    };
  }

  const { activeTarget } = sequentialBuildView;
  const buildState = options.stopBuildStateByIndex[activeTarget.stopIndex];
  const title = options.islandStopPlan[activeTarget.stopIndex]?.title
    ?? titleForStopId(activeTarget.stopId)
    ?? `Landmark ${activeTarget.stopIndex + 1}`;
  const art = resolveBuildModalV2LandmarkArt({
    manifest: options.islandArtManifest,
    stopIndex: activeTarget.stopIndex,
    stopId: activeTarget.stopId,
    title,
    targetLevel: activeTarget.targetLevel,
    currentBuildLevel: buildState?.buildLevel ?? 0,
  });
  const remainingToLevel = Math.max(0, sequentialBuildView.requiredEssence - sequentialBuildView.spentEssence);
  const nextTapCost = sequentialBuildView.requiredEssence > 0
    ? Math.min(resolveBuildSpendStepForTier(sequentialBuildView.requiredEssence), remainingToLevel)
    : 0;

  return {
    sequentialBuildView,
    activeLandmark: {
      stopIndex: activeTarget.stopIndex,
      stopId: activeTarget.stopId,
      title,
      targetLevel: activeTarget.targetLevel,
      sequencePosition: activeTarget.sequencePosition,
      totalSequenceSteps: activeTarget.totalSequenceSteps,
      currentBuildLevel: Math.max(0, Math.floor(buildState?.buildLevel ?? 0)),
      spentEssence: sequentialBuildView.spentEssence,
      requiredEssence: sequentialBuildView.requiredEssence,
      activePart: sequentialBuildView.activePart,
      completedParts: sequentialBuildView.completedParts,
      progressRatio: sequentialBuildView.progressRatio,
      nextTapCost,
      canAffordNextTap: options.essenceAvailable >= nextTapCost && nextTapCost > 0,
      ...art,
    },
    parts: sequentialBuildView.parts.map((part) => ({
      partNumber: part.partNumber,
      status: part.status,
      remainingEssence: part.remainingEssence,
    })),
    levelRail,
  };
}

export function resolveBuildModalV2LandmarkArt(options: {
  manifest: IslandArtManifest | null;
  stopIndex: number;
  stopId: IslandRunSequentialBuildStopId;
  title: string;
  targetLevel: IslandRunSequentialBuildTargetLevel;
  currentBuildLevel: number;
}): { imageSrc?: string; imageAlt: string; imageIsPlaceholder: boolean } {
  const imageAlt = `${options.title} Building Level ${options.targetLevel}`;
  const manifest = options.manifest;
  if (!manifest) return { imageAlt, imageIsPlaceholder: true };

  // Boss construction uses the neutral battle arena/crystal scenery instead of
  // defeated boss art. Non-boss dormant landmarks reuse the target-level asset
  // as an under-construction hero because level-0 art is intentionally absent.
  if (options.stopId === 'boss') {
    const arena = manifest.scenery.find((entry) => entry.id === BATTLE_CENTER_SCENERY_ID);
    return arena?.src
      ? { imageSrc: arena.src, imageAlt: `${options.title} construction arena`, imageIsPlaceholder: false }
      : { imageAlt, imageIsPlaceholder: true };
  }

  const landmark = manifest.landmarks.find((entry) => entry.stopIndex === options.stopIndex);
  const imageSrc = landmark
    ? getIslandArtLandmarkImageSrc(landmark, Math.max(1, options.currentBuildLevel || options.targetLevel)) ?? undefined
    : undefined;
  return imageSrc
    ? { imageSrc, imageAlt, imageIsPlaceholder: false }
    : { imageAlt, imageIsPlaceholder: true };
}

function deriveLevelRail(targetLevel: number): BuildModalV2ViewModel['levelRail'] {
  return ([1, 2, 3] as const).map((level) => {
    const status = level < targetLevel ? 'complete' : level === targetLevel ? 'current' : 'locked';
    return {
      level,
      status,
      ariaLabel: status === 'complete'
        ? `Level ${level} completed`
        : status === 'current'
          ? `Level ${level} currently building`
          : `Level ${level} locked`,
    };
  }) as BuildModalV2ViewModel['levelRail'];
}

function titleForStopId(stopId: IslandRunSequentialBuildStopId): string {
  return STOP_ID_BY_INDEX.includes(stopId) ? stopId[0].toUpperCase() + stopId.slice(1) : 'Landmark';
}
