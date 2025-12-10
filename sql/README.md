# Supabase Schema Bundle

This directory contains the auto-generated SQL bundle for manual Supabase setup.

## Source of Truth

**The authoritative schema lives under `supabase/migrations/`**. Each feature ships as its own migration file with sequential numbering (e.g., `0001_*.sql`, `0002_*.sql`, etc.).

## Manual SQL Bundle

The `manual.sql` file in this directory is a **generated artifact** that concatenates all migrations from `supabase/migrations/` in order. 

### To configure Supabase without the CLI:

1. Open the [Supabase SQL editor](https://app.supabase.com/project/muanayogiboxooftkyny/editor/sql)
2. Paste the contents of `sql/manual.sql`
3. Execute the script

The bundle is idempotent; policies are dropped before re-creation so you can re-run it safely.

### Regenerating the Bundle

```bash
npm run build:manual-sql
```

This command:
- Reads all `*.sql` files from `supabase/migrations/` (excluding `demo_data.sql`)
- Sorts them lexically
- Concatenates them with delimiters
- Writes the output to `sql/manual.sql`

**Do not hand-edit `manual.sql`** - instead update or add a migration in `supabase/migrations/` and re-run the bundler.

## Legacy Scripts

Historical SQL files from the `sql/` directory have been archived in `supabase/reference/` for reference. These legacy scripts are no longer maintained and should not be used.

## Loading Demo Data

`supabase/migrations/demo_data.sql` seeds realistic habits, logs, and challenge data. To use it:

1. In the SQL editor, run: `select set_config('app.demo_email', 'your@email.com', false);`
2. Run the contents of `supabase/migrations/demo_data.sql`

If you skip step 1, the script uses the earliest `auth.users` record automatically.

## CI Protection

A GitHub Actions workflow (`legacy-sql-guard.yml`) prevents accidental re-introduction of SQL files in this directory. All schema changes must be made through `supabase/migrations/`.
