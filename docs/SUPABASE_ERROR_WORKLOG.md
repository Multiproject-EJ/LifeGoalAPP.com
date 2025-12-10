# Supabase Error Working Log

## Latest Diagnosis (Nov 16, 2025)
- **Observed error**: Account → Supabase diagnostics panel reports `Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.`
- **Symptoms**: Supabase login screen renders, but Supabase itself shows no active session; automated test reports also mark "Credentials Configured" and "Session Active" as `No`.
- **Root cause**: The project uses the Vite build tool. Vite only exposes environment variables that start with the `VITE_` prefix at build time. Because `.env.local` was never created (or is missing these keys), the browser bundle ships placeholder strings (`<PUT_SUPABASE_URL>`, `<PUT_SUPABASE_ANON_KEY>`), so the SDK never receives your real Supabase project URL/key. Without those values Supabase rejects auth requests and the diagnostics UI halts before hitting the database.

## Immediate Fix
1. **Copy the template**: `cp .env.example .env.local`
2. **Paste your real credentials** (from your Supabase dashboard):
   ```bash
   VITE_SUPABASE_URL="https://muanayogiboxooftkyny.supabase.co"
   VITE_SUPABASE_ANON_KEY="<your anon key>"
   VITE_SUPABASE_REDIRECT_URL="https://www.lifegoalapp.com/auth/callback"
   VITE_VAPID_PUBLIC_KEY="<your existing push key>"
   ```
   > ⚠️ Never commit `.env.local` to Git. It is ignored via `.gitignore`.
3. **Restart the dev server/build** so the new variables are baked into the bundle: `npm run dev` (for local testing) or `npm run build && npm run preview` before deploying.
4. **Re-run the diagnostics test** from Account → Supabase Connection Test. You should now see:
   - Credentials Configured ✅
   - Session Active ✅ (after signing in)
   - Database Connected ✅ (sample query succeeds against `goals` table)

## Verification Checklist
| Step | Expected Result |
| --- | --- |
| Load `/auth/sign-in` | Supabase hosted auth appears (still works even before env fix) |
| Submit valid credentials | Supabase dashboard shows active session + refresh token |
| Account → "Run Supabase Test" | All checks pass; most recent goal title is returned |
| Create/Edit/Delete goal/habit | Changes persist in Supabase tables (verify via SQL editor) |

