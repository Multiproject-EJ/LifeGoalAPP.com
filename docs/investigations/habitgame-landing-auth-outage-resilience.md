# HabitGame landing/auth gate + Supabase auth outage resilience investigation

Date: 2026-05-18
Scope: no-code investigation only. No auth, Supabase, routing, CSS, asset, gameplay, or PeaceBetween implementation changes were made.

## Files inspected

- `src/main.tsx`
- `src/routes/resolveRoute.ts`
- `src/App.tsx`
- `src/features/auth/SupabaseAuthProvider.tsx`
- `src/lib/supabaseClient.ts`
- `src/index.css`
- `src/world/WorldHome.tsx`
- `src/world/WorldHero.tsx`
- `src/world/JourneyPreview.tsx`
- `src/world/ArchetypePicker.tsx`
- `src/world/RewardsTease.tsx`
- `src/surfaces/surfaceContext.ts`
- `src/surfaces/peacebetween/PeaceBetweenLanding.tsx`
- `src/surfaces/peacebetween/PeaceBetweenShell.tsx`
- `src/surfaces/peacebetween/peacebetween.css`
- `src/features/conflict-resolver/ConflictResolverEntry.tsx`
- `src/features/meditation/BreathingSpace.tsx`
- `index.html`
- `public/manifest.webmanifest`
- `docs/conflict-resolver/07_MONOREPO_SURFACES_AND_DOMAIN_ROUTING.md`

## 1. Current HabitGame public landing/auth gate

### Public landing before app/auth provider

The first public HabitGame landing surface is not in `App.tsx`. It is selected by `Root` in `src/main.tsx`:

- `NON_APP_ROUTES` includes `world`, `lobby`, `privacy`, `terms`, and `support`.
- `Root()` calls `resolveRoute()` and renders `WorldHome` when `showApp` and `showLobby` are false.
- `WorldHome` receives `onContinue`, `onLogin`, and `beforeInstallPromptEvent` props from `Root`.
- `onContinue` sets `showApp(true)`.
- `onLogin` sets `loginOnEntry(true)` and `showApp(true)`, which mounts `<App forceAuthOnMount={loginOnEntry} />` inside `SupabaseAuthProvider`.

Relevant components/functions/classes:

- `Root()` — `src/main.tsx`
- `resolveRoute()` — `src/routes/resolveRoute.ts`
- `WorldHome` — `src/world/WorldHome.tsx`
- `WorldHero` — `src/world/WorldHero.tsx`
- `JourneyPreview` — `src/world/JourneyPreview.tsx`
- `ArchetypePicker` — `src/world/ArchetypePicker.tsx`
- `RewardsTease` — `src/world/RewardsTease.tsx`
- CSS classes in `src/world/world.css` are used by these world-site components.

Current public landing copy visible to logged-out users includes:

- `HABITGAME`
- `Level Up Your Life`
- `LEVEL 1`
- `Your Life, Gamified`
- `Every habit earns XP. Every day builds momentum.`
- `Build Momentum`
- `Small actions compound into transformation.`
- `Earn Rewards`
- `Achievements, coins, and milestones celebrate progress.`
- `YOUR PATH`
- `Every day moves you forward`
- `See where your journey takes you`
- `Level 1: Start`
- `Your quest begins`
- `Streak ×3`
- `3 days in a row`
- `Quest Complete`
- `First habit mastered`
- `Reward Unlocked`
- `XP milestone reached`
- `Level Up`
- `New powers await`
- `Champion`
- `Top 10% of players`
- `Legend`
- `Your legacy lives on`
- `Start your first habit to unlock the path ✦`
- `CHOOSE YOUR CLASS`
- `Who are you in this game?`
- `Your archetype shapes your quests and rewards.`
- `REWARDS`
- `What you earn`
- `XP Orbs` / `Earn experience`
- `Trait Packs` / `Discover strengths`
- `Zen Seeds` / `Grow mindfulness`
- `Achievements` / `Unlock milestones`
- `Coins` / `Build your treasury`
- `Start Your Game`
- `Log in`
- `📱 Install App`
- `✓ Installed`
- `Build habits • Earn rewards • Unlock your future`
- `HabitGame © {year} · v1.0`
- `Privacy`, `Terms`, `Support`

