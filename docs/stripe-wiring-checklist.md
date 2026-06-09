# Stripe Product Wiring — Master Checklist

> **How to use this doc:**
> When you're ready to launch a product, find its section below, create the Stripe
> prices, paste the `price_xxx` IDs into Supabase secrets, deploy the edge function,
> and flip any feature flag. Then mark the item ✅.
>
> Reference: all checkout edge functions live in `supabase/functions/create-checkout-session-*/index.ts`.
> All fulfillment lives in `supabase/functions/stripe-webhook/index.ts`.

---

## Quick status overview

| Product | Code | Edge fn | Webhook | Stripe prices | Flag | Ready? |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Pro subscription (monthly/yearly) | ✅ | ✅ | ✅ | ✅ | — | ✅ LIVE |
| Dice pack (500 rolls) | ✅ | ✅ | ✅ | ✅ | — | ✅ LIVE |
| Customer portal | ✅ | ✅ | — | — | — | ✅ LIVE |
| Creature pack (5 cards) | ✅ | ✅ | ✅ | ❌ empty | ❌ gated | **TODO** |
| Egg packs (small/med/large) | ✅ | ✅ | ✅ | ❌ missing | — | **TODO** |
| Minigame tickets (5 SKUs) | ✅ | ✅ | ✅ | ❌ empty | — | **TODO** |
| Creature themes (10 SKUs) | ✅ | ✅ | ✅ | ❌ empty | — | **TODO** |
| Card packs | ❌ | ❌ | ❌ | ❌ | — | NOT STARTED |

---

## 1 · Creature Pack — `creature_pack_5`

**Gated by feature flag** — the buy button is hidden until you flip it on.

### What to do in Stripe

1. Create a **Product**: "Creature Pack — 5 Cards"
2. Create a one-time **Price** (your currency, your amount)
3. Copy the `price_xxx` ID

### What to do in Supabase

```bash
supabase secrets set STRIPE_PRICE_CREATURE_PACK_5=price_xxx
supabase functions deploy create-checkout-session-creature-pack
```

### What to do in the app

In `.env.local` (or Vercel env vars):
```
VITE_CREATURE_PACK_STRIPE_CHECKOUT_ENABLED=true
```

### Relevant files

| File | Purpose |
|---|---|
| `supabase/functions/create-checkout-session-creature-pack/index.ts` | Checkout session |
| `src/services/creaturePackPurchases.ts` | Frontend helper |
| `stripe-webhook` → `applyCreaturePackCredit()` | Fulfillment |
| `.env.example` line 56–60 | Env var templates |

### Notes

- Odds/refund/purchase-policy review must happen before flag flip (per comment in `.env.example`)
- Pack always gives 5 creatures; guaranteed ≥2 the player doesn't already own
- See `supabase/functions/stripe-webhook/index.ts` → `CREATURE_PACK_SLOT_WEIGHTS` for tier probabilities

---

## 2 · Egg Packs — 3 SKUs

New as of PR #2705. Everything is wired except the Stripe prices.

### SKUs and pricing

| SKU | Label | Eggs | Price | Tier contents |
|---|---|:---:|---|---|
| `egg_pack_small` | Clutch | 3 | 5 kr | 3 Common |
| `egg_pack_medium` | Basket | 15 | 25 kr | 12 Common + 3 Rare |
| `egg_pack_large` | Crate | 25 | 250 kr | 19 Common + 6 Rare |

### What to do in Stripe

1. Create 3 Products (one per pack)
2. Create one-time Prices in NOK at the amounts above
3. Copy the three `price_xxx` IDs

### What to do in Supabase

```bash
supabase secrets set \
  STRIPE_PRICE_EGG_PACK_SMALL=price_xxx \
  STRIPE_PRICE_EGG_PACK_MEDIUM=price_xxx \
  STRIPE_PRICE_EGG_PACK_LARGE=price_xxx

supabase functions deploy create-checkout-session-egg-pack
```

