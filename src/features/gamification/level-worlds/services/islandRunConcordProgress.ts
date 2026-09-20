/** Concord moved from Island 001 to 005. Read both ledgers without deleting earned progress. */
export const CONCORD_COLLECTION_ISLAND = 5;
type ConcordLedger = Readonly<Record<string, readonly number[]>> | null | undefined;
function union(ledger: ConcordLedger, limit: number): number[] {
  return [...new Set([...(ledger?.['1'] ?? []), ...(ledger?.['5'] ?? [])])]
    .filter(n => Number.isInteger(n) && n >= 0 && n < limit).sort((a,b) => a-b);
}
export const getConcordCollectedSlots = (ledger: ConcordLedger): number[] => union(ledger, 9);
export const getConcordRewardedLines = (ledger: ConcordLedger): number[] => union(ledger, 8);
