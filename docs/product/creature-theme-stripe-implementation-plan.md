# Creature Theme + Special Theme + Stripe Implementation Plan

Status: **Product/engineering plan**
Date: **2026-06-01**
Scope: app themes, creature theme purchases, special gift themes, Stripe checkout fulfillment, and unlock/apply UX.

## 1. Decision update

Creature themes should cost **real money through Stripe checkout links**, not Egg Shards.

This updates the prior economy assumption:

- **Default themes** remain free.
- **Island 120 completion theme** is a free achievement gift.
- **Birthday present theme** is a free personal gift after birthday-present opt-in.
- **Creature themes** are paid premium cosmetics purchased through Stripe.
- **Paired / Perfect Companion bonus** should be a special modal and a discounted Stripe offer, not a shard discount.

## 2. Recommended first pricing

Use simple one-time purchase tiers based on creature rarity.

| Creature theme tier | Base Stripe price | Paired / Perfect Companion offer | Notes |
|---|---:|---:|---|
| Common creature theme | **$2.49** | **$1.99** | Entry-level cosmetic purchase. |
| Rare creature theme | **$4.99** | **$3.99** | Main premium theme tier. |
| Mythic creature theme | **$9.99** | **$7.99** | High-prestige cosmetic. |

The paired price is intentionally rounded to familiar store pricing. It is approximately 20% off while staying user-friendly.

## 3. Product rules

### 3.1 Theme ownership types

| Theme type | Price | Unlock / ownership rule | Where purchased or claimed | Where applied |
|---|---:|---|---|---|
| Default theme | Free | Included by default | Automatic | Settings → Appearance |
| Island 120 theme | Free | Complete Island 120 | Island completion reward flow | Settings → Appearance |
| Birthday theme | Free | Opt into birthday presents and claim first birthday gift | Birthday/Profile gift flow | Settings → Appearance |
| Creature theme | Paid | Own the creature, then purchase via Stripe | Creature Sanctuary | Settings → Appearance |
| Paired creature theme offer | Paid discounted | Creature is a Perfect/paired companion and eligible for purchase | Special paired creature modal or Sanctuary | Settings → Appearance |
| General non-creature premium theme | Paid | Purchase via Stripe or Player Shop | Player Shop | Settings → Appearance |

### 3.2 Creature theme purchase eligibility

A player should not be able to buy a creature theme until the matching creature exists in their Sanctuary collection.

V1 rule:

```ts
creatureThemeEligible = ownsCreature(creatureId)
```

Future rule options:

```ts
creatureThemeEligible = ownsCreature(creatureId) && bondLevel >= requiredBondLevel
```

### 3.3 Paired / Perfect Companion offer

Add a modal called **Perfect Pair Theme Offer**.

Trigger it when:

1. A player first sets or discovers a Perfect Companion that has a paid theme.
2. A player hatches a creature that is one of their Perfect Companions.
3. A player opens that creature detail card in the Sanctuary and has not yet bought the theme.
4. A future bond gate is reached for that creature's theme.

Recommended modal copy structure:

```text
🌱 Sproutling Grove is calling

Sproutling is one of your Perfect Companions. Its premium app theme is available with your Perfect Pair offer.

Regular price: $2.49
Perfect Pair price: $1.99

[Preview Theme] [Buy for $1.99] [Maybe later]
```

Important constraints:

- Do not auto-open Stripe checkout without user action.
- Do not make the paired theme free.
- Do not store discount eligibility only in localStorage.
- The server/Edge Function must validate the player is eligible for the paired price before returning a discounted checkout URL.

## 4. Recommended Stripe architecture

### 4.1 Use app-created Stripe Checkout Sessions, not raw public discounted Payment Links

The user-facing CTA can still be described as a **Stripe checkout link**, but the safest implementation is:

1. Client calls a Supabase Edge Function such as `create-checkout-session-theme`.
2. Edge Function validates the authenticated user and requested theme SKU.
3. Edge Function validates creature ownership and paired discount eligibility.
4. Edge Function creates a Stripe Checkout Session.
5. Client redirects to `session.url`.
6. Existing `stripe-webhook` grants the theme entitlement after `checkout.session.completed`.

Why not expose raw discounted Payment Links directly?

