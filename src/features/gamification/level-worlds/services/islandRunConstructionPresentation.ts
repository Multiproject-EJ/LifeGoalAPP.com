import type { BuildModalV2LevelReview } from '../components/BuildModalV2';
import type { BuildModalV2ViewModel } from './islandRunBuildModalV2ViewModel';

export type IslandRunConstructionPhase =
  | 'arrive'
  | 'survey'
  | 'foundation'
  | 'frame'
  | 'assemble'
  | 'finish'
  | 'reveal';

/**
 * Read-only animation input for the live Island renderer. It deliberately
 * contains no callbacks and cannot mutate construction/gameplay state.
 */
export type IslandRunConstructionPresentation = {
  active: boolean;
  /** Full construction choreography is limited to a hold or recent build tap. */
  working: boolean;
  /** Camera authority outlives the short robot burst so recent work stays framed. */
  cameraLocked: boolean;
  phase: IslandRunConstructionPhase;
  progress: number;
  sequence: number;
  sourceLevel: number | null;
  commissioning: boolean;
  cloudCover: number;
  targetStopId: string | null;
  targetLevel: number | null;
  reducedMotion: boolean;
};

const BUILD_PHASES: ReadonlyArray<{
  phase: IslandRunConstructionPhase;
  until: number;
  cloudCover: number;
}> = [
  { phase: 'arrive', until: 0.08, cloudCover: 0.08 },
  { phase: 'survey', until: 0.18, cloudCover: 0.18 },
  { phase: 'foundation', until: 0.36, cloudCover: 0.56 },
  { phase: 'frame', until: 0.58, cloudCover: 0.68 },
  { phase: 'assemble', until: 0.82, cloudCover: 0.72 },
  { phase: 'finish', until: 0.97, cloudCover: 0.46 },
  { phase: 'reveal', until: 1, cloudCover: 0.06 },
];

export function deriveIslandRunConstructionPresentation(options: {
  isOpen: boolean;
  isBuildHoldActive: boolean;
  isBuildBurstActive?: boolean;
  isCameraLocked?: boolean;
  viewModel: BuildModalV2ViewModel;
  levelReview?: BuildModalV2LevelReview | null;
  reducedMotion?: boolean;
}): IslandRunConstructionPresentation {
  const landmark = options.viewModel.activeLandmark;
  const progress = Math.min(1, Math.max(0, landmark?.progressRatio ?? (options.levelReview ? 1 : 0)));
  const isReview = Boolean(options.levelReview);
  const sequence = Math.max(0, Math.floor(
    options.levelReview?.presentationSequence ?? landmark?.sequencePosition ?? 0,
  ));
  const targetStopId = options.levelReview?.stopId ?? landmark?.stopId ?? null;
  const targetLevel = options.levelReview?.level ?? landmark?.targetLevel ?? null;
  const sourceLevel = options.levelReview?.previousLevel ?? null;
  const isActive = options.isOpen && Boolean(landmark || isReview);

  if (!isActive) {
    return {
      active: false,
      working: false,
      cameraLocked: false,
      phase: 'arrive',
      progress,
      sequence,
      sourceLevel,
      commissioning: false,
      cloudCover: 0,
      targetStopId,
      targetLevel,
      reducedMotion: Boolean(options.reducedMotion),
    };
  }

  if (isReview) {
    return {
      active: true,
      working: true,
      cameraLocked: true,
      phase: 'reveal',
      progress: 1,
      sequence,
      sourceLevel,
      commissioning: true,
      cloudCover: 0.06,
      targetStopId,
      targetLevel,
      reducedMotion: Boolean(options.reducedMotion),
    };
  }

  const isWorking = options.isBuildHoldActive || Boolean(options.isBuildBurstActive);
  const progressPhase = BUILD_PHASES.find((entry) => progress <= entry.until)
    ?? BUILD_PHASES[BUILD_PHASES.length - 1];
  const phaseConfig = progress <= 0.02
    ? { phase: 'arrive' as const, cloudCover: 0.08 }
    : {
        phase: progressPhase.phase,
        cloudCover: options.isBuildHoldActive
          ? progressPhase.cloudCover
          : isWorking
            ? Math.min(progressPhase.cloudCover, 0.46)
            : 0,
      };

  return {
    active: true,
    working: isWorking,
    cameraLocked: isWorking || Boolean(options.isCameraLocked),
    phase: phaseConfig.phase,
    progress,
    sequence,
    sourceLevel,
    commissioning: false,
    cloudCover: phaseConfig.cloudCover,
    targetStopId,
    targetLevel,
    reducedMotion: Boolean(options.reducedMotion),
  };
}
