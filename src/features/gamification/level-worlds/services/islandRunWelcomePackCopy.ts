export interface WelcomePackStarterCacheCopyOptions {
  displayName?: string | null;
}

function normalizeWelcomePackDisplayName(displayName: string | null | undefined): string | null {
  if (typeof displayName !== 'string') return null;
  const trimmed = displayName.trim().replace(/\s+/g, ' ');
  return trimmed.length > 0 ? trimmed.slice(0, 48) : null;
}

export function buildWelcomePackStarterCacheBody(options: WelcomePackStarterCacheCopyOptions = {}): string {
  const displayName = normalizeWelcomePackDisplayName(options.displayName);
  if (displayName) {
    return `Starter cache released for ${displayName}. Captain Ivo left this for your first steps on First Light Shore.`;
  }
  return 'Captain Ivo left this cache for your first steps on First Light Shore.';
}