- Discounted links can be shared outside the intended paired-creature context.
- Eligibility checks are harder to enforce before payment.
- Server-created Checkout Sessions can include authoritative metadata for fulfillment.
- The repo already has Stripe checkout-session and webhook patterns for dice packs and minigame tickets.

### 4.2 Stripe price IDs

Create Stripe Prices for each SKU. Prefer explicit per-theme SKUs so reporting is clean.

Example env naming:

```env
STRIPE_PRICE_THEME_SPROUTLING_GROVE=price_...
STRIPE_PRICE_THEME_SPROUTLING_GROVE_PAIRED=price_...
STRIPE_PRICE_THEME_AURORA_SKY=price_...
STRIPE_PRICE_THEME_AURORA_SKY_PAIRED=price_...
STRIPE_PRICE_THEME_NEBULA_DRIFT=price_...
STRIPE_PRICE_THEME_NEBULA_DRIFT_PAIRED=price_...
STRIPE_PRICE_THEME_STARHORN_CELESTIAL=price_...
STRIPE_PRICE_THEME_STARHORN_CELESTIAL_PAIRED=price_...
```

For the first pass, one price per tier can work, but per-theme price IDs are better for analytics, refunds, grant reconciliation, and product naming on receipts.

### 4.3 Checkout metadata

Every theme checkout session should include fulfillment metadata.

```ts
metadata: {
  product_type: 'theme',
  theme_id: 'sproutling-grove',
  sku_id: 'theme_sproutling_grove',
  price_variant: 'base' | 'paired',
  creature_id: 'common-sproutling',
  user_id: user.id,
}
```

The webhook should grant entitlement only when:

- `session.mode === 'payment'`,
- `session.payment_status === 'paid'`,
- `session.metadata.product_type === 'theme'`,
- `theme_id` is recognized,
- `user_id` maps to the authenticated app user/customer record,
- the event has not already been fulfilled.

### 4.4 Stripe fulfillment table

Add a durable table for cosmetic ownership. Do not rely on localStorage for paid themes.

Suggested table:

```sql
create table public.user_cosmetic_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cosmetic_type text not null check (cosmetic_type in ('theme')),
  cosmetic_id text not null,
  source text not null check (source in (
    'default',
    'stripe_purchase',
    'island_milestone',
    'birthday_present',
    'admin_grant'
  )),
  source_ref text,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  granted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, cosmetic_type, cosmetic_id)
);
```

Optional second table for purchase audit:

```sql
create table public.theme_purchase_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  theme_id text not null,
  sku_id text not null,
  price_variant text not null,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  amount_total integer,
  currency text,
  status text not null,
  created_at timestamptz not null default now(),
  fulfilled_at timestamptz
);
```

## 5. Theme metadata model

Extend theme metadata with unlock and commerce rules.

```ts
type ThemeUnlockRule =
  | { type: 'free' }
  | { type: 'special_gift'; giftId: 'island_120_complete' | 'first_birthday_present' }
  | {
      type: 'creature_purchase';
      creatureId: string;
      tier: 'common' | 'rare' | 'mythic';
      skuId: string;
      basePriceUsd: string;
      pairedSkuId?: string;
      pairedPriceUsd?: string;
      pairedDiscountPercent?: 20;
      requiredBondLevel?: number;
    }
  | { type: 'player_shop_purchase'; skuId: string; priceUsd: string }
  | { type: 'admin_preview' };
```

Example creature theme:

```ts
{
  id: 'sproutling-grove',
  name: 'Sproutling Grove',
  category: 'light',
  unlockRule: {
    type: 'creature_purchase',
    creatureId: 'common-sproutling',
    tier: 'common',
    skuId: 'theme_sproutling_grove',
    basePriceUsd: '$2.49',
    pairedSkuId: 'theme_sproutling_grove_paired',
    pairedPriceUsd: '$1.99',
    pairedDiscountPercent: 20,
  },
}
```

Example special gift themes:

```ts
{
  id: 'dreamt-horizon',
  name: 'Dreamt Horizon',
  category: 'dark',
  unlockRule: { type: 'special_gift', giftId: 'island_120_complete' },
}
```

```ts
{
  id: 'birthday-wish',
  name: 'Birthday Wish',
  category: 'light',
  unlockRule: { type: 'special_gift', giftId: 'first_birthday_present' },
}
```

