export const VAULT_ISLAND_PERIMETER_STYLES = ['charms', 'garden', 'gold-castle'];
const STORAGE_KEY = 'habitgame:vault-island:perimeter-style:v1';
export function normalizeVaultIslandPerimeterStyle(value) {
    return VAULT_ISLAND_PERIMETER_STYLES.includes(value)
        ? value
        : 'charms';
}
export function loadVaultIslandPerimeterStyle() {
    if (typeof window === 'undefined')
        return 'charms';
    try {
        return normalizeVaultIslandPerimeterStyle(window.localStorage.getItem(STORAGE_KEY));
    }
    catch {
        return 'charms';
    }
}
export function saveVaultIslandPerimeterStyle(style) {
    const normalized = normalizeVaultIslandPerimeterStyle(style);
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(STORAGE_KEY, normalized);
        }
        catch {
            // The selected cosmetic still applies for this visit when storage is unavailable.
        }
    }
    return normalized;
}