### Auth gate / login / signup UI inside App.tsx

The current login/signup auth gate lives mostly inside `src/App.tsx`, not a dedicated landing component.

Relevant functions/components/state:

- `App({ forceAuthOnMount })`
- `useSupabaseAuth()` destructuring in `App`
- `forceAuthOnMount` effect that opens the login tab
- `handleAuthSubmit`
- `handleGoogleSignIn`
- `handleSignOut`
- `openAuthOverlay`
- `handleAccountClick`
- `renderAuthPanel`
- `statusElements`
- `shouldRequireAuthentication = !isAuthenticated`
- mobile full-page auth gate branch: `if (shouldRequireAuthentication && isMobileExperience)`
- desktop/tablet auth overlay branch: `shouldForceAuthOverlay`, `isAuthOverlayVisible`

Auth gate CSS classes in `src/index.css`:

- `.auth-layout`
- `.app--auth-gate`
- `.auth-gate__masthead`
- `.auth-gate__brand`
- `.auth-gate__theme-toggle`
- `.auth-gate__layout`
- `.auth-gate__panel`
- `.auth-panel`
- `.auth-card`
- `.auth-card__header`
- `.auth-card__body`
- `.auth-card__tabs`
- `.auth-tab`
- `.auth-tab--active`
- `.auth-tab-panel`
- `.auth-card__providers`
- `.auth-provider`
- `.auth-provider--google`
- `.auth-card__primary`
- `.auth-overlay`
- `.auth-overlay__backdrop`
- `.auth-overlay__dialog`
- `.auth-overlay__close`
- `.app--auth-overlay`
- `.workspace-shell--blurred`
- shared Supabase form/status classes such as `.supabase-auth__form`, `.supabase-auth__field`, `.supabase-auth__actions`, `.supabase-auth__action`, `.supabase-auth__divider`, `.supabase-auth__status`, `.supabase-auth__status--info`, `.supabase-auth__status--error`, `.supabase-auth__status--success`, `.supabase-auth__status--hidden`.

Auth actions are wired as follows:

- Email/password login: `renderLoginPanel()` form submits to `handleAuthSubmit()`, which calls `signInWithPassword({ email, password })` from `useSupabaseAuth()`.
- Email/password signup: `renderSignupPanel()` form submits to `handleAuthSubmit()`, which calls `signUpWithPassword(...)` from `useSupabaseAuth()` with `full_name` and `onboarding_complete: false` metadata.
- Google login/signup: Google buttons call `handleGoogleSignIn()`, which calls `signInWithGoogle()` from `useSupabaseAuth()`.
- Auth implementation: `SupabaseAuthProvider` calls Supabase `signInWithPassword`, `signUp`, `signInWithOAuth`, `resetPasswordForEmail`, and `signOut`.

Current auth gate copy shown to logged-out users includes:

- Brand/masthead: `HabitGame`
- Tabs: `Log in`, `Sign up`
- Login title/subtitle: `Welcome back`; `Log in to sync your rituals, goals, and check-ins across devices.`
- Signup title/subtitle: `Create your LifeGoal account`; `Sign up with email or Google to unlock your full ship.`
- Field labels/placeholders: `Email`, `you@example.com`, `Password`, `••••••••`, `Your name`, `Jordan Goalsetter`, `Create a secure password`
- Buttons/loading: `Log in`, `Signing in…`, `Sign up with email`, `Creating account…`
- Divider/provider buttons: `or`, `Continue with Google`, `Sign up with Google`
- Loading/error/success/status copy:
  - `Loading session…`
  - `Supabase credentials are not configured. Update your environment variables to enable live authentication.`
  - `Enter an email address to continue.`
  - `Enter a password to continue.`
  - `Signed in successfully.`
  - `Create a password to finish signing up.`
  - `Share your name so we can personalize your ship.`
  - `Check your email to confirm your account, then sign in to continue.`
  - `Redirecting to Google…`
  - `Unable to open Google sign-in.`
  - `Unable to complete the request.`
  - Supabase/provider error messages mapped by `SupabaseAuthProvider`, including missing credentials and HTTP/database schema errors.
