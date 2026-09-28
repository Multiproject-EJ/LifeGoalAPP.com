alter table public.island_run_runtime_state
  add column if not exists selected_player_piece_id text;

comment on column public.island_run_runtime_state.selected_player_piece_id is
  'Cosmetic-only Island Run board token selection. Null means the default starter piece. Ownership for earned/premium pieces lives in public.user_cosmetic_entitlements with cosmetic_type = ''player_piece''.';
