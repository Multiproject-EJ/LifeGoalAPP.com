# DEVPLAN — World Site Front Layer for LifeGoalApp (Mobile-first, game-lobby feel)

## Why this plan exists

This plan formalizes the new **public world-site layer** while protecting the existing authenticated app experience. It is intentionally structured so any engineer/agent can pick up work slice-by-slice without guessing route contracts, auth behavior, or asset rules.

---

## North Star

Ship a public, mobile-first world site at `/` that:

- Feels like an in-game lobby/world map (not a typical marketing page).
- Gives clear actions for:
  - Continue Journey
  - Log in
  - Add to Home Screen
- Preserves the existing app experience and auth flow.

### Product outcomes (success metrics)

- **Activation:** increase `% of first-time visitors who tap Continue Journey or Log in`.
- **Install intent:** increase `% of eligible mobile users who tap install CTA`.
- **No-regression:** keep auth-success rate and app-open success rate flat or improved after introducing `/` world shell.
- **Performance:** mobile `/` loads quickly enough to feel immediate (target budgets below).

---



## Performance SLOs (hard gates)

These SLOs are required for Slice 1–4 releases on mobile-first surfaces.

### Mobile web budgets (target device: modern iPhone + mid-tier Android)

- **LCP:** <= 2.5s (p75)
- **CLS:** <= 0.10 (p75)
- **INP:** <= 200ms (p75)
- **TTFB:** <= 800ms (p75)

### Payload budgets for world layer

- Additional world-route JS: <= 120KB gzip (initial target)
- Hero background image (`world-bg-main.webp`): <= 250KB
- Non-critical world assets: lazy loaded; no blocking fetches on first paint

### Enforcement

- Every slice PR must include a before/after perf snapshot.
- If any SLO regresses beyond threshold, block rollout to broader audience.

---



## Ownership model (RACI-lite)

Assign explicit owners before Slice 1 implementation begins.

| Area | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Route contract (`/`, `/login`, `/app`) | Frontend engineer | Tech lead | Product owner | QA |
| Auth redirect + `next` safety | Frontend engineer | Tech lead | Security reviewer | QA |
| PWA compatibility/signoff | PWA engineer | Tech lead | Frontend engineer | Product owner |
| Rollout flags + release | Release manager | Product owner | Tech lead | Support |
| Telemetry + dashboards | Analytics engineer | Product owner | Frontend engineer | QA |

---

## Invariants (must never break)

1. Existing authenticated app behavior remains accessible.
2. Existing route behavior for current deep links stays functional during migration.
3. `/login` remains a stable login entry point once introduced.
4. World-site code/assets remain separately loadable from core app UI code.
5. PWA installability and service worker behavior remain intact.

### PWA preservation charter (non-destructive integration)

Treat PWA behavior as a protected subsystem while adding the world-site layer:

- Keep one authoritative app manifest flow during migration (avoid conflicting starts/scopes).
- Do not change service-worker registration path/scope unless a migration step explicitly requires it.
- Preserve offline/open behavior for existing installed users.
- Test both browser-tab mode and standalone installed mode for every route change.
- If any install/open regression appears, halt slice rollout and rollback route changes first.

### Definition of ready (before starting any slice)

- A short hypothesis is written: “If we ship X in this slice, we expect Y behavior change.”
- Route/auth impact is explicitly called out (none / low / medium / high).
- Test commands are listed before coding starts.
- Rollback path is noted (what to revert or feature-flag off).

---

## Current baseline (from repo audit)

- The React app is currently mounted from `index.html` at `/` with no router library; routing is done through `window.location` checks in `App.tsx`.
- Current special in-app paths are `/`, `/journal`, and `/breathing-space`.
- Auth today is an in-app auth gate/overlay; there is no dedicated `/login` route yet.
- Session is retrieved using Supabase `auth.getSession()` and kept in sync via `onAuthStateChange`.
- PWA is configured via `manifest.webmanifest` and registered via `registerServiceWorker()` in production.

(See `docs/world-site-baseline.md` for the detailed table.)

---

## Repo map (target-state guidance)

```text
/src
  /world              # new public world-site components/routes
  /app                # app-shell route wrappers/adapters (auth-required)
  /auth               # login-related route components
/public
  /world-assets       # static world images (WebP, compressed)
/docs
  DEVPLAN-world-site.md
  world-site-baseline.md
```

