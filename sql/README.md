# Supabase SQL Manual Bundle

**IMPORTANT**: This directory contains only auto-generated SQL bundles.

## Source of truth

- The **authoritative schema lives under `supabase/migrations/`**. Each feature ships as its own migration file.
- All new migrations should be added to `supabase/migrations/` following the numeric prefix format (e.g., `0113_feature_name.sql`)
- The manual SQL script in this folder (`manual.sql`) is a generated artifact. Do **not** hand-edit it; instead update or add a migration in `supabase/migrations/` and re-run the bundler described below.
- Legacy SQL files that were previously in this directory have been archived to `supabase/reference/` for historical reference.

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

This command concatenates all migration files from `supabase/migrations/` in lexical order, skips `demo_data.sql`, and writes the result to `sql/manual.sql` with helpful delimiters so you can inspect where each migration starts/stops.

## Loading demo data

`supabase/migrations/demo_data.sql` seeds realistic habits, logs, and challenge data so you can test the UI against Supabase. To target a specific account without editing the file:

1. In the SQL editor, run `select set_config('app.demo_email', 'your@email.com', false);`
2. Run the contents of `supabase/migrations/demo_data.sql`

If you skip step 1 the script automatically uses the earliest `auth.users` record, so you can keep re-running it without manual edits.

