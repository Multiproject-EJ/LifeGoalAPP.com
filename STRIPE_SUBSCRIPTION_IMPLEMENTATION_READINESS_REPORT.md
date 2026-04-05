# Stripe Subscription Implementation Readiness Report

## 1) Executive summary
- The app is a React + TypeScript Vite SPA/PWA with Supabase auth/data and existing Supabase Edge Functions, but **Stripe is not currently integrated** (no Stripe package, no Stripe routes/functions, no billing webhook pipeline).
- There is an existing **Account** surface and **Support** case flow that already references billing/cancellation help, making it the best insertion point for Upgrade/Manage Billing controls.
- Supabase migrations show mature RLS patterns (`auth.uid() = user_id`, plus controlled admin/service-role policies) that billing tables should follow.
- Current “subscription” display in account UI is metadata-driven (`user.user_metadata.subscription_*`) rather than authoritative entitlements from DB, so gating must be migrated to DB-backed entitlements.

## 2) Existing relevant architecture
### Frontend
- Vite + React + TypeScript (`vite`, `@vitejs/plugin-react`, TS build script). 
- Route handling is custom (not React Router): `resolveRoute()` handles path buckets and mostly falls back to app shell.
- Auth is handled via `SupabaseAuthProvider` context + `useSupabaseAuth`; app uses `supabaseSession` and `activeSession` centrally.

### PWA
- PWA manifests exist at `public/manifest.webmanifest` and `public/manifest.json`.
- Service worker registration is done in `src/main.tsx` (prod only) via `registerServiceWorker()`; it registers `/sw.js`.
- Existing SW (`public/sw.js`) includes shell/data caching and offline queue behavior.

### Supabase
- Browser client setup is in `src/lib/supabaseClient.ts`.
- Supabase Edge Functions exist under `supabase/functions/*` (actions-cleanup, auto-progression, goal-coach-chat, send-reminders, suggest-goal, treat-calendar, vision-spotlight, vision-star-special).
- Frontend already calls Edge Functions via both `supabase.functions.invoke(...)` and direct `fetch(${SUPABASE_URL}/functions/v1/...)` patterns.

### Existing account/support/billing-adjacent UX
- `App.tsx` has an account workspace lane rendering `MyAccountPanel`.
- `MyAccountPanel` already has a “Subscription → Plan overview” card (currently metadata-based) and support controls.
- Support request modal includes support categories like billing help, cancellation request, refund review.

### Existing gating/entitlement-like logic
- AI feature gating exists via `src/services/aiEntitlementService.ts` and `VITE_AI_TIER`, plus local quota-based fallback.
- Some access checks are nav-specific (e.g., auth required for certain nav IDs), but no Stripe-backed entitlement gate exists.

## 3) Existing files and paths
### Auth/session/app shell
- `src/features/auth/SupabaseAuthProvider.tsx`
- `src/lib/supabaseClient.ts`
- `src/App.tsx`
- `src/main.tsx`
- `public/auth/callback.html`

### PWA
- `public/manifest.webmanifest`
- `public/manifest.json`
- `src/registerServiceWorker.ts`
- `public/sw.js`

### Account/settings/modals/support
- `src/features/account/MyAccountPanel.tsx`
- `src/features/cases/CaseSubmissionModal.tsx`
- `src/features/cases/MyCasesPanel.tsx`
- `src/features/admin/AdminInboxPanel.tsx`
- `src/services/cases.ts`
- `src/services/adminRoles.ts`

### Supabase edge/server surfaces
- `supabase/functions/actions-cleanup/index.ts`
- `supabase/functions/auto-progression/index.ts`
- `supabase/functions/goal-coach-chat/index.ts`
- `supabase/functions/send-reminders/index.ts`
- `supabase/functions/suggest-goal/index.ts`
- `supabase/functions/treat-calendar/index.ts`
- `supabase/functions/vision-spotlight/index.ts`
- `supabase/functions/vision-star-special/index.ts`

### Migrations / schema / RLS patterns
- `supabase/migrations/0001_habits_core.sql`
- `supabase/migrations/0002_push.sql`
- `supabase/migrations/0107_workspace_profiles.sql`
- `supabase/migrations/0204_feedback_support_cases.sql`
- `src/lib/database.types.ts`

### Environment / secrets-related files
- `README.md` (documents env var setup)
- `supabase/defaultCredentials.json` (checked-in URL + anon key fallback)
- `lib/aiClient.ts` and `lib/auth.ts` (server-side helper patterns using service key)
- `api/vapid-public.js`, `api/save-subscription.js` (Node serverless helpers)

## 4) Missing pieces
- Stripe dependency/config: **not found** (`stripe` package, `@stripe/stripe-js`, Stripe SDK wiring).
- Billing DB model for subscriptions/entitlements: **not found** (no Stripe customer/subscription/webhook event tables).
- Billing Edge Functions (checkout session create, portal session create, webhook handler): **not found**.
- Billing routes/handlers for checkout success/cancel outcomes: **not found** in current route map.
- DB-backed entitlement gate for paid features: **not found** (current “plan” card reads auth metadata).

