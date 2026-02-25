# World Site Baseline — Current Routing/Auth/PWA Behavior

This baseline captures current behavior before introducing a public world layer.

## 1) Route table (current behavior)

| Path | Current behavior | Source |
|---|---|---|
| `/` | Main React app mount. If unauthenticated on mobile, auth gate fills screen; desktop uses auth overlay on top of app shell. | `index.html`, `src/App.tsx` |
| `/journal` | Main app mounts and sets active nav to journal, then keeps URL in sync with nav state. | `src/App.tsx` |
| `/breathing-space` | Main app mounts and sets active nav to breathing space, then keeps URL in sync with nav state. | `src/App.tsx` |
| `/auth/callback.html` | Static callback page for auth OAuth callback handling. | `public/auth/callback.html` |
| `/login` | No dedicated route/page today (not implemented yet). | repo audit |
| `/app` | No dedicated route/page today (not implemented yet). | repo audit |

## 2) Auth behavior baseline

- Auth state is provided by `SupabaseAuthProvider`.
- Session initialization:
  - `supabase.auth.getSession()` on provider startup.
  - `supabase.auth.onAuthStateChange(...)` subscription for updates.
- `App.tsx` defines `shouldRequireAuthentication = !isAuthenticated && !isDemoMode`.
- When auth is required:
  - mobile: returns a full auth-gate layout.
  - desktop: shows auth overlay while keeping app shell mounted.

### Plain-language behavior statements

- If I am logged out and open `/`, I am shown authentication UI before full app use.
- If I am logged in and open `/`, I access the app experience.
- If I open `/journal` or `/breathing-space`, the app sets that view as active.
- There is no `/app` route contract yet; this must be introduced in migration.

## 3) PWA/installability baseline

- Manifest linked in `index.html` via `/manifest.webmanifest`.
- Manifest currently uses:
  - `start_url: "/"`
  - `scope: "/"`
  - `display: "standalone"`
- Service worker registration is done in production via `registerServiceWorker()`.
- Registration target: `/sw.js` with scope `/`.
- Existing push-related worker file `public/service-worker.js` also exists (notification focused); primary app registration points to `/sw.js`.

## 4) Migration constraints confirmed

1. Routing currently relies on manual `window.location.pathname` checks rather than a full router package.
2. `/` currently behaves as app entry + auth gate; making `/` public requires introducing explicit app entry (`/app`) and login (`/login`) paths.
3. Existing deep links `/journal` and `/breathing-space` need compatibility handling during transition.
4. PWA manifest/service worker behavior should remain stable during route migration.

## 5) Open decisions to lock before Slice 1/2

1. Should `/login` be a full standalone page or reuse the current auth panel shell with minimal wrappers?
2. Should legacy `/journal` and `/breathing-space` routes become redirects to `/app/...` immediately or remain temporary direct mounts?
3. Should post-login default target be `/app` first, with `/lobby` behind a feature flag?
4. Should route gating be implemented in a minimal internal switchboard first, then upgraded to a router library later?


## 6) PWA/migration risk hotspots to watch

1. Manifest `start_url` currently points to `/`; changing root behavior without a compatibility strategy can impact installed launch expectations.
2. Service worker scope is `/`, so route-response behavior at root impacts both browser and installed experiences.
3. Any route migration must be tested with refresh/deep-link behavior (especially in standalone mode) to avoid blank shell states.
4. Because current routing is pathname-based in `App.tsx`, incremental route changes need strict fallback behavior for unknown paths.


## 7) Baseline user-journey expectations to preserve during migration

These expectations should remain true until explicitly changed by a planned slice:

1. Existing returning users can still reach core app functionality without confusion.
2. Auth gating remains understandable (users know what to do next).
3. Installed users launching from home screen do not land in broken/blank states.
4. Refreshing known paths does not dead-end users.

## 8) Migration readiness questions (must be answered before Slice 1)

1. Which feature-flag mechanism will control world-site rollout in production?
2. Where will route/auth regression telemetry be monitored during rollout windows?
3. Who owns go/no-go and rollback decisions for route-contract launch?
4. What is the explicit fallback if legacy-route compatibility fails in production?


## 9) Baseline metric table (fill before rollout)

Populate before enabling world-route rollout flags.

| Metric | 7-day baseline | Alert threshold | Owner |
|---|---:|---:|---|
| Login success rate | TBD | -2.0pp for 30m | Auth owner |
| `/app` route error rate | TBD | >0.5% for 15m | Frontend owner |
| Standalone launch failure rate | TBD | >1.0% for 15m | PWA owner |
| Route-not-found/blank-shell rate | TBD | >0.3% for 15m | Frontend owner |


## 10) Ownership assignments to fill pre-launch

Fill these before enabling any route-contract production flag.

| Domain | Owner | Backup |
|---|---|---|
| Route contract and redirects | TBD | TBD |
| PWA installed-mode verification | TBD | TBD |
| Rollout/rollback command | TBD | TBD |
| Analytics dashboard monitoring | TBD | TBD |


## 11) Baseline environment stamp

Record exact baseline capture context for traceability.

- Baseline capture date range: TBD
- App version / commit: TBD
- Manifest version/hash: TBD
- Service worker version/hash: TBD
- Notes: TBD
