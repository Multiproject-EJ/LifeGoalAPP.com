# 120 Island Run Multi-Device Sync Audit

## Scope
This audit checks whether a player sees the same Island Run state across iPhone, iPad, and browser for the same account.

## What is synchronized across devices
The core Island Run runtime state is read from and written to Supabase table `island_run_runtime_state`:

- `current_island_number`, `cycle_index`
- `token_index`, `hearts`, `coins`, `spin_tokens`, `dice_pool`
- `island_started_at_ms`, `island_expires_at_ms`
- `per_island_eggs`, `completed_stops_by_island`
- `island_shards`, `shard_tier_index`, `shard_claim_count`, `shields`, `shards`
- `diamonds`, `market_owned_bundles_by_island`
- `creature_treat_inventory`, `companion_bonus_last_visit_key`
- `onboarding_display_name_loop_completed`, `story_prologue_seen`, `audio_enabled`
- `creature_collection`, `active_companion_id`
- plus first-run and daily-hearts markers

At runtime, the UI hydrates local state by:
1. reading localStorage first (fast fallback), then
2. fetching Supabase runtime row, and
3. replacing local copy with table data on success.

Writes persist both locally and remotely; as of M20A they now use optimistic concurrency (`runtime_version`) compare-and-swap semantics with retry/merge for safe collection/map fields.

## What is NOT synchronized across devices (still local-only or mirrored)
No remaining known Island Run runtime fields are intentionally local-only in this sync slice.

## Real-time behavior and conflict model
Island Run now includes live reconciliation for already-open clients:
- Supabase realtime subscription on `island_run_runtime_state` row changes for the active `user_id`.
- Focus/visibility + interval refresh reconciliation to catch missed updates and reconnect cases.

Implication:
- Concurrent writes reject stale versions (`runtime_version` CAS), reducing blind last-writer-wins overwrites on overlapping fields.
- Open multi-device sessions now converge automatically once update events are observed and reconciled.
- If a device goes offline or Supabase is unreachable, runtime state falls back to local cache and remote writes can be skipped under backoff; that device can drift until next successful hydrate.

## Direct answer
Is Island Run fully synced across iPad, iPhone, and browser to always keep same island and same state?

- **Yes for runtime state coverage in this slice**, including progression, economy, onboarding/story/audio toggles, market ownership, creature systems, and companion visit dedupe markers.
- **Convergent in real-time** across concurrently-open devices due to subscriptions + focus/poll reconciliation.

## Recommended improvements for continued hardening
1. Expand targeted race/reconnect/realtime convergence tests around version conflicts, replay, and convergence.
