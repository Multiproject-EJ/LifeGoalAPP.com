export type CreatureTreatType = 'basic' | 'favorite' | 'rare';

export interface CreatureTreatInventory {
  basic: number;
  favorite: number;
  rare: number;
}

const DEFAULT_INVENTORY: CreatureTreatInventory = {
  basic: 3,
  favorite: 1,
  rare: 0,
};

function getStorageKey(userId: string): string {
  return `island_run_creature_treat_inventory_${userId}`;
}

function normalizeInventory(value: Partial<CreatureTreatInventory> | null | undefined): CreatureTreatInventory {
  return {
    basic: typeof value?.basic === 'number' && Number.isFinite(value.basic) ? Math.max(0, Math.floor(value.basic)) : DEFAULT_INVENTORY.basic,
    favorite: typeof value?.favorite === 'number' && Number.isFinite(value.favorite) ? Math.max(0, Math.floor(value.favorite)) : DEFAULT_INVENTORY.favorite,
    rare: typeof value?.rare === 'number' && Number.isFinite(value.rare) ? Math.max(0, Math.floor(value.rare)) : DEFAULT_INVENTORY.rare,
  };
}

export function fetchCreatureTreatInventory(userId: string): CreatureTreatInventory {
  if (typeof window === 'undefined') return DEFAULT_INVENTORY;
  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));
    if (!raw) return DEFAULT_INVENTORY;
    return normalizeInventory(JSON.parse(raw) as Partial<CreatureTreatInventory>);
  } catch {
    return DEFAULT_INVENTORY;
  }
}

function writeCreatureTreatInventory(userId: string, inventory: CreatureTreatInventory): CreatureTreatInventory {
  if (typeof window === 'undefined') return inventory;
  try {
    window.localStorage.setItem(getStorageKey(userId), JSON.stringify(inventory));
  } catch {
    // ignore storage failures for now
  }
  return inventory;
}

export function earnCreatureTreatsForUser(userId: string, delta: Partial<Record<CreatureTreatType, number>>): CreatureTreatInventory {
  const current = fetchCreatureTreatInventory(userId);
  const next = normalizeInventory({
    basic: current.basic + (delta.basic ?? 0),
    favorite: current.favorite + (delta.favorite ?? 0),
    rare: current.rare + (delta.rare ?? 0),
  });
  return writeCreatureTreatInventory(userId, next);
}

export function spendCreatureTreatForUser(userId: string, treatType: CreatureTreatType, amount = 1): CreatureTreatInventory {
  const safeAmount = Math.max(1, Math.floor(amount));
  const current = fetchCreatureTreatInventory(userId);
  if (current[treatType] < safeAmount) {
    return current;
  }
  const next = {
    ...current,
    [treatType]: current[treatType] - safeAmount,
  } satisfies CreatureTreatInventory;
  return writeCreatureTreatInventory(userId, next);
}
