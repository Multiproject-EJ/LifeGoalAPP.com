import type { Session } from '@supabase/supabase-js';

function normalizeEmail(email: string | null | undefined): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function readAllowedInternalTesterEmails(): Set<string> {
  return new Set(
    (import.meta.env.VITE_ISLAND_RUN_INTERNAL_TESTER_EMAILS ?? '')
      .split(',')
      .map(normalizeEmail)
      .filter(Boolean),
  );
}

export function isAllowedIslandRunInternalTester(session: Session | null | undefined): boolean {
  return readAllowedInternalTesterEmails().has(normalizeEmail(session?.user?.email));
}

export function isIslandRunInternalDevToolsBuildEnabled(): boolean {
  return Boolean(
    import.meta.env.DEV
      || import.meta.env.VITE_ENABLE_ISLAND_RUN_INTERNAL_DEV_TOOLS === 'true',
  );
}

export function isIslandRunInternalDevToolsEnabled(
  session: Session | null | undefined,
  isDevModeEnabled: boolean,
): boolean {
  return isDevModeEnabled
    && isIslandRunInternalDevToolsBuildEnabled()
    && isAllowedIslandRunInternalTester(session);
}
