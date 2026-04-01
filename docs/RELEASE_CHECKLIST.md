# LifeGoalApp — Release Checklist

> **Purpose**: Step-by-step release checklist for deploying a new instance of LifeGoalApp or promoting the current `main` branch to production.
>
> Run items top-to-bottom. Items marked **🔄 idempotent** use `IF NOT EXISTS` / `ON CONFLICT DO NOTHING` guards and are safe to re-run against an existing database. All other migrations must be run exactly once in order.

---

## 1. Pre-flight

- [ ] Confirm you are on the correct branch (`main` or a release tag).
- [ ] Confirm `git status` is clean (no uncommitted changes).
- [ ] Run `npm run build` — must exit with **zero TypeScript errors and zero build errors**. Chunk-size warnings are pre-existing and can be ignored.
- [ ] Verify `.env.local` (or deployment environment variables) contains all required variables (see Section 3).

---

## 2. Supabase Migration Steps

Run migrations in the order listed below. All files are in `supabase/migrations/`.

> **How to run**: `supabase db push` (applies all pending migrations) **or** copy-paste individual SQL files into the Supabase SQL editor. When running individually, follow the sequential order below.

### Core habits & reminders (0001–0012)

| File | Description | Idempotent? |
|---|---|---|
| `0001_habits_core.sql` | Core habits schema: `habits_v2`, `habit_logs_v2`, `reminders`, `profiles`, `streaks` | No |
| `0002_push.sql` | Push subscriptions: `push_subscriptions` table and VAPID key storage | No |
| `0003_challenges_autoprog.sql` | Challenges, auto-progression: `challenges`, `challenge_instances` | No |
| `0004_habits_v2_domain_goal.sql` | Adds `domain` and `goal_id` columns to `habits_v2`; links habits to life goals | 🔄 |
| `0005_habit_adjustments.sql` | Habit adjustment history table | 🔄 |
| `0006_habit_adjustments_rollbacks.sql` | Rollback helpers for habit adjustments | 🔄 |
| `0007_reminder_prefs_and_state.sql` | `user_reminder_prefs` and per-habit reminder preferences | 🔄 |
| `0008_m4_autoprog_ladder_v1.sql` | M4 auto-progress ladder: `progress_state`, `completion_percentage` columns on `habit_logs_v2`; `habit_environment`, `done_ish_config` on `habits_v2` | No |
| `0008_per_habit_prefs_actions_logging.sql` | Per-habit action logging and preferences | 🔄 |
| `0009_reminder_analytics_views.sql` | Analytics views for reminder delivery rates | 🔄 |
| `0010_timezone_quiet_hours_weekends.sql` | Timezone and quiet-hours columns on `user_reminder_prefs` | 🔄 |
| `0011_merge_legacy_habits_into_v2.sql` | One-time migration: merges legacy `habits` rows into `habits_v2` | 🔄 |
| `0012_archive_and_drop_legacy_habits.sql` | Archives and drops legacy `habits` table | 🔄 |

### Vision board & extended goals (0101–0105)

| File | Description | Idempotent? |
|---|---|---|
| `0101_vision_core.sql` | `vision_images` table, storage bucket | No |
| `0102_sharing_push.sql` | Vision board sharing and push integration columns | No |
| `0103_gratitude_mood.sql` | Gratitude entries and mood tracking columns | No |
| `0104_life_goals_extended.sql` | Extended goal fields: `target_date`, `life_wheel_category`, `status_tag`, `progress_notes` | No |
| `0105_vision_images_url_support.sql` | Adds public URL support for vision images | No |

### Journal & profiles (0106–0114)

