import { isStandaloneMode } from './detectStandalone';

export type ResolvedRoute = 'world' | 'app' | 'login' | 'lobby' | 'privacy' | 'terms' | 'support' | 'unknown';

/**
 * Resolve current pathname to a route target.
 * - `/` in standalone mode → 'app' (skip world site for installed PWA users)
 * - `/` in browser mode → 'world' (show public landing)
 * - `/login` → 'login'
 * - `/lobby` → 'lobby' (auth-required post-login bridge)
 * - `/privacy` → 'privacy' (public trust page)
 * - `/terms` → 'terms' (public trust page)
 * - `/support` → 'support' (public trust page)
 * - `/app` or `/app/*` → 'app' (official authenticated app shell entry)
 * - `/journal`, `/breathing-space` → 'app' (legacy compat)
 * - everything else → 'app' (safe fallback)
 */
export function resolveRoute(pathname: string = window.location.pathname): ResolvedRoute {
  const normalized = pathname.replace(/\/+$/, '') || '/';

  if (normalized === '/') {
    return isStandaloneMode() ? 'app' : 'world';
  }
  if (normalized === '/login') return 'login';
  if (normalized === '/lobby') return 'lobby';
  if (normalized === '/privacy') return 'privacy';
  if (normalized === '/terms') return 'terms';
  if (normalized === '/support') return 'support';
  if (normalized === '/app' || normalized.startsWith('/app/')) return 'app';
  if (normalized === '/journal' || normalized === '/breathing-space') return 'app';
  // Safe fallback: render the app for any unknown route
  return 'app';
}