If exact folders differ, preserve the **separation of concerns**:
- world experience code should not inflate core app payload.
- auth/app contracts should be explicit.

---

## Execution model

- Work in vertical slices.
- Each slice must be shippable on its own.
- Each slice includes:
  - scope
  - explicit tasks
  - definition of done
  - verification commands
  - known risks

### Step-by-step collaboration loop (recommended)

For each slice, run this sequence:

1. **Clarify scope in one paragraph** (what this slice is and is not).
2. **Lock contracts** (routes, auth behavior, event names, asset names).
3. **Ship the thinnest vertical implementation**.
4. **Verify with explicit command checklist**.
5. **Capture learnings** (what changed, what to adjust in next slice).

This keeps momentum while preventing route/auth regressions.

---

## User POV experience blueprint (what it should feel like)

From a mobile user perspective, the experience should feel like this:

1. **Open site** → instantly see a polished “world lobby” with one clear primary action.
2. **Recognize continuity** → copy and visuals communicate “continue your journey,” not “start from zero.”
3. **Tap Continue Journey**:
   - if authenticated: immediate handoff to app (`/app`) with no confusion,
   - if guest: clean login flow, then returned to intended destination.
4. **Optional install prompt** appears only when contextually helpful and never blocks progress.
5. **Installed experience** feels app-like and continuous (launch icon → expected screen, no weird route jumps).

### Emotional design targets

- **First 3 seconds:** clarity + curiosity.
- **First interaction:** confidence (no dead-end choice).
- **After login/install:** momentum (fast continuation into app loop).

### Anti-goals (what we explicitly avoid)

- Marketing-style text wall above the fold.
- Forced install prompts before user intent.
- Auto-redirect loops that disorient users.
- Breaking existing installed-user expectations.

---

## Route contract roadmap (target end-state)

| Path | Auth | Purpose | Owner layer |
|---|---|---|---|
| `/` | Public | World site entry/lobby | `src/world` |
| `/login` | Public | Authentication entry | `src/auth` |
| `/app` | Required | Main app shell | `src/app` |
| `/app/*` | Required | App deep links | `src/app` |
| `/lobby` (optional) | Required | Post-login bridge | `src/world` + auth |
| `/journal`, `/breathing-space` | Compat | Legacy direct links during migration | redirect/mapping layer |

### Redirect policy draft

- Never auto-redirect users away from `/`.
- On protected routes, redirect to `/login?next=<encoded-path>` when logged out.
- After successful login, send users to `next` when present; otherwise `/app` (or `/lobby` when enabled).
- In installed standalone mode, preserve app-like continuity (no jarring bounce between public and protected surfaces).
- **Standalone exception:** When `display-mode: standalone` is detected (installed PWA), `/` immediately resolves to the app experience (`/app` equivalent). The public World Site is only shown to browser-tab visitors. This prevents installed PWA users from seeing a redundant landing page.

### Mobile-first world-site UI contract

- Design for 390x844 first (modern iPhone baseline), then scale out.
- Reserve safe zones: top controls remain clear of notch; bottom CTA clears home indicator.
- World CTAs stay thumb-reachable in lower half where practical.
- Above-the-fold content must communicate identity + one primary action quickly.
- Avoid dense copy blocks; prioritize visual progression + short microcopy.

---

## Slice 0 — Discover + freeze behavior (completed before major route changes)

### Goal
Document current route/auth/PWA behavior and lock migration constraints.

### Tasks
- [x] Inventory current path handling.
- [x] Document auth guard behavior as-implemented.
- [x] Document SW + manifest installability baseline.
- [x] Confirm Supabase session retrieval mechanism.

### Deliverable
- `docs/world-site-baseline.md`

### Definition of done
- Plain language statements for logged-out/logged-in behavior are documented.
- Migration assumptions are explicit.

---

## Slice 1 — Introduce public `/` world shell (no app breakage)

### Goal
Render a distinct public world shell at `/` while keeping current app entry behavior available through a compatibility path.

### Tasks
- [x] Introduce a route-resolution layer (minimal internal router or pathname switchboard module).
- [x] Add world-shell component for `/` with:
  - brand mark
  - `Log in` CTA
  - `Continue Journey` CTA