### What to do in .env.example

Add these three lines (they are missing — add them alongside the creature pack block):

```
STRIPE_PRICE_EGG_PACK_SMALL=""
STRIPE_PRICE_EGG_PACK_MEDIUM=""
STRIPE_PRICE_EGG_PACK_LARGE=""
```

### Wire up the UI

Drop the components into your shop / hatchery screen:

```tsx
import { EggPackShop } from '@/features/gamification/level-worlds/components/EggPackShop';
import { EggInventoryColumn } from '@/features/gamification/level-worlds/components/EggInventoryColumn';

// Shop screen
<EggPackShop />

// Left-side inventory panel (pass unopened eggs from island run state)
<EggInventoryColumn
  inventory={gameState.eggRewardInventory}
  onOpenEgg={(id) => openEggRewardInventoryEntry({ eggRewardId: id, ... })}
/>
```

### Relevant files

| File | Purpose |
|---|---|
| `supabase/functions/create-checkout-session-egg-pack/index.ts` | Checkout (all 3 SKUs) |
| `src/services/eggPackPurchases.ts` | Frontend helpers + pack definitions |
| `src/features/…/components/EggPackShop.tsx` + `.css` | Shop UI |
| `src/features/…/components/EggInventoryColumn.tsx` + `.css` | Inventory column |
| `stripe-webhook` → `applyEggPackCredit()` | Fulfillment → `egg_reward_inventory` |
| `islandRunGameStateStore.ts` lines 38–41 | Types extended for `egg_pack` source |

---

## 3 · Minigame Tickets — 5 SKUs

Code, edge function, and webhook are all complete. Only Stripe prices are missing.

### SKUs and what they're for

| SKU | Event | What it buys |
|---|---|---|
| `minigame_tickets_10` | Generic (event picked at checkout) | 10 tickets for a specific timed event |
| `feeding_frenzy_tickets_10` | Feeding Frenzy | 10 tickets locked to that event |
| `lucky_spin_tickets_10` | Lucky Spin | 10 tickets locked to that event |
| `space_excavator_tickets_10` | Space Excavator | 10 tickets locked to that event |
| `companion_feast_tickets_10` | Companion Feast | 10 tickets locked to that event |

### What to do in Stripe

Create one Product + Price per SKU (10 tickets each, decide on a price per SKU).
Suggested: 5–10 kr per pack of 10 tickets.

### What to do in Supabase

```bash
supabase secrets set \
  STRIPE_PRICE_MINIGAME_TICKETS_10=price_xxx \
  STRIPE_PRICE_FEEDING_FRENZY_TICKETS_10=price_xxx \
  STRIPE_PRICE_LUCKY_SPIN_TICKETS_10=price_xxx \
  STRIPE_PRICE_SPACE_EXCAVATOR_TICKETS_10=price_xxx \
  STRIPE_PRICE_COMPANION_FEAST_TICKETS_10=price_xxx

supabase functions deploy create-checkout-session-minigame-ticket
```

### Relevant files

| File | Purpose |
|---|---|
| `supabase/functions/create-checkout-session-minigame-ticket/index.ts` | Checkout |
| `src/services/minigameTicketStore.ts` | Frontend helper |
| `stripe-webhook` → `applyMinigameTicketCredit()` | Fulfillment |
| `.env.example` lines 17–23 | Env var templates (already present, just blank) |

---

## 4 · Creature Themes — 10 SKUs

Full design spec lives in `docs/product/creature-theme-stripe-implementation-plan.md`.

### SKUs and suggested pricing