## 5) Risks / conflicts / do-not-overwrite warnings
- Do not rely on `user_metadata.subscription_*` for source-of-truth access control; this is display-oriented and mutable outside DB entitlement sync.
- Existing AI gating (`VITE_AI_TIER`, local quotas) is separate from billing and could conflict if reused directly.
- Keep current support/admin case system intact (`admin_users`, `case_threads`, `case_messages`)—it already contains billing-related support categories.
- Avoid putting Stripe secrets in client-exposed env (`VITE_*` / `NEXT_PUBLIC_*`). Existing code already has some client-side OpenAI usage via `VITE_OPENAI_API_KEY`; do not repeat that with Stripe secrets.
- `supabase/defaultCredentials.json` is committed with URL/anon key fallback; acceptable for anon but do not introduce any Stripe secret there.

## 6) Recommended implementation plan tailored to this repo
### A. New DB tables (minimal, Stripe-aligned)
1. `billing_customers`
   - `user_id uuid primary key references auth.users(id)`
   - `stripe_customer_id text unique not null`
   - timestamps
2. `billing_subscriptions`
   - `id uuid pk`
   - `user_id uuid not null`
   - `stripe_subscription_id text unique not null`
   - `stripe_price_id text`
   - `status text not null` (trialing, active, past_due, canceled, incomplete, etc.)
   - `current_period_end timestamptz`
   - `cancel_at_period_end boolean`
   - `raw jsonb`
   - timestamps
3. `billing_entitlements`
   - `user_id uuid pk`
   - `is_pro boolean not null default false`
   - `entitlements jsonb not null default '{}'::jsonb`
   - `effective_from/effective_to` (optional)
   - `updated_at`
4. `billing_webhook_events`
   - `stripe_event_id text pk`
   - `type text`
   - `received_at timestamptz default now()`
   - `processed_at timestamptz`
   - `status text` (received/processed/failed)
   - `payload jsonb`
   - `error text`

RLS pattern: mirror existing owner-scoped policies (user can select own customer/subscription/entitlement rows), and restrict writes to service-role/webhook paths.

### B. New Edge Functions
1. `create-checkout-session`
   - Auth required; resolve `auth.uid()`
   - Create/reuse Stripe customer
   - Create subscription Checkout session
   - Return `url`
2. `create-customer-portal-session`
   - Auth required; map `auth.uid()` -> Stripe customer
   - Return portal URL
3. `stripe-webhook`
   - Verify webhook signature using Stripe signing secret
   - Idempotency via `billing_webhook_events`
   - Upsert `billing_subscriptions` and recompute `billing_entitlements`
4. (Optional tiny helper) `billing-status`
   - Auth-required read endpoint for normalized billing/entitlement response if you want one API abstraction over direct table reads.

### C. Frontend integration points
Modify/create:
- `src/features/account/MyAccountPanel.tsx`
  - Replace metadata-only “Plan overview” behavior with DB-backed entitlement display.
  - Add buttons:
    - `Upgrade to Pro` (if `is_pro=false`) → calls `create-checkout-session` and redirects.
    - `Manage Billing` (if has customer/subscription) → calls `create-customer-portal-session` and redirects.
- `src/App.tsx`
  - Add handling for return query params (`?checkout=success|canceled`) on app boot and show toast/banner in account screen.
- New lightweight service:
  - `src/services/billing.ts` for invoking edge functions + reading `billing_entitlements`.

### D. Minimal request flow mapping
1. **Create checkout session**: click Upgrade in `MyAccountPanel` → call edge function `create-checkout-session` with auth bearer.
2. **Redirect to Stripe Checkout**: frontend `window.location.assign(url)`.
3. **Handle success return**: Stripe return URL points back to app (e.g., `/app?checkout=success`); app shows “processing” state and refreshes entitlement row.
4. **Process webhook**: Stripe sends events to `stripe-webhook`; function verifies signature, stores event, updates subscription + entitlements.
5. **Update entitlement state**: webhook writes `billing_entitlements` (`is_pro=true/false` and claims).
6. **Open customer portal**: Manage Billing button invokes `create-customer-portal-session`, then redirect.

### E. Where UI should read entitlements
- Source of truth: `public.billing_entitlements` (or secure view over it).
- Frontend should read this table (owner-select RLS) and gate paid features from this row only.

## 7) Open questions that must be answered before coding
1. Stripe price model: single monthly price or monthly+annual?
2. Trial behavior needed for MVP?
3. What exact in-app features should be tied to `is_pro` first (AI features, support SLAs, future modules)?
4. Desired post-checkout UX: account tab toast only, or dedicated lightweight success/cancel screens?
5. Backfill strategy for existing users currently showing metadata-based plan labels?
6. Should support/admin tooling display billing status context for agents?
7. Which environment/deployment target will host webhook endpoint first (Supabase Edge Function URL + Stripe dashboard config)?

## 8) Smallest safe MVP path
1. Add billing schema migration with four tables + RLS (owner read, service-role write).
2. Add `create-checkout-session`, `create-customer-portal-session`, `stripe-webhook` Edge Functions.
3. Add `src/services/billing.ts` and wire `MyAccountPanel` buttons.
4. Keep current `Plan overview` card but change data source from `user_metadata` to `billing_entitlements` + `billing_subscriptions`.
5. Add simple return handling in `App.tsx` using query params and polling/refetch for entitlement sync.
6. Gate exactly one premium feature first using `billing_entitlements.is_pro` to validate end-to-end.
7. Add operational checklist: webhook retries/idempotency test, canceled subscription downgrade test, portal return test.
