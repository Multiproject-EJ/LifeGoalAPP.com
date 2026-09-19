/** Opening-games campaign policy. Pure functions only: callers commit through
 * canonical, mutex-protected actions. Never infer cohort from island number. */
export const OPENING_GAMES_CAMPAIGN_KEY = '0:2:campaign';
export const OPENING_GAMES_CEREMONY_KEY = '0:2:opening';
export const OPENING_GAMES_TEAM_ROLL_TARGET = 12;
export const OPENING_GAMES_STARTER_TICKETS = 3;
export const OPENING_GAMES_INAUGURAL_GAME_ID = 'signal_path' as const;
// Canonical landmark indices, never board tiles: the welcome/Hatchery venue
// and Event Arena. Landmark-first construction reaches Arena L1 at step 7/15;
// requiring all five L1 venues would delay this introduction until step 13.
export const OPENING_GAMES_VENUE_STOP_INDICES = [0, 2] as const;

export interface OpeningGamesCampaignMarker {
  missionId: 'opening-games-campaign';
  version: 1;
  layout: 'legacy' | 'opening-games-v1';
  updatedAtMs: number;
}

export interface OpeningGamesCeremonyProgress {
  missionId: 'host-the-first-games';
  version: 1;
  rollsCompleted: number;
  venuesPreparedAtMs: number | null;
  teamsWelcomedAtMs: number | null;
  beaconLitAtMs: number | null;
  completedAtMs: number | null;
  activeAttemptId: string | null;
  settledAttemptIds: string[];
  firstTicketBoostEventId: string | null;
  updatedAtMs: number;
}

export type OpeningGamesLedgerView = Readonly<Record<string, unknown>>;
const integer = (value: unknown) => typeof value === 'number' && Number.isFinite(value)
  ? Math.max(0, Math.floor(value)) : 0;
const timestamp = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const id = (value: unknown): string | null => typeof value === 'string' && value.trim().length > 0 && value.length <= 160 ? value : null;
const first = (a: number | null, b: number | null) => a === null ? b : b === null ? a : Math.min(a, b);

export function createOpeningGamesCampaignMarker(layout: OpeningGamesCampaignMarker['layout']): OpeningGamesCampaignMarker {
  return { missionId: 'opening-games-campaign', version: 1, layout, updatedAtMs: 0 };
}

export function sanitizeOpeningGamesCampaignMarker(raw: unknown): OpeningGamesCampaignMarker | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  if (value.missionId !== 'opening-games-campaign' || value.version !== 1
    || (value.layout !== 'legacy' && value.layout !== 'opening-games-v1')) return null;
  return { ...createOpeningGamesCampaignMarker(value.layout), updatedAtMs: integer(value.updatedAtMs) };
}

export function usesOpeningGamesCampaign(ledger: OpeningGamesLedgerView): boolean {
  return sanitizeOpeningGamesCampaignMarker(ledger[OPENING_GAMES_CAMPAIGN_KEY])?.layout === 'opening-games-v1';
}

/** Legacy wins conflicting cohort markers; earned ordinary data is not moved. */
export function mergeOpeningGamesCampaignMarkers(a: OpeningGamesCampaignMarker, b: OpeningGamesCampaignMarker): OpeningGamesCampaignMarker {
  return { ...createOpeningGamesCampaignMarker(a.layout === 'legacy' || b.layout === 'legacy' ? 'legacy' : 'opening-games-v1'), updatedAtMs: Math.max(a.updatedAtMs, b.updatedAtMs) };
}

export function createOpeningGamesCeremonyProgress(): OpeningGamesCeremonyProgress {
  return { missionId: 'host-the-first-games', version: 1, rollsCompleted: 0,
    venuesPreparedAtMs: null, teamsWelcomedAtMs: null, beaconLitAtMs: null, completedAtMs: null,
    activeAttemptId: null, settledAttemptIds: [], firstTicketBoostEventId: null, updatedAtMs: 0 };
}

