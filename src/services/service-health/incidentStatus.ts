/**
 * Remote incident status (Part 12).
 *
 * Incident messaging must not depend on the failing provider. An optional
 * status JSON can be hosted anywhere static (GitHub Pages, CDN, the app's own
 * origin). When unreachable or unconfigured, callers fall back to the generic
 * translated-error messaging — never to raw provider output.
 *
 * Expected document shape:
 *   { "active": true, "title": "…", "message": "…", "code": "…", "updatedAt": "…" }
 */

export interface RemoteIncident {
  active: boolean;
  title: string;
  message: string;
  code: string | null;
  updatedAt: string | null;
}

export type FetchLike = (
  url: string,
  init?: { signal?: AbortSignal },
) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

export interface FetchIncidentOptions {
  url: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** Parse a status payload defensively; malformed content yields null. */
export function parseIncidentPayload(payload: unknown): RemoteIncident | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.active !== 'boolean') return null;
  const title = asString(record.title);
  const message = asString(record.message);
  if (record.active && (!title || !message)) return null;
  return {
    active: record.active,
    title: title ?? '',
    message: message ?? '',
    code: asString(record.code),
    updatedAt: asString(record.updatedAt),
  };
}

/**
 * Fetch the external status document. Resolves null on any failure —
 * status checking must never become another source of errors.
 */
export async function fetchRemoteIncident(options: FetchIncidentOptions): Promise<RemoteIncident | null> {
  const fetchImpl = options.fetchImpl ?? (typeof fetch !== 'undefined' ? (fetch as FetchLike) : null);
  if (!fetchImpl || !options.url) return null;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeout = controller
    ? setTimeout(() => controller.abort(), options.timeoutMs ?? 5_000)
    : null;
  try {
    const response = await fetchImpl(options.url, controller ? { signal: controller.signal } : undefined);
    if (!response.ok) return null;
    return parseIncidentPayload(await response.json());
  } catch {
    return null;
  } finally {
    if (timeout !== null) clearTimeout(timeout);
  }
}
