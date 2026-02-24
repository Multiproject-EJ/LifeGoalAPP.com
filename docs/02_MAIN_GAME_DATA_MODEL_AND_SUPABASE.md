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
  rarity text not null check (rarity in ('normal','seasonal','rare')),
  theme_id text not null,
  background_id int null,
  custom_background_url text null,
  duration_hours int not null default 72,
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
  hearts int not null default 30,
  currency int not null default 0,
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

## v1 vs v2

v1:
- island definitions can be JSON in repo
- only user_* tables in Supabase

v2:
- server-driven island schedule
- seasonal overrides
