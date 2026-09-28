# Telemetry and Supabase remediation — 2026-09-28

## Scope

Privacy-safe daily review of aggregate production telemetry and Supabase service
logs for project `muanayogiboxooftkyny`, followed by isolated remediation from
the latest `origin/main` (`90b6d494`). No production data, schema, settings, or
authentication configuration was changed during this run.

## Current 24-hour evidence

- API gateway: 4,923 requests, 43 4xx responses, and zero 5xx responses.
- Postgres: seven error log entries. No RLS/permission or sustained server-error
  cluster was found.
- Island Run: 340/340 action rows applied successfully, all client action IDs
  unique, and zero rows remained past the 48-hour retention boundary.
- Telemetry: 254 rows from one anonymous aggregate user; zero duplicate
  `(user_id, event_type, dedupe_key)` groups.
- The sample remains one active user, so activation and D1/D7 retention are not
  decision-grade.

## Confirmed issues and user effect

1. `telemetry_events` produced 27 intentional-dedupe 406 responses. The client
   requested a single returned row after `ON CONFLICT DO NOTHING`, but an
   ignored duplicate has no row to return. The event is best-effort and the
   visible app continues, but logs become noisy and the client records false
   telemetry drops.
2. `record_player_activity` produced 12 404 responses. Latest main already
   contains `20260927170000_player_insights.sql`, but production has not applied
   it, so daily play/funnel aggregates are currently not collected. Gameplay
   itself continues because the client disables further attempts for the
   session when the RPC is absent.
3. `claim_daily_spin_habit_bonus` produced one rejected claim. Production still
   checks only `habit_completions`, while active Today flows can store legitimate
   completions in `habit_logs_v2` or legacy `habit_logs`. A qualifying player can
   therefore miss the promised bonus spin.

## Prepared remediation

- Reconciled the active repository migration filenames with all 32 applied
  production migrations. The only active local-only migrations are now the
  three intended pending changes: crash-report rewards, daily-spin eligibility,
  and player insights.
- Updated telemetry dedupe writes so ignored duplicates do not request a single
  returned row.
- Added `20260927164558_align_daily_spin_bonus_with_active_habit_logs.sql`, which
  accepts completion evidence from all three supported stores while retaining
  authentication, current-date, idempotency, and bounded-spin safeguards.
- Preserved the already-merged player-insights migration from latest main; it
  still requires an explicit production migration approval.

## Verification

- `check-telemetry-dedupe-no-406.mjs`: passed.
- `check-daily-spin-bonus-active-habit-logs.mjs`: passed.
- `playerInsights` Island Run suite: 4 passed, 0 failed.
- `git diff --check`: passed.
- Production schema inspection confirmed the completion-store columns and the
  applied Crystal Miners column/comment match the reconciled migration.

## Promotion boundary and rollback

This work is local on `codex/telemetry-sentinel-20260928`; it is not pushed,
merged, deployed, or applied to production. Code can be rolled back by reverting
the remediation commits. The daily-spin RPC can be rolled back by restoring the
prior definition from `20260812214026_harden_confirmed_security_definer_rpcs.sql`.
The player-insights migration is additive; rollback can stop the client heartbeat
while retaining the small aggregate table, avoiding loss of collected history.