- Desktop app shell logged-out auth entry copy: `Sign in`, `Hide sign-in`, `Authenticate with HabitGame`, `Close sign-in dialog`, `Sign in to your account`, `Open the sign-in dialog`.

## 2. Route/surface isolation

### HabitGame routing

`resolveRoute()` in `src/routes/resolveRoute.ts` is path-based:

- `/` renders `world` in browser mode or `app` in standalone PWA mode.
- `/login` renders `login`.
- `/lobby` renders `lobby`.
- `/privacy`, `/terms`, `/support` render public trust pages.
- `/app` and `/app/*` render the app shell.
- `/journal` and `/breathing-space` render the app shell for legacy compatibility.
- Unknown paths fall back to `app`.

`habitgame.app` and `lifegoalapp.com` are not separately branched in the current application code. `public/CNAME` points to `habitgame.app`; docs also reference `lifegoalapp.com`. In code, both non-PeaceBetween hostnames resolve to the default `habitgame` surface.

### PeaceBetween routing/isolation

PeaceBetween is isolated by hostname plus `/conflict/` paths:

- `src/surfaces/surfaceContext.ts` defines `resolveSurface(hostname)` and returns `peacebetween` only for `peacebetween.com` and `www.peacebetween.com`; all other hosts return `habitgame`.
- `isConflictRoute(pathname)` returns true for paths starting with `/conflict/`.
- `Root()` in `src/main.tsx` special-cases `peacebetween.com`/`www.peacebetween.com` at `/` so the app mounts rather than the generic `WorldHome` public landing.
- `App.tsx` computes `activeSurface` and renders `<PeaceBetweenLanding />` for PeaceBetween root `/`.
- `App.tsx` renders `<PeaceBetweenShell><ConflictResolverEntry surface="peacebetween" /></PeaceBetweenShell>` for PeaceBetween `/conflict/...` routes.
- In the HabitGame app, conflict resolver remains embedded under Breathing Space via `<ConflictResolverEntry surface="habitgame" />` in `BreathingSpace.tsx`.
- `App.tsx` also defaults `activeWorkspaceNav` to `breathing-space` on PeaceBetween hosts and opens the conflict tab for PeaceBetween or `/conflict/join` paths.

PeaceBetween files/routes/components:

- `src/surfaces/surfaceContext.ts`
- `src/surfaces/peacebetween/PeaceBetweenLanding.tsx`
- `src/surfaces/peacebetween/PeaceBetweenShell.tsx`
- `src/surfaces/peacebetween/peacebetween.css`
- `src/features/conflict-resolver/ConflictResolverEntry.tsx`
- `src/features/conflict-resolver/ConflictResolverExperience.tsx`
- `src/features/meditation/BreathingSpace.tsx` for the HabitGame-embedded conflict resolver surface.

Current PeaceBetween landing copy includes:

- `Peace Between`
- `A calmer way to begin a hard conversation.`
- `Guided prompts help both people feel heard, reduce escalation, and choose one clear next step together.`
- `Start a new conversation`
- `Have an invite link?`
- `Enter your token to continue where your conversation left off.`
- `Paste invite token`
- `Continue with invite`
- `What to expect`
- `Share your perspective`
- `Start with what feels important to you, in plain language.`
- `Understand each other`
- `Follow a neutral structure that keeps the conversation steady.`
- `Leave with one next step`
- `End with a practical action both people can commit to.`

### Explicit do-not-touch list for HabitGame landing redesign

Do not touch these when redesigning HabitGame landing/auth gate:

