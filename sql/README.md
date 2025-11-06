# Supabase schema and policy scripts

These SQL files provision the Supabase project for LifeGoalAPP (project id `muanayogiboxooftkyny`).

## Usage

1. Open the [Supabase SQL editor](https://app.supabase.com/project/muanayogiboxooftkyny/editor/sql).
2. Run `001_schema.sql` to create tables, triggers, and extensions.
3. Run `002_policies.sql` to enable row level security and user-scoped policies.
4. (Optional) Run `003_seed_demo_user.sql` to provision a manual testing account.

The `003_seed_demo_user.sql` script calls the built-in `auth.create_user` helper so it avoids the `auth.admin.create_user` cross-database error while still registering the user with a confirmed email address.

Both scripts are idempotent and can be re-run safely.
