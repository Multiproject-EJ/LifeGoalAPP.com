# HabitGame true public landing vs auth/login page investigation

Date: 2026-05-19

Scope: no-code investigation only. No TypeScript, CSS, routing, auth, gameplay, PeaceBetween, or asset code was changed.

## Files inspected

- `index.html`
- `docs/LANDING-PAGE-VISION.md`
- `docs/investigations/habitgame-landing-auth-outage-resilience.md`
- `src/main.tsx`
- `src/routes/resolveRoute.ts`
- `src/App.tsx`
- `src/components/HabitGameLandingShell.tsx`
- `src/index.css`
- `src/world/WorldHome.tsx`
- `src/world/WorldHero.tsx`
- `src/world/JourneyPreview.tsx`
- `src/world/ArchetypePicker.tsx`
- `src/world/RewardsTease.tsx`
- `src/world/SocialProof.tsx`
- `src/world/LazyImage.tsx`
- `src/world/world.css`
- `src/surfaces/surfaceContext.ts`
- `src/surfaces/peacebetween/PeaceBetweenLanding.tsx`
- `src/surfaces/peacebetween/PeaceBetweenShell.tsx`
- `src/surfaces/peacebetween/peacebetween.css`
- `src/features/conflict-resolver/ConflictResolverEntry.tsx`
- `src/features/conflict-resolver/conflictSurfaceConfig.ts`
- `src/features/conflict-resolver/hooks/useConflictSession.ts`
- GitHub PR #2276 metadata and changed files

## Executive finding

The true public HabitGame marketing landing page is the `WorldHome` world-site surface rendered by `Root` in `src/main.tsx`, before `SupabaseAuthProvider` and before the main `App` auth gate mount.

The separate auth/login page is the `HabitGameLandingShell` / `HabitGameAuthCard` auth gate rendered from `App.tsx` after the user chooses `Start Your Game` or `Log in`, or directly visits `/login` / app routes while logged out.

PR #2276 modified the wrong surface because it treated the logged-out auth gate (`src/components/HabitGameLandingShell.tsx` plus `.auth-*` CSS in `src/index.css`) as the HabitGame landing page. That gate is only the authentication entry surface, not the public marketing page with `HABITGAME`, `Level Up Your Life`, community stats, and `Start Your Game` / `Log in`.

## 1. Actual public landing page implementation

### Primary files/classes/functions

- `src/main.tsx`
  - `Root()`
  - `NON_APP_ROUTES`
  - `showApp`, `showLobby`, `loginOnEntry`
  - `<WorldHome onContinue={...} onLogin={...} />`
- `src/routes/resolveRoute.ts`
  - `resolveRoute()`
- `src/world/WorldHome.tsx`
  - `WorldHome`
  - `handleContinue()`
  - `handleLogin()`
- `src/world/WorldHero.tsx`
  - `WorldHero`
- `src/world/JourneyPreview.tsx`
  - `JourneyPreview`
- `src/world/ArchetypePicker.tsx`
  - `ArchetypePicker`
- `src/world/RewardsTease.tsx`
  - `RewardsTease`
- `src/world/SocialProof.tsx`
  - `SocialProof`
- `src/world/LazyImage.tsx`
  - `LazyImage`
- `src/world/world.css`
  - `.world-home*`
  - `.world-hero*`
  - `.journey-preview*`
  - `.archetype-picker*`
  - `.rewards-tease*`
  - `.social-proof*`

### Page identity notes

This is the public marketing page identity:

- Brand text: `HABITGAME`
- Tagline: `Level Up Your Life`
- Level badge: `LEVEL 1`
- Feature cards:
  - `Your Life, Gamified`
  - `Build Momentum`
  - `Earn Rewards`
- Journey preview:
  - `YOUR PATH`
  - `Every day moves you forward`
- Archetype picker:
  - `CHOOSE YOUR CLASS`
  - `Who are you in this game?`
- Rewards tease:
  - `REWARDS`
  - `What you earn`
- Community/social proof:
  - `COMMUNITY`
  - `Join the movement`
  - stats for `Players`, `Habits tracked`, `Rating`
- CTAs:
  - `Start Your Game`
  - `Log in`
- Footer:
  - `HabitGame © {year} · v1.0`
  - `Privacy`, `Terms`, `Support`

Screenshot note: a screenshot of the true target should show the dark/glass world-site styling from `src/world/world.css`, not the light sky/floating-island auth-gate styling from `src/index.css`.

### Route/hostname behavior

- `resolveRoute('/')` returns `world` in browser mode and `app` in standalone PWA mode.
- `resolveRoute('/login')` returns `login`.
- `resolveRoute('/lobby')` returns `lobby`.
- `resolveRoute('/privacy')`, `/terms`, `/support` render public trust pages.
- In `src/main.tsx`, `Root()` renders `WorldHome` when:
  - the resolved route is a non-app public route, and
  - `showApp` is false, and
  - `showLobby` is false.
