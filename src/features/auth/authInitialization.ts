export const AUTH_INITIALIZATION_TIMEOUT_MS = 8000;

export type AuthInitializationStatus = 'loading' | 'ready' | 'timeout' | 'error';

export function shouldShowAuthConnectionNotice({
  initializationStatus,
  isConfigured,
  isOnline,
}: {
  initializationStatus: AuthInitializationStatus;
  isConfigured: boolean;
  isOnline: boolean;
}): boolean {
  return !isConfigured || !isOnline || initializationStatus === 'timeout' || initializationStatus === 'error';
}
