import { isStandaloneMode } from './detectStandalone';

export type ResolvedRoute = 'world' | 'app' | 'login' | 'unknown';

/**
 * Resolve current pathname to a route target.
 * - `/` in standalone mode → 'app' (skip world site for installed PWA users)
 * - `/` in browser mode → 'world' (show public landing)
 * - `/journal`, `/breathing-space` → 'app' (legacy compat)
 * - `/login` → 'login' (future use, currently falls back to app)
 * - everything else → 'app' (safe fallback)
 */
export function resolveRoute(pathname: string = window.location.pathname): ResolvedRoute {
  const normalized = pathname.replace(/\/+$/, '') || '/';

  if (normalized === '/') {
    return isStandaloneMode() ? 'app' : 'world';
  }
  if (normalized === '/login') return 'login';
  if (normalized === '/journal' || normalized === '/breathing-space') return 'app';
  // Safe fallback: render the app for any unknown route
  return 'app';
}