- [x] Add one Tier-1 background asset to prove asset pipeline. (CSS-only atmospheric background: star/particle field + floating orbs implemented in Slice 2)
- [x] Implement CTA contract:
  - authenticated → `/app`
  - unauthenticated → `/login`

### Definition of done
- `/` no longer auto-forces auth.
- World shell renders consistently on mobile.
- Existing app can still be reached.

### Verification commands
- [x] `npm run build`
- [ ] `npm run dev` then manually test:
  - [x] visit `/` while logged out → world shell, no forced redirect
  - [ ] tap Continue Journey while logged out → `/login`
  - [ ] tap Continue Journey while logged in → `/app`
  - [x] installed PWA still launches and reaches app surface without route errors

### Risks
- accidental replacement of current root behavior before `/app` alias exists.

---

---

## Slice 2 — Rich Game-Lobby Landing Page (WorldHome)

### Goal
Transform the Slice 1 skeleton WorldHome into a production-quality, immersive game-lobby landing page.

### Tasks
- [x] Atmospheric background layer: CSS-only star/particle field (`::before` radial-gradient dots) + 3 slow-drifting floating orbs (`@keyframes wh-orb-float`).
- [x] Brand zone: enhanced logo with glow shadow, `WORLD 1` level badge, updated app-name gradient, updated tagline ("Your quest to level up starts here").
- [x] Feature showcase zone: three horizontal-scroll glassmorphic cards (Goals & Quests, Habits & Streaks, Level Up) with scroll-snap on mobile and side-by-side layout on 640px+.
- [x] CTA zone: primary button pulsing-glow animation, secondary glassmorphic button, conditional "Add to Home Screen" text-link button.
- [x] `WorldHome` props extended: `onLogin`, `installPromptAvailable`, `onInstallPrompt`.
- [x] `main.tsx` Root updated: `onLogin` callback, `loginOnEntry` state (plumbing ready for Slice 3), `beforeinstallprompt` event capture + trigger.
- [x] Responsive: 390px baseline → 640px tablet → 1024px desktop.
- [x] Accessibility: `:focus-visible` outlines, `prefers-reduced-motion` disables all animations, WCAG AA contrast for all text.
- [x] Footer: copyright + `v1.0` version indicator.

### Definition of done
- Rich game-lobby UI visible at `/` in browser mode.
- Standalone PWA still skips world site.
- `/journal` and `/breathing-space` still work.
- `npm run build` passes.

### Verification commands
- [x] `npm run build`
- [x] `npm run dev` — rich world site at `/`
- [x] Install prompt button conditionally renders when `beforeinstallprompt` fires

---

## Slice 3 (formerly Slice 2) — Establish official route contract (`/`, `/login`, `/app`)

### Goal
Make route architecture explicit and stable.

### Tasks
- [x] Introduce `/login` page (reuses current auth card logic via `forceAuthOnMount` prop).
- [x] Introduce `/app` as official authenticated app shell entry.
- [x] Keep `/journal` and `/breathing-space` functioning (compatibility mapping in `resolveRoute`).
- [x] Add `safeNext.ts` auth guard utility for `?next=` parameter validation.
- [x] Wire `loginOnEntry` from Root → App (`forceAuthOnMount` prop).
- [x] Implement safe `?next=` parameter handling with security validation.

### Definition of done
- Logged out opening `/app` shows auth gate (equivalent to `/login` redirect behavior).
- Logged in opening `/app` opens main app.
- `/login` route → shows app with auth panel open on login tab.
- Deep links preserve behavior or have deliberate redirects with no dead ends.

### Verification commands
- [x] `npm run build`
- [ ] `npm run dev` then manually test:
  - [ ] logged out: open `/app` → shows auth gate
  - [ ] logged in: open `/app` → app shell
  - [ ] open `/login` → auth panel open on login tab
  - [ ] open legacy `/journal` and `/breathing-space` links → mapped route behavior
  - [ ] installed mode deep-links do not break (`/app`, legacy links, refresh behavior)
  - [ ] `?next=` parameter sanitized (rejects `https://evil.com`, `//evil.com`, `javascript:alert(1)`)

### Risks
- existing direct bookmarks to root-based in-app pages.

---

## Slice 3 — Install UX (A2HS) with respectful prompting