## 6. Theme access resolver

Build a resolver that returns a full state, not just `true` or `false`.

```ts
type ThemeAccessStatus =
  | 'owned'
  | 'free'
  | 'locked'
  | 'available_for_purchase'
  | 'available_for_paired_purchase'
  | 'admin_preview';

interface ThemeAccessResult {
  status: ThemeAccessStatus;
  selectable: boolean;
  checkoutSkuId?: string;
  displayPrice?: string;
  compareAtPrice?: string;
  discountLabel?: string;
  lockedReason?: string;
  ctaLabel?: string;
  ctaTarget?:
    | 'settings'
    | 'creature_sanctuary'
    | 'birthday_preferences'
    | 'island_run'
    | 'player_shop';
}
```

Resolver responsibilities:

- Free default themes are selectable.
- Paid creature themes are selectable only after entitlement exists.
- Owned creature but unpaid theme returns `available_for_purchase`.
- Paired eligible creature returns `available_for_paired_purchase`.
- Creature not owned returns `locked` with “Hatch [Creature] to unlock purchase.”
- Island 120 and birthday themes return `owned` only after entitlement exists.
- Admin/creator can preview all themes but should not automatically receive paid entitlements.

## 7. UX placement

### 7.1 Settings → Appearance / Theme Library

Purpose: apply and preview all app themes.

Theme cards should show:

- Active
- Owned
- Included by default
- Free gift locked/claim state
- Available for purchase
- Perfect Pair offer
- Hatch creature to unlock purchase
- Buy in Sanctuary CTA
- Set birthday gift CTA
- Continue Island Run CTA

### 7.2 Creature Sanctuary

Purpose: discover and purchase creature themes.

Add theme purchase cards in creature detail and/or Sanctuary Inventory & Shop:

- Creature not owned: “Hatch Sproutling to unlock this premium theme offer.”
- Creature owned: “Buy Sproutling Grove for $2.49.”
- Paired creature: “Perfect Pair offer: $1.99.”
- Owned theme: “Owned — Apply in Settings.”

### 7.3 Player Shop

Purpose: non-creature paid themes and general cosmetics.

Do not make Player Shop the primary home for creature themes. Creature themes belong in Creature Sanctuary because they are emotionally tied to the creature.

### 7.4 Garage

Do not route app themes to Garage.

Garage remains scoped to the spaceship: ship upgrades, dice regeneration, archetype rooms, mini-event modules, and ship-only cosmetics.

## 8. Birthday gift and AI coach consent

The birthday theme is free, but birthday data must be opt-in and privacy-forward.

Recommended preference shape:

```ts
interface BirthdayGiftPreferences {
  enabled: boolean;
  month: number | null;
  day: number | null;
  birthYear?: number | null;
  ageBand?:
    | 'under_18'
    | '18_24'
    | '25_34'
    | '35_44'
    | '45_54'
    | '55_64'
    | '65_plus'
    | null;
  allowLifeStageForAiCoach: boolean;
  firstBirthdayGiftClaimedAt: string | null;
}
```

Consent rules:

- Month/day is enough for birthday gifts.
- Birth year or age band is optional.
- AI coach life-stage personalization must be a separate explicit consent toggle.
- The user should be able to disable birthday gifts and remove life-stage data later.

## 9. Implementation phases

### Phase 1 — Theme metadata and resolver foundation

- Add `ThemeUnlockRule`.
- Add `ThemeAccessResult` resolver.
- Keep current behavior unchanged for existing themes.
- Add display labels and CTA targets.
- Add unit tests for free, locked, admin preview, and paid-but-not-owned states.

### Phase 2 — Special gift theme metadata

- Add `dreamt-horizon` for Island 120 completion.
- Add `birthday-wish` for first birthday present.
- Add CSS variable theme blocks.
- Show them as locked/free gift themes in Settings.
- No grant flow yet.

### Phase 3 — Cosmetic entitlement table and client read service

- Add `user_cosmetic_entitlements` migration.
- Add read service/hook for owned theme IDs.
- Update access resolver to include durable entitlements.
- Preserve localStorage only for selected theme preference, not ownership.

### Phase 4 — Stripe theme checkout service

