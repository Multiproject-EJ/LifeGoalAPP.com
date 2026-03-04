# DATA MODEL + SUPABASE — HABITGAME MAIN LOOP

Goal: Minimal durable schema that supports:
- 120 island definitions (mostly metadata)
- user island run state (timer, token pos, hearts, currency)
- egg inventory (active + dormant + home eggs)
- owned islands + home selection

## Principles
- Keep island definitions mostly static (can ship as JSON first)
- Persist only what must survive: run state, eggs, ownership
- Use snake_case
- Enable RLS on user-owned tables
- One migration per logical change

---

## Tables (v1)

### 1) island_definitions (optional in v1)
If you want server-driven schedule; otherwise ship `islands.json`.

```sql
create table if not exists island_definitions (
  island_number int primary key,
  is_special boolean not null default false, -- true for the 20 canonical special islands
  rarity text not null check (rarity in ('normal','special')),
  theme_id text not null,
  background_id int null,
  custom_background_url text null,
  duration_hours int not null default 48, -- 48h for normal islands; 72h for special islands
  created_at timestamptz not null default now()
);
```

### 2) user_island_state (required)

Stores current run state for each user.

```sql
create table if not exists user_island_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  island_number int not null,
  started_at timestamptz not null,
  expires_at timestamptz not null,
  token_tile_index int not null default 0, -- 0..16
  hearts int not null default 30,         -- app-wide persistent energy
  coins int not null default 0,           -- app-wide persistent currency
  diamonds int not null default 0,        -- app-wide premium currency (1 diamond = 1,000 coins)
  island_mini_game_currency int not null default 0, -- temporary; zeroed on island travel
  spin_tokens int not null default 0,
  stop_completion jsonb not null default '{}'::jsonb,
  last_tick_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

`stop_completion` example:

```json
{
  "stop_hatchery": true,
  "stop_minigame": false,
  "stop_market": true,
  "stop_utility": false,
  "stop_boss": false
}
```

### 3) user_owned_islands (required)

```sql
create table if not exists user_owned_islands (
  user_id uuid references auth.users(id) on delete cascade,
  island_number int not null,
  owned_at timestamptz not null default now(),
  primary key (user_id, island_number)
);
```

### 4) user_home_island (required)

```sql
create table if not exists user_home_island (
  user_id uuid primary key references auth.users(id) on delete cascade,
  island_number int not null,
  set_at timestamptz not null default now()
);
```

### 5) user_eggs (required)

Tracks active eggs, dormant eggs, home eggs.

```sql
create table if not exists user_eggs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  location text not null check (location in ('island','home','dormant')),
  island_number int null, -- null for home eggs
  egg_tier text not null check (egg_tier in ('common','rare','mythic')),
  stage int not null check (stage between 1 and 4),
  set_at timestamptz not null default now(),
  hatch_at timestamptz not null,
  opened_at timestamptz null,
  meta jsonb not null default '{}'::jsonb
);
```

`meta` may store:
- creature_id
- reward_roll_seed
- cosmetics flags

---

## RLS Policies (required)

Enable RLS:

```sql
alter table user_island_state enable row level security;
alter table user_owned_islands enable row level security;
alter table user_home_island enable row level security;
alter table user_eggs enable row level security;
```

Policies (pattern):

```sql
create policy "read_own_island_state" on user_island_state
for select using (auth.uid() = user_id);

create policy "upsert_own_island_state" on user_island_state
for insert with check (auth.uid() = user_id);

create policy "update_own_island_state" on user_island_state
for update using (auth.uid() = user_id);
```

Repeat similarly for other tables.

---

## Migration file naming

`supabase/migrations/YYYYMMDDHHMM__main_loop_v1.sql`

---

## island_run_runtime_state columns (as of migration 0173)

| Column | Type | Default | Description |
|---|---|---|---|
| `user_id` | uuid | — | PK, references auth.users |
| `first_run_claimed` | boolean | false | Whether the first-run bonus has been claimed |
| `daily_hearts_claimed_day_key` | text | null | Day key for the last daily hearts claim |
| `current_island_number` | int | 1 | Current island the player is on |
| `boss_trial_resolved_island_number` | int | null | Island where boss trial was resolved |
| `active_egg_tier` | text | null | Global active egg tier (legacy; kept for backward compat) |
| `active_egg_set_at_ms` | bigint | null | Global active egg set timestamp ms |
| `active_egg_hatch_duration_ms` | bigint | null | Global active egg hatch duration ms |
| `active_egg_is_dormant` | boolean | false | Whether the global active egg is dormant |
| `per_island_eggs` | jsonb | `'{}'` | Per-island egg ledger. Key = island number as text. Value = `{tier, set_at_ms, hatch_at_ms, status: "incubating"\|"ready"\|"collected"\|"sold"}`. One entry per island; never overwritten once status is collected/sold. |
| `island_shards` | int | 0 | Lifetime cumulative shard count for the Collectible Progress Bar |
| `shard_tier_index` | int | 0 | Current collectible era tier index (advances on player claim) |
| `shard_claim_count` | int | 0 | Total number of shard milestone claims |
| `shields` | int | 0 | Body Habit Shield wallet currency balance (earned from Body habit completions) |
| `shards` | int | 0 | Persistent Shards wallet currency balance (accumulates across islands; earn paths wired in future slices) |
| `updated_at` | timestamptz | now() | Last updated timestamp |

---

## v1 vs v2

v1:
- island definitions can be JSON in repo; must include `is_special` flag (true for the 20 canonical special islands: 5, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90, 96, 102, 108, 114, 120) and set `duration_hours` to 48 (normal) or 72 (special)
- only user_* tables in Supabase

v2:
- server-driven island schedule
- special island content overrides (see canonical list in `docs/07_MAIN_GAME_PROGRESS.md`)
