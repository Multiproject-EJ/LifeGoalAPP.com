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
- plus first-run and daily-hearts markers

At runtime, the UI hydrates local state by:
1. reading localStorage first (fast fallback), then
2. fetching Supabase runtime row, and
3. replacing local copy with table data on success.

Writes persist both locally and remotely via upsert.

## What is NOT synchronized across devices (localStorage-only)
The following Island Run-related state is currently local-only and device-specific:

- Diamonds wallet (`island_run_diamonds_<userId>`)
- Per-island shop owned bundles (`island_run_shop_owned_<userId>_island_<n>`)
- Onboarding display-name loop local step storage
- Story-seen flags
- Creature collection / active companion / companion per-visit bonus flags
- Audio preference toggle (`islandRunAudioEnabled`)

These do not round-trip through `island_run_runtime_state`.

## Real-time behavior and conflict model
There is no realtime subscription that streams remote updates into already-open clients. Devices hydrate on mount, then keep local React state while writing patches/upserts.

Implication:
- If multiple devices are active simultaneously, each can write and whichever write lands last may overwrite overlapping fields.
- If a device goes offline or Supabase is unreachable, runtime state falls back to local cache and remote writes can be skipped under backoff; that device can drift until next successful hydrate.

## Direct answer
Is Island Run fully synced across iPad, iPhone, and browser to always keep same island and same state?

- **Partially yes** for core runtime progress/state in `island_run_runtime_state` (island number, token position, hearts/coins/spins/dice, timers, eggs ledger, completed stops, shard economy fields).
- **Not fully** for local-only state listed above.
- **Not strongly consistent in real-time** across multiple concurrently-open devices (no live subscriptions; last-writer-wins style upserts on shared row).

## Recommended improvements for full cross-device parity
1. Move diamonds + market owned bundles + creature collection/active companion into Supabase-backed tables/columns.
2. Add `updated_at` optimistic concurrency checks (or version column) to avoid stale client overwrites.
3. Add realtime subscriptions (or polling on visibility/focus) to reconcile active multi-device sessions.
4. Reduce fallback-only behavior by queueing failed writes and replaying after connection recovery.
