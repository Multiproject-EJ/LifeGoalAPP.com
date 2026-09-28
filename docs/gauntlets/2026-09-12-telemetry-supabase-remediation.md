# Telemetry and Supabase remediation Gauntlet

Date: 2026-09-12
Branch: `codex/supabase-remediation-20260912`
Base: `origin/main` at `e8db4af0541e356951380477d7d17d0dc5c04019`
Project: Supabase `muanayogiboxooftkyny`

## Mission

Resolve the currently verified telemetry and production-database gaps without disturbing other agents, enabling commerce, exposing personal data, or increasing the Supabase bill. Leave durable evidence that distinguishes fixed defects, accepted intentional behavior, plan limitations, and monitoring-access gaps.

## Authority and boundaries

Eivind approved the previously enumerated remediation with “fix alt, sett i gang”. This authorizes the safe production Skybound schema migration, migration-history reconciliation after exact comparison, least-privilege security remediation where behavior is preserved, verification, and promotion through the normal reviewed branch path.

The following remain outside authority:

- No Supabase plan upgrade or other paid resource.
- No commerce enablement and no deployment of the parked ticket-purchase RPC.
- No user-data inspection beyond anonymous aggregates.
- No destructive production-data rewrite.
- No weakening of public campaign sharing or required authenticated game RPCs merely to silence a generic advisor.

## Verified starting state

- Production project reports `ACTIVE_HEALTHY` on Postgres 17.
- `island_run_runtime_state.skybound_academy_progress_by_event` is absent.
- `fulfill_minigame_ticket_purchase(uuid, integer)` is absent and remains intentionally parked while commerce is off.
- The action-log retention job has left zero rows older than 48 hours.
- The organization is on the Free plan. Supabase documents leaked-password protection as Pro-only, so enabling it would violate the no-cost boundary.
- Security advisors report two intentional sanitized public-sharing SECURITY DEFINER RPCs, thirteen authenticated SECURITY DEFINER RPCs requiring function-by-function least-privilege review, and the Pro-only leaked-password warning.
- The current connector does not expose hosted-service `query_logs`, so full service-log monitoring is not currently possible through the connector.

## Phases and gates

1. Reconstruct and compare local and remote migration history, including SQL fingerprints.
2. Reconcile repository migration versions without changing production schema or rerunning historical SQL.
3. Validate the pending set and apply only the approved idempotent Skybound migration.
4. Verify schema, migration history, advisors, retention, and the commerce-off invariant.
5. Review each SECURITY DEFINER function and change only privileges that are demonstrably unnecessary.
6. Restore service-log access through an existing no-cost project-scoped connection if possible; otherwise leave an explicit access blocker and alert.
7. Run proportionate repository checks, commit, push, review, and promote only if current main remains compatible.

## Rollback

- Repository reconciliation is reversible as one scoped commit.
- The Skybound column addition is additive and uses an empty JSON default. Rollback is to stop reading/writing the field; the column is not dropped because that could destroy recovered progress.
- Any privilege change must have an explicit inverse GRANT and a pre-change privilege snapshot.
- Commerce remains off throughout, so no commerce rollback is required.

## Evidence log

- 2026-09-12: fetched current `origin/main`; base is `e8db4af0`.
- 2026-09-12: confirmed isolated worktree and did not modify the dirty primary checkout.
- 2026-09-12: confirmed Free plan, missing Skybound column, absent ticket-purchase RPC, and zero action-log rows older than 48 hours.
- 2026-09-12: confirmed official guidance: migration history is version-based; `db push --dry-run` previews pending migrations; `migration repair` mutates only history metadata; hosted logs should use project-scoped read-only `query_logs` or the Management API.
- 2026-09-12: reconstructed all sixteen timestamp-mismatched migration files and the three remote-only files from the production migration-history bodies. Historical SQL now follows the actual production order; no production history rows were deleted or forged.
- 2026-09-12: moved the unapplied commerce-only ticket fulfillment migration out of the active migration directory and added an explicit commerce-off guard comment.
- 2026-09-12: applied `add_skybound_academy_progress` to production as version `20260912215340`; the column is present with an empty JSON default and zero null rows.
- 2026-09-12: active local and production migration histories now contain the same 31 timestamp/name pairs. The parked commerce migration is excluded from the active chain.
- 2026-09-12: four same-version migration bodies differ from their original production-history snapshots. One is byte-identical after snapshot round-tripping; one contains later Quest foundation additions whose tables, indexes, policies, triggers, and RPC are confirmed present in production; one adds safe `to_regprocedure` guards; and one differs only in comments/case. These bodies are intentionally retained because local rebuilds need the canonical final definitions.
- 2026-09-12: function-by-function privilege audit confirmed anonymous execution only for the two intentionally public sanitized campaign-sharing RPCs. All private authenticated SECURITY DEFINER RPCs deny `anon` and check `auth.uid()`; the admin telemetry RPC additionally checks the admin table. Revoking authenticated execution would break intended app flows, so the remaining generic lints are reviewed/accepted rather than hidden.
- 2026-09-12: leaked-password protection remains unavailable without moving the Free organization to Pro. It was not enabled because the authority boundary forbids a paid upgrade.
- 2026-09-12: the installed Supabase plugin describes real-time log access, but its current connected tool surface does not expose `query_logs`. The no-cost browser fallback reached the Supabase sign-in screen and was stopped without entering credentials. Full service-log coverage therefore remains an explicit connection blocker rather than a false healthy result.
- 2026-09-12: Quest foundation, telemetry security, action-log retention, demo-cloud routing, sanitized campaign sharing, parked commerce readiness, personal-quest unlock, and SECURITY DEFINER regression scripts passed.
- 2026-09-12: live `https://habitgame.app/` and `/app` rendered without browser warnings/errors. The desktop client showed the intentional phone-only gate, so this is not evidence for the still-required real-mobile reward/action smoke.
- 2026-09-12: production action-log cleanup is active every five minutes, completed 288/288 runs successfully in the last 24 hours, and left zero rows older than 48 hours.
- 2026-09-12: whole-repository TypeScript emitted no diagnostics but failed to terminate after several minutes and was manually stopped. It is recorded as inconclusive, not passed; no TypeScript source changed in this branch.

## Final acceptance

- **Resolved and verified — Skybound persistence:** production column is live with the required JSONB, default, nullability, and comment.
- **Resolved and verified — migration version history:** local and remote active chains contain the same 31 version/name pairs. Historical bodies with later canonical additions are documented and production state was checked.
- **Resolved and verified — action-log retention:** 288/288 successful runs in 24 hours and zero stale rows.
- **Intentional and reviewed — commerce RPC:** safely parked outside the active chain while commerce is off.
- **Intentional and reviewed — SECURITY DEFINER access:** public sharing is intentionally sanitized; private RPCs deny anonymous access and enforce caller/admin checks. Generic advisor notices remain visible.
- **Blocked without cost — leaked-password protection:** Supabase restricts the feature to Pro, while this organization is on Free. No paid upgrade was made.
- **Blocked on connection capability — service logs:** the current connected Supabase tool surface lacks `query_logs`, and the dashboard fallback requires a Supabase browser sign-in. Monitoring must keep reporting insufficient log coverage.
- **In progress — exact mobile journey:** desktop production is error-free and correctly phone-gated, but a real-phone first-reward/meaningful-action smoke remains.
