export function buildTimeLimitedOfferExpiryDedupeKey(options: {
  offerDate: string;
  windowEnd: number;
}): string {
  const safeWindowEnd = Number.isFinite(options.windowEnd)
    ? Math.max(0, Math.floor(options.windowEnd))
    : 0;
  return `offer-expired:${options.offerDate}:${safeWindowEnd}`;
}
