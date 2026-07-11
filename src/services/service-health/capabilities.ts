/**
 * Capability matrix (Parts 5 & 8).
 *
 * Every feature declares what it needs from the cloud and how it degrades
 * when those needs are unmet. UI asks `getFeatureAvailability` instead of
 * inventing per-screen special cases.
 */

import type {
  FeatureAvailability,
  FeatureCapability,
  ServiceHealthSnapshot,
  ServiceKind,
} from './types';

const LOCAL_REASON = 'Works on this device; changes sync when cloud services return.';
const QUEUE_REASON = 'Saved on this device; it will finish syncing automatically.';
const PAUSE_REASON = 'Temporarily unavailable while cloud services recover.';
const BLOCK_REASON = 'Requires a secure server connection and stays disabled until services return.';

const noCloud = {
  network: false,
  cloud: false,
  auth: false,
  realtime: false,
  storage: false,
  edgeFunctions: false,
};

function capability(
  id: string,
  label: string,
  requires: Partial<FeatureCapability['requires']>,
  whenUnavailable: FeatureCapability['whenUnavailable'],
): FeatureCapability {
  return { id, label, requires: { ...noCloud, ...requires }, whenUnavailable };
}

/**
 * The canonical matrix. Local-first features degrade to local/queue;
 * money and account-integrity features pause or hard-block.
 */
export const FEATURE_CAPABILITIES: readonly FeatureCapability[] = [
  // Works locally, syncs later.
  capability('habit_completion', 'Habit check-ins', { cloud: true }, 'local'),
  capability('journal', 'Journal', { cloud: true }, 'local'),
  capability('todos', 'To-dos', { cloud: true }, 'local'),
  capability('goals', 'Goals', { cloud: true }, 'local'),
  capability('checkins', 'Daily check-ins', { cloud: true }, 'local'),
  capability('timers', 'Timers', {}, 'local'),
  capability('notes_drafts', 'Notes & drafts', {}, 'local'),
  capability('island_run', 'Island Run', { cloud: true }, 'local'),
  capability('cached_creatures', 'Creature collection (cached)', {}, 'local'),

  // Usable now; resulting writes queue.
  capability('image_upload', 'Image uploads', { network: true, cloud: true, storage: true }, 'queue'),
  capability('runtime_checkpoint', 'Game checkpoints', { cloud: true }, 'queue'),
  capability('settings_sync', 'Settings sync', { cloud: true }, 'queue'),

  // Paused until services return.
  capability('purchases', 'Purchases', { network: true, cloud: true, auth: true, edgeFunctions: true }, 'pause'),
  capability('subscriptions', 'Subscriptions', { network: true, cloud: true, auth: true, edgeFunctions: true }, 'pause'),
  capability('ai_coach', 'AI Coach', { network: true, cloud: true, edgeFunctions: true }, 'pause'),
  capability('multiplayer', 'Multiplayer & leaderboards', { network: true, cloud: true, realtime: true }, 'pause'),
  capability('marketplace', 'Marketplace', { network: true, cloud: true, auth: true }, 'pause'),

  // Hard-blocked for integrity — never granted from local state.
  capability('premium_grant', 'Premium unlocks', { network: true, cloud: true, auth: true }, 'block'),
  capability('economy_settlement', 'Currency settlement', { network: true, cloud: true, auth: true }, 'block'),
  capability('account_ownership', 'Account & ownership changes', { network: true, cloud: true, auth: true }, 'block'),
] as const;

export type FeatureCapabilityId = (typeof FEATURE_CAPABILITIES)[number]['id'];

const capabilityById = new Map(FEATURE_CAPABILITIES.map((entry) => [entry.id, entry]));

export function getFeatureCapability(id: string): FeatureCapability | null {
  return capabilityById.get(id) ?? null;
}

function serviceUsable(snapshot: ServiceHealthSnapshot, service: ServiceKind): boolean {
  const state = snapshot.services[service];
  return state === 'healthy' || state === 'unknown';
}

function requirementsMet(
  capabilitySpec: FeatureCapability,
  snapshot: ServiceHealthSnapshot,
): boolean {
  const { requires } = capabilitySpec;
  if ((requires.network || requires.cloud) && !snapshot.networkOnline) return false;
  if (requires.cloud && (snapshot.overall === 'OFFLINE' || snapshot.overall === 'MAINTENANCE')) {
    return false;
  }
  if (requires.auth && (!serviceUsable(snapshot, 'auth') || snapshot.overall === 'ACCOUNT_ACTION_REQUIRED')) {
    return false;
  }
  if (requires.cloud && !serviceUsable(snapshot, 'database')) return false;
  if (requires.storage && !serviceUsable(snapshot, 'storage')) return false;
  if (requires.realtime && !serviceUsable(snapshot, 'realtime')) return false;
  if (requires.edgeFunctions && !serviceUsable(snapshot, 'edgeFunctions')) return false;
  return true;
}

/**
 * Resolve how a feature behaves under the current health snapshot.
 * Unknown feature ids resolve to 'available' so new features fail open
 * locally rather than crash.
 */
export function getFeatureAvailability(
  featureId: string,
  snapshot: ServiceHealthSnapshot,
): FeatureAvailability {
  const capabilitySpec = capabilityById.get(featureId);
  if (!capabilitySpec) return { status: 'available' };
  if (snapshot.overall === 'UNSAFE') {
    return { status: 'blocked', reason: 'Saving is unavailable right now, so changes cannot be recorded safely.' };
  }
  if (requirementsMet(capabilitySpec, snapshot)) return { status: 'available' };

  switch (capabilitySpec.whenUnavailable) {
    case 'local':
      return { status: 'local', reason: LOCAL_REASON };
    case 'queue':
      return { status: 'queued', reason: QUEUE_REASON };
    case 'pause':
      return { status: 'paused', reason: PAUSE_REASON };
    case 'block':
      return { status: 'blocked', reason: BLOCK_REASON };
  }
}

/** True when the feature can be interacted with at all right now. */
export function isFeatureUsable(featureId: string, snapshot: ServiceHealthSnapshot): boolean {
  const availability = getFeatureAvailability(featureId, snapshot);
  return availability.status === 'available' || availability.status === 'local' || availability.status === 'queued';
}