| File | Description | Idempotent? |
|---|---|---|
| `0106_journal_feature.sql` | `journal_entries` table with tags, mood, type | 🔄 |
| `0107_workspace_profiles.sql` | `workspace_profiles` for per-user display preferences | 🔄 |
| `0108_add_initials.sql` | Adds `initials` column to profiles | 🔄 |
| `0108_ai_settings.sql` | `ai_settings` table for AI coach data-access toggles | 🔄 |
| `0109_habit_completions.sql` | Habit completion summary materialized view | No |
| `0110_meditation_sessions.sql` | `meditation_sessions` table | 🔄 |
| `0111_meditation_reminders.sql` | Meditation reminder preferences | 🔄 |
| `0112_journal_modes.sql` | Adds `mode` column to `journal_entries` | 🔄 |
| `0113_vision_images_file_metadata.sql` | Adds file metadata columns to `vision_images` | 🔄 |
| `0114_problem_journal_type.sql` | Adds `problem` journal entry type | 🔄 |
| `0114_vision_images_review_metadata.sql` | Adds review metadata columns to `vision_images` | 🔄 |

### Gamification & power-ups (0115–0131)

| File | Description | Idempotent? |
|---|---|---|
| `0115_gamification_system.sql` | `gamification_profiles`, `gamification_notifications`, XP ledger, level config | 🔄 |
| `0116_annual_reviews.sql` | Annual review session tables | 🔄 |
| `0116_daily_spin_wheel.sql` | Daily spin wheel state table | 🔄 |
| `0117_vision_board_daily_game.sql` | Vision board daily game session tracking | No |
| `0118_checkins_upsert_rule.sql` | Upsert rule for daily check-ins (idempotent daily records) | No |
| `0119_telemetry_events.sql` | `telemetry_events` and `telemetry_preferences` tables | 🔄 |
| `0120_vision_board_image_tags.sql` | Tags system for vision board images | No |
| `0121_vision_board_image_tags_group.sql` | Tag group support | No |
| `0122_meditation_goals_tracking.sql` | Meditation goal tracking tables | 🔄 |
| `0123_meditation_goals_functions.sql` | RPC functions for meditation goal progress | No |
| `0124_vision_board_storage_bucket.sql` | Vision board v1 storage bucket policy | 🔄 |
| `0125_annual_review_completed_at.sql` | Adds `completed_at` to annual reviews | 🔄 |
| `0126_daily_spin_wheel.sql` | Daily spin wheel v2 schema update | 🔄 |
| `0127_power_ups_store.sql` | `power_ups` and `user_power_ups` tables | 🔄 |
| `0128_optimize_push_notifications.sql` | Indexes and partition optimization on push tables | 🔄 |
| `0129_actions_feature.sql` | Actions, projects, and task management tables | 🔄 |
| `0130_add_zen_tokens.sql` | Adds zen token balance to gamification profiles | 🔄 |
| `0131_add_project_id_to_actions.sql` | Adds `project_id` foreign key to actions | 🔄 |

### Personality, treats & training (0132–0139)

| File | Description | Idempotent? |
|---|---|---|
| `0132_personality_test.sql` | Personality assessment schema | 🔄 |
| `0133_holiday_preferences.sql` | `holiday_preferences` table (used by treat calendar) | 🔄 |
| `0134_personality_recommendations_seed.sql` | Seed data for personality-based habit recommendations | 🔄 |
| `0135_monthly_treat_calendar.sql` | `daily_calendar_seasons`, `daily_calendar_hatches`, `daily_calendar_progress`, `daily_calendar_rewards` with RLS | 🔄 |
| `0136_vision_board_v2_storage_bucket.sql` | Vision board v2 storage bucket policy | No |
| `0137_training_exercise.sql` | Training and exercise session tables | 🔄 |
| `0138_workout_sessions.sql` | Workout session logging tables | 🔄 |
| `0139_add_archetype_hand.sql` | Adds `archetype_hand` column to gamification profiles | 🔄 |

### Commitment contracts (0140–0147)