### Goal
Encourage install from world layer without intrusive UX.

### Tasks
- [ ] Add install state detection:
  - standalone mode
  - Android `beforeinstallprompt`
  - iOS manual guidance
- [ ] Show one install module only when eligible.
- [ ] Persist dismissal state in local storage with cooldown.

### Definition of done
- Android prompt only appears from user gesture.
- iOS gets clear manual add instructions.
- Installed users see “Open App” behavior.

### Verification commands
- [ ] `npm run build`
- [ ] Manual mobile checks (Android + iOS Safari where possible):
  - [ ] eligible Android sees install affordance
  - [ ] install prompt only after click
  - [ ] iOS gets coachmark guidance and dismiss persistence
  - [ ] install UX never blocks Continue Journey / Log in primary paths

---

## Slice 4 — 80% visual feel pack (asset-first)

### Goal
Shift from CSS-only to image-led “game lobby” visual language.

### Priority asset list
1. `world-bg-main.webp`
2. `panel-glass-xl.webp`
3. `btn-primary-continue.webp`
4. `fx-bottom-glow.webp`
5. `journey-node-active.webp`
6. `journey-path-glow.webp`
7. `role-philosopher-card.webp`
8. `reward-trait-card-pack.webp`
9. `reward-xp-orb.webp`
10. `world-bg-blur.webp`

### Tasks
- [ ] Add `/public/world-assets/` pipeline.
- [ ] Preload only primary background.
- [ ] Lazy-load secondary assets via intersection observer.
- [ ] Build `WorldHero` using image layers.

### Definition of done
- Visual identity reads “mobile game lobby”.
- Smooth scrolling on iPhone-class devices.
- App bundle remains controlled.

### Performance budgets (initial guardrails)

- Keep additional JS for world shell minimal (prefer static assets + CSS positioning).
- Avoid importing large world assets into TS modules when static URLs suffice.
- Preload only `world-bg-main.webp`; all others lazy/deferred.

---

## Slice 5 — Journey preview section

### Goal
Show progression at first scroll.

### Tasks
- [x] Add `JourneyPreview` with 5–7 nodes and path art.
- [x] Keep animation subtle and battery-friendly.
- [x] Add progression microcopy.

### Definition of done
- It visually communicates “continue progression”, not static content.

---

## Slice 6 — Archetype picker (identity hook)

### Goal
Swap feature marketing for identity-led onboarding.

### Tasks
- [x] Add 3–6 archetype cards (duplicates allowed initially).
- [x] Expand card details on select.
- [x] Persist selected archetype locally.

### Definition of done
- Archetype selection survives refresh.
- Interaction feels like class selection.

---

## Slice 7 — Rewards tease strip

### Goal
Signal reward loop quickly.

### Tasks
- [ ] Add compact rewards strip (XP orb, trait pack, zen seed placeholder).
- [ ] Add concise copy only.

### Definition of done
- Loop promise is clear without text-heavy sections.

---

## Slice 8 — Optional `/lobby` post-login bridge

### Goal
Enable a thematic post-login bridge before entering full app.

### Tasks
- [ ] Add `/lobby` (auth-required).
- [ ] Show minimal profile summary (avatar, level, streak, quest).
- [ ] CTA to `/app`.

### Definition of done
- Fast, lightweight transition experience.

---

## Slice 9 — Trust + SEO layer

### Goal
Support sharing/indexing/trust.

### Tasks
- [ ] Add `/privacy`, `/terms`, `/support` pages.
- [ ] Add base SEO metadata + OG image for `/`.

### Definition of done
- Shared links render polished previews.
- Trust pages are reachable from footer.

---

## Slice 10 — Analytics events

### Goal
Track adoption events without noise.

### Event contract
- `world_view`
- `continue_click`
- `login_click`
- `install_view`
- `install_click`
- `install_dismiss`
- `archetype_select`

### Definition of done
- Single event per user action.
- Works on mobile Safari and Chrome.

### Event payload guidance

Common fields (where available):
- `platform` (`ios`, `android`, `desktop`)
- `is_standalone`
- `path`
- `session_state` (`authed`, `guest`)

Keep payloads lean and stable to avoid analytics drift.

### Event spec table (v1)

