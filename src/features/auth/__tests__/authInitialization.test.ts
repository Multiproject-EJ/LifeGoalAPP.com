import {
  shouldShowAuthConnectionNotice,
  type AuthInitializationStatus,
} from '../authInitialization';

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
}