| File | Description | Idempotent? |
|---|---|---|
| `0140_commitment_contracts.sql` | `commitment_contracts` table with 11 ContractTypes, RLS | 🔄 |
| `0141_contract_recovery_mode.sql` | Recovery mode columns for contracts | No |
| `0142_contract_accountability_mode.sql` | Accountability partner columns | No |
| `0143_contract_due_evaluation_rpc.sql` | RPC for evaluating contract due dates | No |
| `0144_contract_due_sweep_schedule.sql` | Cron schedule for contract due sweep | No |
| `0145_contract_due_sweep_observability.sql` | Observability columns for sweep runs | 🔄 |
| `0146_contract_sweep_health_rpc.sql` | Health check RPC for contract sweep | No |
| `0147_contract_reset_guardrails.sql` | Reset limit guardrails for contracts | No |

### Habit analysis experiments (0148–0163)

| File | Description | Idempotent? |
|---|---|---|
| `0148_habit_improvement_analysis.sql` | Habit analysis experiment sessions | No |
| `0149_habit_analysis_experiment_progress.sql` | Progress tracking for experiments | No |
| `0150_habit_analysis_session_progress.sql` | Per-session progress columns | No |
| `0151_habit_analysis_experiment_difficulty.sql` | Difficulty rating for experiments | No |
| `0152_habit_experiment_win_note.sql` | Win note field for experiments | No |
| `0153_habit_analysis_mobile_draft.sql` | Mobile draft support for analysis | No |
| `0154_habit_analysis_completion_state.sql` | Completion state tracking | No |
| `0155_habit_analysis_experiment_energy.sql` | Energy level tracking in experiments | No |
| `0156_habit_analysis_mobile_draft_saved_at.sql` | `saved_at` timestamp for mobile drafts | No |
| `0157_habit_analysis_experiment_tomorrow_confidence.sql` | Tomorrow confidence rating | No |
| `0158_habit_analysis_completion_reflection.sql` | Completion reflection text field | No |
| `0159_habit_analysis_experiment_urge_level.sql` | Urge level tracking | No |
| `0160_habit_analysis_better_day_win_note.sql` | Better-day win note variant | No |
| `0161_habit_analysis_experiment_stress_level.sql` | Stress level tracking | No |
| `0162_habit_analysis_completion_summary.sql` | Completion summary columns | No |
| `0163_habit_analysis_mobile_draft_completion_reflection.sql` | Mobile draft completion reflection | No |

### Goals & island game (0164–0175)

| File | Description | Idempotent? |
|---|---|---|
| `0164_goal_snapshots.sql` | Goal snapshot history for progress tracking | No |
| `0165_gratitude_journal_type.sql` | Adds gratitude journal type | No |
| `0165_habit_logs_stage_tracking.sql` | Stage tracking columns on `habit_logs_v2` | No |
| `0166_goal_execution_foundations.sql` | Goal execution metadata columns | 🔄 |
| `0167_island_run_runtime_state_progression_markers.sql` | Island run runtime state and progression markers | 🔄 |
| `0168_island_run_egg_state_columns.sql` | Egg state columns for island run | No |
| `0169_island_run_per_island_eggs.sql` | Per-island egg tracking table | No |
| `0170_island_run_timer_columns.sql` | Timer columns for island run | No |
| `0171_island_run_shard_fields.sql` | Shard fields for island run economy | 🔄 |
| `0172_island_run_shields_column.sql` | Shields wallet column | No |
| `0173_island_run_shards_wallet_column.sql` | Shards wallet column | No |
| `0174_contract_engine_v2.sql` | Contract Engine 2.0: `user_reputation_scores`, new ContractTypes, `locked` status | 🔄 |
| `0175_contract_sweep_v2.sql` | Contract sweep v2 cron and RPC | No |

### Final migrations (0176–0188)