| Event | Required properties | Optional properties | Fires when | Dedupe rule |
|---|---|---|---|---|
| `world_view` | `path`, `platform`, `session_state` | `is_standalone` | World route first visible | 1x per page view |
| `continue_click` | `path`, `platform`, `session_state` | `is_standalone` | User taps Continue Journey | 1x per click |
| `login_click` | `path`, `platform`, `session_state` | `is_standalone` | User taps Log in | 1x per click |
| `install_view` | `path`, `platform` | `is_standalone` | Install module rendered eligible | 1x per view session |
| `install_click` | `path`, `platform` | `is_standalone` | User taps install CTA | 1x per click |
| `install_dismiss` | `path`, `platform` | `dismiss_ttl_days` | User dismisses install module | 1x per dismiss action |
| `archetype_select` | `path`, `platform`, `archetype_id` | `session_state` | User selects archetype card | 1x per selection |


---

## Cross-slice quality gates

- Mobile safe-area aware layout (top ~120px, bottom ~140px constraints).
- No unexpected CLS spikes.
- Keep world assets static + lazy-loaded.
- Maintain compatibility with service worker + manifest flow.
- Validate route invariants on every slice.

### Accessibility gates

- CTA buttons meet touch target size (44px+).
- Color contrast is readable over art backgrounds.
- Decorative imagery does not block semantic headings/buttons.
- Keyboard focus order remains logical on desktop.

### Rollout and rollback gates

- Prefer feature flag for new route behavior during initial rollout.
- Rollback must be one deploy (or flag off) without DB changes.
- Keep compatibility mapping until analytics confirms low legacy-route usage.

### PWA regression matrix (required each route-affecting slice)

- **Android Chrome (browser tab):** `/`, `/login`, `/app`, Continue Journey routing.
- **Android Chrome (installed):** launch icon → expected entry, resume session, protected-route behavior.
- **iOS Safari (browser):** `/` rendering, iOS install guidance visibility logic.
- **iOS Home Screen (installed):** launch, session continuity, no blank/offline misroutes.
- **Desktop:** auth + route compatibility sanity checks.

---

## Working agreements for future PRs

Include this in PR summaries:
1. Slice implemented.
2. Files changed.
3. Exact test steps and commands.
4. Next slice + key risks.

---

## Immediate next action

Proceed with **Slice 1** implementation after baseline approval:
- add public world shell at `/`
- introduce explicit `/login` and `/app` contracts behind a minimal route switchboard
- preserve current app behavior through compatibility mapping

---

## Suggested “step-by-step improvement session” agenda

Use this sequence when we refine the plan together before coding each slice:

1. **Lock one slice only** (no multitasking).
2. **Decide route/auth contracts in plain language** for that slice.
3. **List exact files likely to change**.
4. **Write 5–8 manual test steps before coding**.
5. **Call out one failure mode + rollback plan**.
6. **Ship, verify, and update this plan status table.**

If you want, we can start this immediately with **Slice 1 contract lock** and produce the exact route switchboard behavior next.


---

## Slice 1 implementation pack (ready-to-build checklist)

Use this as the “build now” micro-spec once decisions are locked.

### Candidate file plan

- `src/world/WorldHome.tsx` (new world-shell view)
- `src/world/world.css` (mobile-first layout + safe-area handling)
- `src/auth/LoginRoute.tsx` (route wrapper around existing auth UI)
- `src/app/AppRoute.tsx` (wrapper that mounts existing app shell)
- `src/routes/resolveRoute.ts` (minimal pathname switchboard)
- `src/main.tsx` or `src/App.tsx` (route-entry integration)
- `public/world-assets/world-bg-main.webp` (initial Tier-1 visual)

### Minimal acceptance tests (manual)

1. Logged out → open `/` → world shell appears (no forced redirect).
2. Logged out → Continue Journey → `/login?next=%2Fapp`.
3. Login success → redirects to `/app` (or valid `next`).
4. Logged in → open `/` → world shell still public (no forced app redirect).
5. Logged in → Continue Journey → `/app`.
6. Legacy `/journal` and `/breathing-space` behave per compatibility policy.
7. Installed mode launch still opens expected surface without blank screen.

### Code review gates (must pass)

- No SW scope/start-url breaking changes sneaked in.
- No heavyweight world assets imported into app shell JS bundle.
- Redirect handling sanitizes `next` parameter safely.
- Route switchboard has explicit fallback behavior.

