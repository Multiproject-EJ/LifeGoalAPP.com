export const VAULT_ISLAND_PERIMETER_STYLES = ['charms', 'garden', 'gold-castle'] as const;

export type VaultIslandPerimeterStyle = (typeof VAULT_ISLAND_PERIMETER_STYLES)[number];

const STORAGE_KEY = 'habitgame:vault-island:perimeter-style:v1';

export function normalizeVaultIslandPerimeterStyle(value: unknown): VaultIslandPerimeterStyle {
  return VAULT_ISLAND_PERIMETER_STYLES.includes(value as VaultIslandPerimeterStyle)
    ? value as VaultIslandPerimeterStyle
    : 'charms';
}

export function loadVaultIslandPerimeterStyle(): VaultIslandPerimeterStyle {
  if (typeof window === 'undefined') return 'charms';
  try {
    return normalizeVaultIslandPerimeterStyle(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return 'charms';
  }
}

export function saveVaultIslandPerimeterStyle(style: VaultIslandPerimeterStyle): VaultIslandPerimeterStyle {
  const normalized = normalizeVaultIslandPerimeterStyle(style);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, normalized);
    } catch {
      // The selected cosmetic still applies for this visit when storage is unavailable.
    }
  }
  return normalized;
}
