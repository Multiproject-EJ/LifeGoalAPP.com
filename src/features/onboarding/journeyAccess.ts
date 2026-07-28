export type JourneyMetadata = Record<string, unknown> | null | undefined;

function normalizePositiveDay(value: unknown): number | null {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric < 1) return null;
  return Math.max(1, Math.min(30, Math.floor(numeric)));
}

/**
 * Existing players without journey metadata keep the complete app. New journey
 * players and explicit admin Day Loop previews receive chapter-based access.
 */
export function readJourneyDay(metadata: JourneyMetadata): number | null {
  if (!metadata) return null;
  const developerDay = normalizePositiveDay(metadata.developer_journey_day);
  if (developerDay) return developerDay;

  const journeyVersion = Number(metadata.journey_version ?? 0);
  if (journeyVersion < 1) return null;
  return normalizePositiveDay(metadata.journey_day) ?? 1;
}

export function isDayOneJourney(metadata: JourneyMetadata): boolean {
  return readJourneyDay(metadata) === 1;
}
