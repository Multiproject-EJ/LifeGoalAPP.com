import { isConflictRoute, resolveSurface } from '../surfaces/surfaceContext';

/** Keep a mounted app on a reloadable app route, not the public landing root. */
export function resolveWorkspaceHistoryUrl(workspace: string, href: string): string | null {
  const current = new URL(href);
  if (
    isConflictRoute(current.pathname)
    || (resolveSurface(current.hostname) === 'peacebetween' && current.pathname === '/')
  ) return null;

  const pathname = workspace === 'journal'
    ? '/journal'
    : workspace === 'breathing-space'
      ? '/breathing-space'
      : '/app';
  if (current.pathname === pathname) return null;
  // Use the current URL so consumed startup parameters are not resurrected.
  return pathname + current.search + current.hash;
}