- `src/surfaces/peacebetween/PeaceBetweenLanding.tsx`
- `src/surfaces/peacebetween/PeaceBetweenShell.tsx`
- `src/surfaces/peacebetween/peacebetween.css`
- `src/surfaces/surfaceContext.ts`
- `src/features/conflict-resolver/**`
- `src/features/meditation/BreathingSpace.tsx` conflict resolver wiring
- PeaceBetween hostname handling in `src/main.tsx` and `src/App.tsx`
- `/conflict/new`, `/conflict/join`, and all `/conflict/...` route handling
- Supabase auth provider/client behavior in `src/features/auth/SupabaseAuthProvider.tsx` and `src/lib/supabaseClient.ts`, unless a specific resilience PR is scoped to auth fallback behavior
- Island Run/gameplay state/actions/services/components
- Existing PeaceBetween invite token form and conflict resolver surface config

## 3. Supabase auth outage behavior

### Startup/session initialization

`SupabaseAuthProvider` renders children immediately while it initializes. It does not block rendering at provider level.

Initialization flow:

1. Initial state: `session = null`, `initializing = true`, `supabase = null`.
2. First effect calls `getSupabaseClient()`.
3. If client creation succeeds, second effect calls `supabase.auth.getSession()` and subscribes to `onAuthStateChange`.
4. `getSession().then(...)` sets session and caches it via `setSupabaseSession(nextSession)`.
5. `.finally(...)` sets `initializing(false)`.
6. If there is no `supabase` client, the second effect sets `initializing(false)`.

Findings:

- `getSession()` has no explicit `.catch(...)`; a rejected promise would still run `.finally(...)`, so the auth UI can proceed, but the error is not converted into a user-facing startup auth error.
- There is no timeout around `getSession()`.
- If `getSession()` hangs indefinitely, `initializing` remains true indefinitely.
- `onAuthStateChange` is registered after starting `getSession()`, but if `getSession()` hangs, the auth panel remains in `Loading session…` because `initializing` never flips.

### `useSupabaseAuth()` initializing behavior

`useSupabaseAuth()` only reads context and throws if used outside `SupabaseAuthProvider`. It does not add a fallback, timeout, error UI, or offline awareness.

In `App.tsx`, `initializing` affects only `renderAuthPanel()` by replacing the login/signup form with `Loading session…`. The rest of `App` still renders based on `isAuthenticated`, which is false until a session exists.

### Auth actions failure behavior

- `signInWithPassword`, `signUpWithPassword`, `signInWithGoogle`, `sendPasswordReset`, and `signOut` throw if Supabase client is missing or if Supabase returns an error.
- `handleAuthSubmit()` catches errors and shows `authError` in `.supabase-auth__status--error`.
- `handleGoogleSignIn()` catches errors and shows `Unable to open Google sign-in.` or the thrown message.
- Google buttons are disabled when `submitting || !isConfigured`.
- Email/password buttons are disabled only while `submitting`; if Supabase is misconfigured, submit attempts throw a missing-credentials error and display it.

### Misconfiguration behavior

`getSupabaseClient()` throws when credentials are missing. `SupabaseAuthProvider` catches this during client setup, stores the error internally, sets `supabase = null`, and the second effect sets `initializing(false)`. The auth panel then renders normally plus this visible error:

`Supabase credentials are not configured. Update your environment variables to enable live authentication.`

Submitting email/password then throws the provider/client missing-credentials error.

### Offline/network/unavailable behavior

There is no explicit offline detection in the auth gate/provider:

- No `navigator.onLine` auth gate branch was found.
- No `online`/`offline` event listener was found in the auth provider or app auth gate.
- No network-specific auth fallback copy was found.
- No retry button specific to auth initialization was found.
- No timeout/fallback state exists for hanging Supabase calls.

Offline or Supabase outage behavior depends on Supabase JS promise behavior. If calls reject, the user eventually sees an error after submitting. If calls hang, the user can remain in a loading/submitting state.

### Blank/white screen risk answers

