export type AppSurface = 'habitgame' | 'peacebetween';

const PEACEBETWEEN_HOSTS = new Set(['peacebetween.com', 'www.peacebetween.com']);

export function resolveSurface(hostname?: string | null): AppSurface {
  const normalized = (hostname ?? '').toLowerCase();
  if (PEACEBETWEEN_HOSTS.has(normalized)) {
    return 'peacebetween';
  }
  return 'habitgame';
}

export function isConflictRoute(pathname?: string | null): boolean {
  return (pathname ?? '').startsWith('/conflict/');
}
