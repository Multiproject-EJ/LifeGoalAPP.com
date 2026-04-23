/**
 * Contract-v2 is permanently enabled.
 *
 * Historical query/localStorage/env overrides were removed because they created
 * divergent gameplay semantics and made production debugging non-deterministic.
 * Keep this helper as a stable import surface for any legacy call sites that
 * still read `isIslandRunContractV2Enabled()`.
 */
export function isIslandRunContractV2Enabled(): boolean {
  return true;
}
