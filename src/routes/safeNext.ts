/**
 * Extract and validate the `next` query parameter.
 * Only allows relative paths starting with `/`.
 * Rejects absolute URLs, protocol-relative URLs, and javascript: URIs.
 * Falls back to `/app` if invalid or missing.
 */
export function getSafeNextPath(search: string = window.location.search): string {
  const DEFAULT = '/app';
  try {
    const params = new URLSearchParams(search);
    const next = params.get('next');
    if (!next) return DEFAULT;

    // Decode if needed
    let decoded: string;
    try {
      decoded = decodeURIComponent(next);
    } catch {
      return DEFAULT; // malformed encoding
    }

    // Must start with single /
    if (!decoded.startsWith('/')) return DEFAULT;
    // Reject protocol-relative URLs (//evil.com)
    if (decoded.startsWith('//')) return DEFAULT;
    // Reject javascript: and other protocol schemes
    if (/javascript:/i.test(decoded)) return DEFAULT;
    if (/data:/i.test(decoded)) return DEFAULT;
    if (/vbscript:/i.test(decoded)) return DEFAULT;
    // Reject if the path segment after stripping leading slashes looks like a scheme
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/i.test(decoded.replace(/^\/+/, ''))) return DEFAULT;

    return decoded;
  } catch {
    return DEFAULT;
  }
}
