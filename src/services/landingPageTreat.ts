export const LANDING_PAGE_TREAT_DICE = 50;
export const LANDING_PAGE_TREAT_PENDING_KEY = 'lifegoal.landingTreat.pendingDay.v1';
export const LANDING_PAGE_TREAT_CLAIMED_KEY = 'lifegoal.landingTreat.claimedDay.v1';
export const LANDING_PAGE_TREAT_VISITED_KEY = 'lifegoal.landingTreat.visited.v1';
export const DICE_PACK_SHOP_SEEN_KEY = 'lifegoal.dicePackShop.seen.v1';

function browserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function landingPageTreatDayKey(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function hasVisitedLandingPageTreat(storage: Storage | null = browserStorage()): boolean {
  try {
    return storage?.getItem(LANDING_PAGE_TREAT_VISITED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markLandingPageTreatVisited(storage: Storage | null = browserStorage()): void {
  try {
    storage?.setItem(LANDING_PAGE_TREAT_VISITED_KEY, 'true');
  } catch {
    // UI discovery state is best effort.
  }
}

export function hasSeenDicePackShop(storage: Storage | null = browserStorage()): boolean {
  try {
    return storage?.getItem(DICE_PACK_SHOP_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markDicePackShopSeen(storage: Storage | null = browserStorage()): void {
  try {
    storage?.setItem(DICE_PACK_SHOP_SEEN_KEY, 'true');
  } catch {
    // UI discovery state is best effort.
  }
}

/**
 * Demo-only handoff from the public landing treat page into canonical dice
 * award actions. Local day keys are adequate for the current demo; launch must
 * replace this with a server-authoritative daily claim before enabling rewards.
 */
export function consumePendingLandingPageTreat(options: {
  storage?: Storage | null;
  now?: Date;
} = {}): number {
  const storage = options.storage === undefined ? browserStorage() : options.storage;
  if (!storage) return 0;
  const dayKey = landingPageTreatDayKey(options.now);

  try {
    const pendingDay = storage.getItem(LANDING_PAGE_TREAT_PENDING_KEY);
    const claimedDay = storage.getItem(LANDING_PAGE_TREAT_CLAIMED_KEY);
    if (pendingDay !== dayKey || claimedDay === dayKey) return 0;

    storage.setItem(LANDING_PAGE_TREAT_CLAIMED_KEY, dayKey);
    storage.removeItem(LANDING_PAGE_TREAT_PENDING_KEY);
    storage.setItem(LANDING_PAGE_TREAT_VISITED_KEY, 'true');
    return LANDING_PAGE_TREAT_DICE;
  } catch {
    return 0;
  }
}