- Add `create-checkout-session-theme` Supabase Edge Function.
- Add theme SKU/price config.
- Validate auth, SKU, creature ownership, paired eligibility, and duplicate ownership.
- Return Stripe Checkout Session URL.
- Add client service such as `createThemeCheckoutSession(themeId, variant)`.

### Phase 5 — Stripe webhook fulfillment

- Extend `stripe-webhook` for `product_type=theme`.
- Insert entitlement idempotently.
- Record purchase audit metadata.
- Handle duplicate webhook events safely.
- Add tests/fixtures for successful theme purchase and duplicate event replay.

### Phase 6 — Creature Sanctuary paid theme UI

- Add paid theme cards to creature detail and/or Sanctuary Inventory & Shop.
- Add “Buy Theme” CTA.
- Add insufficient eligibility messaging.
- Add post-purchase return state that refreshes entitlements.
- Add “Apply now” after entitlement is confirmed.

### Phase 7 — Perfect Pair Theme Offer modal

- Add viewport-anchored modal through the top-level modal/portal system.
- Lock background scroll while open.
- Trigger from paired creature eligibility events.
- Validate discounted checkout through the Edge Function.
- Add local dismissal state only for modal UX; do not store entitlement/discount truth in localStorage.

### Phase 8 — Island 120 free gift grant

- Grant `dreamt-horizon` through canonical Island Run action/service flow when Island 120 is completed.
- Do not grant from React UI directly.
- Make the grant idempotent.
- Add celebration copy: “Dreamt Horizon unlocked.”

### Phase 9 — Birthday gift flow

- Add birthday gift preference UI.
- Add optional AI coach life-stage consent.
- Add first birthday gift claim service.
- Grant `birthday-wish` idempotently through an account/profile service.
- Add Settings CTA from locked Birthday Wish card.

### Phase 10 — QA, analytics, and release hardening

- Add analytics events for theme view, preview, checkout started, checkout completed, entitlement granted, paired offer shown, paired offer purchased, and theme applied.
- Confirm refunds and chargebacks have an operational playbook.
- Add admin tooling to inspect and grant/revoke theme entitlements.
- Validate mobile modal behavior and scroll locking.

## 10. First launch theme set

| Theme | Type | Price / reward | Purchase or claim surface |
|---|---|---:|---|
| Bio Day | Default | Free | Automatic |
| Midnight Blue | Default | Free | Automatic |
| Dreamt Horizon | Island milestone | Free at Island 120 complete | Island Run celebration |
| Birthday Wish | Birthday gift | Free after opt-in/claim | Birthday/Profile gift flow |
| Sproutling Grove | Common creature theme | $2.49 / $1.99 paired | Creature Sanctuary |
| Ember Glow | Rare creature theme | $4.99 / $3.99 paired | Creature Sanctuary |
| Aurora Sky | Rare creature theme | $4.99 / $3.99 paired | Creature Sanctuary |
| Nebula Drift | Rare creature theme | $4.99 / $3.99 paired | Creature Sanctuary |
| Starhorn Celestial | Mythic creature theme | $9.99 / $7.99 paired | Creature Sanctuary |

## 11. Architecture guardrails

- Do not add gameplay writes directly inside React UI components.
- Do not call `persistIslandRunRuntimeStatePatch` from theme UI.
- Read creature ownership through the canonical Island Run state/store path.
- Grant paid and special themes through durable service/server paths.
- Keep localStorage limited to selected theme preferences.
- Preserve Settings as the place to apply themes.
- Preserve Creature Sanctuary as the place to buy creature themes.
- Preserve Garage as spaceship progression, not app theme management.

## 12. Open decisions before implementation

1. Confirm final USD pricing for Common/Rare/Mythic creature themes.
2. Confirm whether paired pricing uses separate Stripe prices or a Stripe coupon applied by the Edge Function.
3. Confirm whether each theme gets its own Stripe Product or whether products are grouped by tier.
4. Confirm refund behavior: revoke theme entitlement automatically or handle manually first.
5. Confirm whether paid themes are previewable before purchase.
6. Confirm exact visual names for `dreamt-horizon`, `birthday-wish`, and first creature themes.
7. Confirm where birthday preferences live in Account/Profile navigation.
