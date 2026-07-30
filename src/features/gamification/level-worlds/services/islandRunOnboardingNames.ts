export type IslandRunOnboardingNameSuggestion = {
  id: string;
  captainName: string;
  shipName: string;
};

const CAPTAIN_NAMES = [
  'Captain Nova',
  'Captain Rowan',
  'Captain Mira',
  'Captain Sol',
  'Captain Aster',
  'Captain Ivo',
  'Captain Lyra',
  'Captain Cove',
  'Captain Wren',
  'Captain Echo',
  'Captain Sora',
  'Captain Elio',
] as const;

const SHIP_NAMES = [
  'The Luma Skiff',
  'The Dawn Compass',
  'The Golden Current',
  'The Starling',
  'The Bright Horizon',
  'The Moonwake',
  'The Wayfinder',
  'The Quiet Comet',
  'The Sunlit Tide',
  'The North Star',
  'The Blue Lantern',
  'The First Light',
] as const;

function positiveInteger(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.abs(Math.floor(value));
}

/**
 * Four deterministic, on-device name pairs. This deliberately avoids making
 * the first-run path depend on network AI, device model support, or generated
 * text moderation.
 */
export function buildIslandRunOnboardingNameSuggestions(
  seed: number,
  count = 4,
): IslandRunOnboardingNameSuggestion[] {
  const safeSeed = positiveInteger(seed);
  const safeCount = Math.max(1, Math.min(4, Math.floor(count)));
  return Array.from({ length: safeCount }, (_, index) => {
    const captainIndex = (safeSeed + index * 5) % CAPTAIN_NAMES.length;
    const shipIndex = (safeSeed * 3 + index * 7 + 1) % SHIP_NAMES.length;
    return {
      id: `name-pair-${safeSeed}-${index}`,
      captainName: CAPTAIN_NAMES[captainIndex],
      shipName: SHIP_NAMES[shipIndex],
    };
  });
}

