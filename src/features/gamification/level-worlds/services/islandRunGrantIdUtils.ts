export function normalizeGrantIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value
    .filter((grantId): grantId is string => typeof grantId === 'string' && grantId.trim().length > 0)
    .map((grantId) => grantId.trim())))
    .sort((a, b) => a.localeCompare(b));
}

export function appendGrantId(existingGrantIds: readonly string[] | undefined, grantId: string): string[] {
  return normalizeGrantIds([...(existingGrantIds ?? []), grantId]);
}
