-- Theme cosmetic entitlements for free gift and Stripe-purchased app themes.

create table if not exists public.user_cosmetic_entitlements (
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

create index if not exists user_cosmetic_entitlements_user_type_idx
  on public.user_cosmetic_entitlements (user_id, cosmetic_type);

create index if not exists user_cosmetic_entitlements_stripe_session_idx
  on public.user_cosmetic_entitlements (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

alter table public.user_cosmetic_entitlements enable row level security;

drop policy if exists "Users can read their own cosmetic entitlements" on public.user_cosmetic_entitlements;
create policy "Users can read their own cosmetic entitlements"
  on public.user_cosmetic_entitlements
  for select
  using (auth.uid() = user_id);

comment on table public.user_cosmetic_entitlements is
  'Durable ownership records for cosmetic unlocks such as paid creature themes and free special gift themes.';
comment on column public.user_cosmetic_entitlements.cosmetic_id is
  'Theme id or future cosmetic id owned by the user.';
comment on column public.user_cosmetic_entitlements.source is
  'Authority that granted the entitlement: Stripe purchase, milestone, birthday gift, or admin grant.';
