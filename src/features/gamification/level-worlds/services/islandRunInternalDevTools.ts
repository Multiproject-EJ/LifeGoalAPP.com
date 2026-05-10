import type { Session } from '@supabase/supabase-js';

const ISLAND_RUN_INTERNAL_TESTER_EMAILS = new Set([
  'josefsen.eivind@gmail.com',
]);

function normalizeEmail(email: string | null | undefined): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

export function isAllowedIslandRunInternalTester(session: Session | null | undefined): boolean {
  return ISLAND_RUN_INTERNAL_TESTER_EMAILS.has(normalizeEmail(session?.user?.email));
}

export function isIslandRunInternalDevToolsBuildEnabled(): boolean {
  return Boolean(import.meta.env.DEV)
    || import.meta.env.VITE_ENABLE_ISLAND_RUN_INTERNAL_DEV_TOOLS === 'true';
}

export function isIslandRunInternalDevToolsEnabled(
  session: Session | null | undefined,
  isDevModeEnabled: boolean,
): boolean {
  return isDevModeEnabled
    && isIslandRunInternalDevToolsBuildEnabled()
    && isAllowedIslandRunInternalTester(session);
}