| File | Description | Idempotent? |
|---|---|---|
| `0176_scheduled_reminders.sql` | `scheduled_reminders` table with `(status, scheduled_at)` index and per-user RLS | 🔄 |
| `0177_advent_calendar_holiday_key.sql` | Adds `holiday_key` column to `daily_calendar_seasons` for holiday advent calendar | 🔄 |
| `0178_*` | _(reserved / no canonical migration file in repo)_ | — |
| `0179_island_run_completed_stops_by_island.sql` | Adds per-island completed stop ledger to `island_run_runtime_state` | No |
| `0180_*`–`0185_*` | Other feature-track migrations (see `supabase/migrations/`) | varies |
| `0186_island_run_cycle_index.sql` | Adds `cycle_index` wrap counter to `island_run_runtime_state` | 🔄 |
| `0187_island_run_per_run_state_columns.sql` | Adds in-flight runtime columns (`token_index`, `hearts`, `coins`, `spin_tokens`) | No |
| `0188_island_run_dice_pool_column.sql` | Adds `dice_pool` to `island_run_runtime_state` | No |

---

## 3. Environment Variables

Set these in `.env.local` (local dev) or in your deployment platform's environment settings.

### Required

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL (e.g., `https://xyz.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public API key |
| `VITE_SUPABASE_REDIRECT_URL` | OAuth redirect URL (e.g., `https://habitgame.app/auth/callback.html`) |
| `VITE_VAPID_PUBLIC_KEY` | Web Push VAPID public key (required for push notifications) |

### Supabase edge function environment (set in Supabase Dashboard → Edge Functions → Secrets)

| Variable | Purpose |
|---|---|
| `VAPID_PUBLIC_KEY` | VAPID public key (for `send-reminders` edge function) |
| `VAPID_PRIVATE_KEY` | VAPID private key |
| `VAPID_SUBJECT` | VAPID subject (`mailto:` address or URL) |
| `OPENAI_API_KEY` | OpenAI API key (for AI coach, goal suggestions, goal coach chat) |

### Optional

| Variable | Default | Purpose |
|---|---|---|
| `VITE_AI_GOAL_SUGGEST_URL` | — | URL for `suggest-goal` edge function (enables AI goal suggestions) |
| `VITE_AI_GOAL_COACH_CHAT_URL` | — | URL for `goal-coach-chat` edge function (enables goal coach chat) |
| `VITE_OPENAI_API_KEY` | — | OpenAI key on the client side (not recommended for production; prefer server-side edge functions) |
| `VITE_GOAL_COACH_CONTEXT_EXPERIMENT` | `false` | Feature flag — enables experimental goal coach context in AI coach (set to `"true"` to enable) |

---

## 4. Feature Flags

| Flag | Location | Default | Effect |
|---|---|---|---|
| **Gamification toggle** | User account settings → Gamification (stored in `gamification_profiles.gamification_enabled`) | `true` | Disabling hides XP bar, level badge, achievements, and all gamification UI. Core habit tracking still works. |
| **Telemetry opt-in** | User account settings → Privacy → Telemetry (stored in `telemetry_preferences.telemetry_enabled`) | `false` | When enabled, behavioral events are recorded to `telemetry_events`. Required for AI coach difficulty adaptation. |
| **AI data access scoping** | User account settings → AI Coach → Data Access (stored in `ai_settings`) | All on | Per-source toggles (goals, habits, journal, reflections, vision board). Disabled sources are excluded from the AI coach system prompt. |
| **Goal coach context experiment** | `VITE_GOAL_COACH_CONTEXT_EXPERIMENT=true` env var | `false` | Experimental: adds goal context directly to the main AI coach prompt in additional ways. |

---

## 5. Demo Parity Notes

See [`docs/game-of-life-2.0/DEMO_MODE_SETUP.md`](./game-of-life-2.0/DEMO_MODE_SETUP.md) for the full demo mode guide.

**Summary of what works without Supabase:**

| Feature | Demo mode | Notes |
|---|---|---|
| Habits (CRUD, logs) | ✅ Full mock | `demoData.ts` seed data; logs stored in localStorage |
| Goals (CRUD) | ✅ Full mock | `demoData.ts` seed data |
| Journal entries | ✅ Full mock | `demoData.ts` seed data |
| Life wheel check-ins | ✅ Full mock | `demoData.ts` seed data |
| Vision board images | ✅ Full mock | `demoData.ts` seed data (no file upload) |
| Gamification (XP, levels, streaks) | ✅ localStorage-backed | Profile state in localStorage; no server sync |
| Daily spin wheel / power-ups | ✅ localStorage-backed | |
| Holiday Treats Calendar | ✅ Full mock | `getDemoTreatCalendarData()` returns Christmas advent with pre-opened doors |
| Push notifications (preview) | ✅ Schedule preview | Demo schedule list shown; no actual pushes sent |
| Telemetry events | ✅ localStorage mock | `addDemoTelemetryEvent()` stores in demo state |
| Scheduled reminders | ✅ Full mock | `getDemoMockScheduledReminders()` |
| AI Coach | ✅ Prompts work | Requires `VITE_OPENAI_API_KEY` or edge function URL for real responses |
| Achievements | ⚠️ Supabase required | No demo fallback in `achievements.ts` |
| Meditation reminders | ⚠️ Supabase required | |
| Push notification delivery | ❌ Not in demo | Demo mode never sends actual pushes |
| Server-side persistence (treat calendar, etc.) | ❌ Not in demo | All data lives in localStorage; cleared on sign-out |

---

## 6. Build Verification

- [ ] `npm run build` — zero TypeScript errors, zero Vite build errors. Pre-existing chunk-size warnings may appear and are acceptable.
- [ ] `node_modules/.bin/tsc --noEmit` — zero type errors (equivalent check without Vite transforms).
- [ ] No `console.error` calls related to missing env vars on startup (check the browser console on first load with `.env.local` configured).

---

## 7. Pre-Deploy Checks

### Service Worker / PWA

- [ ] `public/sw.js` (or equivalent service worker) is present and registered.
- [ ] `public/manifest.json` (or `manifest.webmanifest`) is present with correct `name`, `short_name`, `icons`, `start_url`, and `display: "standalone"`.
- [ ] On HTTPS, the browser shows the "Add to Home Screen" / install prompt.
- [ ] Service worker caches the app shell for offline use.

### Push Notifications

- [ ] VAPID keys are generated and set in both the client env (`VITE_VAPID_PUBLIC_KEY`) and the Supabase edge function secrets (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`).
- [ ] `supabase/functions/send-reminders/index.ts` is deployed: `supabase functions deploy send-reminders`.
- [ ] Cron schedule for `send-reminders` is active in the Supabase dashboard (or via `supabase/config.toml`).
- [ ] Test: create a habit with a reminder time ~5 minutes from now, grant notification permission, invoke the edge function manually (`supabase functions invoke send-reminders`), and confirm a push notification arrives.

### Treat Calendar edge function

- [ ] `supabase/functions/treat-calendar/index.ts` is deployed: `supabase functions deploy treat-calendar`.
- [ ] Test: call `GET /functions/v1/treat-calendar?userId=<id>` and confirm a season response or `null` (outside active window).

### Supabase RLS

- [ ] All tables have RLS enabled. Spot-check: `scheduled_reminders`, `telemetry_events`, `daily_calendar_seasons`, `commitment_contracts`.
- [ ] `anon` role cannot read other users' rows on any table. Test with the Supabase Table Editor using the anon key.

### Auth

- [ ] Supabase Auth → Email templates are configured (confirmation, magic link, password reset).
- [ ] OAuth providers (if used) are configured in Supabase Auth settings with the correct redirect URL (`VITE_SUPABASE_REDIRECT_URL`).

---

## 8. Post-Deploy Smoke Test

1. Open the app in a private/incognito window.
2. Sign up with a new email address and complete onboarding.
3. Add a habit, log it as "Done" for today → confirm XP award and streak counter update.
4. Open the AI Coach, start a session → confirm a response arrives (requires OpenAI key).
5. Open the Treats Calendar → confirm the active holiday advent calendar appears (or "No active calendar" outside windows).
6. Open Account → Settings → Telemetry → enable telemetry → complete a habit → confirm an event appears in the Supabase `telemetry_events` table.
7. Enable a push notification reminder for the habit you created → confirm the demo schedule preview updates.
