# Wisdom Tree Supabase, Consent, and Memory Architecture

## Scope

- Investigation only.
- No code was implemented.
- No migrations were created.
- No existing tables were modified.
- No AI calls were added.
- No Island Run gameplay was changed.

## PASS/FAIL confidence

**PASS with phased constraints.**

Wisdom Tree can support trusted personalization and future Pro AI cheaply if it stays separate from Island Run runtime state, defaults to handcrafted/static content, stores only consented low-sensitivity signals, compresses raw product data before AI use, and caches generated bundles with server-side idempotency and quotas.

**FAIL if implemented as:**

- mandatory AI analysis,
- live generation per tile/roll/modal open,
- raw journal-history memory,
- hidden age/life-stage inference,
- clinical/diagnostic labeling,
- or emotional choices connected to stronger dice/essence/gameplay rewards.

## Existing systems inspected

### Island Run runtime-state boundary

- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md:10-23`
  - Gameplay reads must use canonical Island Run store/hooks.
  - Gameplay writes must use canonical action services.
- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md:24-30`
  - New UI direct runtime patch writes and new gameplay runtime-state mirrors are forbidden.
- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md:217-250`
  - Wisdom is Stop 4 in the fixed Island Run sequence.
- `supabase/migrations/0167_island_run_runtime_state_progression_markers.sql:4-16`
  - `island_run_runtime_state` is gameplay/runtime persistence.
- `supabase/migrations/0215_island_run_contract_v2_runtime_fields.sql:4-24`
  - Runtime state includes gameplay fields like active stop, stop states, essence, reward bar, event progress, and inventory.
- `src/features/gamification/level-worlds/services/islandRunRuntimeState.ts:13-31`
  - Explicitly warns not to route new gameplay mutations through the compatibility bridge.

**Conclusion:** Wisdom Tree consent, memory, profile summaries, and AI cache data must be stored in separate Wisdom Tree tables, never in `island_run_runtime_state`.

### Journal

- `supabase/migrations/0106_journal_feature.sql:21-35`
  - `journal_entries` stores raw journal content, tags, linked goals/habits, and privacy flag.
- `supabase/migrations/0106_journal_feature.sql:43-61`
  - Owner-only RLS policy protects journal entries.
- `src/services/journal.ts:490-525`
  - `createJournalEntry` validates active session and payload user before insert; network failures can queue local journal records.

**Conclusion:** Future Wisdom Tree journal linking should store only an optional `journal_entry_id` reference, not raw journal text in Wisdom Tree memory. Journal text use for AI should be separately consented and summarized before prompting.

### Goals

- `src/services/goals.ts:365-383`
  - `fetchGoals()` reads the current user's goals via Supabase/RLS and merges local offline records.
- `src/services/goals.ts:86-110`
  - Goal records can include title, description, life wheel category, timing, why-it-matters, priority, and environment fields.
- `supabase/migrations/0104_life_goals_extended.sql:44-58`
  - Goals include `life_wheel_category`, timing fields, and indexes.

**Conclusion:** Wisdom Tree can use goals as optional compressed signals, but should not repeatedly send full goal descriptions or long progress notes to AI.

### Habits

- `supabase/migrations/0001_habits_core.sql:27-41`
  - `habits_v2` stores title, emoji, type, schedule, target, and metadata.
- `supabase/migrations/0001_habits_core.sql:70-84`
  - `habit_logs_v2` stores habit completions, value, note, and mood.
- `supabase/migrations/0001_habits_core.sql:147-177`
  - Habits, logs, reminders, and profiles use owner RLS.
- `src/services/habitsV2.ts:318-328`
  - `listHabitsV2()` reads active, non-archived habits through Supabase/RLS.

**Conclusion:** Habit signal use should be opt-in and compressed to frequency/domain weights; do not copy raw habit notes into Wisdom Tree memory.

### Personality / archetype

- `supabase/migrations/0132_personality_test.sql:3-18`
  - Profiles may store personality traits/axes/summary; `personality_tests` stores traits, axes, answers, and version.
- `supabase/migrations/0132_personality_test.sql:45-66`
  - Owner-only RLS protects tests; questions/recommendations are authenticated-readable.
- `supabase/migrations/0139_add_archetype_hand.sql:4-7`
  - `personality_tests.archetype_hand` stores symbolic archetype cards.
- `src/services/personalityTest.ts:127-139`
  - Personality tests are fetched per user.
- `src/services/personalityTest.ts:244-252`
  - Latest test can update profile personality summary.

**Conclusion:** Wisdom Tree should use archetype/personality data only if separately consented. It should prefer symbolic, non-diagnostic language and avoid clinical traits as direct card labels.

### Workspace profile / birthday

- `supabase/migrations/0107_workspace_profiles.sql:6-14`
  - `workspace_profiles` stores display/full/workspace names.
- `supabase/migrations/0107_workspace_profiles.sql:21-45`
  - Owner-only RLS protects workspace profiles.
- `supabase/migrations/0180_workspace_profile_birthday.sql:1-5`
  - Optional `workspace_profiles.birthday` already exists.
- `supabase/migrations/0183_workspace_profile_gender.sql:1-5`
  - Optional `gender` also exists.
- `src/services/workspaceProfile.ts:13-25`
  - Workspace profile is fetched by `user_id`.

**Conclusion:** Do not require birthday. If future Wisdom Tree uses age/life-stage, prefer user-selected broad tone/bucket over deriving from birthday. If birthday is already present, use it only with explicit Wisdom Tree consent.

### Billing / entitlement

- `supabase/migrations/0213_billing_and_wallet_foundation.sql:41-50`
  - `billing_entitlements` stores `is_pro`, entitlement JSON, source, and effective dates.
- `supabase/migrations/0213_billing_and_wallet_foundation.sql:130-160`
  - Users can select their own billing rows.
- `supabase/migrations/0213_billing_and_wallet_foundation.sql:162-201`
  - Backend/service-role paths own billing writes.
- `src/services/billing.ts:37-64`
  - `fetchBillingSnapshot()` reads entitlement, subscription, customer, and wallet.

**Conclusion:** Future Wisdom Tree cache generation should key tier decisions off server-verified billing entitlements, not browser-controlled tier flags.

### AI settings/routing/quota

- `supabase/migrations/0108_ai_settings.sql:6-13`
  - `ai_settings` stores provider, API key, and model per user.
- `supabase/migrations/0108_ai_settings.sql:21-47`
  - Owner-only RLS allows users to manage their own AI settings.
- `src/services/aiTaskRouting.ts:1-11`
  - Existing task registry covers habit and conflict tasks only; Wisdom Tree is not registered.
- `src/services/aiTaskRouting.ts:44-72`
  - Model routing currently depends on cost level and runtime tier.
- `src/services/aiQuotaService.ts:13-25`
  - Existing quota is localStorage/sessionStorage only.
- `src/services/aiEntitlementService.ts:16-90`
  - Client-side entitlement consumes local quota and falls back when no API key/quota.
- `src/services/aiTelemetry.ts:21-27`
  - AI telemetry dispatches browser events and KPI records.

**Conclusion:** Existing client quota is not enough for app-funded Wisdom Tree Pro generation. Future Wisdom Tree needs server-side quota/idempotency before any app-funded AI generation.

### Edge Function auth patterns

- `supabase/functions/suggest-goal/index.ts:148-177`
  - Requires Authorization header and validates the Supabase user.
- `supabase/functions/suggest-goal/index.ts:194-218`
  - Uses user/app OpenAI key and calls OpenAI after validation.
- `supabase/functions/goal-coach-chat/index.ts:55-58`
  - Caps turns and message length (`MAX_TURNS`, `MAX_MESSAGE_CHARS`).
- `supabase/functions/goal-coach-chat/index.ts:107-145`
  - Resolves user AI settings/model with app-key fallback.
- `supabase/functions/goal-coach-chat/index.ts:211-250`
  - Compresses context into short, capped fields before prompting.

**Conclusion:** Wisdom Tree generation should be an authenticated Edge Function using service-role writes only for generated cache/usage rows, with strict input caps and context summaries.

### Existing AI run telemetry precedent

- `supabase/migrations/0201_conflict_ai_memory.sql:3-25`
  - `conflict_ai_runs` stores stage, mode, model, context domains, token counts, latency, fallback, errors, and creator.
- `src/features/conflict-resolver/services/conflictAiOrchestrator.ts:200-229`
  - Conflict AI persists model, mode, token counts, latency, and errors.

**Conclusion:** Wisdom Tree should use similar run telemetry ideas, but scoped per user and generation period, not per chat message.

## Recommended future data model

### Core principle

Wisdom Tree data should be a **separate personalization layer**:

- Island Run runtime state remains gameplay-only.
- Wisdom Tree events record lightweight choices, not diagnoses.
- Raw journals/goals/habits remain in their existing tables.
- Summaries are compressed, versioned, consent-scoped, and deletable.
- AI outputs are cached bundles, not generated on every interaction.

### Proposed tables by phase

| Table | Phase | Needed now? | Purpose |
|---|---:|---:|---|
| `wisdom_tree_preferences` | Phase 2 | No | User consent/control and personalization mode |
| `wisdom_tree_choice_events` | Phase 2 | No | Lightweight card/choice event memory |
| `wisdom_tree_profile_snapshots` | Phase 3 | No | Compressed symbolic Wisdom profile summary |
| `wisdom_tree_context_summaries` | Phase 3 | No | Compressed source-domain summaries for goals/habits/journal/personality |
| `wisdom_tree_card_cache` | Phase 4 | No | Cached generated Pro card bundles/future-self notes |
| `wisdom_tree_generation_usage` | Phase 4 | No | Server-side quota, idempotency, cost telemetry |

## Table-by-table proposal

### 1) `wisdom_tree_preferences`

**Phase:** Phase 2  
**Needed in Phase 1:** No

**Purpose**

Store user consent and control settings for Wisdom Tree personalization.

**Recommended fields**

- `user_id uuid primary key references auth.users(id) on delete cascade`
- `created_at timestamptz`
- `updated_at timestamptz`
- `ai_analysis_mode text`
  - allowed: `off`, `handcrafted_only`, `gentle_personalization`, `deeper_reflection`
  - default: `handcrafted_only`
- `use_choice_history boolean default true`
- `use_goals boolean default false`
- `use_habits boolean default false`
- `use_journal_text boolean default false`
- `use_personality_archetype boolean default false`
- `use_birthday_if_available boolean default false`
- `do_not_infer_age_life_stage boolean default true`
- `life_stage_self_reported text null`
  - broad optional value, e.g. `student`, `early_career`, `family_care`, `career_growth`, `transition`, `retirement`, `prefer_not_to_say`
- `tone_preference text`
  - e.g. `cozy`, `playful`, `direct`, `extra_gentle`
- `memory_enabled boolean default true`
- `memory_reset_at timestamptz null`
- `last_consent_reviewed_at timestamptz null`
- `settings_version integer default 1`

**What NOT to store**

- Raw journal text.
- Raw goal/habit notes.
- Birthdate copy.
- Inferred age.
- Clinical labels.
- “Diagnosis,” “trauma,” “attachment style,” or mental-health classifications.
- Any reward/economy/gameplay state.

**RLS notes**

- Owner `SELECT/INSERT/UPDATE/DELETE` by `auth.uid() = user_id`.
- Avoid admin broad read by default.
- If support tooling needs visibility, show only coarse settings and never sensitive source preferences unless strictly necessary.

**Cost/privacy risk**

- Low cost.
- Medium privacy sensitivity because it records consent choices. Keep owner-only and make reset/delete easy.

### 2) `wisdom_tree_choice_events`

**Phase:** Phase 2  
**Needed in Phase 1:** No

**Purpose**

Store lightweight memory of cards shown and choices selected so Wisdom Tree can adapt without raw emotional profiling.

**Recommended fields**

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `created_at timestamptz default now()`
- `event_type text`
  - `card_shown`, `choice_selected`, `journal_saved`, `card_completed`
- `card_id text not null`
- `card_source text`
  - `static`, `cached_ai`, `fallback_static`
- `card_version text`
- `category text`
  - `Flame`, `Hearth`, `Tide`, `Storm`, `Bloom`, `Mirror`
- `choice_id text null`
- `choice_label_key text null`
  - stable key, not full freeform user text.
- `island_number integer null`
- `cycle_index integer null`
- `wisdom_stop_context jsonb default '{}'`
  - safe metadata only, e.g. `{ "stopId": "wisdom", "surface": "island_run" }`
- `journal_entry_id uuid null references public.journal_entries(id) on delete set null`
- `client_event_id text null`
  - idempotency from client.
- `session_id text null`

**What NOT to store**

- Raw choice emotion explanation.
- Freeform reflection text.
- Diagnosis-like labels.
- Full card prose if `card_id`/version can resolve it.
- Rewards, dice, essence, boss, tile, or runtime-state fields.
- Hidden demographic inference.

**RLS notes**

- Owner-only `SELECT`.
- Owner insert allowed for event logging with `user_id = auth.uid()`.
- Consider append-only user events:
  - no user update except perhaps soft delete/reset.
  - deletion allowed for reset/delete.
- Add unique constraint on `(user_id, client_event_id)` when `client_event_id` is not null to prevent double logs.

**Cost/privacy risk**

- Low storage cost.
- Low-to-medium privacy sensitivity. It is behavioral data; avoid sensitive labels and allow reset.

### 3) `wisdom_tree_profile_snapshots`

**Phase:** Phase 3  
**Needed in Phase 1:** No

**Purpose**

Store compressed symbolic Wisdom Tree profile snapshots derived from choice history and consented source summaries.

**Recommended fields**

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `created_at timestamptz default now()`
- `valid_from timestamptz default now()`
- `expires_at timestamptz null`
- `source_event_range jsonb`
  - counts/date range, not raw events.
- `category_weights jsonb`
  - e.g. `{ "Flame": 0.22, "Hearth": 0.18 }`
- `recent_tendencies jsonb`
  - symbolic/taxonomic keys like `small_next_step`, `restoration`, `uncertainty`, not diagnoses.
- `life_domain_priorities jsonb`
  - broad domains and weights, e.g. `health`, `career`, `relationships`, `finance`, `growth`, `home`, `creativity`.
- `confidence numeric`
- `recency_score numeric`
- `summary_text text`
  - cozy symbolic language.
- `summary_version text`
- `source_domains text[]`
  - e.g. `choice_events`, `goals_summary`, `habits_summary`.
- `consent_snapshot jsonb`
  - compact record of which source domains were allowed.
- `generated_by text`
  - `deterministic`, `edge_ai`, `manual_reset`

**What NOT to store**

- Raw journal history.
- Raw goals/habits.
- Clinical labels.
- “User is depressed/anxious/ADHD/etc.”
- Protected-class or inferred demographic attributes.
- Exact age unless user explicitly chose an age bucket.

**RLS notes**

- Owner-only read.
- Writes should be service-role-only or owner writes through controlled RPC/Edge Function.
- User deletion/reset must delete snapshots.

**Cost/privacy risk**

- Medium privacy risk because it is a derived profile.
- Cost low if deterministic; medium if AI-generated. Prefer deterministic aggregation first.

### 4) `wisdom_tree_context_summaries`

**Phase:** Phase 3  
**Needed in Phase 1:** No

**Purpose**

Store compressed source-domain summaries so future AI bundles can avoid raw long prompts and repeated expensive summarization.

**Recommended fields**

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `source_domain text`
  - `goals`, `habits`, `journal`, `personality`, `choice_events`
- `summary_kind text`
  - `domain_weights`, `recent_themes`, `signal_counts`, `safe_prompt_context`
- `summary_json jsonb default '{}'`
- `summary_text text null`
- `source_hash text not null`
- `source_item_count integer`
- `source_from timestamptz null`
- `source_to timestamptz null`
- `prompt_version text null`
- `generated_by text`
  - `deterministic`, `edge_ai`
- `created_at timestamptz default now()`
- `expires_at timestamptz null`
- `consent_snapshot jsonb`

**What NOT to store**

- Full journal entries.
- Full goal descriptions when a domain/category/short title hash is enough.
- Full habit logs or notes.
- Any raw source payload that would recreate the original private text.
- Sensitive inferences.

**RLS notes**

- Owner-only read/delete.
- Service-role-only generation writes for AI-generated summaries.
- Owner/client writes allowed only for deterministic non-sensitive summaries if needed.

**Cost/privacy risk**

- Medium privacy risk.
- Medium cost reducer; this table is key to cheap cached bundles because it prevents repeated long-context prompting.

### 5) `wisdom_tree_card_cache`

**Phase:** Phase 4  
**Needed in Phase 1:** No

**Purpose**

Cache weekly or period-based Pro AI card bundles and future-self notes.

**Recommended fields**

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `period_key text not null`
  - e.g. `2026-W21` or `island-band-001-010`
- `bundle_kind text`
  - `weekly_cards`, `future_self_notes`, `fallback_static_mix`
- `tier text`
  - `free`, `pro`, `admin_test`
- `card_bundle jsonb not null`
  - generated cards, choices, responses, safety metadata.
- `future_self_notes jsonb default '[]'`
- `prompt_version text not null`
- `model text null`
- `context_hash text not null`
- `preferences_hash text not null`
- `source_summary_ids uuid[] default '{}'`
- `idempotency_key text not null`
- `status text`
  - `ready`, `generating`, `failed`, `expired`, `fallback`
- `fallback_reason text null`
- `created_at timestamptz default now()`
- `expires_at timestamptz not null`
- `last_served_at timestamptz null`

**What NOT to store**

- Raw source context used to generate the cards.
- Full journal/goal/habit text.
- Token-by-token chat transcript.
- Diagnostic labels.
- Gameplay/economy state.

**RLS notes**

- Owner-only read.
- Service-role-only insert/update for generated cache rows.
- Owner delete for reset/delete.
- Unique constraint on `(user_id, bundle_kind, period_key, prompt_version, context_hash, preferences_hash)` or on `idempotency_key` to prevent repeated generation.

**Cost/privacy risk**

- Medium cost risk if generation is not idempotent.
- Medium privacy risk because generated cards may reflect summaries; keep owner-only and expire/refresh.

### 6) `wisdom_tree_generation_usage`

**Phase:** Phase 4  
**Needed in Phase 1:** No

**Purpose**

Server-side quota/cost control and observability for Wisdom Tree generation.

**Recommended fields**

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `created_at timestamptz default now()`
- `period_key text not null`
- `request_kind text`
  - `generate_weekly_bundle`, `refresh_context_summary`, `future_self_note`
- `tier text`
  - `free`, `pro`, `admin_test`
- `mode text`
  - `cached_hit`, `generated`, `fallback`, `blocked_quota`, `error`
- `idempotency_key text not null`
- `cache_id uuid null references public.wisdom_tree_card_cache(id) on delete set null`
- `model text null`
- `prompt_version text null`
- `context_hash text null`
- `token_input integer null`
- `token_output integer null`
- `latency_ms integer null`
- `error_code text null`
- `error_message text null`

**What NOT to store**

- Prompt text.
- Raw context.
- User journal/goal/habit content.
- Generated card body if already stored in cache.

**RLS notes**

- Owner-only read of usage summary can be allowed.
- Service-role-only insert.
- Admin aggregate dashboards should query anonymized/aggregated views, not raw per-user rows.
- Unique index on `idempotency_key`.

**Cost/privacy risk**

- Low privacy risk if no raw prompts/errors with personal content are stored.
- High cost-control value.

## Consent model

### Recommended modes

1. **AI analysis off**
   - No AI profile summaries.
   - Static cards only.
   - Optional local/card event logging can still be disabled separately.

2. **Cozy handcrafted-only mode**
   - Default for Phase 1 and safest default overall.
   - Static card library.
   - No AI.
   - Optional choice events only if memory is enabled.

3. **Gentle personalization mode**
   - Uses choice history and optionally goals/habits summaries.
   - No journal text by default.
   - Generates or selects from cached bundles only.
   - Symbolic language only.

4. **Deeper reflection mode**
   - Explicit opt-in.
   - Can use journal summaries only if `use_journal_text = true`.
   - Must show clear explanation: “We summarize themes, not store your full journal in Wisdom Tree memory.”
   - No clinical claims.

### Consent toggles

Minimum future preferences UI should include:

- AI analysis: off / handcrafted-only / gentle / deeper.
- Use goals: yes/no, default no.
- Use habits: yes/no, default no.
- Use journal text: yes/no, default no.
- Use personality/archetype: yes/no, default no.
- Use birthday if already provided: yes/no, default no.
- Do not infer age/life stage: yes/no, default yes.
- Reset Wisdom Tree memory.
- Delete all Wisdom Tree data.

### Reset/delete behavior

**Reset memory**

- Set `wisdom_tree_preferences.memory_reset_at = now()`.
- Delete or ignore choice events before reset.
- Delete profile snapshots/context summaries/card caches before reset.
- Keep preferences unless user chooses full delete.

**Delete Wisdom Tree data**

- Delete preferences, choice events, snapshots, context summaries, card cache, usage rows where legally/product-appropriate.
- Do not delete original journal/goals/habits/personality data; those belong to their source features.

## Memory compression model

### Event → aggregate → profile

1. Store only lightweight choice events:
   - card id/version,
   - category,
   - choice id,
   - island number,
   - timestamp,
   - optional journal entry reference.

2. Periodically aggregate to category/domain weights:
   - counts by category,
   - recency-weighted tendencies,
   - broad source-domain weights,
   - confidence based on sample size and recency.

3. Create profile snapshot:
   - cozy summary,
   - category weights,
   - recent tendencies,
   - source domains used,
   - consent snapshot.

### Safe tendency keys

Allowed examples:

- `small_next_step`
- `rest_and_care`
- `connection`
- `uncertainty`
- `courage`
- `creative_growth`
- `reflection`
- `boundary_setting`

Avoid:

- `depressed`
- `anxious`
- `avoidant`
- `traumatized`
- `immature`
- `manic`
- `high_risk_user`
- `lonely_person`

## Age/life-stage handling recommendation

### Recommendation

Do **not** require birthday and do **not** infer exact age or life stage by default.

### Safest design

1. Use no age/life-stage signal in Phase 1 or Phase 2.
2. If future personalization needs it, ask for optional soft self-report:
   - “What kind of season are you in right now?”
   - Choices like `student`, `early career`, `caregiving/family season`, `career growth`, `big transition`, `retirement/legacy`, `prefer not to say`.
3. If birthday already exists in `workspace_profiles.birthday`, only use broad age buckets with explicit Wisdom Tree consent:
   - `under_18` should generally avoid deeper AI reflection and use extra-safe handcrafted content.
   - `18_24`, `25_34`, `35_44`, `45_54`, `55_64`, `65_plus` if truly necessary.
4. Keep `do_not_infer_age_life_stage` default true.
5. Never expose copy that feels creepy:
   - Avoid “As someone your age...”
   - Prefer “For this season of life, if it fits...”
6. Do not derive life stage from goals/habits/journal unless user explicitly self-reports.

## Goal/habit signal compression

### Safe reads

Use existing owner-scoped services/RLS patterns:

- Goals:
  - `fetchGoals()` from `src/services/goals.ts`.
  - Use only if `wisdom_tree_preferences.use_goals = true`.
- Habits:
  - `listHabitsV2()` from `src/services/habitsV2.ts`.
  - Use only if `wisdom_tree_preferences.use_habits = true`.

### Recommended compression

For goals:

- Count by `life_wheel_category`.
- Extract short title keywords only after deduplication.
- Weight active/current goals more than stale/completed goals.
- Store:
  - domain weights,
  - top 3 broad priorities,
  - recency date range,
  - source hash.

For habits:

- Count active habits by domain/intent/schedule.
- Store frequency/weight:
  - daily vs weekly,
  - consistency trend if already available,
  - broad domains.
- Avoid storing raw notes or mood logs.

### Deduplication

- Normalize lowercase trimmed titles.
- Hash source item ids + updated_at + relevant safe fields.
- If `source_hash` unchanged, do not regenerate context summary.
- Merge repeated categories into weights rather than repeated text.

## Cached AI bundles model

### Recommended generation pattern

- Future Pro AI should generate **weekly bundles** or **island-band bundles**, not per open.
- Edge Function:
  1. Authenticate user.
  2. Read preferences.
  3. Verify billing entitlement server-side.
  4. Build/check context hashes.
  5. Check `wisdom_tree_card_cache`.
  6. If cache hit, return cached bundle.
  7. If cache miss and quota allows, generate once.
  8. Store cache + usage row in same server-side flow.

### Context hash

Hash should include:

- preferences version/hash,
- prompt version,
- selected source summary ids/hashes,
- period key,
- tier,
- language/locale if used.

Hash should not include:

- raw journal text,
- raw goal/habit text,
- raw AI prompt.

### Idempotency

- Client sends a `client_request_id`.
- Server computes `idempotency_key`.
- Unique index prevents duplicate generation for the same user/period/context/prompt.
- If a generation is already in progress, return `generating` or cached fallback instead of starting another call.

## AI cost-control model

### Are existing quota systems enough?

**No.**

Existing `aiQuotaService` is browser-local and can be reset or bypassed. It is useful for UX/fallback hints, but not enough for app-funded Wisdom Tree generation.

### Future server-side quota

Add a Wisdom Tree Edge Function plus `wisdom_tree_generation_usage`:

- Check server-side entitlement from `billing_entitlements`.
- Limit generation by:
  - user,
  - period,
  - request kind,
  - tier.
- Count only actual generation, not cache hits.
- Record cache hits to observe value.
- Block repeated generation with idempotency keys.

### Recommended limits

- Free:
  - no AI generation in early rollout,
  - handcrafted/static only,
  - optional cached global/static bundles.
- Pro:
  - one weekly personalized bundle per user per prompt version/context hash.
  - optional manual refresh with strict monthly cap.
- Admin/test:
  - separate tier and lower-risk debug controls.

## RLS / privacy checklist

### Table-level checklist

- Every Wisdom Tree table has `user_id`.
- RLS enabled on every table.
- Owner-only `SELECT`.
- Owner-only preference writes.
- Choice events owner insert with idempotency.
- Generated snapshots/cache/usage service-role write only where possible.
- Owner delete/reset supported.
- Admin access only through audited, aggregated, or explicit support tooling.
- No public read policies.

### Data minimization checklist

- Do not store raw full journal history.
- Do not store raw AI prompts containing private source data.
- Do not store full goal/habit notes in Wisdom Tree tables.
- Do not store clinical/diagnostic labels.
- Do not store exact inferred age/life stage.
- Do not store Island Run reward/economy/gameplay state.
- Do not store infinite chat transcripts.

### AI safety/privacy checklist

- AI optional and off/handcrafted by default.
- Journal text off by default.
- Source domains included in prompt must match current consent.
- Prompt uses summaries, not raw long histories.
- Cache output expires.
- Reset/delete removes generated personalizations.
- Generated copy uses symbolic cozy language.
- No emotional choice changes dice/essence/reward odds.

## Phased rollout

### Phase 1: no schema

Implement now:

- Handcrafted static cards only.
- No AI.
- No Supabase tables.
- No choice event persistence.
- No Wisdom Tree runtime-state fields.
- No journal save unless separately approved.
- No gameplay/economy coupling.

Do not implement now:

- Any Wisdom Tree migration.
- Any AI cache.
- Any profile summary.
- Any consent table.

### Phase 2: preferences + choice events

Implement later:

- `wisdom_tree_preferences`.
- `wisdom_tree_choice_events`.
- Reset/delete Wisdom Tree memory UX.
- Consent UI with handcrafted default.
- Optional journal reference only, not raw text.

Purpose:

- Let users control personalization.
- Start low-risk symbolic memory.

### Phase 3: profile snapshots + context summaries

Implement later after Phase 2 is stable:

- `wisdom_tree_profile_snapshots`.
- `wisdom_tree_context_summaries`.
- Deterministic aggregators first.
- Optional consented goals/habits summaries.
- Journal summaries only with explicit opt-in.

Purpose:

- Compress repeated signals.
- Prepare safe AI context without raw long prompts.

### Phase 4: cached Pro AI bundles

Implement last:

- `wisdom_tree_card_cache`.
- `wisdom_tree_generation_usage`.
- Authenticated Edge Function.
- Server-side entitlement/quota.
- Idempotent weekly bundle generation.
- Cache fallback to static cards.

Purpose:

- Provide richer Pro personalization without live per-modal AI costs.

## Clear recommendation: implement now vs later

### Implement now

- Phase 1 static Wisdom Tree card encounter only.
- Documentation and UX copy rules.
- No schema.
- No AI.
- No memory.
- No journal source analysis.

### Implement later

- Phase 2 preferences and choice events.
- Phase 3 compressed summaries.
- Phase 4 cached Pro AI bundles and server-side quota.

### Do not implement

- Wisdom Tree data inside `island_run_runtime_state`.
- Raw journal-history storage in Wisdom Tree tables.
- Mandatory AI analysis.
- Required birthdate.
- Hidden demographic profiling.
- Infinite chat memory.
- Emotional-choice rewards.

## Final recommendation

For user trust and cost control, Wisdom Tree should evolve from **static cozy cards** to **consented lightweight memory** to **compressed symbolic summaries** to **cached Pro AI bundles**. The database should be additive, isolated, owner-protected, and resettable. The first implementation PR should still ship with **no new schema** and should leave all AI/data architecture as future work.
