# LifeGoal production-readiness repair — execution and evidence

Date: 2026-08-11 (Europe/London)
Automation: `lifegoal-production-readiness-repair`
Base: `origin/main` at `1fd81f25d0f21e538c4a8cf54eca51565badae10`
Branch: `codex/lifegoal-production-readiness-20260811`

## Outcome and authority boundary

This repair reduces canonical save churn, prevents synthetic demo/preview IDs from reaching UUID-backed goal queries, fails minigame ticket commerce closed until its complete backend is proven ready, and gives weak-password failures actionable copy. It does not deploy, apply migrations, mutate production data/Auth/RLS/privileges, create Stripe products or prices, merge, or push to `main`.

The work was performed in an isolated worktree from a freshly fetched `origin/main`; the user's dirty checkout was not switched or edited. Draft PR #3262 was inspected first. Its focused creature/offer commit was retained, strengthened, and incorporated here; this broader branch supersedes that stale branch rather than duplicating the fixes.

## Status by requested priority

| Priority | State | Root cause, repair, and evidence |
| --- | --- | --- |
| 1. Creature/offer save churn | **Resolved in branch** | `applyCreatureCollection` now merges monotonically before equality/commit. `grantIds` are compared as an unordered audit set, missing stale markers cannot remove canonical markers, and the ledger no longer invents `formLevel: 1` during an otherwise semantic no-op. The regression proves reversed/duplicated IDs, a stale missing-ID snapshot, and A→B→A all preserve runtime version 20, emit zero store notifications, and leave persisted local storage byte-for-byte unchanged. Offer expiry telemetry uses the stable `offer-expired:<date>:<windowEnd>` client/server dedupe key instead of the changing offered-habit list. |
| 2. Four TypeScript blockers | **Resolved on latest main** | A clean dependency install followed by `tsc -b --pretty false` passed before repair edits. The reported Capacitor Browser contract, `PostgrestError/toJSON`, and both Zen Garden number-to-never failures were stale-install/older-main symptoms, not reproducible on base SHA `71aded21`; no duplicate source workaround was added. The post-edit Vite production build passed. A second full-project `tsc -b` produced no diagnostics but exceeded 4.5 minutes and was stopped; focused suites compile the changed application paths. |
| 3. Synthetic UUID leakage | **Resolved in branch** | `demo-user-0001` flowed from `createDemoSession` through the Wisdom encounter and `loadCompassPlayerData` into unguarded `goalsRepo`; `wisdom-caretaker-preview` followed the same path from `WisdomStopPreview`'s synthetic preview session. The UI session was never a real Supabase Auth session. `refreshGoalsFromSupabase` and `syncGoalsWithSupabase` now use the existing `canUseSupabaseDataForUser` boundary before acquiring the client; preview mode additionally stays local at the encounter boundary. The routing test locks both sentinel IDs outside the UUID contract and asserts both repository guards. |
| 4. Minigame ticket purchase safety | **In progress — safely OFF** | Read-only production inventory found the signed webhook handler and replay reservation, but no deployed `create-checkout-session-minigame-ticket` and no live `increment_user_minigame_tickets_by_event` RPC. A default-OFF readiness flag hides the button and the service independently fails closed before Edge invocation. A versioned service-role-only RPC migration, authenticated Edge Function helper tests, pgTAP ACL/input tests, and a staged deploy runbook are prepared but not applied. Real Stripe product/price IDs and explicit migration/function/live-release approval remain required. |
| 5. Weak password UX | **Resolved in branch** | Supabase `WeakPasswordError`, `weak_password`, and the provider fallback wording map to friendly passphrase guidance. Unrelated auth errors retain the existing mapping path. Leaked-password protection remains unchanged in production. |
| 6. Security advisors | **In progress — targeted remediation prepared** | The read-only review reproduced all 18 notices: 2 anon SECURITY DEFINER, 15 authenticated SECURITY DEFINER, and 1 leaked-password configuration warning. Confirmed risks were limited to three functions: arbitrary-date/no-completion daily-spin claims, unchecked client-supplied Combined Journey thresholds, and global sweep-health disclosure. The prepared migration verifies a current-day owned completion, quarantines Combined Journey claims to `service_role` while the client feature defaults OFF, and restricts sweep health to `service_role`. The other warnings were not mass-edited; production review/apply and leaked-password configuration require explicit approval. |

## Verification ledger

