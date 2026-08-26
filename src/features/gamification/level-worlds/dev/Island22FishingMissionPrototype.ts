export const ISLAND_22_ROD_TILE_INDEX = 2;
export const ISLAND_22_REPAIR_STEPS = 5;
export const ISLAND_22_TREASURE_DICE_PREVIEW = 100;

export type Island22FishingPrototypePhase =
  | 'find-rod'
  | 'ready-to-cast'
  | 'fish-tile-active'
  | 'reeling'
  | 'dragon-cinematic'
  | 'repair-impact-building'
  | 'completed';

export interface Island22CatchDefinition {
  id: string;
  label: string;
  kilograms: number;
  pulls: number;
  tileIndex: number;
  kind: 'fish' | 'monster' | 'treasure';
}

export const ISLAND_22_SCRIPTED_CATCHES: readonly Island22CatchDefinition[] = [
  { id: 'silver-sprat', label: 'Silver sprat', kilograms: 5, pulls: 3, tileIndex: 8, kind: 'fish' },
  { id: 'harbor-cod', label: 'Harbor cod', kilograms: 9, pulls: 4, tileIndex: 15, kind: 'fish' },
  { id: 'bluefin-skate', label: 'Bluefin skate', kilograms: 14, pulls: 5, tileIndex: 24, kind: 'fish' },
  { id: 'lantern-pike', label: 'Lantern pike', kilograms: 18, pulls: 6, tileIndex: 32, kind: 'fish' },
  { id: 'abyssal-tug', label: 'Something enormous', kilograms: 32, pulls: 10, tileIndex: 11, kind: 'monster' },
  { id: 'captains-reliquary', label: "Captain's reliquary", kilograms: 0, pulls: 4, tileIndex: 28, kind: 'treasure' },
  { id: 'sunscale-bream', label: 'Sunscale bream', kilograms: 8, pulls: 4, tileIndex: 5, kind: 'fish' },
  { id: 'crown-tuna', label: 'Crown tuna', kilograms: 14, pulls: 6, tileIndex: 20, kind: 'fish' },
] as const;

export const ISLAND_22_RARE_CATCH_POOL: readonly Island22CatchDefinition[] = [
  { id: 'moon-tuna', label: 'Mythic moon tuna', kilograms: 40, pulls: 12, tileIndex: 26, kind: 'fish' },
] as const;

export interface Island22FishingPrototypeState {
  phase: Island22FishingPrototypePhase;
  hasRod: boolean;
  caughtKilograms: number;
  currentCatchIndex: number;
  targetTileIndex: number | null;
  pullsRemaining: number;
  pullsRequired: number;
  repairStepsCompleted: number;
  impactBuildingDestroyed: boolean;
  treasureDicePreview: number;
  lastMessage: string;
}

export const island22KilogramsToPounds = (kilograms: number) => Math.round(kilograms * 2.2046226218 * 10) / 10;

export function createIsland22FishingMissionPrototype() {
  let state: Island22FishingPrototypeState;

  const reset = () => {
    state = {
      phase: 'find-rod',
      hasRod: false,
      caughtKilograms: 0,
      currentCatchIndex: 0,
      targetTileIndex: ISLAND_22_ROD_TILE_INDEX,
      pullsRemaining: 0,
      pullsRequired: 0,
      repairStepsCompleted: 0,
      impactBuildingDestroyed: false,
      treasureDicePreview: 0,
      lastMessage: 'Land on the glowing fishing-rod tile.',
    };
  };

  const getState = () => ({ ...state });

  const cast = () => {
    if (state.phase !== 'ready-to-cast') return false;
    const catchDefinition = ISLAND_22_SCRIPTED_CATCHES[state.currentCatchIndex];
    if (!catchDefinition) return false;
    state.phase = 'fish-tile-active';
    state.targetTileIndex = catchDefinition.tileIndex;
    state.lastMessage = catchDefinition.kind === 'treasure'
      ? 'A strange golden glimmer is moving under the water…'
      : 'A fish tile is glowing. Land there to hook it!';
    return true;
  };

  const landOnTargetTile = (tileIndex: number) => {
    if (tileIndex !== state.targetTileIndex) return false;
    if (state.phase === 'find-rod') {
      state.hasRod = true;
      state.phase = 'ready-to-cast';
      state.targetTileIndex = null;
      state.lastMessage = 'Fishing rod collected. Cast into the central pond!';
      return true;
    }
    if (state.phase !== 'fish-tile-active') return false;
    const catchDefinition = ISLAND_22_SCRIPTED_CATCHES[state.currentCatchIndex];
    if (!catchDefinition) return false;
    state.phase = 'reeling';
    state.targetTileIndex = null;
    state.pullsRequired = catchDefinition.pulls;
    state.pullsRemaining = catchDefinition.pulls;
    state.lastMessage = catchDefinition.kind === 'monster'
      ? 'The line is impossibly strong—keep pulling!'
      : `Hooked ${catchDefinition.label}. Pull!`;
    return true;
  };

  const pull = () => {
    if (state.phase !== 'reeling' || state.pullsRemaining <= 0) return false;
    state.pullsRemaining -= 1;
    if (state.pullsRemaining > 0) {
      state.lastMessage = `${state.pullsRemaining} strong pull${state.pullsRemaining === 1 ? '' : 's'} left.`;
      return true;
    }

    const catchDefinition = ISLAND_22_SCRIPTED_CATCHES[state.currentCatchIndex];
    if (!catchDefinition) return false;
    state.currentCatchIndex += 1;
    if (catchDefinition.kind === 'treasure') {
      state.treasureDicePreview += ISLAND_22_TREASURE_DICE_PREVIEW;
      state.phase = 'ready-to-cast';
      state.lastMessage = `Ancient treasure! +${ISLAND_22_TREASURE_DICE_PREVIEW} dice preview.`;
      return true;
    }

    state.caughtKilograms += catchDefinition.kilograms;
    if (catchDefinition.kind === 'monster') {
      state.phase = 'dragon-cinematic';
      state.impactBuildingDestroyed = true;
      state.lastMessage = '78 kg! The water is draining—something has the line!';
      return true;
    }
    if (state.caughtKilograms >= 100) {
      state.phase = 'completed';
      state.lastMessage = '100 kg complete! The village feast can begin.';
      return true;
    }
    state.phase = 'ready-to-cast';
    state.lastMessage = `${catchDefinition.label}: +${catchDefinition.kilograms} kg. Cast again!`;
    return true;
  };

  const completeDragonCinematic = () => {
    if (state.phase !== 'dragon-cinematic') return false;
    state.phase = 'repair-impact-building';
    state.lastMessage = 'The waterfront net house was destroyed. Rebuild it!';
    return true;
  };

  const repair = () => {
    if (state.phase !== 'repair-impact-building') return false;
    state.repairStepsCompleted = Math.min(ISLAND_22_REPAIR_STEPS, state.repairStepsCompleted + 1);
    if (state.repairStepsCompleted >= ISLAND_22_REPAIR_STEPS) {
      state.impactBuildingDestroyed = false;
      state.phase = 'ready-to-cast';
      state.lastMessage = 'Rebuilt! The fish are returning. Cast again.';
    } else {
      state.lastMessage = `Rebuilding… ${state.repairStepsCompleted}/${ISLAND_22_REPAIR_STEPS}`;
    }
    return true;
  };

  reset();
  return { getState, reset, cast, landOnTargetTile, pull, completeDragonCinematic, repair };
}