export function sanitizeOpeningGamesCeremonyProgress(raw: unknown): OpeningGamesCeremonyProgress {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return createOpeningGamesCeremonyProgress();
  const value = raw as Record<string, unknown>;
  if (value.missionId !== 'host-the-first-games' || value.version !== 1) return createOpeningGamesCeremonyProgress();
  const venues = timestamp(value.venuesPreparedAtMs);
  const rollsCompleted = Math.min(OPENING_GAMES_TEAM_ROLL_TARGET, integer(value.rollsCompleted));
  const teams = venues === null || rollsCompleted < OPENING_GAMES_TEAM_ROLL_TARGET ? null : timestamp(value.teamsWelcomedAtMs);
  const beacon = teams === null ? null : timestamp(value.beaconLitAtMs);
  const completed = beacon === null ? null : timestamp(value.completedAtMs);
  // Do not evict cancellation tombstones while stale devices can still refer to
  // them. This account-once challenge stops producing attempts after success.
  const settled = Array.from(new Set(Array.isArray(value.settledAttemptIds) ? value.settledAttemptIds.map(id).filter((s): s is string => s !== null) : [])).sort();
  const attempt = id(value.activeAttemptId);
  return { missionId: 'host-the-first-games', version: 1,
    rollsCompleted,
    venuesPreparedAtMs: venues, teamsWelcomedAtMs: teams, beaconLitAtMs: beacon, completedAtMs: completed,
    activeAttemptId: beacon !== null && completed === null && attempt && !settled.includes(attempt) ? attempt : null,
    settledAttemptIds: settled, firstTicketBoostEventId: completed === null ? null : id(value.firstTicketBoostEventId),
    updatedAtMs: integer(value.updatedAtMs) };
}

export function resolveOpeningGamesCeremony(ledger: OpeningGamesLedgerView): OpeningGamesCeremonyProgress {
  return sanitizeOpeningGamesCeremonyProgress(ledger[OPENING_GAMES_CEREMONY_KEY]);
}

export function mergeOpeningGamesCeremonyProgress(a: OpeningGamesCeremonyProgress, b: OpeningGamesCeremonyProgress): OpeningGamesCeremonyProgress {
  const newer = a.updatedAtMs === b.updatedAtMs
    ? (a.activeAttemptId ?? '') >= (b.activeAttemptId ?? '') ? a : b
    : a.updatedAtMs > b.updatedAtMs ? a : b;
  const settledAttemptIds = Array.from(new Set([...a.settledAttemptIds, ...b.settledAttemptIds])).sort();
  return sanitizeOpeningGamesCeremonyProgress({ ...newer,
    rollsCompleted: Math.max(a.rollsCompleted, b.rollsCompleted),
    venuesPreparedAtMs: first(a.venuesPreparedAtMs, b.venuesPreparedAtMs),
    teamsWelcomedAtMs: first(a.teamsWelcomedAtMs, b.teamsWelcomedAtMs),
    beaconLitAtMs: first(a.beaconLitAtMs, b.beaconLitAtMs),
    completedAtMs: first(a.completedAtMs, b.completedAtMs), settledAttemptIds,
    firstTicketBoostEventId: [a.firstTicketBoostEventId, b.firstTicketBoostEventId]
      .filter((value): value is string => value !== null).sort()[0] ?? null,
    activeAttemptId: newer.activeAttemptId && !settledAttemptIds.includes(newer.activeAttemptId) ? newer.activeAttemptId : null,
  });
}

export function resolveOpeningGamesAccess(ledger: OpeningGamesLedgerView, islandNumber: number) {
  const legacy = !usesOpeningGamesCampaign(ledger);
  const progress = resolveOpeningGamesCeremony(ledger);
  return { ordinaryEvents: legacy || progress.completedAtMs !== null,
    inauguralRound: !legacy && islandNumber === 2 && progress.beaconLitAtMs !== null && progress.completedAtMs === null,
    orientation: !legacy && islandNumber === 1,
  };
}

/** Mission content identity only. Never use this to remap paid stops or eggs. */
export function resolveOpeningGamesContentIsland(ledger: OpeningGamesLedgerView, islandNumber: number): number {
  if (!usesOpeningGamesCampaign(ledger)) return islandNumber;
  return islandNumber === 2 ? 4 : islandNumber === 4 ? 2 : islandNumber;
}

