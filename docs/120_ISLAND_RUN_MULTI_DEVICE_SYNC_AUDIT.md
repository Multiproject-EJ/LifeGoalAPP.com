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
- `onboarding_display_name_loop_completed`, `story_prologue_seen`, `audio_enabled`
- `creature_collection`, `active_companion_id`
- plus first-run and daily-hearts markers

At runtime, the UI hydrates local state by:
1. reading localStorage first (fast fallback), then
2. fetching Supabase runtime row, and
3. replacing local copy with table data on success.

Writes persist both locally and remotely; as of M20A they now use optimistic concurrency (`runtime_version`) compare-and-swap semantics with retry/merge for safe collection/map fields.

## What is NOT synchronized across devices (still local-only or mirrored)
The following Island Run-related state is currently local-only and device-specific:

- Creature treat inventory (`island_run_creature_treat_inventory_<userId>`)
- Companion per-visit bonus dedupe flag (`island_run_companion_bonus_applied_<userId>`)
- Onboarding display-name loop local step storage
- Legacy mirrors for completed stops and per-island market keys
- Audio preference mirror key (`islandRunAudioEnabled`)

Some of these are now mirrors/fallbacks (with table-backed canonical state), but still represent dual-source behavior that can diverge until cleanup.

## Real-time behavior and conflict model
There is no realtime subscription that streams remote updates into already-open clients. Devices hydrate on mount, then keep local React state while writing patches.

Implication:
- Concurrent writes now reject stale versions, reducing blind last-writer-wins overwrites on overlapping fields.
- If a device goes offline or Supabase is unreachable, runtime state falls back to local cache and remote writes can be skipped under backoff; that device can drift until next successful hydrate.

## Direct answer
Is Island Run fully synced across iPad, iPhone, and browser to always keep same island and same state?

- **Partially yes** for core runtime progress/state in `island_run_runtime_state` (island number, token position, hearts/coins/spins/dice, timers, eggs ledger, completed stops, shard economy fields).
- **Not fully** for local-only state listed above.
- **Not strongly consistent in real-time** across multiple concurrently-open devices (no live subscriptions yet).

## Recommended improvements for full cross-device parity
1. Add realtime subscriptions (or polling on visibility/focus) to reconcile active multi-device sessions.
2. Reduce fallback-only behavior by queueing failed writes and replaying after connection recovery.
3. Move treat inventory + companion visit dedupe key into runtime table fields.
4. Remove legacy local mirrors behind a migration-complete feature flag.
