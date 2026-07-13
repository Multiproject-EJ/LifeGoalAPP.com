# Per-User Data Limits

**Status:** enforced since migration `0278_per_user_data_limits.sql`; Storage object cap in `0279_per_user_storage_object_cap.sql`; parent-scoped child tables in `0280_child_table_data_limits.sql`
**Related:** `0275_log_retention_auto_cleanup.sql` (time-based retention), `docs/quota_emergency_cleanup.sql` (incident runbook), `README_STORAGE_POLICIES.md` (Storage cap deployment)

## Why

Supabase bills and restricts by **total database size** (free tier: 500 MB; the
project was restricted once already on 2026-07-11 when `island_run_action_log`
grew to ~1.9 GB). Migration 0275 fixed the *server-generated* growth with
retention jobs. This document covers the remaining risk: **user-generated
rows had no ceiling**. Every insert path (journal, vision board, habits, AI
chat, gamification logs) was open-ended, so a single account — a bug, a
script, or an AI agent asked to "loop until it breaks" — could grow the
database without limit and take the project down for everyone.

Client-side validation alone cannot close this: anyone with a session token
can call PostgREST directly and skip the UI. The enforcement therefore lives
in the database, where every write path — UI, direct API, offline-queue
replay — has to pass through it.

## How it works

- **`public.user_data_limits`** — one row per capped table:
  `max_rows` (per account) and `max_row_bytes` (per row). Limits are *data*:
  ops can raise a cap for everyone (or lower it) from the dashboard SQL
  editor without a deploy. Authenticated clients can read the table (for
  "37 of 50 used" UI); only the service role can write it (RLS).
- **`public.enforce_user_data_limit()`** — a single generic trigger attached
  `BEFORE INSERT OR UPDATE` to every capped table. On insert it counts the
  account's existing rows (index-backed) and rejects at the cap. On insert
  *and* update it rejects rows larger than `max_row_bytes`, so a row cannot
  be created small and bloated afterwards. Rows that exceeded the cap before
  limits existed stay editable as long as an edit does not grow them.
- **`public.attach_user_data_limit_triggers()`** — attaches the trigger and a
  supporting `user_id` index to every configured table that exists; skips
  missing tables with a NOTICE. Re-run it after adding a new table to the
  config.
- **Failure contract** — a rejected write fails with a message starting with
  `USER_DATA_LIMIT_EXCEEDED:`. The client resilience layer
  (`src/services/service-health/errorTranslation.ts`) classifies this as the
  `user_limit_reached` category: non-retryable, **never parked on the offline
  queue** (retrying cannot succeed until the user deletes data), and shown to
  the user as "Storage limit reached for this feature".
- **Client mirror** — `src/config/userDataLimits.ts` mirrors the seeded caps
  so UI can explain limits up front. The server always has the final word.

## How the numbers were calculated

There are two independent caps per table, and the containment guarantee is
their product:

> worst case per user per table = `max_rows` x `max_row_bytes`

For each table we picked `max_rows` as roughly *10x a heavy legitimate user
over 5 years* and `max_row_bytes` as roughly *10x a typical row*, then checked
that the product stays in the tens-of-MB range. Typical usage lands orders of
magnitude below the caps — a normal account is a few MB total.

| Table | Max rows | Max row size | Worst case | Generosity check |
|---|---:|---:|---:|---|
| `journal_entries` | 10,000 | 10 KB | 100 MB | 27 years of daily entries, ~5 pages of text each |
| `habits` | 200 | 10 KB | 2 MB | 2x the ~100 discussed |
| `habit_logs` | 50,000 | 2 KB | 100 MB | 27 habits logged daily for 5 years |
| `habit_completions` | 50,000 | 2 KB | 100 MB | same as habit_logs |
| `habit_analysis_sessions` | 1,000 | 50 KB | 50 MB | ~4 deep analyses/week for 5 years |
| `vb_boards` | 20 | 10 KB | 0.2 MB | |
| `vb_cards` | 500 | 10 KB | 5 MB | ~25 cards on every one of 20 boards (image bytes live in Storage, not here) |
| `vision_board_image_tags` | 2,000 | 2 KB | 4 MB | |
| `actions` | 2,000 | 10 KB | 20 MB | actions expire after 3 days by design |
| `projects` | 200 | 10 KB | 2 MB | |
| `project_tasks` | 5,000 | 10 KB | 50 MB | 25 tasks in every one of 200 projects |
| `today_todos` | 1,000 | 10 KB | 10 MB | |
| `routines` / `routine_logs` | 100 / 20,000 | 10 KB / 2 KB | 41 MB | 11 routines completed daily for 5 years |
| `annual_reviews` | 100 | 100 KB | 10 MB | a century of annual reviews |
| `goal_snapshots` | 2,000 | 25 KB | 50 MB | |
| `compass_books` | 100 | 100 KB | 10 MB | |
| `environment_audits` | 1,000 | 25 KB | 25 MB | |
| `meditation_sessions` | 20,000 | 2 KB | 40 MB | 11 sessions/day for 5 years |
| `workout_sessions` | 10,000 | 5 KB | 50 MB | 5 workouts/day for 5 years |
| `exercise_logs` | 50,000 | 2 KB | 100 MB | 5 exercises per workout |
| `personal_records` | 2,000 | 2 KB | 4 MB | |
| `ai_coach_threads` / `ai_coach_messages` | 500 / 10,000 | 5 KB / 8 KB | 82 MB | 10k messages ~= 5/day for 5 years |
| `scheduled_reminders` | 500 | 5 KB | 2.5 MB | |
| `push_subscriptions` | 20 | 5 KB | 0.1 MB | one per device |
| `feature_votes` | 500 | 2 KB | 1 MB | |
| `telemetry_events` | 25,000 | 2 KB | 50 MB | also pruned after 30 days (0275) |
| `xp_transactions` | 50,000 | 1 KB | 50 MB | ~27 XP events/day for 5 years |
| `spin_history` | 10,000 | 1 KB | 10 MB | |
| `power_up_transactions` | 10,000 | 1 KB | 10 MB | |
| `task_tower_sessions` | 10,000 | 5 KB | 50 MB | |
| `island_run_action_log` | 5,000 | — | see note | row size uncapped by design (full runtime snapshots); 48 h retention (0275) bounds total size |