- `test:auth-resilience`: pass, including class/code weak-password mappings.
- `test:demo-cloud-routing`: pass, including both sentinel boundary assertions.
- `test:minigame-ticket-commerce-readiness`: pass, including default OFF, UI/service fail-closed behavior, SKU/event compatibility, metadata, and RPC ACL checks.
- `test:habit-offer-sort`: pass, including stable expiry-key deduplication.
- `test:island-run`: **1727 pass, 3 fail**. The new grantId churn/no-save and ticket-gate cases pass. A clean `origin/main` comparison produced **1725 pass, 3 fail** with the same three visual/manifest failures in `islandNarrativeOpeningFlow` and `islandRunBoardPerformanceGuards` (fixed-plot construction and final-camera legacy squash); none of their implementation files are changed here.
- `check:island-run-architecture-guards`: pass with 0 violations and the same 3 allowlisted legacy warnings.
- Clean-install baseline `tsc -b --pretty false`: pass on the recorded main SHA. Post-edit retry: no diagnostics, manually stopped after 4.5 minutes; Vite and focused TypeScript-backed suites cover the edited paths.
- `vite build`: pass, 1,282 modules transformed in 1m36s; existing chunk-size/dynamic-import warnings only.
- `git diff --check`: pass.
- Phone-sized browser smoke: attempted through the repository's 414×896 guest boot guard after build, but skipped because the execution environment has no Chromium under `PLAYWRIGHT_BROWSERS_PATH`. The static routing regression proves neither sentinel can cross the goal repository's cloud boundary; a real roll/reward/Today-return smoke remains a release-candidate check.
- Local pgTAP was prepared but not run because no local Supabase database was started and production mutation was forbidden.

## Production evidence and user effect

The 2026-08-11 sentinel remains valid warning evidence: 1,561 applied `runtime_snapshot_upsert` events in 24 hours versus a 50/day prior baseline, 87 completed-roll events, no duplicate action/dedupe groups, and UUID query errors from the two synthetic identities. With one active user, funnel and retention conclusions remain statistically non-decision-ready.

After merge and a normal app release, users should see less redundant creature/offer persistence, demo and preview flows should stop generating invalid goal UUID requests, unavailable ticket checkout should disappear instead of failing halfway, and weak passwords should receive understandable guidance. Ticket commerce, the targeted database hardening, leaked-password protection, and live deployment remain deliberately outside this job's authority.

## Residual risk and release gates

1. Review and explicitly approve the two migrations and Edge Function before any Supabase deployment.
2. Supply/approve real Stripe test/live products and prices, then complete signed-webhook replay and atomic +10 ticket evidence using the companion runbook.
3. Run the prepared pgTAP files against an isolated local/staging database and re-run Security Advisor.
4. Run the phone-sized guest Island Run roll/reward/return smoke in a browser-equipped environment and confirm network logs contain neither sentinel.
5. Keep `minigameTicketPurchasesReady` and `combinedJourneyRewardsEnabled` OFF until their server-authoritative gates pass.

## Island action-log scale investigation — 2026-08-12

Read-only production aggregates confirmed that creature synchronization was write amplification rather than ordinary player progress. Of 1,887 retained action-log rows from one player/session, 902 changed `creature_collection`; 861 of those arrived less than one second after the preceding creature write. Two alternating state hashes accounted for 701 rows. This matches the stale local snapshot → canonical audit-marker restore loop fixed by the monotonic merge and unordered `grantIds` equality regression in this branch.

The action log itself is healthy at current volume: about 3.5 MB, indexed by `created_at`, zero dead tuples after autovacuum, unique `(user_id, client_action_id)` idempotency protection, and 133,405 historical rows already removed. It must not be manually cleared because recent rows are the retry/idempotency ledger.

The present retention schedule is not ready for multiple equally active players. It deletes at most 5,000 rows once daily, so at the observed pre-fix rate it can fall behind at roughly five such players. The safe follow-up is a separate, staged migration that keeps the 48-hour window but runs the existing 5,000-row bounded delete every five minutes via `cron.alter_job` or `cron.schedule`. That raises bounded cleanup capacity to 1.44 million rows/day without one large delete transaction. Alert when the oldest row exceeds 72 hours or cleanup repeatedly consumes the full 5,000-row batch. Evaluate time partitioning only after sustained volume approaches 500,000 rows/day or measured delete/vacuum pressure justifies the migration cost.

Post-release success evidence: for 24 hours after the deployed bundle is active, creature-only A→B→A bursts remain zero, action-log statuses remain applied without duplicate client action IDs, and per-session write rate tracks meaningful gameplay actions instead of render cadence. No production retention schedule or player data is changed by this PR.
