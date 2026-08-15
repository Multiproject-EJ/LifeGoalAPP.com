import { useEffect, useRef, type CSSProperties } from 'react';
import type { IslandRunDiceThrowStrength } from '../../services/islandRunDiceThrowPresentation';
import { BoardDice3D } from './BoardDice3D';

/**
 * Visual-only dice choreography for authored 3D islands.
 *
 * The canonical roll service still owns the face values and movement result.
 * This layer only replaces the BoardStage dice that would otherwise be hidden
 * below the WebGL canvas, and deliberately ignores pointer input so it cannot
 * block the controller, reward bar, or landmark hit targets.
 */
export interface IslandRunDiceLaunchOverlayProps {
  faces: readonly [number, number];
  isRolling: boolean;
  throwStrength: IslandRunDiceThrowStrength;
  landingVariant?: number;
  onRollComplete?: () => void;
  onTopBarImpact?: () => void;
}

const FULL_MOTION_DURATION_MS = 1_600;
const REDUCED_MOTION_DURATION_MS = 280;
const HARD_TOP_BAR_IMPACT_MS = 475;

const NORMAL_LANDING_PRESETS = [
  { leftX: 44, leftY: 52, rightX: 56, rightY: 53 },
  { leftX: 41, leftY: 49, rightX: 54, rightY: 55 },
  { leftX: 47, leftY: 55, rightX: 59, rightY: 50 },
  { leftX: 42, leftY: 56, rightX: 57, rightY: 55 },
] as const;

type DiceLandingStyle = CSSProperties & {
  '--dice-left-land-x': string;
  '--dice-left-land-y': string;
  '--dice-right-land-x': string;
  '--dice-right-land-y': string;
};

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function IslandRunDiceLaunchOverlay({
  faces,
  isRolling,
  throwStrength,
  landingVariant = 0,
  onRollComplete,
  onTopBarImpact,
}: IslandRunDiceLaunchOverlayProps) {
  const onRollCompleteRef = useRef(onRollComplete);
  const onTopBarImpactRef = useRef(onTopBarImpact);

  useEffect(() => {
    onRollCompleteRef.current = onRollComplete;
    onTopBarImpactRef.current = onTopBarImpact;
  }, [onRollComplete, onTopBarImpact]);

  useEffect(() => {
    if (!isRolling) return undefined;
    const reducedMotion = prefersReducedMotion();
    const completionTimer = window.setTimeout(
      () => onRollCompleteRef.current?.(),
      reducedMotion ? REDUCED_MOTION_DURATION_MS : FULL_MOTION_DURATION_MS,
    );
    const impactTimer = reducedMotion || throwStrength !== 'hard'
      ? null
      : window.setTimeout(
          () => onTopBarImpactRef.current?.(),
          HARD_TOP_BAR_IMPACT_MS,
        );
    return () => {
      window.clearTimeout(completionTimer);
      if (impactTimer !== null) window.clearTimeout(impactTimer);
    };
  }, [isRolling, throwStrength]);

  if (!isRolling) return null;

  const landingPreset = NORMAL_LANDING_PRESETS[
    Math.abs(Math.floor(landingVariant)) % NORMAL_LANDING_PRESETS.length
  ]!;
  const landingStyle: DiceLandingStyle = {
    '--dice-left-land-x': `${landingPreset.leftX}%`,
    '--dice-left-land-y': `${landingPreset.leftY}%`,
    '--dice-right-land-x': `${landingPreset.rightX}%`,
    '--dice-right-land-y': `${landingPreset.rightY}%`,
  };

  return (
    <div
      className="island-run-dice-launch-overlay"
      data-throw-strength={throwStrength}
      data-landing-variant={Math.abs(Math.floor(landingVariant)) % NORMAL_LANDING_PRESETS.length}
      data-testid="island-run-dice-launch-overlay"
      aria-hidden="true"
      style={landingStyle}
    >
      <span className="island-run-dice-launch-overlay__muzzle" />
      <span className="island-run-dice-launch-overlay__trail island-run-dice-launch-overlay__trail--left" />
      <span className="island-run-dice-launch-overlay__trail island-run-dice-launch-overlay__trail--right" />
      <span className="island-run-dice-launch-overlay__impact island-run-dice-launch-overlay__impact--reward" />
      <span className="island-run-dice-launch-overlay__impact island-run-dice-launch-overlay__impact--topbar" />
      <BoardDice3D
        value1={faces[0]}
        value2={faces[1]}
        isRolling
      />
    </div>
  );
}
