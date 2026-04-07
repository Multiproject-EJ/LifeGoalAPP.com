const CONTRACT_V2_FLAG_KEY = 'island_run_contract_v2';

function readQueryFlagValue(flagName: string): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(flagName);
}

function readLocalStorageFlagValue(flagName: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(`feature_flag_${flagName}`);
  } catch {
    return null;
  }
}

function isTruthyFlag(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'on' || normalized === 'yes';
}

export function isIslandRunContractV2Enabled(): boolean {
  const queryValue = readQueryFlagValue(CONTRACT_V2_FLAG_KEY);
  if (queryValue !== null) return isTruthyFlag(queryValue);

  const localValue = readLocalStorageFlagValue(CONTRACT_V2_FLAG_KEY);
  if (localValue !== null) return isTruthyFlag(localValue);

  return isTruthyFlag(import.meta.env.VITE_ISLAND_RUN_CONTRACT_V2);
}