- Could the user see a blank/white screen? **Possible but not the dominant auth-gate behavior.** The provider renders children immediately, so normal auth initialization should not create a white screen. However, the `/lobby` route explicitly returns `null` while `initializing` and while redirecting unauthenticated users, so a hanging auth initialization on `/lobby` can be blank. A render-time exception outside existing boundaries could also blank the app.
- Could the landing page fail to render because auth initialization blocks rendering? **The public `WorldHome` landing does not depend on SupabaseAuthProvider, so `/` browser-mode HabitGame landing should still render.** The app auth gate inside `App.tsx` can be stuck at `Loading session…` if auth initialization hangs.
- Is there a timeout/fallback state? **No.** No auth initialization timeout was found.
- Is there an offline/error UI? **Partial.** Misconfigured Supabase has a visible auth-panel error. Sign-in/sign-up/Google failures are caught and shown. There is no explicit offline UI and no startup `getSession()` failure UI.
- Is there a recoverable error boundary around the auth gate? **No.** `RecoverableErrorBoundary` is used for `LevelWorldsHub` entry modal, not around `SupabaseAuthProvider`, `App`, `WorldHome`, or `renderAuthPanel()`.
- Does mobile behave differently from desktop? **Yes.** Mobile unauthenticated app entry returns a full-page `.app--auth-gate` with only the auth card. Desktop/tablet unauthenticated app entry renders the app shell behind a forced `.auth-overlay`, with `.workspace-shell--blurred` and a modal auth card. During a hang, mobile shows the standalone card with `Loading session…`; desktop shows the overlay card with `Loading session…` over the blurred shell.
- Does PeaceBetween behave differently? **Yes.** PeaceBetween root `/` renders `PeaceBetweenLanding` from `App.tsx` before the HabitGame auth gate branch, so it is not replaced by the HabitGame login/signup UI. PeaceBetween `/conflict/...` routes render `PeaceBetweenShell` and `ConflictResolverEntry surface="peacebetween"`. PeaceBetween is still mounted inside `SupabaseAuthProvider`, so a provider-level render exception would affect it, but normal auth initialization does not block the PeaceBetween landing render.

## 4. Landing redesign implementation map

Safest future implementation approach:

1. Extract a dedicated auth gate component before changing visuals.
   - Recommended name: `HabitGameLanding` if it owns the logged-out landing composition, or `AuthGateLanding` if it only wraps the login/signup panel.
   - Keep auth action functions and auth state in `App.tsx` initially.
   - Move only JSX and presentation composition out of `App.tsx`.
2. Reuse the existing auth panel behavior first.
   - Keep `handleAuthSubmit`, `handleGoogleSignIn`, `authError`, `authMessage`, `submitting`, `activeAuthTab`, `setActiveAuthTab`, and `isConfigured` unchanged.
   - Preserve the existing `renderAuthPanel()` semantics or convert it into a prop-driven child only after extraction is stable.
3. Props/actions the extracted component would need:
   - `activeAuthTab`
   - `onAuthTabChange`
   - `initializing`
   - `isConfigured`
   - `submitting`
   - `email`, `password`, `fullName`
   - setters or field-specific handlers for email/password/fullName
   - `onAuthSubmit`
   - `onGoogleSignIn`
   - `authMessage` / `authError` or a rendered `statusElements` node
   - optional `onThemeToggle` is not needed if `ThemeToggle` remains directly rendered as a component
4. CSS placement:
   - Short term: keep existing auth CSS in `src/index.css` while extracting to avoid visual drift.
   - Visual redesign PR: add a scoped stylesheet such as `src/features/auth/HabitGameLanding.css` or a clearly separated section in `src/index.css` with `habitgame-landing__*`/`auth-gate__*` classes.
   - Avoid modifying `src/surfaces/peacebetween/peacebetween.css`.
5. Static asset placement:
   - Reuse current public landing assets in `public/landing-page-assets/` where possible.
   - Put new production landing imagery under `public/landing-page-assets/` or a scoped subfolder such as `public/landing-page-assets/fantasy/`.
   - Keep app icons in `public/icons/` unless replacing global PWA icons in a separate scoped PR.
6. Keep redesign visual-only:
   - Do not change `SupabaseAuthProvider` auth methods in the visual PR.
   - Do not change `resolveRoute`, `resolveSurface`, or PeaceBetween routing.
   - Do not change `handleAuthSubmit`, `handleGoogleSignIn`, or auth metadata payloads.
   - Do not add gameplay state writes or Island Run runtime state reads/writes.
   - Snapshot existing copy/CTA behavior before visual changes and preserve action wiring.

