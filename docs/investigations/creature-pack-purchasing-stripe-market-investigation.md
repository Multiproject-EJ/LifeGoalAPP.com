# Creature/Egg/Card Pack Purchasing + Stripe + Market Investigation

Date: 2026-05-20  
Status: Investigation only — no implementation, Stripe changes, Supabase migrations, or gameplay/economy writes.

## Executive answers

- **Do we already have pricing docs?** Partially, but not for paid creature/egg/card packs. The repo documents in-game economy costs such as the Market dice bundle (`30` essence → `+6` dice), Sanctuary shard-shop treat costs (`3/5/10` shards, plus bond items), egg sell reward ranges, a free first-session creature pack (`5` creature cards + `100` dice), and placeholder minigame-ticket Stripe SKUs. I did **not** find concrete public pricing docs for creature packs, egg packs, or card creature packs.
- **Do we already have Stripe links/products?** Stripe integration exists for Pro subscriptions, 500-roll dice packs, and minigame ticket packs, but I did **not** find Stripe checkout links, product IDs, price IDs, or webhook fulfillment for creature packs, egg packs, or card creature packs. Existing Stripe code uses env-var price IDs such as `STRIPE_PRICE_DICE_PACK_500`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY`, and minigame ticket price env vars.
- **Do we have dev shortcuts?** Yes for dice, essence, timed-event tickets, speed-hatching eggs, building/clearing islands, Lucky Roll/Treasure Path flows, and dev opening egg reward vouchers. I did **not** find a dev/admin shortcut that directly grants arbitrary creature/card pack bundles, Active Companion selection, shards, or treats as a single admin grant product.

## Scope inspected

### Docs

- `docs/04_MAIN_GAME_EGGS_HATCHERY_HOME.md`
- `docs/12_MINIGAME_BOSS_ECONOMY_PLAYER_LEVEL_DESIGN.md`
- `docs/CREATURE_CARD_DESIGN_SYSTEM_V1.md`
- `docs/CREATURE_PERSONALITY_DEX_V1.md`
- `docs/gameplay/MINIGAME_EVENTS_CONSOLIDATION_PLAN.md`
- `docs/gameplay/ISLAND_RUN_STRIPE_DICE_SHOP_AUDIT_2026-04-11.md`
- `docs/investigations/CREATURE_CARD_SYSTEM_INVESTIGATION_2026-05-20.md`
- `docs/investigations/creature-pack-dice-regen-architecture.md`
- `docs/investigations/island-1-first-creature-pack-reward.md`
- `docs/investigations/dev-egg-speed-hatch-and-clear-island.md`

### Code and schema

- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
- `src/features/gamification/level-worlds/services/islandRunFirstSessionCreaturePackAction.ts`
- `src/features/gamification/level-worlds/services/islandRunStateActions.ts`
- `src/features/gamification/level-worlds/services/islandRunEggRewardInventoryAction.ts`
- `src/features/gamification/level-worlds/services/creatureCollectionService.ts`
- `src/features/gamification/level-worlds/services/creatureTreatInventoryService.ts`
- `src/services/billing.ts`
- `src/services/minigameTicketStore.ts`
- `src/features/account/MyAccountPanel.tsx`
- `supabase/functions/create-checkout-session-payment/index.ts`
- `supabase/functions/create-checkout-session-minigame-ticket/index.ts`
- `supabase/functions/create-checkout-session-subscription/index.ts`
- `supabase/functions/stripe-webhook/index.ts`
- `supabase/migrations/0191_island_run_creature_collection_sync.sql`
- `supabase/migrations/0213_billing_and_wallet_foundation.sql`
- `supabase/migrations/0214_user_wallets_atomic_increment_rpc.sql`
- `supabase/migrations/0231_add_minigame_tickets_by_event.sql`
- `supabase/migrations/0234_increment_user_minigame_tickets_by_event_rpc.sql`
- `supabase/migrations/0236_add_egg_reward_inventory.sql`
- `.env.example`

## 1. Existing docs coverage

| Topic | Found? | Notes |
| --- | --- | --- |
| Creature packs | Yes, free/onboarding only | `island-1-first-creature-pack-reward.md`, `creature-pack-dice-regen-architecture.md`, and current code describe a first-session creature pack. |
| Egg packs | Not as purchasable packs | Eggs are documented as per-island hatchery slots and Treasure Path egg reward vouchers, not store-bought egg packs. |
| Card creature packs | Partial design/product language only | Creature card docs define card identity/design, but not paid card pack purchasing. |
| Pricing | Partial | In-game Market/Sanctuary costs and Stripe placeholders exist; no concrete creature/egg/card pack real-money prices found. |
| Rarity odds | Partial | First-session pack has slot weights; eggs have common/rare/mythic selection and sell rewards. No paid pack odds disclosure found. |
| Free vs paid packs | Partial | Free first-session pack is clear; paid creature/egg/card packs are not defined. |
| Dev/admin test packs | Partial | Dev egg voucher opening and dev economy shortcuts exist; no general admin grant pack spec found. |

Important doc details:

- `docs/04_MAIN_GAME_EGGS_HATCHERY_HOME.md` documents egg tiers, hatch timers, per-island egg permanence, collect/sell behavior, and egg sell rewards.
- `docs/CREATURE_PERSONALITY_DEX_V1.md` and `docs/CREATURE_CARD_DESIGN_SYSTEM_V1.md` define creature card identity and visual rules, not purchase/price rules.
- `docs/investigations/island-1-first-creature-pack-reward.md` describes a first pack concept, but current implementation is now `5` cards and `+100` dice.
- `docs/gameplay/MINIGAME_EVENTS_CONSOLIDATION_PLAN.md` describes minigame ticket Stripe SKU placeholders, not creature/card pack SKUs.

## 2. 120-island Market/store support

### Main Market panel

Current Market support in `IslandRunBoardPrototype.tsx`:

- **Stripe dice pack:** “Buy 500 Rolls (Stripe)” calls `createDicePackCheckoutSession()`.
- **In-game dice bundle:** `30` essence buys `+6` dice, once per island (`dice_bundle` ownership marker).
- **Tier 2 post-boss copy:** says bigger dice packs + essence boosters are “available soon”; not implemented.
- **Creature Trade copy:** points users back to Hatchery collect/sell; not a buy flow.

Current gaps:

- No Market purchase flow found for buying eggs.
- No Market purchase flow found for buying creatures.
- No Market purchase flow found for buying card packs.
- No Market purchase flow found for buying cosmetics.
- No Market purchase flow found for buying with dice/tickets.
- The dice bundle path is still mixed/migration-era: essence deduction and owned-bundle marker use action services, but the `+6` dice reward is applied through component-local state rather than a single atomic purchase action. Future product work should not copy this pattern.

### Sanctuary inventory/shop

The Sanctuary “Inventory & Shop” shard shop supports:

- Basic Treat ×2 for `3` shards.
- Favorite Snack ×1 for `5` shards.
- Rare Feast ×1 for `10` shards.
- Enrichment Kit for `8` shards → `+3` bond XP to active companion.
- Habitat Upgrade for `20` shards → `+8` bond XP to active companion.

Risk note: this shop currently uses shard spend and local/runtime updates from the component surface. Future economy work should route through canonical action services only.

### Existing currencies used in store-like flows

- **Essence:** main Market dice bundle.
- **Shards:** Sanctuary treats and bond items.
- **Stripe:** dice pack and minigame-ticket pack checkout.
- **Tickets:** can be bought through timed-event minigame ticket checkout, not used to buy creature/egg/card packs.
- **Dice:** no store purchase with dice found.

## 3. Stripe integration

### Existing checkout/client paths

- `src/services/billing.ts`
  - `createSubscriptionCheckoutSession()`
  - `createDicePackCheckoutSession()`
  - `createCustomerPortalSession()`
- `src/services/minigameTicketStore.ts`
  - `initiateMinigameTicketCheckout()`
- `IslandRunBoardPrototype.tsx`
  - Market/out-of-dice entry points for 500-roll checkout.
  - Active-event panel entry for minigame ticket checkout.
- `MyAccountPanel.tsx`
  - Pro subscription checkout.
  - Customer portal.
  - Buy 500 Rolls.

### Existing Supabase Edge Functions

- `create-checkout-session-subscription`
  - Uses `STRIPE_PRICE_PRO_MONTHLY` / `STRIPE_PRICE_PRO_YEARLY`.
  - Product metadata: `habitgame_pro`.
- `create-checkout-session-payment`
  - Uses `STRIPE_PRICE_DICE_PACK_500`.
  - Product metadata: `dice_pack`, `rolls=500`.
- `create-checkout-session-minigame-ticket`
  - Uses SKU env vars such as `STRIPE_PRICE_MINIGAME_TICKETS_10`, `STRIPE_PRICE_FEEDING_FRENZY_TICKETS_10`, etc.
  - Product metadata: `minigame_ticket_pack`, `tickets=10`.
- `stripe-webhook`
  - Handles subscription create/update/delete.
  - Handles `checkout.session.completed` for `dice_pack`.
  - Handles `checkout.session.completed` for `minigame_ticket_pack`.

### Existing billing/entitlement tables

- `billing_customers`
- `billing_subscriptions`
- `billing_entitlements`
- `billing_webhook_events`
- `user_wallets` with `dice_rolls`

### Existing fulfillment/RPCs

- Dice packs: webhook calls `increment_user_dice_rolls`, updating `user_wallets.dice_rolls`.
- Minigame ticket packs: webhook calls `increment_user_minigame_tickets_by_event`, updating `island_run_runtime_state.minigame_tickets_by_event`.
- Pro subscription: webhook updates subscription snapshot and `billing_entitlements`.

### Creature/egg/card pack Stripe status

Not found:

- No `STRIPE_PRICE_CREATURE_PACK_*`.
- No `STRIPE_PRICE_EGG_PACK_*`.
- No `STRIPE_PRICE_CARD_PACK_*`.
- No creature/egg/card pack `product_type` in Stripe metadata.
- No webhook branch for granting creatures, eggs, or card packs.
- No normalized entitlement table for consumable creature/card pack grants.
- No checkout link/product ID/price ID for creature/egg/card packs in `.env.example`.

## 4. Dev/admin shortcuts

Found dev shortcuts:

- `applyDevGrantDice` — grants dice through canonical commit path.
- `applyDevGrantEssence` — grants essence through canonical commit path.
- `applyDevGrantTimedEventTickets` — grants event-scoped minigame tickets through canonical commit path.
- `applyDevSpeedHatchEgg` — marks current island egg ready.
- `applyDevBuildAllToL3` — builds landmarks to L3.
- `applyDevClearCurrentIslandForTravel` — satisfies island-clear gate and opens normal celebration/travel path.
- Lucky Roll/Treasure Path dev overlay helpers.
- Dev egg reward voucher opening via `openEggRewardInventoryEntry`.
- Local dev mode unlock via `localStorage.dev_mode`.

Not found:

- No admin panel shortcut that grants arbitrary eggs as inventory vouchers.
- No admin panel shortcut that grants arbitrary creatures/card packs.
- No admin panel shortcut that grants Active Companion selection as a product.
- No direct dev grant for shards/treats found comparable to dice/essence/tickets.
- No production admin entitlement grant flow for creature/card packs.

## 5. Current canonical purchase/action path

### Best current canonical Island Run action patterns

Future creature/egg/card pack work should follow these patterns:

- `claimFirstSessionCreaturePackReward`
  - Uses `withIslandRunActionLock`.
  - Reads canonical Island Run state.
  - Grants creatures via runtime `creatureCollection`.
  - Grants dice.
  - Advances tutorial state.
  - Commits through `commitIslandRunState`.
- `openEggRewardInventoryEntry`
  - Uses `withIslandRunActionLock`.
  - Opens one egg voucher idempotently.
  - Grants a creature into `creatureCollection`.
  - Marks the egg voucher opened.
  - Commits through `commitIslandRunState`.
- `applyDevGrant*` actions
  - Useful dev-only examples for canonical commits, but should not become production purchase logic.

### Supabase truth

- Creature ownership lives in `island_run_runtime_state.creature_collection`.
- Active companion lives in `island_run_runtime_state.active_companion_id`.
- Egg reward vouchers live in `island_run_runtime_state.egg_reward_inventory`.
- Treat inventory lives in `island_run_runtime_state.creature_treat_inventory`.
- Minigame tickets live in `island_run_runtime_state.minigame_tickets_by_event`.
- Billing entitlements/subscription/customer state lives in `billing_*` tables.
- Paid dice pack credits currently live in `user_wallets.dice_rolls`, not directly in `island_run_runtime_state.dice_pool`.

### LocalStorage fallbacks / legacy surfaces

- `creatureCollectionService.ts` stores local creature collection and active companion values, but its header says it is non-authoritative and retained for migration/fallback UI compatibility only.
- `creatureTreatInventoryService.ts` stores local treat inventory, but its header says runtime/Supabase-backed Island Run state is the source of truth.
- Future purchase/grant work should not introduce new localStorage authority or a second creature inventory.

## 6. Safest product model

### A. In-game Egg Pack bought with essence

Safest if it is **not paid**, capped, and deterministic/idempotent.

Recommended shape:

- Treat as a canonical Island Run reward/purchase action.
- Spend essence through a service action.
- Grant a small number of egg reward vouchers into `eggRewardInventory`.
- Do not directly duplicate creature records or hatchery active egg slots.
- Use a clear non-real-money currency label.
- Cap frequency per island/event/season.

### B. Paid Card Creature Pack via Stripe

Highest risk if random. Safest paid version is **non-random, fixed contents, clearly disclosed before purchase**.

Recommended shape:

- Fixed visible bundle: e.g. “Starter Card Creature Pack: Sproutling, Pebble Spirit, Mossling, Glowtail.”
- Stripe checkout metadata should identify a fixed SKU, not a random roll.
- Webhook should create an idempotent pack grant ledger, then call canonical Island Run grant/action service.
- If product insists on randomness, do not ship until legal/platform review, odds disclosure, refunds, parental controls, and entitlement recovery are designed.

### C. Seasonal gift pack

Low-risk if free and idempotent.

Recommended shape:

- No Stripe.
- Server/config-gated seasonal campaign.
- Fixed or controlled-random contents with disclosed odds if random.
- Claim through canonical action service.
- Store claim state in runtime/tutorial/seasonal ledger, not localStorage.

### D. Admin/dev grant pack

Useful for support/testing if gated.

Recommended shape:

- Admin-only/support-only surface.
- Grant fixed pack or egg vouchers through canonical action service.
- Write audit metadata: admin id, user id, source, reason, grant id, created_at.
- Never expose dev grant controls through public localStorage-only flags in production.

## 7. Economy/legal/product risks

- **Paid random packs / loot-box risk:** A paid random creature/card/egg pack may trigger loot-box/random-item disclosure expectations. Do not add paid random rewards without legal/platform review and odds disclosure.
- **Odds disclosure:** Existing first-session pack weights are internal; no customer-facing odds disclosure exists for paid packs.
- **Refund/entitlement handling:** Existing Stripe webhook has event-level dedupe, but no creature/card pack entitlement ledger or refund reversal flow exists.
- **Duplicate ownership:** Current creature collection supports copy counts. Paid fixed packs must define duplicate behavior before launch: extra copy, shard refund, alternate item, or blocked purchase.
- **Offline purchase sync:** Stripe webhook fulfillment is server-side, while Island Run state hydrates in the app. Pack grants need idempotent sync/retry and clear pending/synced UI.
- **Child/user safety:** The app has cute creatures, dice, islands, and rewards. Avoid pressure prompts, near-depletion upsells, hidden pricing, and random paid rewards.
- **Pay-to-win risk:** Creatures can influence companion/regen/product loops. Paid creatures should be cosmetic/supportive at first, not stronger economy generators.
- **Second inventory risk:** Creating a separate paid creature inventory would conflict with `creatureCollection`. Use the existing canonical runtime collection.
- **Split-authority risk:** Current Market/Sanctuary shop paths include migration-era component-side effects. Future purchases must be service-authoritative.
- **Personalized pricing risk:** Avoid hidden discounts or vulnerability-based pricing.

## 8. Recommended phased implementation plan

### Phase 0 — Decision and policy

- Decide that no paid random creature/card/egg packs will ship without legal review and odds disclosure.
- Define paid packs as fixed-content bundles first.
- Define duplicate handling and refund support policy.
- Confirm that all future creature ownership grants use `creatureCollection`.

### Phase 1 — Product catalog/spec only

- Add a non-code product catalog/spec for:
  - free seasonal gift pack,
  - fixed paid card creature pack,
  - in-game essence egg pack,
  - admin/dev fixed grant pack.
- Include contents, purchase currency, limits, duplicate behavior, support/refund behavior, and UX disclosure copy.

### Phase 2 — Canonical action design

- Design one service-level pack grant boundary that:
  - runs under `withIslandRunActionLock`,
  - reads canonical Island Run state,
  - validates SKU/source,
  - applies duplicate policy,
  - updates `creatureCollection` and/or `eggRewardInventory`,
  - records idempotency/grant status,
  - commits with `commitIslandRunState`.
- Do not write purchase grants from React UI.

### Phase 3 — In-game/free packs first

- Implement the essence egg pack or seasonal gift pack before any paid creature/card pack.
- Keep contents fixed or clearly disclosed.
- Validate duplicate/idempotency/offline behavior.

### Phase 4 — Admin/dev grant tooling

- Add an admin/support grant surface only after the canonical grant service exists.
- Include audit logging and strict admin gating.
- Avoid public localStorage-only dev unlocks for production grants.

### Phase 5 — Paid fixed pack via Stripe

- Add Stripe SKU/price env vars only for fixed-content packs.
- Add webhook branch with idempotent grant ledger.
- Show pending/synced/refunded status in UI.
- Do not add random paid rewards.

### Phase 6 — Only if approved: random free packs

- Randomness can be used for free seasonal/in-game packs if disclosed and capped.
- Keep random paid packs out of scope unless legal/platform/product review approves a full odds/refund/age-safety design.

## Bottom line

The app already has strong building blocks: canonical creature collection, egg reward voucher inventory, a first-session creature pack action, Stripe checkout/webhook infrastructure, billing entitlement tables, and Market/Sanctuary store surfaces. It does **not** currently have a paid creature/egg/card pack product model, concrete pricing docs, Stripe products/price IDs for those packs, or a safe entitlement/grant ledger for paid creature/card fulfillment. The safest next step is a fixed-content, non-random, canonical-action pack model, starting with free/in-game packs before any paid Stripe product.
