# Supabase schema and policy scripts

These SQL files provision the Supabase project for LifeGoalAPP (project id `muanayogiboxooftkyny`).

## Source of truth

- The authoritative schema lives under `supabase/migrations/`. Each feature ships as its own migration file.
- The manual SQL scripts inside this folder are generated artifacts. Do **not** hand-edit them; instead update or add a migration and re-run the bundler described below.

## Manual SQL bundle

When you want to configure Supabase without the CLI, run the prebuilt bundle:

1. Open the [Supabase SQL editor](https://app.supabase.com/project/muanayogiboxooftkyny/editor/sql).
2. Paste the contents of `sql/manual.sql`.
3. Execute the script. It contains every migration (in order) so running it once will fully provision the database.

The bundle is idempotent; policies are dropped before re-creation so you can re-run it safely.

### Regenerating the bundle

```
npm run build:manual-sql
```

This command concatenates all migration files in lexical order, skips `demo_data.sql`, and writes the result to `sql/manual.sql` with helpful delimiters so you can inspect where each migration starts/stops.

> Legacy scripts (`001_schema.sql`, `002_policies.sql`, `003_life_goals_extended.sql`) remain checked in for reference, but `manual.sql` is the recommended way to run the schema manually.