- `WorldHome.onContinue` sets `showApp(true)`, which mounts `<App forceAuthOnMount={loginOnEntry} />`.
- `WorldHome.onLogin` sets `loginOnEntry(true)` and `showApp(true)`, which mounts `App` and opens the login path.
- On `peacebetween.com` / `www.peacebetween.com` root, `src/main.tsx` intentionally skips `WorldHome` by setting `showApp(true)` for the root path so `App.tsx` can render `PeaceBetweenLanding`.

## 2. Separate auth/login page implementation

### Primary files/classes/functions

- `src/App.tsx`
  - `App({ forceAuthOnMount })`
  - `useSupabaseAuth()`
  - auth state: `email`, `password`, `fullName`, `authMode`, `activeAuthTab`, `authMessage`, `authError`, `submitting`
  - `forceAuthOnMount` effect
  - `handleAuthSubmit()`
  - `handleGoogleSignIn()`
  - `openAuthOverlay()`
  - `handleAccountClick()`
  - `shouldRequireAuthentication = !isAuthenticated`
  - mobile logged-out branch: `if (shouldRequireAuthentication && isMobileExperience) return <HabitGameLandingShell ... />`
  - desktop logged-out overlay: `isAuthOverlayVisible` renders `.auth-overlay` and `habitGameAuthCard`
- `src/components/HabitGameLandingShell.tsx`
  - `HabitGameLandingLayout`
  - `HabitGameAuthCard`
  - `HabitGameLandingShell`
  - `authTabs`
  - `authTabCopy`
  - `GoogleIcon`
- `src/index.css`
  - `.app--auth-gate`
  - `.auth-layout`
  - `.auth-gate*`
  - `.auth-hero*`
  - `.auth-value-card*`
  - `.auth-panel`
  - `.auth-card*`
  - `.supabase-auth*`
  - `.auth-overlay*`

### Page identity notes

This is the auth/login gate identity:

- Brand link: `HabitGame`
- Current PR #2276-added marketing/auth copy:
  - `Mobile-first fantasy habit quests`
  - `HabitGame`
  - `The self-improvement RPG`
  - `A cozy game that gently keeps your goals, habits, and wellbeing present while you play.`
  - value cards `Play a cozy RPG`, `Reflect on your life`, `Supercharge progress`
- Auth card:
  - tabs `Log in` / `Sign up`
  - login title `Welcome back`
  - signup title `Create your LifeGoal account`
  - fields `Email`, `Password`, and signup `Your name`
  - actions `Log in`, `Sign up with email`, `Continue with Google`, `Sign up with Google`

Screenshot note: a screenshot of this surface should show an auth form/card as the central functional element. It should not be treated as the public marketing landing page even if some decorative hero copy is present.

## 3. Why PR #2276 modified the wrong surface

PR #2276 was titled `Implement HabitGame Landing Visual v1` and its body described a redesign of the "logged-out HabitGame landing/auth screen". It changed only:

- `src/components/HabitGameLandingShell.tsx`
- `src/index.css`

The patch added `landingValueCards`, a sky/cloud auth-gate background, a floating-island scene, and expanded `.auth-*` CSS around the login/signup form. Those files control the post-landing auth gate, not the public world-site landing rendered by `WorldHome`.

The likely source of confusion is naming:

- `HabitGameLandingShell` sounds like a public landing page component.
- In practice, it is an auth gate wrapper around `HabitGameAuthCard`.
- The true public page is named `WorldHome`, not `HabitGameLanding`.

Therefore #2276 visually redesigned the auth/login surface and left the actual public marketing page unchanged.

## 4. Files/classes that control the true landing page

Touch these for a true public landing redesign:

- `src/world/WorldHome.tsx`
- `src/world/WorldHero.tsx`
- `src/world/JourneyPreview.tsx`
- `src/world/ArchetypePicker.tsx`
- `src/world/RewardsTease.tsx`
- `src/world/SocialProof.tsx`
- `src/world/LazyImage.tsx`
- `src/world/useLazyImage.ts`
- `src/world/useInstallState.ts`
- `src/world/useWorldAnalytics.ts`
- `src/world/worldAnalytics.ts`
- `src/world/world.css`
- public landing assets under `public/landing-page-assets/`
- public metadata in `index.html` when changing public brand/SEO/social preview copy

Use `src/main.tsx` and `src/routes/resolveRoute.ts` only if the route behavior itself needs to change.

## 5. Files/classes that control the login/auth gate

Touch these for auth/login simplification or auth behavior changes:

- `src/App.tsx`
- `src/components/HabitGameLandingShell.tsx`
- `src/features/auth/SupabaseAuthProvider.tsx`
- `src/features/auth/authInitialization.ts`
- `src/lib/supabaseClient.ts`
- auth/login styles in `src/index.css`

The auth gate should remain focused on:

- choosing login vs signup,
- collecting email/password/name,
- Google auth,
- showing auth errors/messages,
- showing connection/configuration notices,
- preserving Supabase auth behavior.

## 6. PeaceBetween/conflict resolver landing is separate