| SKU | Theme name | Base price | Paired / Perfect Companion price |
|---|---|---:|---:|
| `sproutling-grove` | Sproutling Grove | $2.49 | $1.99 |
| `sproutling-grove` paired variant | — | — | — |
| `ember-glow` | Ember Glow | $2.49 | $1.99 |
| `ember-glow` paired variant | — | — | — |
| `aurora-sky` | Aurora Sky | $4.99 | $3.99 |
| `aurora-sky` paired variant | — | — | — |
| `nebula-drift` | Nebula Drift | $4.99 | $3.99 |
| `nebula-drift` paired variant | — | — | — |
| `starhorn-celestial` | Starhorn Celestial | $9.99 | $7.99 |
| `starhorn-celestial` paired variant | — | — | — |

> Common creatures → $2.49 / $1.99 paired  
> Rare creatures → $4.99 / $3.99 paired  
> Mythic creatures → $9.99 / $7.99 paired  
> See the plan doc for full rationale.

### What to do in Stripe

Create 10 Products + Prices (5 themes × 2 variants each).

### What to do in Supabase

```bash
supabase secrets set \
  STRIPE_PRICE_THEME_SPROUTLING_GROVE=price_xxx \
  STRIPE_PRICE_THEME_SPROUTLING_GROVE_PAIRED=price_xxx \
  STRIPE_PRICE_THEME_EMBER_GLOW=price_xxx \
  STRIPE_PRICE_THEME_EMBER_GLOW_PAIRED=price_xxx \
  STRIPE_PRICE_THEME_AURORA_SKY=price_xxx \
  STRIPE_PRICE_THEME_AURORA_SKY_PAIRED=price_xxx \
  STRIPE_PRICE_THEME_NEBULA_DRIFT=price_xxx \
  STRIPE_PRICE_THEME_NEBULA_DRIFT_PAIRED=price_xxx \
  STRIPE_PRICE_THEME_STARHORN_CELESTIAL=price_xxx \
  STRIPE_PRICE_THEME_STARHORN_CELESTIAL_PAIRED=price_xxx

supabase functions deploy create-checkout-session-theme
```

### Unlock gate

Themes are only purchasable after the player owns the creature AND has upgraded it
to Form 3. The purchase button surfaces in the Creature Sanctuary screen.
Do NOT expose the buy button before that gate is implemented in the UI.

### Relevant files

| File | Purpose |
|---|---|
| `supabase/functions/create-checkout-session-theme/index.ts` | Checkout |
| `src/services/themePurchases.ts` | Frontend helper |
| `stripe-webhook` → `applyThemeEntitlement()` | Fulfillment → `user_cosmetic_entitlements` |
| `.env.example` lines 43–54 | Env var templates (present, just blank) |
| `docs/product/creature-theme-stripe-implementation-plan.md` | Full design spec |

---

## 5 · Card Packs — NOT STARTED

Referenced in `docs/investigations/creature-pack-purchasing-stripe-market-investigation.md`
as a future product but nothing exists in the codebase yet.

When the time comes, model it on the Creature Pack pattern:
- New edge function `create-checkout-session-card-pack`
- New frontend service `src/services/cardPackPurchases.ts`
- New `applyCardPackCredit()` in the webhook
- New SKU type + env var `STRIPE_PRICE_CARD_PACK_*`

---

## Shared Stripe secrets (already set — for reference)

These must be present in Supabase secrets for **all** edge functions to work.

```
STRIPE_SECRET_KEY             — your Stripe secret key (sk_live_xxx or sk_test_xxx)
STRIPE_WEBHOOK_SECRET         — from Stripe → Developers → Webhooks endpoint
STRIPE_CHECKOUT_SUCCESS_URL   — e.g. https://lifegoalapp.com/purchase-success
STRIPE_CHECKOUT_CANCEL_URL    — e.g. https://lifegoalapp.com/shop
STRIPE_PORTAL_RETURN_URL      — e.g. https://lifegoalapp.com/settings/billing
```

---

## Webhook events to register in Stripe

Make sure your Stripe webhook endpoint is listening for these event types:

```
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
```

Endpoint: `https://<your-project>.supabase.co/functions/v1/stripe-webhook`
