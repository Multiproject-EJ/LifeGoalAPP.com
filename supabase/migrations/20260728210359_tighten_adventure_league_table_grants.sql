revoke all on table public.adventure_league_entries from anon;
revoke all on table public.adventure_league_entries from authenticated;
grant select, insert, update, delete on table public.adventure_league_entries to authenticated;

revoke all on table public.arena_minigame_preferences from anon;
revoke all on table public.arena_minigame_preferences from authenticated;
grant select, insert, update, delete on table public.arena_minigame_preferences to authenticated;