**Absolute worst case:** an adversary that deliberately maxes *every* table
with *maximum-size* rows tops out around **~1 GB** and then receives hard
errors on every further insert — the loop terminates. That is survivable on
the Pro tier and diagnosable on the free tier (one `SELECT user_id, count(*)`
away), versus the previous behavior of unbounded growth. A *realistic* heavy
user stays under ~20 MB because typical rows are 50–100x smaller than the
row-size cap.

## What an "AI loop" hits, in order

1. **Row-size cap** — a single oversized payload is rejected immediately.
2. **Row-count cap** — at the cap, every further insert fails with a
   non-retryable error; the client will not even queue it for retry.
3. **Supabase API rate limits** — bound how fast the loop can approach 1+2.
4. **Retention jobs (0275)** — separately shrink the operational logs nightly.

## Tuning / operations

- **Raise or lower a cap** (no deploy):
  `UPDATE public.user_data_limits SET max_rows = 20000 WHERE table_name = 'journal_entries';`
- **Cap a new table:** insert a row into `user_data_limits`, then
  `SELECT public.attach_user_data_limit_triggers();` and add the table to
  `src/config/userDataLimits.ts`.
- **Exempt one power user:** not supported yet — caps are global per table.
  A `user_limit_overrides` table would be the natural extension if a paid
  tier ever needs bigger allowances.
- **Find who is near a cap:**
  `SELECT user_id, count(*) FROM journal_entries GROUP BY 1 ORDER BY 2 DESC LIMIT 10;`

## Storage object cap (migration 0279)

The `vision-board` bucket caps each file at 5 MB (0124) but historically not
the *number* of files per user, so a token-holder calling the Storage API
directly (bypassing the app's `vb_cards` cap) could upload without limit.
Migration `0279` tightens the bucket's INSERT policy to reject uploads once
an account owns **1000** objects — worst case `1000 x 5 MB` per user, versus
unbounded before. Because `storage.objects` is owned by
`supabase_storage_admin`, the cap is **applied via the Supabase Dashboard**
(the migration degrades to a NOTICE otherwise); the exact SQL, a verification
query, and a "who's near the cap" query live in `README_STORAGE_POLICIES.md`.
The count lives in a `SECURITY DEFINER` function
(`public.vision_board_object_count`) because a policy that reads its own table
would recurse; running the count outside RLS also keeps it accurate for
private buckets. The migration
never removes protection — until applied, the prior uncapped policy stays in
force. The private `vision` (V2) bucket has no INSERT policy today (it is
effectively closed) and is deliberately left untouched.

## Parent-scoped child tables (migration 0280)

Several user-writable tables have no `user_id` column — they hang off a parent
by a foreign key — so 0278 skipped them. 0280 caps them **per parent** by
pointing the existing trigger's count at the parent FK (no new trigger logic;
the count simply groups by a different column, and a `scope_label` makes the
rejection read "…per board" instead of "…per account"). The per-user total is
then bounded by `(parent cap) x (per-parent cap)`. `goals` carries a `user_id`
and is capped per account directly (it was defined in the legacy reference
schema and missed by 0278).

| Table | Scope (parent) | Per-scope cap | Parent cap | Per-user bound | Row size |
|---|---|---:|---:|---:|---:|
| `goals` | account | 500 | — | 500 | 10 KB |
| `annual_goals` | `annual_reviews` | 100 | 100 | 10,000 | 4 KB |
| `vb_sections` | `vb_boards` | 100 | 20 | 2,000 | 4 KB |
| `habit_experiment_days` | `habit_analysis_sessions` | 100 | 1,000 | 100,000 | 4 KB |
| `life_goal_steps` | `goals` | 100 | 500 | 50,000 | 5 KB |
| `life_goal_substeps` | `life_goal_steps` | 50 | 50,000 | (bounded by steps) | 5 KB |

The per-user bounds look large because they multiply two generous caps, but
each individual cap is ~10x realistic use and every row is tiny; typical
accounts sit orders of magnitude below. Tables absent from a given environment
are skipped by `attach_user_data_limit_triggers()` with a NOTICE.

## Known gaps (deliberately out of scope)

- **Storage total bytes** are bounded only indirectly (object count x 5 MB
  per-file limit), not summed per user. A byte-sum policy is heavier per
  upload and unnecessary given the count cap; revisit only if large files
  become common.
- **The multi-party `conflict_*` tables** are scoped by `session_id` across
  multiple participants, not owned by one user. Bounding them means capping
  conflict *session* creation (and invites) rather than per-parent row counts;
  it is a distinct collaboration-abuse concern, left for a dedicated pass.
- **Egress/compute quotas** are unrelated to stored size and remain governed
  by Supabase rate limits and the AI quota service (`aiQuotaService.ts`).
- **Concurrent inserts** can overshoot a row cap by a handful of rows (the
  count-then-insert is not serialized). Irrelevant for containment; noted for
  completeness.
