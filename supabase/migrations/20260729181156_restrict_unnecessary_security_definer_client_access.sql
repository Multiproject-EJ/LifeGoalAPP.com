-- Reduce the client-callable SECURITY DEFINER surface identified by the
-- Supabase Security Advisor.
--
-- The one-argument contract evaluator is the authenticated client wrapper. It
-- derives the user id from auth.uid() and delegates to the two-argument worker,
-- so clients do not need direct access to that worker.
--
-- The campaign share RPCs are not used by the current application and return
-- whole table rows, including internal identifiers and JSON state. Keep them
-- available to trusted server code only until a deliberately sanitised public
-- projection is introduced.

begin;

alter function public.evaluate_due_commitment_contracts(uuid, integer)
  security invoker;
revoke execute on function public.evaluate_due_commitment_contracts(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.evaluate_due_commitment_contracts(uuid, integer)
  to service_role;

alter function public.get_shared_campaign(text)
  security invoker;
revoke execute on function public.get_shared_campaign(text)
  from public, anon, authenticated;
grant execute on function public.get_shared_campaign(text)
  to service_role;

alter function public.get_shared_campaign_live_events(text, integer)
  security invoker;
revoke execute on function public.get_shared_campaign_live_events(text, integer)
  from public, anon, authenticated;
grant execute on function public.get_shared_campaign_live_events(text, integer)
  to service_role;

comment on function public.evaluate_due_commitment_contracts(uuid, integer) is
  'Internal contract evaluator. Authenticated clients must call the auth.uid()-scoped one-argument wrapper.';
comment on function public.get_shared_campaign(text) is
  'Server-only pending a sanitised public campaign-share projection.';
comment on function public.get_shared_campaign_live_events(text, integer) is
  'Server-only pending a sanitised public campaign-event projection.';

commit;
