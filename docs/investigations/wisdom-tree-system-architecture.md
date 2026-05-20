# Wisdom Tree System Architecture Investigation

## Scope

- Investigation only for an AI-powered Wisdom Tree / emotional reflection layer.
- No implementation, migrations, gameplay rewiring, economy changes, or live AI calls were added.
- Architecture recommendations preserve the Island Run contracts:
  - Read gameplay through `useIslandRunState` / store snapshots.
  - Mutate gameplay only through canonical action services.
  - Do not add runtime-state mirrors or direct UI patch writes.

## Architecture confidence

**PASS with constraints.**

The feature is feasible if Phase 1 is treated as a paced, mostly handcrafted card encounter system that reads existing context and saves optional journal-style reflections. Confidence drops if it is implemented as live chat, per-tile AI generation, or a gameplay-state writer.

## Current systems mapped

### 1) Existing AI infrastructure

- Supabase Edge Functions already exist for AI goal work:
  - `supabase/functions/suggest-goal/index.ts`
    - Uses OpenAI via `openai@4.67.3`.
    - Reads user-specific `ai_settings` first, then falls back to `OPENAI_API_KEY`.
    - Authenticates through Supabase user auth before generating.
  - `supabase/functions/goal-coach-chat/index.ts`
    - Uses OpenAI, trims message history to `MAX_TURNS = 24`, caps message text with `MAX_MESSAGE_CHARS = 1200`, and returns structured JSON.
    - Accepts goal context, personality summary, existing goals, and optional goal evolution summaries.
- Client-side direct OpenAI calls also exist:
  - `src/services/habitAiSuggestions.ts`
    - Uses `VITE_OPENAI_API_KEY`, `resolveAiEntitlement`, short timeouts, and deterministic fallback suggestions.
  - `src/services/environmentAiSuggestions.ts`
    - Uses the same entitlement path and falls back to local recommendations.
- AI task routing and free/premium model selection are centralized in:
  - `src/services/aiTaskRouting.ts`
    - Current task registry has `level_1` and `level_2`.
    - Free defaults use `gpt-4o-mini`; premium defaults use stronger models.
- Local quota protection exists but is client-local only:
  - `src/services/aiQuotaService.ts`
    - Free daily limits: `level_1 = 60`, `level_2 = 12`.
    - Free session limits: `level_1 = 18`, `level_2 = 4`.
  - `src/services/aiEntitlementService.ts`
    - Falls back when no API key or quota remains.
    - Emits AI analytics events through `trackAiTelemetry`.
- AI settings storage exists:
  - `supabase/migrations/0108_ai_settings.sql`
    - `ai_settings(user_id, provider, api_key, model)` with owner RLS.
  - `src/services/aiSettings.ts`
    - Fetches/upserts model settings for provider `openai`.

### 2) Existing Island Run systems

- Core contract:
  - `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
    - Island Run is 120 islands with exactly 5 sequential stops per island.
    - The 5 landmark order is Hatchery → Habit → Mystery → Wisdom → Boss.
    - Board tiles are movement/reward tiles only; landmarks are not tile indices.
- Architecture guardrails:
  - `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
  - `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`
