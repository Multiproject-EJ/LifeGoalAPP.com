# Analytics Events (Competition Killer MVP)

> **Purpose**: Define the minimum event schema required to measure D1/D3/D7 retention and validate the Competition Killer MVP loop.
> 
> **Scope**: P5.3 Analytics & retention instrumentation.

---

## 1) Event Contract (Base)

Every event should emit the following base fields:

```
Event {
  event_name        // string
  user_id           // string (or anon_id if unauthenticated)
  session_id        // string
  timestamp         // ISO-8601
  platform          // web | pwa | ios | android | desktop
  app_version       // string
  timezone          // IANA TZ
}
```

> **Note**: Use the same event structure for both Supabase and any analytics vendor. If offline, queue and sync later.

---

## 2) MVP Events (Required)

### Onboarding + First Loop
- `onboarding_started`
- `first_habit_created`
- `first_reward_created`
- `first_reward_redeemed`

### Retention + Habit Flow
- `day2_return`
- `day3_return`
- `day4_return`
- `day5_return`
- `day6_return`
- `day7_return`
- `habit_completed`

### Miss + Recovery
- `miss_detected`
- `powerdown_completed`

### Weekly Ritual
- `weekly_ritual_completed`

---

## 3) Event Properties (Minimum)

Include these fields on specific events (in addition to the base event contract).

### `first_habit_created`
```
{
  habit_id
  life_area          // Health | Mind | Relationships | Work | Home | Growth
  schedule_type      // morning | afternoon | evening | none
}
```

### `first_reward_created`
```
{
  reward_id
  reward_category    // Rest | Fun | Growth | Treat | Social | Meta
  reward_type        // Instant | Session | Delayed | External
  currency_type      // Gold | Tokens | Keys | Energy
  cost_amount        // number
}
```

### `first_reward_redeemed`
```
{
  reward_id
  currency_type
  cost_amount
}
```

### `habit_completed`
```
{
  habit_id
  completion_source  // manual | reminder | offline_sync
  streak_day         // number | null
}
```

### `miss_detected`
```
{
  habit_id
  day_number         // 1-7 (if in first-week flow)
}
```

### `powerdown_completed`
```
{
  quest_id
  life_area
}
```

### `weekly_ritual_completed`
```
{
  week_start         // ISO-8601 date
}
```

---

## 4) Retention Computation (D1 / D3 / D7)

**Definition**: A return event is logged when a user opens the Today screen on the target day relative to `onboarding_started`.

- **D1**: `day2_return` within 24–48 hours after `onboarding_started`
- **D3**: `day4_return` within 72–96 hours after `onboarding_started`
- **D7**: `day8_return` (future) or `day7_return` within 168–192 hours after `onboarding_started`

> **MVP simplification**: Use `day2_return`, `day3_return`, ..., `day7_return` events to compute D1/D3/D7 with a 24h bucket based on the user’s local timezone.

---

## 5) Supabase Event Table (Suggested)

```
CREATE TABLE analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  user_id uuid,
  session_id text,
  timestamp timestamptz not null,
  platform text,
  app_version text,
  timezone text,
  properties jsonb default '{}'::jsonb
);
```

---

## 6) Done When (P5.3)

- MVP event list exists and is aligned with the Competition Killer plan.
- Event properties are defined for first-loop, habit, miss, and weekly ritual events.
- D1/D3/D7 retention can be computed from logs.

