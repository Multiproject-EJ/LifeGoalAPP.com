const PUBLIC_IDENTITY_FALLBACK = 'Explorer';

// Public identity labels appear in winner tables and shared surfaces. Keep one
// app-wide policy regardless of subscription tier: paying does not change the
// safety rules for other players.
const BLOCKED_PUBLIC_TOKENS = new Set([
  'asshole',
  'bastard',
  'bitch',
  'cunt',
  'dick',
  'fuck',
  'fucker',
  'motherfucker',
  'nazi',
  'nigger',
  'nigga',
  'pussy',
  'shit',
  'slut',
  'whore',
]);

function normalizeForModeration(value: string): string[] {
  const deLeeted = value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[@4]/g, 'a')
    .replace(/[3]/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[$5]/g, 's')
    .replace(/[7]/g, 't');
  const tokens = deLeeted.split(/[^a-z]+/).filter(Boolean);
  if (tokens.length > 1 && tokens.every((token) => token.length === 1)) {
    tokens.push(tokens.join(''));
  }
  return tokens;
}

export function containsBlockedPublicIdentityLanguage(value: string): boolean {
  return normalizeForModeration(value).some((token) => BLOCKED_PUBLIC_TOKENS.has(token));
}

export function validatePublicIdentityLabel(
  value: string,
  options: { label: string; maxLength?: number },
): string | null {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return `Choose a ${options.label.toLowerCase()} first.`;
  if (normalized.length > (options.maxLength ?? 40)) {
    return `${options.label} must be ${options.maxLength ?? 40} characters or fewer.`;
  }
  if (containsBlockedPublicIdentityLanguage(normalized)) {
    return `Choose a different ${options.label.toLowerCase()} for public game spaces.`;
  }
  return null;
}

export function cleanPublicIdentityLabel(
  value: string,
  fallback = PUBLIC_IDENTITY_FALLBACK,
  maxLength = 60,
): string {
  const normalized = value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
  if (!normalized || containsBlockedPublicIdentityLanguage(normalized)) return fallback;
  return normalized;
}
