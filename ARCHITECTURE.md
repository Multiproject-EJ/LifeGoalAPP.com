# Architecture Overview

## Application Structure
- **Frontend:** Vite + React app under `src/`, with feature modules in `src/features/`.
- **State & Context:** Shared state in `src/contexts/` and utilities in `src/lib/` and `src/services/`.
- **Backend:** Supabase for persistence, auth, and edge functions (`supabase/`, `sql/`).
- **Demo Mode:** Local/demo data sources embedded in the client for offline/demo parity.

## Data Flow (High Level)
1. UI components in `src/features/*` invoke shared services in `src/services/`.
2. Services read/write to Supabase when authenticated or to demo data when in demo mode.
3. Gamification, coach, and dashboard subscribe to shared scoring/telemetry outputs.

## Data Model Delta (Game of Life 2.0)

### New/extended entities and fields
**Supabase (authoritative)**
- `user_onboarding`
  - `user_id`, `completed_at`, `version`, `current_step`
- `balance_scores`
  - `user_id`, `agency`, `awareness`, `rationality`, `vitality`, `computed_at`
- `rationality_checks`
  - `user_id`, `prompt`, `response`, `confidence_level`, `created_at`
- `habit_tiers`
  - `habit_id`, `tier` (Seed/Minimum/Standard), `downshifted_at`, `upgrade_ready_at`
- `vision_board_items`
  - add `type`, `review_interval_days`, `last_reviewed_at`, `orphaned` boolean
- `coach_privacy_settings`
  - `user_id`, `can_read_goals`, `can_read_habits`, `can_read_journal`, `can_read_reflections`, `can_read_vision_board`
- `coach_interventions`
  - `user_id`, `type`, `payload`, `shown_at`, `accepted_at`
- `micro_quests`
  - `user_id`, `title`, `axis`, `reward_xp`, `status`, `created_at`, `completed_at`
- `telemetry_events`
  - `user_id`, `event_name`, `metadata`, `created_at`
- `notification_schedules`
  - `user_id`, `channel`, `cadence`, `next_run_at`, `enabled`

**Demo data (local mirror)**
- Mirror the Supabase fields above in the demo data layer used by the client.
- Ensure demo JSON/types match Supabase shape for seamless switching.

### Migration plan (do not implement unless minimal and safe)
1. Add new tables/columns via Supabase migrations for the entities listed above.
2. Backfill defaults for existing users (e.g., neutral balance scores, Standard tier).
3. Update demo data fixtures to mirror the new schema.
4. Roll out feature flags to enable Game of Life 2.0 modules progressively.