---

## PR template snippet for slice delivery

Copy into each slice PR summary:

- **Slice:**
- **Route/Auth impact level:** none / low / medium / high
- **Files changed:**
- **Verification commands run:**
- **Manual mobile checks performed:**
- **PWA installed-mode checks performed:**
- **Rollback plan:**
- **Next slice + risks:**


---

## Launch gating and rollback thresholds (hard numbers)

Use explicit numbers to remove ambiguity during rollout.

### Rollback triggers

Rollback (or flag off) if any trigger is met after rollout:

- Login success rate drops by >= 2.0 percentage points vs 7-day baseline for 30 minutes.
- `/app` route error rate exceeds 0.5% of opens for 15 minutes.
- Standalone launch failures exceed 1.0% for 15 minutes.
- Route-not-found or blank-shell reports exceed 0.3% of sessions for 15 minutes.

### Go/no-go ownership

- **Release driver:** Product/engineering owner for world-site slice.
- **PWA safety signoff:** Engineer validating installed-mode matrix.
- **Rollback authority:** On-call engineer + product owner.

### Post-release check windows

- T+15 min: smoke checks + metrics sanity.
- T+60 min: trigger threshold validation.
- T+24h: compare against baseline trend and decide progression.


---

## Security and edge-case matrix (required before Slice 2 rollout)

Validate these route/auth edge cases before enabling `app_route_contract_v2` broadly.

| Case | Expected behavior | Status |
|---|---|---|
| `next=/app` | Allowed; redirects to `/app` post-login | [ ] |
| `next=%2Fapp%2Fjournal` | Allowed relative path; redirects safely | [ ] |
| `next=https://evil.com` | Rejected; fallback to `/app` | [ ] |
| `next=//evil.com` | Rejected; fallback to `/app` | [ ] |
| `next=javascript:alert(1)` | Rejected; fallback to `/app` | [ ] |
| malformed/invalid encoding | Rejected; fallback to `/app` | [ ] |
| stale auth session on protected route | redirected to `/login` with safe `next` | [ ] |
| auth callback missing `next` | fallback to `/app` | [ ] |
| refresh on `/app/*` in standalone | stable route resolution; no blank shell | [ ] |
| unknown path | deterministic fallback policy applied | [ ] |

---

## Device/browser coverage matrix (minimum release gate)

A slice with route/auth/PWA changes cannot ship without this minimum matrix pass.

| Platform | Browser/Mode | Minimum version | Required checks |
|---|---|---|---|
| iOS | Safari (browser) | iOS 16.4+ | `/`, login flow, install guidance visibility |
| iOS | Home Screen (installed) | iOS 16.4+ | launch continuity, `/app` access, refresh behavior |
| Android | Chrome (browser) | Chrome 120+ | `/`, `/login`, `/app`, Continue Journey flow |
| Android | Chrome (installed) | Chrome 120+ | launch icon continuity, protected-route behavior |
| Desktop | Chrome/Safari/Edge | Current stable | route compatibility + auth sanity |

### Coverage rule

- Minimum **1 real iPhone + 1 real Android** verification per route-affecting slice.
- Emulators can supplement but do not replace installed-mode checks.

---

## Slice timeline + confidence tracker

Use this to keep execution realistic and expose dependency risk early.

| Slice | Estimate | Confidence | Key dependency/blocker |
|---|---|---:|---|
| Slice 1 (public `/` shell) | 2–3 days | 0.80 | route switchboard integration |
| Slice 2 (route contract) | 2–4 days | 0.70 | legacy-route compatibility decisions |
| Slice 3 (install UX) | 2–3 days | 0.70 | cross-platform prompt behavior |
| Slice 4 (visual pack) | 3–5 days | 0.65 | asset production + compression pipeline |
| Slice 5–7 (journey/identity/rewards) | 4–7 days | 0.65 | final art + copy direction |
| Slice 8 (optional `/lobby`) | 2–4 days | 0.60 | lightweight profile summary contract |
| Slice 9–10 (SEO + analytics polish) | 2–4 days | 0.75 | trust-page content + analytics QA |

### Confidence rubric

- `0.80+` clear scope, low unknowns.
- `0.60–0.79` moderate integration risk.
- `<0.60` unknown dependencies not resolved.