## 5. Asset inventory

Existing reusable assets found:

### Logo/app/brand

- `public/icons/app-icon-192.png`
- `public/icons/app-icon-512.png`
- `public/icons/app-icon-1024.png`
- `public/icons/app-icon-192old.png`
- `public/icons/app-icon-512old.png`
- `public/icons/app-icon-1024old.png`
- `src/assets/V2iconmini.png`
- `src/assets/V2_app_icon_small_light.png`
- `src/assets/V2_app_icon_large_dark.png`

### Current landing/world assets

- `public/landing-page-assets/world-bg-main.webp`
- `public/landing-page-assets/world-bg-blur.webp`
- `public/landing-page-assets/panel-glass-xl.webp`
- `public/landing-page-assets/fx-bottom-glow.webp`
- `public/landing-page-assets/journey-path-glow.webp`
- `public/landing-page-assets/journey-node-active.webp`
- `public/landing-page-assets/reward-xp-orb.webp`
- `public/landing-page-assets/reward-trait-card-pack.webp`
- `public/landing-page-assets/role-philosopher-card.webp`
- `public/landing-page-assets/btn-primary-continue.webp`

### Island/game/background assets

- `public/assets/islands/backgrounds/level-bg-01.webp`
- `public/assets/islands/backgrounds/level-bg-02.webp`
- `public/assets/islands/backgrounds/level-bg-03.webp`
- `public/assets/islands/backgrounds/level-bg-04.webp`
- `public/assets/islands/backgrounds/level-bg-05.webp`
- `public/assets/islands/backgrounds/level-bg-06.webp`
- `public/assets/islands/backgrounds/level-bg-07.webp`
- `public/assets/islands/backgrounds/level-bg-012.webp`
- `public/assets/islands/island-001/board/board-circle-inner.webp`
- `public/assets/islands/island-001/board/board-circle-inner2.webp`
- `public/assets/islands/island-001/scenery/battle-arena-crystal.webp`
- `public/assets/islands/island-001/landmarks/hatchery-l3.webp`
- `public/assets/islands/celebrations/newisland/backgroundceleb.webp`
- `public/assets/islands/celebrations/newisland/islandcompletetext.webp`
- `public/assets/islands/landmarks/*.webp`
- `public/assets/islands/path/path_overlay_001.svg`, `_002.svg`, `_003.svg`
- `public/assets/islands/depth/depth_mask_001.svg`, `_002.svg`, `_003.svg`

### Small icon/reward/onboarding-like assets

- `public/assets/icons/check.svg`
- `public/assets/icons/eye.svg`
- `public/assets/icons/target.svg`
- `public/assets/icons/ingamedice.webp`
- `public/assets/icons/starstodayswin.webp`
- `public/assets/ikigai/ikigai-diagram.svg`
- `public/assets/Eggs/*.webp`
- `public/assets/creatures/*.webp`
- `public/icons/score_collection.webp`
- `public/icons/Score_tab_leaderboard.webp`
- `public/icons/Scoreshop_garage.webp`
- `public/icons/ai_coach/Aicoach_large.webp`
- `public/icons/ai_coach/aicoach_small.webp`
- `public/icons/todays_win/*.webp`
- `src/assets/Score_achievements.webp`
- `src/assets/Score_zengarden.webp`
- `src/assets/Score_shop.webp`
- `src/assets/score_Bank.webp`
- `src/assets/board_topbar.webp`
- `src/assets/board_matchbar.webp`
- `src/assets/board_icons_right1.webp`, `board_icons_right2.webp`, `board_icons_right3.webp`

Missing production assets likely needed for the premium fantasy landing:

- Dedicated fantasy hero background with correct desktop/mobile crops.
- Dedicated H shield logo/mark, if the current PWA icon is not the desired shield.
- Floating island/portal hero composition designed for landing-page use, not gameplay UI reuse.
- Cohesive small feature icons in the fantasy style.
- Optional video placeholder/thumbnail and final video asset, with poster image and reduced-motion fallback.
- Open Graph image currently referenced as `/landing-page-assets/og-image.png`; this file was not present in the asset glob results and should be verified/replaced in a future asset PR.