- Current board owner:
  - `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
    - Still contains legacy compatibility paths and explicitly warns not to add new gameplay write paths.
    - Imports canonical services such as `islandRunStateActions`, `executeIslandRunRollAction`, and `executeIslandRunTileRewardAction`.
- Canonical stop plan:
  - `src/features/gamification/level-worlds/services/islandRunStops.ts`
    - Stop 4 is already `stopId: 'wisdom'`, title `📖 Wisdom Landmark`, description “A short story, questionnaire, or learning moment to reflect on.”
    - Mystery stop can rotate `checkin_reflection`, `habit_action`, `breathing`, and flag-gated `vision_quest`.
- Existing reflection stop:
  - `src/features/gamification/level-worlds/components/IslandRunReflectionComposer.tsx`
    - Presents static prompts, saves a private `journal_entries` row, and calls `onSaved`.
    - Tags entries with `island-run`, `dynamic-stop`, and `checkin-reflection`.
- Encounter tile service:
  - `src/features/gamification/level-worlds/services/encounterService.ts`
    - Encounters are quiz, breathing, or gratitude.
    - Comments describe them as intentionally easy, rewarding, and low-friction.
    - Reward rolling grants essence/shards/spin tokens; Wisdom Tree should not duplicate this reward logic.
- Board tile topology:
  - `src/features/gamification/level-worlds/services/islandBoardTileMap.ts`
    - `IslandTileType = 'currency' | 'chest' | 'hazard' | 'micro' | 'encounter'`.
    - Encounter positions are derived from board profile and island rarity, not hardcoded stop tiles.
- Action authority:
  - `src/features/gamification/level-worlds/services/islandRunRollAction.ts`
    - Single authoritative dice deduction and roll execution path.
  - `src/features/gamification/level-worlds/services/islandRunTileRewardAction.ts`
    - Single serialized landing reward action for essence + reward-bar effects.
  - `src/features/gamification/level-worlds/services/islandRunStateActions.ts`
    - Canonical gameplay state action surface.

### 3) Existing user/profile/context systems

- Goals:
  - `src/services/goals.ts`
    - Supabase-first with offline queue fallback.
    - Stores title, description, category, target date, plan quality, environment context, and snapshots.
- Habits:
  - `src/services/habitsV2.ts`
    - Supabase-first with offline queue fallback.
    - Supports habit title, schedule, status, intent, environment context, risk tags, and duration fields.
- Journaling:
  - `src/services/journal.ts`
    - Supabase/demo/offline paths exist.
    - `journal_entries` supports title, content, mood, tags, privacy, linked goals/habits, type, category, and mood score.
  - `IslandRunReflectionComposer` already proves Island Run can save private journal reflections without adding gameplay writes.
- Personality / identity:
  - `supabase/migrations/0132_personality_test.sql`
    - Adds profile summary columns and creates `personality_tests`.
  - `supabase/migrations/0139_add_archetype_hand.sql`
    - Adds `personality_tests.archetype_hand`.
  - `src/features/identity/deck/ArchetypeCard.tsx`
    - Existing symbolic card UI includes icon, suit, role, stars, strengths, and growth edges.
  - `src/features/identity/personalityTraitCopy.ts`
    - Existing trait copy is direct and card-like, but some labels are more clinical than the requested Wisdom Tree tone.

### 4) Existing gating systems

- Feature availability:
  - `src/config/featureAvailability.ts`
    - Central registry with `live`, `demo`, `comingSoon`, `locked`, `hidden`.
    - Public/admin access can resolve to `open`, `previewOnly`, or `hidden`.
- Access resolver:
  - `src/services/featureAccess.ts`
    - Admin-safe resolver defaults to public access unless admin is positively known.
- Admin lookup:
  - `src/services/adminRoles.ts`
    - Active admins come from `admin_users`.
- Preview overlay:
  - `src/components/FeaturePreviewOverlay.tsx`
    - Reusable “Future Feature” overlay with roadmap feedback.
  - `supabase/migrations/0239_feature_votes.sql`
    - `feature_votes` persists one vote per user+feature with owner RLS and admin read.
- Billing / Pro:
  - `src/services/billing.ts`
    - Reads `billing_entitlements.is_pro`, subscriptions, customers, and wallet.
  - `supabase/migrations/0213_billing_and_wallet_foundation.sql`
    - `billing_entitlements` stores computed entitlement state.
- Demo:
  - `src/services/demoSession.ts`
    - Demo sessions use a fixed demo user and demo metadata.

### 5) Existing storage patterns

- Island Run gameplay state currently lives in `island_run_runtime_state` through `IslandRunGameStateRecord`:
  - `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts`
    - Full runtime record includes dice, essence, stops, timed events, stickers, minigame tickets, creature collection, and reward state.
    - Commit coordinator enforces single-flight writes, remote backoff, pending writes, and conflict recovery.
- Legacy runtime bridge:
  - `src/features/gamification/level-worlds/services/islandRunRuntimeState.ts`
    - Explicitly says not to add fields to this alias and to add fields to `IslandRunGameStateRecord` only when appropriate.
- Profile metadata:
  - `src/features/gamification/level-worlds/services/islandRunProfile.ts`
    - Used for small user metadata patches like onboarding and first-run flags.
- Recommended Wisdom Tree storage path:
  - Phase 1: no new persistent emotional vector table.
  - Use existing `journal_entries` for optional saved reflections.
  - Use local deterministic card selection and temporary UI state for encounter display.
  - Future phase: a dedicated non-gameplay table for Wisdom Tree cards/vector snapshots, not `island_run_runtime_state`, if server persistence becomes necessary.

### 6) Existing mobile UX and cozy reveal patterns

- Safe areas:
  - `src/index.css`
    - Defines `--safe-area-top`, `--safe-area-left`, `--safe-area-right`.
  - `src/features/gamification/level-worlds/LevelWorlds.css`
    - Island Run shell uses `100dvh` and `env(safe-area-inset-*)`.
  - `src/styles/feature-preview-overlay.css`
    - Preview overlay uses safe-area padding and scroll-limited panels.
- Full-screen and layered modals:
  - `src/features/gamification/level-worlds/components/ShardClaimModal.tsx`
    - Blind-box reveal with shimmer delay.
  - `src/features/gamification/level-worlds/components/CreatureHatchRevealModal.tsx`
    - Cozy creature reveal card.
  - `src/features/gamification/daily-treats/ScratchCardReveal.tsx`
    - Lightweight scratch interaction with reveal threshold.
- Island visual language:
  - `src/features/gamification/level-worlds/LevelWorlds.css`
    - Warm wood/amber/gold aesthetic, fixed mobile shell, reward bar, HUD chips, and tutorial overlays.

## Safest integration points

### Safest: Wisdom Landmark content replacement / extension

- Use the existing `wisdom` landmark as the main integration surface.
- It is already explicitly described as story/questionnaire/learning content.
- It appears once per island, naturally limiting frequency.
- It avoids per-tile AI generation and avoids changing board reward mechanics.
- Required future implementation shape:
  - UI reads current island/stop state through canonical Island Run state.
  - Completing the reflection calls existing stop completion paths.
  - Card selection/generation does not write gameplay state directly.

### Safe: Mystery stop `checkin_reflection` variant

- Existing `IslandRunReflectionComposer` can inspire a non-AI Phase 1.
- It already saves to `journal_entries`, which fits optional emotional reflections.
- It should remain lightweight and not force deep journaling.

### Medium-safe: Encounter tile “Wisdom Tree” micro-encounter

- Existing encounter tiles already support quick choices and gratitude prompts.
- This can work if the Wisdom Tree encounter is static/template-based and capped.
- It should not grant new reward types or call AI on landing.
- It should not run on every encounter tile unless cached cards are already available.

### Not recommended for MVP: reward bar, dice, economy, boss, or minigame ticket systems

- These systems are intentionally scarce and tied to monetization/reward loops.
- Wisdom Tree should not modify dice, token, essence, reward-bar, hazard, stop-ticket, or minigame-ticket logic.

## Gameplay flow ideas

### Wisdom Landmark flow

1. Player taps Wisdom Landmark.
2. A cozy tree/card modal opens with 2–3 options.
3. Options are framed as gentle choices:
   - “Rest your lantern”
   - “Take one brave step”
   - “Send a warm signal”
4. Player picks one.
5. The card gives a short reflection and an optional tiny action.
6. Player can:
   - Continue without saving.
   - Save a short private note to journal.
   - Pick an easy alternative task if the main task feels too heavy.
7. Existing stop completion flow handles progress.

### Encounter tile flow

1. Player lands on a rare Wisdom Tree encounter tile.
2. The app selects from a prebuilt/cached local card bundle.
3. The card asks one simple choice.
4. Completion returns to normal encounter reward behavior already handled elsewhere.
5. No AI call occurs during tile landing.

### Easy alternative flow

- Main task:
  - “Spend 20 minutes building your project.”
- Softer alternative:
  - “Write one sentence about the dream this project is serving.”
- Architecture recommendation:
  - Treat alternatives as reflection/task content, not a new gameplay reward lane.
  - If a future habit/action system accepts alternatives, implement through habit/action services, not Island Run tile logic.

## Low-cost AI architecture

Recommended architecture:

1. Static card library first.
2. Local deterministic selection by island number, day key, archetype, and player context.
3. Optional server-generated bundles, not live single-card calls.
4. Cache by user, week, island band, and archetype mix.
5. Use AI only to refresh bundles daily/weekly or on major context changes.

Existing reusable pieces:

- `aiTaskRouting.ts` for task tiers and model routing.
- `aiEntitlementService.ts` / `aiQuotaService.ts` for client quota UX.
- Edge Function auth patterns from `suggest-goal` and `goal-coach-chat`.
- Existing fallback pattern from `habitAiSuggestions.ts` and `environmentAiSuggestions.ts`.
- Journal persistence from `IslandRunReflectionComposer`.

Gaps to address in a future implementation:

- Existing quotas are local only and can be bypassed; server-side usage limits would be needed for any app-funded AI.
- Existing AI endpoints are goal/habit-oriented; a new Wisdom Tree endpoint would be cleaner than overloading goal coach chat.
- Existing AI telemetry is client-dispatched; do not add new telemetry for this investigation, but future cost controls need server logs or metering.

## Risk analysis

### Top 5 biggest risks

1. **Per-tile live AI calls**
   - Would create runaway cost and slow down the board loop.
2. **Therapy-like framing**
   - Words like diagnosis, trauma, healing plan, disorder, or assessment would break the cozy game feel.
3. **Gameplay authority drift**
   - Adding card outcomes directly to `runtimeState` or calling patch APIs from UI would violate Island Run guardrails.
4. **Privacy overreach**
   - Using journal text, mood, or personality context without clear user control can feel invasive.
5. **Reward-loop manipulation**
   - Tying emotional choices to dice, essence, or streak pressure could feel morally judging or manipulative.

### Mitigations

- Cap appearances by landmark cadence rather than tile cadence.
- Use card bundles and templates instead of live generation.
- Keep all user-facing copy cozy, symbolic, and optional.
- Treat saved reflections as private journal entries.
- Keep emotional vectors out of Island Run gameplay state until a dedicated, reviewed storage design exists.

## Recommended phased rollout

### Phase 0 — Content and policy design

- Define card categories, copy rules, forbidden wording, safety boundaries, and example cards.
- Build handcrafted card packs for the six archetypes.
- No code or schema required.

### Phase 1 MVP — Static Wisdom Landmark cards

- Use the existing Wisdom Landmark once per island.
- Present 2–3 handcrafted symbolic choices.
- Optional private journal save using existing journal patterns.
- No AI calls, no new tables, no economy changes.

### Phase 2 — Cached personalized bundles

- Add generated weekly/daily bundles only after server-side throttling exists.
- Personalize lightly from goals/habits/categories, not raw private journal text by default.
- Fall back to handcrafted cards whenever generation fails.

### Phase 3 — Pro personalization

- Pro users get richer bundle variety, future-self cards, and longer memory.
- Still paced and bundled, never infinite chat.

### Phase 4 — Deeper emotional state

- Consider a dedicated `wisdom_tree_profile` or card cache table in a future migration.
- Keep it separate from `island_run_runtime_state`.
- Store low-resolution symbolic preferences, not clinical labels.

## Top 5 safest MVP approaches

1. Wisdom Landmark static 3-card choice once per island.
2. Mystery stop static reflection card variant using `IslandRunReflectionComposer` patterns.
3. Rare encounter tile that uses local prebuilt cards only.
4. Optional journal save with `island-run` and `wisdom-tree` tags.
5. Feature-preview gated demo using `FeaturePreviewOverlay` before broad release.

## Recommended Phase 1 MVP

Ship a non-AI Wisdom Landmark card encounter:

- One encounter per island at the Wisdom Landmark.
- Six symbolic categories: Flame, Hearth, Tide, Storm, Bloom, Mirror.
- 2–3 gentle choices per encounter.
- Optional journal save.
- No new migrations.
- No live AI calls.
- No changes to dice, essence, rewards, boss, or tile progression.

## Estimated implementation complexity

**Medium.**

The smallest version is UI/content work plus safe Island Run stop integration. Complexity rises if it tries to persist new emotional state, generate cards server-side, or affect habit completion.

## Estimated AI operational cost risk

**Low for Phase 1. Medium for cached Pro bundles. High if live calls are tied to tile/event loops.**

The cheapest scalable design is handcrafted cards for Free, cached weekly/daily bundles for Pro, and strict server-side generation limits.
