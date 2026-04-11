-- M23C: Deprecate legacy Island Run active-session RPC surface.
-- Action-commit flow no longer requires continuous active-session ownership.

revoke execute on function public.island_run_claim_active_session(text, boolean, text, jsonb, integer) from authenticated;
revoke execute on function public.island_run_heartbeat_session(text, integer) from authenticated;
revoke execute on function public.island_run_release_active_session(text) from authenticated;
revoke execute on function public.island_run_validate_session_owner(text) from authenticated;

comment on table public.island_run_active_sessions is
  'Deprecated: legacy lease table retained temporarily for rollback/observability while Island Run action-commit migration finalizes.';
