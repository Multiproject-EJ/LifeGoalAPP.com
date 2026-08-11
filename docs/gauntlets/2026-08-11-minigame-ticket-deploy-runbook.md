# Minigame ticket purchase deployment runbook

Status: prepared, not approved or deployed.
Production project: `muanayogiboxooftkyny`.

## Current production gate

Keep `minigameTicketPurchasesReady` set to `false`. The 2026-08-11 read-only audit found that production has neither `create-checkout-session-minigame-ticket` nor `public.increment_user_minigame_tickets_by_event(uuid,text,integer)`. The deployed webhook already contains minigame-ticket handling and a dedupe reservation, but fulfillment would fail without the RPC.

## Approval inputs

Eivind must explicitly approve the production migration/function deploy and provide or approve real Stripe test/live products and prices. Do not reuse illustrative prices from planning documents. Do not enable leaked-password protection or alter Auth/RLS as part of this rollout.

## Staged rollout

1. Confirm `supabase migration list` and isolate the reviewed migration `20260811211349_harden_minigame_ticket_fulfillment.sql`; do not blindly apply unrelated pending migrations.
2. Run local database tests, including `supabase/tests/database/minigame_ticket_fulfillment.test.sql`, and Security Advisor. Verify only `service_role` can execute the RPC.
3. Create the five approved Stripe test-mode products/prices and set their exact IDs in the named `STRIPE_PRICE_*` function secrets. Configure success/cancel URLs. Never commit IDs or secrets.
4. Deploy `create-checkout-session-minigame-ticket` with JWT verification enabled. Verify an authenticated user, a missing token, invalid SKU/event pairs, missing environment values, and a demo session.
5. In Stripe test mode, complete one purchase. Verify the existing signed webhook credits exactly 10 tickets to the correct event bucket. Replay the same webhook event and prove the ticket count does not change.
6. Re-run Security Advisor, focused commerce tests, typecheck, production build, and a phone-sized checkout return-path smoke.
7. Only after all gates pass, set `minigameTicketPurchasesReady` to `true` in a separate reviewed release. Roll back by flipping it to `false`; do not delete purchase or webhook records.

## Evidence required before live mode

- Migration/version and function deployment IDs.
- pgTAP, Edge helper, auth-negative, webhook-replay, typecheck, and build results.
- Approved Stripe product/price mapping and test receipt (IDs redacted from public reports).
- Read-only before/after ticket ledger showing one atomic +10 and no replay increment.
- Explicit merge, production migration/function deploy, Stripe, and live-release approval.