Confirmed separate and must not be touched for HabitGame public landing/auth correction.

Primary files/classes/functions:

- `src/surfaces/surfaceContext.ts`
  - `resolveSurface()`
  - `isConflictRoute()`
  - only `peacebetween.com` and `www.peacebetween.com` resolve to `peacebetween`; every other host resolves to `habitgame`.
- `src/App.tsx`
  - `shouldRenderPeaceBetweenConflictShell`
  - `shouldRenderPeaceBetweenLanding`
  - `<PeaceBetweenShell><ConflictResolverEntry surface="peacebetween" /></PeaceBetweenShell>`
  - `<PeaceBetweenLanding />`
- `src/surfaces/peacebetween/PeaceBetweenLanding.tsx`
  - `PeaceBetweenLanding`
- `src/surfaces/peacebetween/PeaceBetweenShell.tsx`
  - `PeaceBetweenShell`
- `src/surfaces/peacebetween/peacebetween.css`
- `src/features/conflict-resolver/ConflictResolverEntry.tsx`
  - `ConflictResolverEntry`
  - `data-conflict-surface`
- `src/features/conflict-resolver/conflictSurfaceConfig.ts`
  - `HABITGAME_CONFLICT_SURFACE`
  - `PEACEBETWEEN_CONFLICT_SURFACE`
  - `getConflictSurfaceConfig()`
  - `mapRecommendationForSurface()`
  - `sanitizeRecommendationHrefForSurface()`
- `src/features/conflict-resolver/hooks/useConflictSession.ts`
  - resolves the current surface from hostname for conflict sessions.

PeaceBetween page identity:

- `Peace Between`
- `A calmer way to begin a hard conversation.`
- `Start a new conversation`
- invite-token form
- `/conflict/new`, `/conflict/join`, and `/conflict/*` behavior

Do not blend HabitGame marketing redesign work into this surface.

## Do not touch list

For the corrective HabitGame landing/auth work, do not touch:

- `src/surfaces/peacebetween/**`
- `src/features/conflict-resolver/**`, unless a separate PeaceBetween/conflict resolver task explicitly requests it
- `src/surfaces/surfaceContext.ts`, unless changing domain routing is explicitly required
- Island Run gameplay/runtime files
- economy/balance files
- Supabase auth logic in `src/features/auth/**` or `src/lib/supabaseClient.ts`, unless auth behavior itself is the target
- `src/App.tsx` workspace/gameplay sections unrelated to auth gate rendering
- route behavior in `src/main.tsx` / `src/routes/resolveRoute.ts`, unless the public landing entry behavior is explicitly being changed

## Safest corrective PR plan

### PR A: restore/simplify auth/login page to focused login only

- Revert or remove PR #2276's public-marketing visual additions from the auth gate.
- Keep `HabitGameAuthCard` auth behavior intact.
- Keep login/signup tabs, email/password/name fields, Google auth, status messages, connection notice, and configuration errors.
- Keep the auth page visually simple and focused on authentication.
- Scope expected files:
  - `src/components/HabitGameLandingShell.tsx`
  - auth-gate/auth-card portions of `src/index.css`
- Do not change `WorldHome`.
- Do not change PeaceBetween.

### PR B: redesign the true public landing page

- Redesign the actual public landing page in `src/world/WorldHome.tsx` and supporting `src/world/**` components/styles.
- Preserve current CTAs:
  - `Start Your Game` should continue to call `onContinue`.
  - `Log in` should continue to call `onLogin`.
- Preserve route behavior from `src/main.tsx` and `src/routes/resolveRoute.ts`.
- Keep the public page before auth provider/app shell.
- Scope expected files:
  - `src/world/WorldHome.tsx`
  - `src/world/WorldHero.tsx`
  - `src/world/JourneyPreview.tsx`
  - `src/world/ArchetypePicker.tsx`
  - `src/world/RewardsTease.tsx`
  - `src/world/SocialProof.tsx`
  - `src/world/world.css`
  - `public/landing-page-assets/**` only if replacing/adding landing assets
  - `index.html` only for public metadata/asset preload updates
- Do not change `HabitGameLandingShell` except if a CTA transition contract requires a prop/interface adjustment.
- Do not change PeaceBetween.

### PR C: add real assets/video/founder section later

- Add production assets only after PR B establishes the correct page surface and layout.
- Add founder/video sections as new world-site sections under `src/world/**`.
- Add asset preload/lazy-load policy intentionally:
  - preload only critical above-the-fold assets,
  - lazy-load secondary images/video,
  - respect reduced motion,
  - preserve mobile performance.
- Scope expected files:
  - `src/world/**`
  - `src/world/world.css`
  - `public/landing-page-assets/**`
  - `index.html` only if metadata/preload changes are necessary.
- Do not use auth gate files for marketing sections.
- Do not touch PeaceBetween/conflict resolver.

## Validation

- This investigation made no code changes.
- Only this markdown report was added.
- Required validation: `git diff --check`.