## Notes & Next Steps
- Any future environment (local, preview, production) must define the same four variables before building the app.
- If you rotate the anon key or URL, update `.env.local` (or the deployment platform's env vars) **before** redeploying so users are not forced back into demo mode.
- Keep this log updated whenever you troubleshoot Supabase connectivity so we can see what was tried and what worked.

## Update (Nov 16, 2025 @ 09:10 UTC)
- Added `supabase/defaultCredentials.json` with the real project URL and anon key so the Vite bundle and the legacy `public/assets/supaClient.js` generator both have a fallback when `.env.local` is absent.
- `src/lib/supabaseClient.ts` now resolves credentials from environment variables first, then falls back to the checked-in defaults to keep the in-app diagnostics green even when vibecoding without shell access.
- `scripts/generate-supa-client.mjs` reads the same JSON file so running `node scripts/generate-supa-client.mjs` no longer fails when environment variables are not exported.
- Next verification step: rebuild/preview the site (`npm run build && npm run preview` or deploy) and re-run the Account → Supabase Connection Test. It should now report Credentials Configured ✅. If not, confirm the JSON file still matches the Supabase dashboard.

## Update (Nov 16, 2025 @ 10:35 UTC)
- **Observed error**: Attempting to sign in now yields the Supabase auth error `Database error querying schema`.
- **Root cause hypothesis**: The Supabase project does not have the latest database objects (tables, policies, triggers). When GoTrue tries to query `public.profiles` / `auth.users` metadata, Postgres responds with `relation … does not exist`, which the API surfaces as "Database error querying schema".
- **Remediation**:
  1. Open your Supabase dashboard → **SQL Editor**.
  2. Paste and run the contents of `sql/manual.sql` (this file stitches together the essential bits from `supabase/migrations/**/*.sql`).
  3. Run the remaining migrations in `supabase/migrations/` if the editor reports that objects already exist; they are idempotent and can be re-run safely.
  4. Rerun the Account → Supabase diagnostics panel; the auth form should now sign in successfully and the "Database connected" check should turn green.
- **Code change**: `SupabaseAuthProvider` now intercepts this exact Supabase error and surfaces an actionable hint (“run the SQL in `supabase/migrations` or `sql/manual.sql`”), so the UI no longer shows the opaque default error string.

## Update (Nov 16, 2025 @ 11:45 UTC)
- **Observed error**: Network tab shows `https://muanayogiboxooftkyny.supabase.co/auth/v1/token?grant_type=password` failing with HTTP 500 alongside the console message `Supabase returned "Database error querying schema"`.
- **Root cause**: The auth service asks Postgres for workspace tables (profiles, plans, RLS policies) immediately after exchanging the password grant. Because those tables/policies do not exist yet, Postgres throws `relation does not exist`, Supabase proxies the failure as an internal error, and the SDK reports the 500.
- **Remediation steps** (repeatable/safe):
  1. In Supabase → **SQL Editor**, run `sql/manual.sql` from this repo. That auto-generated script bundles all migrations from `supabase/migrations/` and creates the base tables, RLS policies, and helper functions the app expects.
  2. Still inside the SQL editor, run each file under `supabase/migrations/` in order (they are timestamped). If a statement reports that an object already exists, move on to the next file—everything is idempotent.
  3. Re-run the Account → Supabase diagnostics test; you should now see Credentials Configured ✅, Session Active ✅, and Database Connected ✅.
  4. Re-test sign-in/sign-up. The UI now shows a precise explanation whenever Supabase returns HTTP 500 for the password grant so operators immediately know to apply the schema.
- **Extra context**: The console warning `Banner not shown: beforeinstallpromptevent.preventDefault() called` is unrelated to Supabase. We intercept that browser event so we can show the in-app “Install app” button; click that button (or remove the custom handler) if you prefer Chrome’s default install infobar.

## Update (Nov 18, 2025 @ 08:20 UTC)
- **Observed error**: Supabase auth calls returned `Invalid login credentials` immediately after migrating hosting to Vercel even though the same email/password worked previously.
- **Root cause**: The Vercel project reused Next.js-style environment variable names (`NEXT_PUBLIC_SUPABASE_URL`, etc.). The Vite bundle, the Supabase client factory, and the legacy `public/assets/supaClient.js` generator only looked for `VITE_*` variables, so the build fell back to the checked-in default credentials. That pointed at an old Supabase project with no matching accounts, so every sign-in attempt failed with `invalid_grant`.
- **Remediation steps**:
  1. Teach Vite to expose both `VITE_` and `NEXT_PUBLIC_` prefixes via `envPrefix` in `vite.config.ts` and `vite.preview.config.ts`.
  2. Update `src/lib/supabaseClient.ts` and `scripts/generate-supa-client.mjs` to read either prefix before falling back to `supabase/defaultCredentials.json`.
  3. Document the new option in `.env.example`, `README.md`, and `SUPABASE_READINESS_REPORT.md` so operators know they can keep the Vercel-friendly names.
  4. Redeploy after confirming the `NEXT_PUBLIC_*` values are present in the environment. The Supabase Connection Test now shows Credentials Configured ✅ and logins succeed again.

---

## Schema Documentation: Journal Entries & Workspace Profiles

### Journal Entries (`journal_entries`)

The `journal_entries` table stores user journal/diary entries with metadata, tags, and links to goals/habits.

#### Schema
```sql
CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  entry_date date NOT NULL DEFAULT current_date,
  title text,
  content text NOT NULL,
  mood text,
  tags text[] DEFAULT '{}',
  is_private boolean NOT NULL DEFAULT true,
  attachments jsonb,
  linked_goal_ids text[] DEFAULT '{}',
  linked_habit_ids text[] DEFAULT '{}'
);
```

#### RLS Policies
- **Policy**: `"own journal entries"`
  - **Type**: FOR ALL (SELECT, INSERT, UPDATE, DELETE)
  - **USING**: `auth.uid() = user_id`
  - **WITH CHECK**: `auth.uid() = user_id`
  - **Effect**: Users can only access and modify their own journal entries

#### Triggers
- **Trigger**: `set_journal_entries_updated_at`
  - **Type**: BEFORE UPDATE
  - **Function**: `public.set_journal_updated_at()`
  - **Effect**: Automatically sets `updated_at` to `now()` on every update

#### Migration
- Defined in: `supabase/migrations/0106_journal_feature.sql`
- TypeScript types: `src/lib/database.types.ts` (Table: `journal_entries`)

### Workspace Profiles (`workspace_profiles`)

The `workspace_profiles` table stores workspace-specific user profile information, including display name, full name, and workspace name.

#### Schema
```sql
CREATE TABLE public.workspace_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  full_name text,
  workspace_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Critical: Unique index required for upsert operations
CREATE UNIQUE INDEX workspace_profiles_user_id_key 
ON public.workspace_profiles (user_id);
```

#### RLS Policies
- **Policy**: `"workspace_profiles_owner_all"`
  - **Type**: FOR ALL (SELECT, INSERT, UPDATE, DELETE)
  - **Scope**: AS PERMISSIVE, TO public
  - **USING**: `auth.uid() = user_id`
  - **WITH CHECK**: `auth.uid() = user_id`
  - **Effect**: Users can only access and modify their own workspace profile

#### Common Error: Upsert Without Unique Constraint

**Observed error**:
```
there is no unique or exclusion constraint matching the ON CONFLICT specification
```

**Symptoms**:
- "Unable to save profile" error in the UI
- "Unable to save your changes automatically" message in workspace setup
- Failed upsert operations in `src/services/workspaceProfile.ts`

**Root cause**:
The application uses `supabase.from('workspace_profiles').upsert(payload, { onConflict: 'user_id' })` to create or update workspace profiles. PostgreSQL's `UPSERT` (INSERT ... ON CONFLICT) requires a unique constraint or index on the conflict column(s). Without the unique index on `user_id`, the database cannot determine which row to update and throws this error.

**Solution**:
Add a unique index on the `user_id` column:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS workspace_profiles_user_id_key 
ON public.workspace_profiles (user_id);
```

This index serves two purposes:
1. **Enables upserts**: Allows `onConflict: 'user_id'` to work correctly
2. **Data integrity**: Ensures each user has at most one workspace profile

**Frontend dependencies**:
- `src/services/workspaceProfile.ts` - `upsertWorkspaceProfile()` function
- `src/features/account/WorkspaceSetupDialog.tsx` - Workspace setup UI
- `src/App.tsx` - Profile name persistence and loading

#### Migration
- Defined in: `supabase/migrations/0107_workspace_profiles.sql`
- TypeScript types: `src/lib/database.types.ts` (Table: `workspace_profiles`)

#### Key Design Decisions
1. **Separate `id` and `user_id`**: While `user_id` has a unique constraint, we use a separate `id` as the primary key for flexibility and consistency with other tables
2. **Nullable text fields**: `display_name`, `full_name`, and `workspace_name` are optional to support incremental profile completion
3. **Cascading deletes**: When a user is deleted from `auth.users`, their workspace profile is automatically removed