## 6. Risk assessment

| Area | Risk | Finding |
| --- | --- | --- |
| Auth outage blank screen risk | MEDIUM | Normal `/` HabitGame public landing is independent of auth and should render. App auth gate can hang at `Loading session…`; `/lobby` can return `null` while auth initializes. No timeout/error boundary exists. |
| Landing redesign touching auth logic | MEDIUM | Auth UI and action wiring are embedded in `App.tsx`; extraction before redesign lowers risk. |
| PeaceBetween accidental regression | HIGH | PeaceBetween routing is interleaved in `Root` and early `App.tsx` returns; auth-gate work must avoid PeaceBetween files, hostname logic, and `/conflict/...` routes. |
| Mobile safe-area layout | MEDIUM | Current `.auth-card` uses bottom safe-area padding and mobile uses a separate full-page auth gate. New visuals could regress notches/small screens. |
| Desktop/tablet responsiveness | MEDIUM | Desktop uses overlay-over-workspace while mobile uses full gate. A redesign must intentionally support both branches or unify them safely. |
| Heavy asset performance | MEDIUM | Current world landing preloads `world-bg-main.webp` and lazy-loads other layers. Premium hero/video assets could hurt first paint if not responsive/lazy/poster-backed. |
| App startup dependency on Supabase | MEDIUM | Provider does not block children, but app auth UI state depends on `getSession()` settling. No timeout/retry/offline fallback. |

## 7. Recommended next PR plan

### PR 1: Extract auth-gate component only, no visual redesign

- Extract the existing `renderAuthPanel()` markup and mobile auth-gate shell into a dedicated component.
- Preserve all current classes, copy, props, and event handlers.
- Keep auth state/actions in `App.tsx`.
- Do not touch Supabase provider/client, routing, PeaceBetween, CSS visuals, or gameplay.

### PR 2: Add resilient landing/auth fallback states

- Add explicit auth initialization timeout/fallback state.
- Add startup `getSession()` error capture and user-facing retry messaging.
- Add offline detection/copy for auth actions.
- Add recoverable error boundary around the HabitGame auth gate/app auth overlay only.
- Keep PeaceBetween landing behavior unchanged.

### PR 3: Apply new fantasy landing visuals using existing/fallback assets

- Add scoped HabitGame landing/auth gate CSS.
- Reuse `public/landing-page-assets/` and safe existing app/island assets as placeholders.
- Preserve existing auth action props and submit handlers.
- Keep changes visual-only and route-neutral.

### PR 4: Replace placeholder assets with production images/video

- Add final optimized responsive images/video poster assets.
- Use lazy loading, responsive sizing, and reduced-motion fallback.
- Update OG/Twitter image assets if needed.
- Validate mobile/desktop performance and visual fallbacks.

## 8. Validation performed

Read-only/no-code checks performed:

- Searched for auth provider/auth actions with `rg`: `useSupabaseAuth`, `SupabaseAuthProvider`, `supabase.auth`, `getSession`, `onAuthStateChange`, `signInWithPassword`, `signUp`, `signInWithOAuth`, `Google`.
- Searched for HabitGame landing/auth gate classes and copy with `rg`: `auth-`, `login`, `signup`, `landing`, `public`, `renderAuthPanel`.
- Searched for PeaceBetween/conflict routing and surface isolation with `rg`: `PeaceBetween`, `peacebetween.com`, `resolveSurface`, `isConflictRoute`, `ConflictResolverEntry`.
- Searched for hostname/domain routing with `rg`: `habitgame.app`, `lifegoalapp.com`, `peacebetween.com`, `hostname`, `resolveRoute`.
- Listed existing image/video/static assets with `glob` under `public` and `src`.
- Checked the working tree before the report with `git --no-pager status --short`; it was clean.

Post-report validation performed:

- `git --no-pager diff --check` passed with no whitespace errors.
- `git --no-pager status --short` showed only `docs/investigations/habitgame-landing-auth-outage-resilience.md` as an untracked/changed file.
- No build is required for this documentation-only investigation.
