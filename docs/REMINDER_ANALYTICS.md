# Reminder Analytics

This guide documents the analytics layer for tracking reminder effectiveness in LifeGoal App.

## Overview

The reminder analytics feature provides insights into:

- **Sends**: Number of reminders delivered to users
- **Actions**: User interactions with reminders (done, snooze, dismiss)
- **Effectiveness rates**: Percentage of actions taken and habits completed
- **Opt-in adoption**: How many habits have reminder preferences enabled

## Data Sources

### Tables

All analytics data is derived from existing tables:

| Table | Description |
|-------|-------------|
| `reminder_action_logs` | Logs of user actions on notifications |
| `habit_reminder_state` | Tracks last reminder sent per habit |
| `reminder_delivery_failures` | Dead-letter queue for failed deliveries |
| `habit_reminder_prefs` | Per-habit reminder preferences |
| `habits_v2` | Core habits table |

### Views

The following SQL views aggregate data for efficient querying:

| View | Description |
|------|-------------|
| `reminder_actions_daily` | Daily aggregation of actions by user, habit, and action type |
| `reminder_sends_daily` | Daily reminder sends approximated from `last_reminder_sent_at` |
| `reminder_failures_daily` | Daily delivery failures by user |
| `reminder_metrics_aggregate_30d` | Materialized view with pre-computed 30-day metrics |

## Privacy

- **Per-user only**: All queries are scoped to the current authenticated user via RLS and SECURITY DEFINER functions
- **No PII exposed**: Only aggregate counts and percentages are returned
- **User ID protected**: User IDs are used internally but not exposed in API responses

## Metrics Definitions

| Metric | Formula | Description |
|--------|---------|-------------|
| `sends` | count(distinct (user_id, habit_id, day)) | Number of unique reminder sends |
| `actions` | sum(done + snooze + dismiss) | Total user interactions |
| `actionRatePct` | (actions / sends) × 100 | Percentage of sends that received an action |
| `doneRatePct` | (done / actions) × 100 | Percentage of actions that were completions |
| `habitsWithPrefs` | count of habits with `habit_reminder_prefs` rows | Habits that have been configured |
| `habitsEnabledPct` | (enabled habits / habitsWithPrefs) × 100 | Percentage of configured habits with reminders enabled |

### Division by Zero Guards

All percentage calculations include guards:
- If `sends = 0`, `actionRatePct = 0`
- If `actions = 0`, `doneRatePct = 0`
- If `habitsWithPrefs = 0`, `habitsEnabledPct = 0`

## API Endpoints

### GET /analytics/summary

Returns aggregated metrics for the specified range.

**Query Parameters:**
- `range`: `7` or `30` (defaults to `30`)

**Response:**
```json
{
  "rangeDays": 30,
  "sends": 45,
  "actions": {
    "done": 32,
    "snooze": 8,
    "dismiss": 5
  },
  "actionRatePct": 100,
  "doneRatePct": 71.11,
  "habitsWithPrefs": 12,
  "habitsEnabledPct": 91.67
}
```

### GET /analytics/daily

Returns daily breakdown with zero-filled days.

**Query Parameters:**
- `range`: `7` or `30` (defaults to `30`)

**Response:**
```json
[
  {
    "day": "2024-01-01",
    "sends": 3,
    "done": 2,
    "snooze": 1,
    "dismiss": 0
  },
  {
    "day": "2024-01-02",
    "sends": 0,
    "done": 0,
    "snooze": 0,
    "dismiss": 0
  }
]
```

## Database Functions

### get_reminder_analytics_summary

```sql
SELECT * FROM get_reminder_analytics_summary(30);
```

Returns:
- `range_days`: The requested range
- `total_sends`: Total reminder sends
- `total_actions`: Total actions taken
- `done_count`, `snooze_count`, `dismiss_count`: Action breakdowns
- `action_rate_pct`: Actions / sends percentage
- `done_rate_pct`: Done / actions percentage
- `habits_with_prefs`: Number of habits with preferences
- `habits_enabled_pct`: Percentage of enabled habits

### get_reminder_analytics_daily

```sql
SELECT * FROM get_reminder_analytics_daily(30);
```

Returns a row per day with:
- `day`: Date
- `sends`: Number of sends that day
- `done`, `snooze`, `dismiss`: Action counts for that day

## Materialized View Refresh

The `reminder_metrics_aggregate_30d` materialized view provides pre-computed metrics for fast dashboard loading.

### Manual Refresh

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY reminder_metrics_aggregate_30d;
```

### Scheduled Refresh

For production, schedule a nightly refresh using pg_cron or an external scheduler:

```sql
-- Example pg_cron job (if available)
SELECT cron.schedule('refresh-reminder-metrics', '0 3 * * *', 
  'REFRESH MATERIALIZED VIEW CONCURRENTLY public.reminder_metrics_aggregate_30d');
```

Alternatively, call from an external scheduler or Edge Function on a daily basis.

## Frontend Integration

### Dashboard Component

The `ReminderAnalyticsDashboard` component is located at:
```
src/features/notifications/ReminderAnalyticsDashboard.tsx
```

Features:
- Range selector (7 or 30 days)
- KPI grid showing key metrics
- Stacked bar chart for daily actions
- Empty state handling for new users
- Demo mode support with simulated data

### Service Functions

```typescript
import { 
  fetchReminderAnalyticsSummary, 
  fetchReminderAnalyticsDaily 
} from '../../services/reminderAnalytics';

// Fetch 30-day summary
const { data: summary, error } = await fetchReminderAnalyticsSummary(30);

// Fetch daily breakdown
const { data: daily, error } = await fetchReminderAnalyticsDaily(30);
```

## Testing

### Testing the Dashboard

1. Navigate to My Account
2. Expand the "Reminder Analytics" section
3. Verify KPIs display correctly
4. Toggle between 7 and 30 day ranges
5. Check that the chart renders with proper colors

### Testing with Real Data

1. Ensure you have reminder data in the database
2. Check `reminder_action_logs` has entries
3. Verify `habit_reminder_state` has `last_reminder_sent_at` values
4. Call the API endpoints directly to validate responses

### Testing Empty State

1. Use a new user account with no reminder history
2. Verify the empty state message appears
3. Confirm no errors in console

## Related Documentation

- [REMINDER_ACTIONS_AND_PREFS.md](./REMINDER_ACTIONS_AND_PREFS.md) - Reminder actions and preferences
- [DAILY_REMINDER_SCHEDULING.md](./DAILY_REMINDER_SCHEDULING.md) - User preferences and scheduling
- [WEB_PUSH_REMINDERS.md](./WEB_PUSH_REMINDERS.md) - Web Push setup
