import {
  hasCachedAuthSession,
  isCloudUnavailableForAuthGate,
  resolveAuthGateOutageBranch,
  shouldShowAuthConnectionNotice,
  type AuthInitializationStatus,
} from '../authInitialization';
import type { ServiceHealthSnapshot } from '../../../services/service-health/types';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)} but received ${String(actual)}`);
  }
}

export function runAllAuthInitializationTests(): void {
  const visibleStates: AuthInitializationStatus[] = ['timeout', 'error'];
  for (const initializationStatus of visibleStates) {
    assertEqual(
      shouldShowAuthConnectionNotice({ initializationStatus, isConfigured: true, isOnline: true }),
      true,
      `${initializationStatus} should show the connection notice`,
    );
  }

  assertEqual(
    shouldShowAuthConnectionNotice({ initializationStatus: 'loading', isConfigured: true, isOnline: false }),
    true,
    'offline loading should show the connection notice',
  );

  assertEqual(
    shouldShowAuthConnectionNotice({ initializationStatus: 'ready', isConfigured: false, isOnline: true }),
    true,
    'missing auth configuration should show the connection notice',
  );

  assertEqual(
    shouldShowAuthConnectionNotice({ initializationStatus: 'ready', isConfigured: true, isOnline: true }),
    false,
    'ready and online should not show the connection notice',
  );

  runStartupOutageBranchTests();
}

function makeSnapshot(overrides: Partial<ServiceHealthSnapshot> = {}): ServiceHealthSnapshot {
  return {
    overall: 'ONLINE',
    services: {
      auth: 'healthy',
      database: 'healthy',
      storage: 'healthy',
      realtime: 'healthy',
      edgeFunctions: 'healthy',
    },
    lastSuccessAt: null,
    lastCheckAt: null,
    incidentCode: null,
    networkOnline: true,
    incidentMessage: null,
    ...overrides,
  };
}

function makeStorage(entries: Record<string, string>) {
  const keys = Object.keys(entries);
  return {
    length: keys.length,
    key: (index: number) => keys[index] ?? null,
    getItem: (key: string) => entries[key] ?? null,
  };
}

function runStartupOutageBranchTests(): void {
  assertEqual(
    isCloudUnavailableForAuthGate(makeSnapshot()),
    false,
    'healthy snapshot is not an outage',
  );
  assertEqual(
    isCloudUnavailableForAuthGate(makeSnapshot({ networkOnline: false, overall: 'OFFLINE' })),
    true,
    'network offline is an outage',
  );
  assertEqual(
    isCloudUnavailableForAuthGate(makeSnapshot({ overall: 'MAINTENANCE' })),
    true,
    'maintenance is an outage',
  );
  assertEqual(
    isCloudUnavailableForAuthGate(
      makeSnapshot({ overall: 'DEGRADED', services: { ...makeSnapshot().services, auth: 'unavailable' } }),
    ),
    true,
    'auth service down is an outage for the auth gate',
  );

  assertEqual(
    resolveAuthGateOutageBranch({ connectionTroubled: false, cloudUnavailable: false, hasCachedSession: true }),
    'none',
    'no outage → normal sign-in flow',
  );
  assertEqual(
    resolveAuthGateOutageBranch({ connectionTroubled: true, cloudUnavailable: false, hasCachedSession: false }),
    'new_user',
    'new user + outage → try again / play demo / view status',
  );
  assertEqual(
    resolveAuthGateOutageBranch({ connectionTroubled: false, cloudUnavailable: true, hasCachedSession: true }),
    'returning_user',
    'returning user + outage → continue locally',
  );

  assertEqual(
    hasCachedAuthSession(makeStorage({ 'sb-abcdef-auth-token': '{"access_token":"x"}' })),
    true,
    'supabase auth token in storage counts as cached session',
  );
  assertEqual(
    hasCachedAuthSession(makeStorage({ unrelated: 'value' })),
    false,
    'unrelated storage keys are not a cached session',
  );
  assertEqual(hasCachedAuthSession(null), false, 'missing storage means no cached session');
}
