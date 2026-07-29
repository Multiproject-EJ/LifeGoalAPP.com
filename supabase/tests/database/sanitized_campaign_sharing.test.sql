begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

select has_function(
  'public',
  'get_public_shared_campaign',
  array['text'],
  'sanitized public campaign reader exists'
);
select has_function(
  'public',
  'get_public_shared_campaign_live_events',
  array['text', 'integer'],
  'sanitized public campaign event reader exists'
);

select ok(
  (select prosecdef from pg_proc where oid = 'public.get_public_shared_campaign(text)'::regprocedure),
  'campaign reader intentionally crosses owner RLS as SECURITY DEFINER'
);
select ok(
  (select prosecdef from pg_proc where oid = 'public.get_public_shared_campaign_live_events(text,integer)'::regprocedure),
  'campaign event reader intentionally crosses owner RLS as SECURITY DEFINER'
);
select is(
  (select array_to_string(proconfig, ',') from pg_proc where oid = 'public.get_public_shared_campaign(text)'::regprocedure),
  'search_path=""',
  'campaign reader pins an empty search path'
);
select is(
  (select array_to_string(proconfig, ',') from pg_proc where oid = 'public.get_public_shared_campaign_live_events(text,integer)'::regprocedure),
  'search_path=""',
  'campaign event reader pins an empty search path'
);

select ok(
  has_function_privilege('anon', 'public.get_public_shared_campaign(text)', 'EXECUTE'),
  'anonymous share-link visitors can execute the sanitized campaign reader'
);
select ok(
  has_function_privilege('authenticated', 'public.get_public_shared_campaign(text)', 'EXECUTE'),
  'authenticated visitors can execute the sanitized campaign reader'
);
select ok(
  has_function_privilege('service_role', 'public.get_public_shared_campaign(text)', 'EXECUTE'),
  'trusted servers can execute the sanitized campaign reader'
);
select ok(
  has_function_privilege('anon', 'public.get_public_shared_campaign_live_events(text,integer)', 'EXECUTE'),
  'anonymous share-link visitors can execute the sanitized event reader'
);
select ok(
  has_function_privilege('authenticated', 'public.get_public_shared_campaign_live_events(text,integer)', 'EXECUTE'),
  'authenticated visitors can execute the sanitized event reader'
);
select ok(
  has_function_privilege('service_role', 'public.get_public_shared_campaign_live_events(text,integer)', 'EXECUTE'),
  'trusted servers can execute the sanitized event reader'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  '33333333-3333-4333-8333-333333333333',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'campaign-share-owner@example.test', '',
  now(), '{}'::jsonb, '{}'::jsonb, now(), now()
);

insert into public.campaigns (
  id,
  owner_id,
  title,
  description,
  campaign_type,
  status,
  visibility,
  starts_on,
  ends_on,
  campaign_data,
  live_state,
  share_slug,
  profile_share_enabled,
  profile_snapshot,
  published_at,
  life_wheel_category
) values
  (
    '44444444-4444-4444-8444-444444444444',
    '33333333-3333-4333-8333-333333333333',
    'Public test campaign',
    'A deliberately shareable description.',
    'custom',
    'active',
    'unlisted',
    date '2026-07-29',
    date '2026-08-29',
    '{"internal_plan":"must never leave the database"}'::jsonb,
    '{"private_progress":99}'::jsonb,
    'safe-share-test',
    true,
    '{"display_name":"must not be returned without an allowlist"}'::jsonb,
    now(),
    'growth'
  ),
  (
    '55555555-5555-4555-8555-555555555555',
    '33333333-3333-4333-8333-333333333333',
    'Draft test campaign',
    null,
    'custom',
    'draft',
    'unlisted',
    null,
    null,
    '{}'::jsonb,
    '{}'::jsonb,
    'draft-share-test',
    false,
    '{}'::jsonb,
    null,
    null
  );

insert into public.campaign_live_events (
  id,
  campaign_id,
  user_id,
  event_type,
  event_data,
  created_at
)
select
  gen_random_uuid(),
  '44444444-4444-4444-8444-444444444444',
  '33333333-3333-4333-8333-333333333333',
  case
    when generated_number = 1 then 'habit_completed'
    when generated_number = 2 then 'Private free-form activity text'
    else 'activity_' || generated_number::text
  end,
  jsonb_build_object('private_detail', generated_number),
  timestamptz '2026-07-29 18:00:00+00' - make_interval(secs => generated_number)
from generate_series(1, 101) as generated(generated_number);

set local role anon;

select is(
  (select count(*) from public.get_public_shared_campaign('safe-share-test')),
  1::bigint,
  'an anonymous visitor can resolve an active unlisted campaign by its secret slug'
);
select is(
  (select title from public.get_public_shared_campaign('safe-share-test')),
  'Public test campaign',
  'the public campaign title is returned'
);
select is(
  (select count(*) from public.get_public_shared_campaign('draft-share-test')),
  0::bigint,
  'draft campaigns are never shared'
);
select is(
  (select count(*) from public.get_public_shared_campaign('')),
  0::bigint,
  'blank share slugs never resolve a campaign'
);
select ok(
  not exists (
    select 1
    from public.get_public_shared_campaign('safe-share-test') as shared_campaign
    cross join lateral jsonb_object_keys(to_jsonb(shared_campaign)) as public_keys(public_key)
    where public_key in (
      'id',
      'owner_id',
      'goal_id',
      'campaign_data',
      'live_state',
      'share_slug',
      'profile_share_enabled',
      'profile_snapshot',
      'archived_at',
      'created_at',
      'updated_at'
    )
  ),
  'the public campaign result contains no internal or owner fields'
);
select ok(
  (
    select to_jsonb(shared_campaign) ?& array[
      'title',
      'description',
      'campaign_type',
      'status',
      'visibility',
      'starts_on',
      'ends_on',
      'life_wheel_category',
      'published_at'
    ]
    from public.get_public_shared_campaign('safe-share-test') as shared_campaign
  ),
  'the campaign result contains the complete explicit public field set'
);
select is(
  (select count(*) from public.get_public_shared_campaign_live_events('safe-share-test', 1000)),
  100::bigint,
  'the public event reader clamps oversized limits to 100 rows'
);
select is(
  (select count(*) from public.get_public_shared_campaign_live_events('safe-share-test', 0)),
  1::bigint,
  'the public event reader clamps non-positive limits to one row'
);
select is(
  (
    select event_type
    from public.get_public_shared_campaign_live_events('safe-share-test', 2)
    order by created_at asc
    limit 1
  ),
  'activity',
  'free-form event types are replaced by a generic public activity type'
);
select ok(
  not exists (
    select 1
    from public.get_public_shared_campaign_live_events('safe-share-test', 1) as shared_event
    cross join lateral jsonb_object_keys(to_jsonb(shared_event)) as public_keys(public_key)
    where public_key in ('id', 'campaign_id', 'user_id', 'event_data')
  ),
  'the public event result contains no IDs, user references, or raw event data'
);

select * from finish();

rollback;
