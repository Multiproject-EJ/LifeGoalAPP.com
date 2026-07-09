# Island Run first-player funnel — PR 1 investigation and implementation plan

Status: planning-only PR. No product code changes in this document.
Date: 2026-07-09.

## Scope and non-goals

This PR documents the implementation plan for a new first-player funnel into Island Run. It intentionally does **not** change runtime behavior, gameplay state, UI copy, database schema, authentication flow, or billing.

Hard constraints for later PRs:

- Preserve Island 1 canon: Compass Expedition, Captain Ivo, Luma Isle / First Light Shore, Miri, Poko, Elder Sava, Noctyra, Great Drift.
- Do not rewrite Island 1 as a different premise.
- Hatchery remains Stop 1.
- Habit / Routekeeper Steps remains Stop 2.
- Event Arena remains Stop 3, with historical `mystery` stop id preserved for save/narrative compatibility.
- The Concord remains the Island 1 communication unlock and uses nine fragments.
- Signup prompts are save-account prompts, not subscription prompts.
- Pro trial activation happens after signup and must not ask for payment.
- Paid CTA later is “Become a Pro Member.”
- Gameplay writes must stay inside canonical Island Run services/actions.
- Story/narrative observes gameplay and must not mutate gameplay.

## 1. Exact files, components, and services involved

### App entry and authentication

- `src/App.tsx`
  - Current auth form and signup handler live here.
  - Current Island Run auto-open query handling is here.
  - Later funnel PRs should add only guest-entry orchestration and save-account prompt wiring here, not gameplay writes.
- `src/features/auth/SupabaseAuthProvider.tsx`
  - Auth provider surface for signed-in sessions.
  - Needs investigation in the implementation PR for whether Supabase anonymous auth is already exposed or should be added.
- `src/services/billing.ts`
  - Existing entitlement read path maps billing state to `is_pro`.
  - Trial activation should not be coupled directly to landing or guest play.
- `supabase/functions/stripe-webhook/index.ts`
  - Existing Stripe webhook writes subscription and `is_pro` state.
  - Later trial implementation may need a separate non-payment trial source instead of pretending a Stripe subscription exists.

### Island Run shell and board

- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
  - Current production Island Run surface.
  - Owns many existing modal states, the Welcome Pack modal mount, timed-event minigame launcher, boss minigame launcher, build/tutorial prompts, and landmark modal flows.
  - High-risk split-authority file; later PRs should keep new gameplay writes out of this component and delegate to canonical services.
- `src/features/gamification/level-worlds/LevelWorlds.css`
  - Modal and board styling surface for later UI-only funnel modals.
  - Any later modal must obey the viewport-anchored portal/scroll-lock guardrail.

### Canonical gameplay state and mutation services

- `src/features/gamification/level-worlds/hooks/useIslandRunState.ts`
  - Canonical read hook for Island Run state.
- `src/features/gamification/level-worlds/services/islandRunStateStore.ts`
  - Canonical state store and commit path.
- `src/features/gamification/level-worlds/services/islandRunStateActions.ts`
  - Canonical action surface for gameplay mutations: stop objective progress, build spend, event ticket spend/grants, tutorial state, travel, companion selection, and related record commits.
- `src/features/gamification/level-worlds/services/islandRunRollAction.ts`
  - Canonical board roll action.
- `src/features/gamification/level-worlds/services/islandRunTileRewardAction.ts`
  - Canonical tile reward action.
- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts`
  - Runtime record shape and local/remote hydration mapping.
- `src/features/gamification/level-worlds/services/islandRunRuntimeState.ts`
  - Compatibility bridge only. Do not add new UI gameplay writes through this path.

### Stop and Island 1 content

- `src/features/gamification/level-worlds/services/islandRunStops.ts`
  - Canonical stop plan: Hatchery, Habit, Event Arena (`mystery` id), Wisdom, Boss.
- `src/features/gamification/level-worlds/services/islandRunContractV2StopResolver.ts`
  - Stop accessibility, postponement, recommendation, and ticket-required status.
- `src/features/gamification/level-worlds/services/islandRunStopTickets.ts`
  - Essence ticket gating; Hatchery is always free.
- `src/features/gamification/level-worlds/services/islandRunContractV2EssenceBuild.ts`
  - Sequential landmark build costs and spend validation.
- `src/features/gamification/level-worlds/narrative/definitions/island001Narrative.ts`
  - Luma Isle / First Light Shore story canon and stop beats.
- `src/features/gamification/level-worlds/narrative/useIslandNarrativeOpeningFlow.ts`
  - Current read-only narrative opening/reaction controller.
- `public/islands/001/story/arrival/manifest.json`
  - Arrival story reader content.
- `public/islands/001/story/resolution/manifest.json`
  - Resolution story reader content.

### Welcome Pack and first-session systems

- `src/features/gamification/level-worlds/components/WelcomePackModal.tsx`
  - Existing Welcome Pack modal.
- `src/features/gamification/level-worlds/services/islandRunWelcomePackFullClaimAction.ts`
  - Existing full Welcome Pack orchestration.
- `src/features/gamification/level-worlds/services/islandRunWelcomePackClaimAction.ts`
  - Starter card grant.
- `src/features/gamification/level-worlds/services/islandRunWelcomePackRewardBundleAction.ts`
  - Existing dice, essence, and active-event ticket reward bundle.
- `src/features/gamification/level-worlds/services/islandRunWelcomePackEligibility.ts`
  - Existing eligibility guard.
- `src/features/gamification/level-worlds/services/islandRunWelcomePackOnboardingUi.ts`
  - Existing onboarding UI visibility helper.
- `src/features/gamification/level-worlds/services/islandRunFirstSessionTutorialUi.ts`
  - First-session Hatchery guidance and low-dice first creature pack trigger.
- `src/features/gamification/level-worlds/services/islandRunFirstSessionCreaturePackAction.ts`
  - Existing first-session creature pack grant.

### Habit / Routekeeper Steps

- `src/features/gamification/level-worlds/components/IslandRunLifePromptCard.tsx`
  - Existing in-board habit prompt card that can create an Island Run habit from a life prompt.
- `src/features/gamification/level-worlds/services/islandRunLifePromptHabitAction.ts`
  - Existing canonical-ish habit creation service for Island Run life prompt flows.
- `src/features/habits/UnifiedTodayView.tsx`, `src/features/habits/DailyHabitTracker.tsx`
  - Existing habit surfaces that currently interact with Island Run and are migration-risk files.

### Event Arena and minigames

- `src/features/gamification/level-worlds/services/islandRunMinigameResolver.ts`
  - Resolves stop and event minigames.
- `src/features/gamification/level-worlds/components/IslandRunMinigameLauncher.tsx`
  - Launches active minigame overlays.
- `src/features/gamification/level-worlds/services/islandRunEventEngine.ts`
  - Active timed-event resolution.
- Event minigame services used by launcher configuration:
  - `spaceExcavator*`
  - `companionFeast*`
  - `luckySpin*`
  - `islandWorkshop*` / Feeding Frenzy paths as currently named in the resolver.

### Concord / communication unlock

- `src/features/gamification/level-worlds/services/islandRunConcordFragments.ts`
  - Concord fragment model and nine-fragment requirement.
- `src/features/gamification/level-worlds/services/islandRunTechnologyUnlocks.ts`
  - Technology/build unlock state, including Concord unlock behavior.
- `src/features/gamification/level-worlds/components/IslandInhabitantFlow.tsx`
  - Caretaker/inhabitant communication flow after unlock.

### Database and server-side surfaces likely needed later

- `supabase/migrations/0167_island_run_runtime_state_progression_markers.sql` and later Island Run migrations
  - Existing remote runtime state table and added columns.
- `supabase/migrations/0231_add_minigame_tickets_by_event.sql`
  - Existing event-scoped ticket persistence.
- `supabase/migrations/0240_add_welcome_pack_claimed_column.sql`
  - Existing starter-card claim flag.
- `supabase/migrations/0241_add_welcome_pack_reward_bundle_claimed_column.sql`
  - Existing reward bundle claim flag.
- `supabase/migrations/0265_island_run_narrative_seen_state.sql`
  - Existing narrative seen-state persistence.
- New later migrations likely needed for guest claim/merge and trial activation audit, described below.

## 2. Current behavior by desired funnel step

| Desired step | Current behavior | Files / systems |
| --- | --- | --- |
| 1. Landing CTA: “Play My Game for Free.” | Existing app entry appears to require auth before normal app access. Island Run can auto-open after auth via query params. No guest CTA copy exists yet. | `src/App.tsx` |
| 2. Explain free guest play timeline | No unified modal explaining guest play → rewards → save account → 7-day Pro trial → warning exists. Current auth/signup copy is account-oriented. | `src/App.tsx` |
| 3. Let new player enter Island Run as guest | No confirmed first-class guest/anonymous Island Run flow found. Local storage can hold Island Run state for a `Session`, but service signatures generally require a Supabase `Session`. | `SupabaseAuthProvider`, Island Run state services |
| 4. Lightweight name + ship customization | Existing signup requires name and app profile surfaces display name/ship details. No pre-auth guest name/ship customization modal is wired into Island Run entry. | `src/App.tsx`, profile surfaces |
| 5. Starter gift / Welcome Pack | Existing Welcome Pack modal and canonical claim services exist. Current bundle grants 150 dice, 2000 essence, and 20 active-event tickets when an event exists. | Welcome Pack files |
| 6. Play Island 1 first loop using canon | Existing Island 1 narrative is Luma Isle with Miri, Poko, Sava, Ivo, Noctyra, arrival and resolution story readers. | `island001Narrative.ts`, story manifests |
| 7. Hatchery remains Stop 1 | Current stop plan has Hatchery as index 0 and free. First-session tutorial guides Hatchery L1. | `islandRunStops.ts`, `islandRunStopTickets.ts`, tutorial services |
| 8. Habit / Routekeeper Steps remains Stop 2 and creates first tiny action if needed | Current stop plan has Habit as index 1. Island 1 narrative names Routekeeper Steps. Existing life-prompt card can create a habit/action, but PR should verify whether it is automatically used when no tiny action exists and whether score/currency feedback is sufficiently visible. | `IslandRunLifePromptCard.tsx`, habit services, narrative |
| 9. Arena Stop 3 launches active event minigame with +3 extra event tickets | Stop 3 is already Event Arena with historical `mystery` id and active event launcher. Current Welcome Pack grants +20 active-event tickets, not an Arena-specific +3. Timed-event launch spends canonical event-scoped tickets. | `islandRunStops.ts`, board launcher, ticket actions |
| 10. After Arena, show first soft save prompt | No guest prompt exists. Current minigame completion flow may resolve Mystery/Event Arena and show reward feedback, but no account-save prompt is wired. | `IslandRunBoardPrototype.tsx` |
| 11. Continue toward Wisdom / Concord / Boss | Current stop sequence continues Wisdom then Boss. Concord communication unlock exists separately and uses fragments/technology. | stop services, Concord services |
| 12. Before major progression/travel, stronger save prompt if still guest | Current travel flow does not gate on guest state because there is no guest funnel state. Island travel is canonical action-managed. | `islandRunStateActions.ts`, board travel flow |
| 13. After signup, claim/merge guest progress and activate 7-day Pro trial | Current signup creates user metadata and profiles. No guest claim/merge service or non-payment trial activation path was found. | `App.tsx`, auth provider, new server/RPC likely |
| 14. Trial expiry and paid Pro Member CTA later | Existing billing entitlement reads and Stripe webhook manage paid/pro state. Trial-warning and paid CTA should be a later PR after claim/merge. | billing and Stripe surfaces |

## 3. Gaps and risks

### Gaps

1. **Guest identity/session model is undefined.** Most Island Run actions accept a Supabase `Session`; a real guest flow needs either Supabase anonymous auth or a local guest session abstraction with a later claim path.
2. **No claim/merge pipeline.** There is no visible service that atomically claims local guest Island Run progress into a newly signed-up user.
3. **No trial activation source independent of Stripe payment.** Current Pro entitlement appears Stripe/billing-row oriented. A 7-day no-payment trial needs a trusted server-side model and entitlement read support.
4. **No modal scheduler for first-player prompts.** The board has many independent modal states. Guest save prompts must not collide with story reader, Welcome Pack, Hatchery guidance, event minigame, reward modals, Concord, or boss/travel dialogs.
5. **Welcome Pack semantics differ from desired starter gift.** Existing reward bundle is larger and event-ticket grant is active-event dependent. Desired Arena-specific +3 extra tickets should be separate from the Welcome Pack or retuned by product decision.
6. **Name + ship customization lacks a guest save shape.** Existing name data lives in auth metadata/profile tables. Pre-auth guest customization needs temporary storage and claim/merge mapping.
7. **Routekeeper tiny-action behavior needs a focused verification PR.** Current services can create habits, but the exact no-existing-action fallback and feedback may not match the desired funnel.
8. **Copy surfaces do not currently separate “save account” from paid subscription.** Later PRs must enforce this distinction.

### Risks

- **Split-authority regression:** Adding prompt-driven reward grants from UI would violate the architecture contract. All gameplay grants must be canonical action services.
- **Guest data loss:** Local-only guest progress can be cleared by browser storage, private mode, cross-device moves, or failed signup handoff.
- **Duplicate rewards on merge:** Welcome Pack, +3 Arena tickets, and trial activation need idempotency keys/claim flags.
- **Modal starvation or interruption:** Story reader and onboarding/tutorial overlays are high-priority. Save prompts should wait until safe seams.
- **Subscription confusion:** A post-signup Pro trial without payment must not look like a paid checkout or Stripe subscription unless product explicitly chooses that implementation.
- **Narrative mutation risk:** Story systems should emit/read beats only; do not use narrative close events to grant rewards or progress stops.
- **Event ticket authority:** Active event tickets are `minigameTicketsByEvent[eventId]`, not legacy `spinTokens`. Arena +3 must target the active record event id.

## 4. Recommended PR sequence

### PR 1 — investigation + implementation plan (this PR)

- Add this planning document only.
- No product behavior changes.

### PR 2 — guest state foundation and modal scheduler scaffolding

- Decide and implement guest identity strategy.
- Add a non-gameplay `guestFunnelState` model with local storage and/or anonymous auth metadata.
- Add a central first-player modal coordinator that observes board/auth/gameplay state but does not mutate gameplay.
- Add tests for modal priority and persistence flags.

### PR 3 — landing CTA and guest entry

- Add “Play My Game for Free” CTA.
- Add free guest-play timeline modal.
- Route into Island Run as guest.
- No reward grants yet except existing initial runtime defaults.

### PR 4 — guest name + ship customization

- Add lightweight pre-board name/ship modal using existing profile/ship concepts where possible.
- Store in guest funnel state and map to profile fields during claim.
- Keep gameplay state unchanged.

### PR 5 — starter gift / Welcome Pack alignment

- Reuse existing Welcome Pack modal/claim service if product confirms existing bundle values.
- Otherwise add a new canonical starter-gift action with its own idempotency flag.
- Ensure all grants are canonical and tested.

### PR 6 — Routekeeper Steps first tiny action + visible feedback

- Verify and adjust Habit stop behavior to create a tiny action when needed.
- Add visible score/currency feedback through canonical reward/action services.
- Add service and UI tests.

### PR 7 — Event Arena +3 guest funnel ticket boost

- Add a one-time canonical action granting +3 tickets to the active event when Arena is reached/opened/completed, based on product decision.
- Preserve Event Arena as Stop 3 and historical `mystery` id.
- Add idempotency and tests around missing/expired active events.

### PR 8 — first soft save prompt after Arena

- Add soft “Save My Game for Free” prompt at a safe seam after Arena completion.
- Prompt should open signup/save-account flow only; no Pro or payment ask.

### PR 9 — stronger save prompt before major travel/progression

- Add stronger prompt before travel / major progression if still guest.
- Allow product-decided deferral behavior, but avoid data-loss surprise.

### PR 10 — claim/merge guest progress on signup

- Add server-side RPC/Edge Function for idempotent claim/merge.
- Merge Island Run runtime state, guest funnel metadata, Welcome Pack flags, event tickets, profile name/ship, and narrative seen state.
- Add rollback/failure UX.

### PR 11 — 7-day Pro trial activation after signup

- Add trusted trial grant service/RPC, entitlement read support, and post-signup confirmation modal.
- No payment ask.
- Defer warning-before-expiry and paid CTA to subsequent PRs.

### PR 12+ — trial expiry warning and later paid CTA

- Add trial ending warning.
- Add paid CTA copy “Become a Pro Member.”
- Connect to Stripe checkout only at this later stage.

## 5. Data model needs

### Client/local guest funnel metadata

Recommended shape if using anonymous auth or local-first guest play:

```ts
interface IslandRunGuestFunnelStateV1 {
  version: 1;
  guestId: string;
  createdAtMs: number;
  updatedAtMs: number;
  entrySource: 'landing_play_free' | 'debug' | 'unknown';
  displayName?: string;
  shipName?: string;
  shipStyleId?: string;
  hasSeenGuestTimeline: boolean;
  hasSeenSoftSavePromptAfterArena: boolean;
  hasSeenStrongSavePromptBeforeTravel: boolean;
  savePromptDismissals: Array<{ promptId: string; dismissedAtMs: number }>;
  claimStatus: 'unclaimed' | 'claiming' | 'claimed' | 'claim_failed';
  claimedUserId?: string;
}
```

### Island Run runtime state additions likely needed

- `guest_funnel_flags` JSONB or explicit columns, if guest state is persisted remotely before signup.
- `guest_claim_id` / `claimed_from_guest_id` for idempotent merge audit.
- `arena_guest_ticket_boost_claimed_by_event` JSONB or a generic grant-id ledger to prevent duplicate +3 grants.
- Potentially avoid new columns by using existing normalized grant ids if they are suitable for non-creature grants; verify before coding.

### Account/profile additions likely needed

- Guest display name → auth user metadata `full_name` and `workspace_profiles.full_name`.
- Guest ship name/style → existing workspace/profile/ship fields if available; otherwise product must define exact field.
- Trial fields, separate from Stripe paid subscription, for example:
  - `pro_trial_started_at`
  - `pro_trial_ends_at`
  - `pro_trial_source = 'island_run_guest_signup'`
  - `pro_trial_claimed_at`
  - `pro_trial_status`

### Server audit/idempotency

- A `guest_progress_claims` table or claim RPC audit payload should store:
  - `claim_id`
  - `guest_id`
  - `user_id`
  - source fingerprint/hash
  - `claimed_at`
  - claim status and error details
- Trial activation should have its own audit/unique constraint by user and source.

## 6. Guest-state strategy recommendation

Recommended: **Supabase anonymous auth if enabled and compatible with the product’s signup flow; local-only fallback only for unsupported environments.**

Rationale:

- Existing Island Run services expect a Supabase `Session`, and runtime persistence is already keyed by `session.user.id`.
- Anonymous auth would let guest play use the canonical remote/local runtime state path without inventing a fake session type.
- Claiming can become “upgrade anonymous user to permanent credentials” or link anonymous user to email/social identity, reducing merge complexity.
- It minimizes changes to canonical gameplay action signatures.

Fallback if anonymous auth is not available:

- Keep a local `guestId` and local-only Island Run runtime record namespace.
- Build a server-side claim RPC that accepts a signed/validated guest payload after signup.
- This has more data-loss and tamper-risk and should limit high-value rewards until claimed or use server-minted grant proofs.

Do **not** recommend:

- Creating fake `Session` objects by hand.
- Writing guest gameplay state from React components.
- Adding parallel guest-only gameplay state mirrors in UI.

## 7. Save / claim / merge strategy

### Save prompt behavior

- Soft prompt after Arena: “Save My Game for Free” with Continue as guest secondary action, if product allows deferral.
- Strong prompt before travel/major progression: warns that browser-only progress can be lost, still framed as free account save.
- Neither prompt mentions paid membership or payment.

### Claim flow

1. Guest taps save prompt.
2. Open signup form in save-account mode.
3. On successful signup/auth upgrade, call a trusted `claimIslandRunGuestProgress` service/RPC.
4. Service reads current guest runtime/funnel state and target user state.
5. Merge with idempotent grant IDs and monotonic progression rules.
6. Mark guest claim complete.
7. Activate 7-day Pro trial via separate trusted service.
8. Show trial confirmation modal with no payment ask.

### Merge rules

- **Runtime progression:** choose the more advanced canonical progression per island, preserving completed stops, build state, current island, and boss resolution without rewinding an existing user.
- **Currencies:** add guest-earned balances once, capped/audited if needed; never double-apply Welcome Pack or Arena +3.
- **Event tickets:** merge by `minigameTicketsByEvent[eventId]`; expire/ignore invalid event ids based on event engine rules.
- **Welcome Pack:** preserve existing `welcomePackClaimed` and `welcomePackRewardBundleClaimed` flags with OR semantics.
- **Narrative seen state:** merge seen flags so users do not replay already-consumed guest story beats unless product wants replay.
- **Name/ship:** fill empty profile fields from guest customization; do not overwrite existing signed-user fields without confirmation.
- **Trial:** grant once per user/source. If user already had a trial/pro, show appropriate “already active” copy rather than starting a second trial.

## 8. Modal priority order

Recommended priority, highest first:

1. Critical auth/session/claim error modal.
2. Active minigame overlay / boss battle overlay.
3. Story reader major narrative (arrival, resolution, travel arrival).
4. Required first-session tutorial overlay / Hatchery guidance.
5. Reward claim / Win celebration / Welcome Pack reveal in progress.
6. Stop/landmark modal currently opened by user.
7. Guest save prompt before major travel/progression.
8. Guest soft save prompt after Arena.
9. Guest name + ship customization.
10. Guest-play timeline explainer.
11. Ambient narrative toasts/dialogue sheets.
12. Optional shop/market/member promotional modals.

Rules:

- Never open save prompts over active minigames, story readers, blocking tutorial, or reward reveal animations.
- Queue lower-priority prompts until a safe seam.
- Lock background scroll for modal overlays.
- Use viewport-fixed portal/root modal mounting.

## 9. Draft copy for each modal

### Landing CTA

- Button: **Play My Game for Free**
- Supporting line: “Start Island Run as a guest. Save your progress anytime with a free account.”

### Guest timeline explainer

- Title: **Play free first. Save when you’re ready.**
- Body: “You can explore Luma Isle as a guest, earn rewards, and try the first Island Run loop. When you save your game with a free account, we’ll keep your progress and start a 7-day Pro trial — no payment today.”
- Bullets:
  - “Play as a guest.”
  - “Earn starter rewards.”
  - “Save your game for free.”
  - “Try Pro for 7 days after signup.”
  - “We’ll warn you before the trial ends.”
- Primary CTA: **Enter Island Run**
- Secondary CTA: **Create free account now**

### Guest name + ship customization

- Title: **Name your captain**
- Body: “Miri is watching for a new light on First Light Shore. What should the island call you?”
- Name field label: “Captain name”
- Ship field label: “Ship name”
- Style picker label: “Choose a ship style”
- Primary CTA: **Sail to Luma Isle**
- Secondary CTA: **Skip for now**

### Starter gift / Welcome Pack

If reusing current modal:

- Title: **Welcome Pack**
- Body: “Captain Ivo left a starter cache for your first run.”
- Reward line: “Dice, island money, starter cards, and event tickets when an event is active.”
- Primary CTA: **Collect Welcome Pack**

If product chooses a smaller separate starter gift:

- Title: **Starter Gift**
- Body: “A small boost for your first steps on First Light Shore.”
- Primary CTA: **Claim Gift**

### Routekeeper Steps helper

- Title: **Routekeeper Steps**
- Body: “Miri only needs one tiny action to relight the route. Pick something small enough to do today.”
- Suggested tiny action examples:
  - “Drink one glass of water.”
  - “Walk for two minutes.”
  - “Write one sentence.”
- Primary CTA: **Create my tiny action**
- Success toast: “Routekeeper Steps relit: +score and island money.”

### Event Arena +3 tickets

- Title: **Arena boost unlocked**
- Body: “The Event Arena is open. Here are 3 extra event tickets for your first challenge.”
- Primary CTA: **Play event minigame**
- Secondary CTA: **Later**

### Soft save prompt after Arena

- Title: **Save your game for free?**
- Body: “Nice run. Save your Luma Isle progress so your rewards, companion progress, and event tickets are waiting next time.”
- Primary CTA: **Save My Game for Free**
- Secondary CTA: **Keep playing as guest**
- Fine print: “No payment. Your 7-day Pro trial starts after signup.”

### Strong save prompt before major travel/progression

- Title: **Don’t lose your voyage**
- Body: “You’re about to make progress worth saving. Create a free account before you travel so your Island Run rewards and story progress are protected.”
- Primary CTA: **Save My Game for Free**
- Secondary CTA: **Continue as guest** or **Not now** (product decision)
- Fine print: “No payment today. We’ll warn you before your Pro trial ends.”

### Post-signup claim success

- Title: **Your game is saved**
- Body: “Your guest progress has been added to your free account.”
- Reward/benefit line: “Your 7-day Pro trial is now active — no payment needed.”
- Primary CTA: **Continue Island Run**

### Claim failed / recoverable

- Title: **We couldn’t finish saving yet**
- Body: “Your guest game is still on this device. Try again before clearing browser data.”
- Primary CTA: **Try again**
- Secondary CTA: **Continue as guest**

### Trial-ending warning (later PR)

- Title: **Your Pro trial ends soon**
- Body: “Your free 7-day Pro trial ends on {date}. You can keep playing free, or become a Pro Member to keep Pro benefits.”
- Primary CTA: **Become a Pro Member**
- Secondary CTA: **Keep free account**

## 10. Test plan

### Unit tests

- Guest funnel state reducer/storage:
  - creates stable guest id
  - persists dismissed prompt flags
  - does not store gameplay fields in UI-only state
- Modal scheduler:
  - story/minigame/tutorial/reward modals outrank save prompts
  - soft save prompt appears only after Arena completion and only once per guest unless reset
  - strong prompt appears before travel/progression and respects previous claim state
- Guest claim/merge service:
  - idempotent repeated claim
  - merges currencies/tickets without duplicates
  - preserves more advanced signed-user progress
  - merges Welcome Pack flags with OR semantics
  - merges narrative seen state
- Arena +3 ticket action:
  - grants to active `minigameTicketsByEvent[eventId]`
  - no-op/idempotent on repeat
  - handles no active event
- Trial activation:
  - starts once after successful signup/claim
  - refuses duplicate trial grants
  - does not mark paid subscription state unless product chooses that model

### Integration tests

- New guest from landing enters Island Run without existing account.
- Guest sees timeline → customization → Welcome Pack → Island 1 arrival.
- Hatchery first loop still uses existing first-session tutorial.
- Habit stop can create first tiny action if needed.
- Arena launches active event minigame and consumes/grants event-scoped tickets correctly.
- Soft save prompt appears after Arena, not during minigame reward animation.
- Strong save prompt appears before travel if still guest.
- Signup claims progress and resumes in Island Run.
- Post-signup trial confirmation appears without payment ask.

### Regression / guardrail tests

- Existing Island Run architecture guard script, if present, must remain passing.
- No new UI import/call to `persistIslandRunRuntimeStatePatch` for gameplay fields.
- No new stop progression coupling to board tile indices.
- Narrative tests confirm story manifests contain no reward/currency mutation fields.
- Existing Welcome Pack tests remain green.
- Existing stop resolver/ticket tests remain green.
- Existing timed-event ticket authority tests remain green.

### Manual QA

- Desktop and mobile viewport modal centering and scroll lock.
- Private/incognito guest data-loss warning wording.
- Refresh during guest play, during signup, and after claim.
- Event inactive/expired edge cases.
- Returning existing user accidentally entering guest CTA.
- Existing Pro user entering funnel.

## 11. Product decisions still needed before coding

1. **Guest identity strategy:** Use Supabase anonymous auth, local-only guest, or both?
2. **Signup methods for claim:** Email/password only, Google OAuth, magic link, or all?
3. **Can guests defer the strong save prompt before travel?** If yes, how many times?
4. **Welcome Pack tuning:** Reuse current 150 dice / 2000 essence / 20 event tickets / 5 cards, or create a separate smaller starter gift?
5. **Arena +3 trigger:** Grant when Stop 3 opens, when the player taps Play, or after first Arena completion?
6. **No active timed event behavior:** Queue +3 until next event, grant generic tickets, or skip with explanatory copy?
7. **Trial entitlement model:** Separate app-managed trial fields or Stripe trial subscription without payment method?
8. **Trial eligibility:** New accounts only, one per device, one per email, or one per person policy?
9. **Guest name/ship field mapping:** Which existing ship customization fields should be used, and what style choices are approved?
10. **Merge conflict rule:** If an existing account already has Island Run progress, should guest progress merge additively, choose most advanced, or require user confirmation?
11. **Routekeeper reward copy and amount:** What exact score/currency feedback should Habit Stop 2 show?
12. **Concord communication timing:** What exact “major progression” moments should trigger the strong save prompt: Wisdom open, Concord build, Boss eligible, route travel, or all?
13. **Paid CTA timing:** Confirm that “Become a Pro Member” appears only after trial-warning/expiry PRs, not in the signup funnel.

## Current-code evidence summary

- Current stop plan already preserves Hatchery, Habit, Event Arena, Wisdom, Boss order and notes that Event Arena keeps the historical `mystery` stop id for compatibility.
- Current Island 1 narrative uses Luma Isle and characters Miri, Poko, Elder Sava, Captain Ivo, and Noctyra.
- Existing Welcome Pack services already provide canonical, lock-protected claims for cards and reward bundles.
- Existing event launcher already uses event-scoped `minigameTicketsByEvent[eventId]` for active timed-event launches.
- Existing architecture contracts require canonical reads via `useIslandRunState` and gameplay writes via canonical action services.