export type OpeningGamesPreparationAction = 'prepare-venues' | 'welcome-teams' | 'light-beacon';
export function advanceOpeningGamesPreparation(options: {
  ledger: OpeningGamesLedgerView; islandNumber: number; action: OpeningGamesPreparationAction;
  buildLevels: readonly number[]; nowMs: number;
}): { status: 'ok' | 'ineligible' | 'already-complete' | 'builds-required' | 'teams-required' | 'previous-step-required'; progress: OpeningGamesCeremonyProgress } {
  const progress = resolveOpeningGamesCeremony(options.ledger);
  const unchanged = (status: Exclude<ReturnType<typeof advanceOpeningGamesPreparation>['status'], 'ok'>) => ({ status, progress });
  if (!usesOpeningGamesCampaign(options.ledger) || options.islandNumber !== 2 || timestamp(options.nowMs) === null
    || !['prepare-venues', 'welcome-teams', 'light-beacon'].includes(options.action)) return unchanged('ineligible');
  if (progress.completedAtMs !== null) return unchanged('already-complete');
  if (options.action === 'prepare-venues') {
    if (progress.venuesPreparedAtMs !== null) return unchanged('already-complete');
    // The opening is an introduction, not an end-of-island grind. Only its
    // two essential venues need to exist; full restoration remains separate.
    if (options.buildLevels.length !== 5 || options.buildLevels.some(level => !Number.isFinite(level) || level < 0)
      || OPENING_GAMES_VENUE_STOP_INDICES.some(index => options.buildLevels[index] < 1)) return unchanged('builds-required');
    return { status: 'ok', progress: { ...progress, venuesPreparedAtMs: options.nowMs, updatedAtMs: options.nowMs } };
  }
  if (options.action === 'welcome-teams') {
    if (progress.teamsWelcomedAtMs !== null) return unchanged('already-complete');
    if (progress.venuesPreparedAtMs === null) return unchanged('previous-step-required');
    if (progress.rollsCompleted < OPENING_GAMES_TEAM_ROLL_TARGET) return unchanged('teams-required');
    return { status: 'ok', progress: { ...progress, teamsWelcomedAtMs: options.nowMs, updatedAtMs: options.nowMs } };
  }
  if (progress.beaconLitAtMs !== null) return unchanged('already-complete');
  if (progress.teamsWelcomedAtMs === null) return unchanged('previous-step-required');
  return { status: 'ok', progress: { ...progress, beaconLitAtMs: options.nowMs, updatedAtMs: options.nowMs } };
}

export function advanceOpeningGamesForRoll(ledger: OpeningGamesLedgerView, islandNumber: number, nowMs: number): OpeningGamesCeremonyProgress | null {
  if (!usesOpeningGamesCampaign(ledger) || islandNumber !== 2 || timestamp(nowMs) === null) return null;
  const progress = resolveOpeningGamesCeremony(ledger);
  if (progress.completedAtMs !== null || progress.rollsCompleted >= OPENING_GAMES_TEAM_ROLL_TARGET) return null;
  return { ...progress, rollsCompleted: progress.rollsCompleted + 1, updatedAtMs: nowMs };
}

export function beginOpeningGamesInauguralRound(ledger: OpeningGamesLedgerView, islandNumber: number, attemptId: string, nowMs: number) {
  const progress = resolveOpeningGamesCeremony(ledger);
  if (!resolveOpeningGamesAccess(ledger, islandNumber).inauguralRound || !id(attemptId) || timestamp(nowMs) === null || progress.settledAttemptIds.includes(attemptId)) return null;
  if (progress.activeAttemptId) return progress.activeAttemptId === attemptId ? progress : null;
  return { ...progress, activeAttemptId: attemptId, updatedAtMs: nowMs };
}

export function settleOpeningGamesInauguralRound(options: {
  ledger: OpeningGamesLedgerView; islandNumber: number; attemptId: string; gameId: string;
  outcome: 'won' | 'lost' | 'cancelled'; nowMs: number;
}): OpeningGamesCeremonyProgress | null {
  const progress = resolveOpeningGamesCeremony(options.ledger);
  if (!resolveOpeningGamesAccess(options.ledger, options.islandNumber).inauguralRound
    || options.gameId !== OPENING_GAMES_INAUGURAL_GAME_ID || !id(options.attemptId)
    || progress.activeAttemptId !== options.attemptId || progress.settledAttemptIds.includes(options.attemptId)
    || timestamp(options.nowMs) === null || !['won', 'lost', 'cancelled'].includes(options.outcome)) return null;
  return { ...progress, activeAttemptId: null,
    settledAttemptIds: [...progress.settledAttemptIds, options.attemptId].sort(),
    completedAtMs: options.outcome !== 'cancelled' ? options.nowMs : null, updatedAtMs: options.nowMs };
}
