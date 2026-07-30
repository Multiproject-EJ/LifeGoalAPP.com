export interface WelcomePackGiftCopyOptions {
  displayName?: string | null;
}

function normalizeWelcomePackDisplayName(displayName: string | null | undefined): string | null {
  if (typeof displayName !== 'string') return null;
  const trimmed = displayName.trim().replace(/\s+/g, ' ');
  return trimmed.length > 0 ? trimmed.slice(0, 48) : null;
}

export function buildWelcomePackGiftBody(options: WelcomePackGiftCopyOptions = {}): string {
  const displayName = normalizeWelcomePackDisplayName(options.displayName);
  if (displayName) {
    return `Captain Ivo left this welcome gift for ${displayName}'s first steps on First Light Shore.`;
  }
  return 'Captain Ivo left you a welcome gift for your first steps on First Light Shore.';
}
