"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchCreatureTreatInventory = fetchCreatureTreatInventory;
exports.earnCreatureTreatsForUser = earnCreatureTreatsForUser;
exports.spendCreatureTreatForUser = spendCreatureTreatForUser;
exports.clearCreatureTreatInventoryForUser = clearCreatureTreatInventoryForUser;
const DEFAULT_INVENTORY = {
    basic: 3,
    favorite: 1,
    rare: 0,
};
function getStorageKey(userId) {
    return `island_run_creature_treat_inventory_${userId}`;
}
function normalizeInventory(value) {
    return {
        basic: typeof value?.basic === 'number' && Number.isFinite(value.basic) ? Math.max(0, Math.floor(value.basic)) : DEFAULT_INVENTORY.basic,
        favorite: typeof value?.favorite === 'number' && Number.isFinite(value.favorite) ? Math.max(0, Math.floor(value.favorite)) : DEFAULT_INVENTORY.favorite,
        rare: typeof value?.rare === 'number' && Number.isFinite(value.rare) ? Math.max(0, Math.floor(value.rare)) : DEFAULT_INVENTORY.rare,
    };
}
function fetchCreatureTreatInventory(userId) {
    if (typeof window === 'undefined')
        return DEFAULT_INVENTORY;
    try {
        const raw = window.localStorage.getItem(getStorageKey(userId));
        if (!raw)
            return DEFAULT_INVENTORY;
        return normalizeInventory(JSON.parse(raw));
    }
    catch {
        return DEFAULT_INVENTORY;
    }
}
function writeCreatureTreatInventory(userId, inventory) {
    if (typeof window === 'undefined')
        return inventory;
    try {
        window.localStorage.setItem(getStorageKey(userId), JSON.stringify(inventory));
    }
    catch {
        // ignore storage failures for now
    }
    return inventory;
}
function earnCreatureTreatsForUser(userId, delta) {
    const current = fetchCreatureTreatInventory(userId);
    const next = normalizeInventory({
        basic: current.basic + (delta.basic ?? 0),
        favorite: current.favorite + (delta.favorite ?? 0),
        rare: current.rare + (delta.rare ?? 0),
    });
    return writeCreatureTreatInventory(userId, next);
}
function spendCreatureTreatForUser(userId, treatType, amount = 1) {
    const safeAmount = Math.max(1, Math.floor(amount));
    const current = fetchCreatureTreatInventory(userId);
    if (current[treatType] < safeAmount) {
        return current;
    }
    const next = {
        ...current,
        [treatType]: current[treatType] - safeAmount,
    };
    return writeCreatureTreatInventory(userId, next);
}
/**
 * Clears the persisted creature treat inventory for the given user. Used
 * by {@link resetIslandRunProgress} so a fresh-start run doesn't carry
 * over treats earned on later islands.
 */
function clearCreatureTreatInventoryForUser(userId) {
    if (typeof window === 'undefined')
        return;
    try {
        window.localStorage.removeItem(getStorageKey(userId));
    }
    catch {
        // ignore storage failures for now
    }
}
