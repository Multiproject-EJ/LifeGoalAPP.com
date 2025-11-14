# Supabase schema and policy scripts

These SQL files provision the Supabase project for LifeGoalAPP (project id `muanayogiboxooftkyny`).

## Usage

1. Open the [Supabase SQL editor](https://app.supabase.com/project/muanayogiboxooftkyny/editor/sql).
2. Run `001_schema.sql` to create tables, triggers, and extensions.
3. Run `002_policies.sql` to enable row level security and user-scoped policies.
4. Run `003_life_goals_extended.sql` to add support for life goals with steps, substeps, and alerts.
5. (Optional) Run `003_seed_demo_user.sql` to provision a manual testing account (if it exists).

The scripts are idempotent and can be re-run safely; policy definitions explicitly drop any existing policies before creating them again so you can re-apply patches without manual cleanup.

## Schema Versions

- **001_schema.sql** - Base schema with goals, habits, habit_logs, vision_images, checkins, goal_reflections, and notification_preferences
- **002_policies.sql** - Row Level Security (RLS) policies for all base tables
- **003_life_goals_extended.sql** - Extended life goals with:
  - `life_goal_steps` - Break down goals into actionable steps
  - `life_goal_substeps` - Further break down steps into smaller tasks
  - `life_goal_alerts` - PWA-compatible alerts and notifications for goals
  - Additional columns on `goals` table: `life_wheel_category`, `start_date`, `timing_notes`, `estimated_duration_days`
