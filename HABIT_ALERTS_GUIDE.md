# Habit Alerts & Notifications Implementation Guide

## Overview

This guide documents the implementation of habit alerts and notifications for the LifeGoal App. The system allows users to configure alerts for their habits with flexible scheduling options (daily, specific days, custom times).

## Features Implemented

### 1. Database Schema
- **New Table**: `habit_alerts` - Stores alert configurations for habits
  - `id`: UUID primary key
  - `habit_id`: Foreign key to `habits` table
  - `alert_time`: Time of day for the alert (HH:MM:SS format)
  - `days_of_week`: Array of integers (0-6, where 0=Sunday) or NULL for daily
  - `enabled`: Boolean to enable/disable the alert
  - `created_at`, `updated_at`: Timestamps

- **Row Level Security (RLS)**: Full policies implemented to ensure users can only access alerts for their own habits

### 2. Service Layer

#### `habitAlerts.ts`
Core CRUD operations for habit alerts:
- `fetchHabitAlerts(habitId)` - Get all alerts for a habit
- `fetchUserHabitAlerts(userId)` - Get all alerts for a user
- `upsertHabitAlert(payload)` - Create or update an alert
- `deleteHabitAlert(id)` - Delete an alert
- `toggleHabitAlert(id, enabled)` - Enable/disable an alert
- `shouldAlertOnDay(alert, dayOfWeek)` - Check if alert should fire on a day
- `getAlertScheduleDescription(alert)` - Get human-readable schedule description

#### `habitAlertNotifications.ts`
Integration with PWA notification system:
- `getHabitAlertsForDate(habitId, date)` - Get alerts for a specific date
- `hasAlertsForToday(habitId)` - Check if habit has alerts today
- `getNextAlertTime(habitId)` - Get next scheduled alert time
- `getHabitAlertSummary(habitId, startDate, endDate)` - Get alert summary for date range
- `scheduleHabitNotifications(habitId)` - Placeholder for server-side scheduling
- `cancelHabitNotifications(habitId)` - Placeholder for cancellation

### 3. UI Components

#### `HabitAlertConfig.tsx`
Interactive modal component for configuring habit alerts:
- **Add/Edit Alerts**: Time picker and day selector
- **Frequency Options**: 
  - Daily (alerts every day)
  - Custom days (select specific days of the week)
- **Alert Management**: Enable/disable, delete alerts
- **Real-time Updates**: Changes immediately reflected in the UI

#### Integration with `DailyHabitTracker.tsx`
- Added "🔔 Alerts" button in habit detail panels
- Modal overlay for alert configuration
- Monthly grid view shows alert indicators:
  - Bell icon (🔔) displayed for days with alerts
  - Small dot indicator on cells with scheduled alerts
  - Tooltips enhanced to show alert status

### 4. Monthly View Enhancement

The monthly habits view now displays:
- **Visual Indicators**: Bell icons and dots on days with alerts
- **Smart Display**: Only shows indicators for enabled alerts on scheduled days
- **Tooltip Enhancement**: Hover shows if a day has alerts configured

## Usage Guide

### Configuring Alerts for a Habit

1. **Open Daily Habit Tracker**
2. **Expand a Habit**: Click on any habit in the list
3. **Click "🔔 Alerts"**: Opens the alert configuration modal
4. **Add an Alert**:
   - Click "+ Add Alert"
   - Select a time (e.g., 08:00 AM)
   - Choose frequency:
     - **Daily**: Alert every day
     - **Custom days**: Select specific days of the week
   - Click "Add Alert"

### Managing Alerts

- **Enable/Disable**: Toggle alerts on/off without deleting
- **Delete**: Remove alerts permanently
- **Multiple Alerts**: Add multiple alerts for the same habit

### Viewing Alert Indicators

In the monthly view:
- Days with alerts show a **bell emoji (🔔)**
- A **small blue dot** appears in the corner of cells with alerts
- **Completed days with alerts** show a green dot instead
- Hover over cells to see full alert information in the tooltip

## Database Setup

### Running the Migration

Execute the SQL migration in your Supabase SQL Editor:

```sql
-- Run this file: supabase/migrations/0112_habit_alerts.sql
```

Or run the bundled manual.sql which includes all migrations:

```sql
-- Run this file: sql/manual.sql (auto-generated from supabase/migrations/)
```

### Verify Installation

Check that the table was created:

```sql
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'habit_alerts';
```

Check RLS policies:

```sql
SELECT policyname, tablename 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'habit_alerts';
```

## Notification System Integration

### Current Implementation

The current implementation provides:
- ✅ Complete data model for scheduling alerts
- ✅ UI for configuring alerts
- ✅ Service layer for managing alerts
- ✅ Visual indicators in the monthly view

### Platform-Specific Code (TODO)

The actual push notification delivery requires platform-specific implementation:

#### Server-Side (Recommended Approach)

1. **Edge Function** (see `/supabase/functions/send-reminders` for reference):
   ```typescript
   // Edge function runs periodically (e.g., every minute via cron)
   // Query habit_alerts for alerts due now
   // Send push notifications to subscribed users
   ```

2. **Database Query**:
   ```sql
   -- Find alerts due in the next minute for enabled habits
   SELECT ha.*, h.name as habit_name, g.user_id
   FROM habit_alerts ha
   JOIN habits h ON h.id = ha.habit_id
   JOIN goals g ON g.id = h.goal_id
   WHERE ha.enabled = true
   AND ha.alert_time BETWEEN NOW()::time AND (NOW() + interval '1 minute')::time
   AND (ha.days_of_week IS NULL OR EXTRACT(DOW FROM NOW()) = ANY(ha.days_of_week))
   ```

3. **Send Notification**:
   ```typescript
   // Use Web Push API with stored subscription from notification_preferences
   await webpush.sendNotification(subscription, {
     title: `Time for: ${habit_name}`,
     body: 'Mark it complete in LifeGoal App',
     icon: '/icon.png',
     badge: '/badge.png',
     data: { habitId, action: 'open-habit' }
   });
   ```

#### Client-Side (Alternative)

For client-side notifications (limited to when app is open):
```typescript
if (Notification.permission === 'granted') {
  new Notification('Habit Reminder', {
    body: 'Time to complete your habit!',
    icon: '/icon.png',
  });
}
```

### Next Steps for Full Notification Support

1. **Set up VAPID keys** (if not already done):
   ```bash
   npx web-push generate-vapid-keys
   ```

2. **Configure environment variables**:
   ```bash
   VITE_VAPID_PUBLIC_KEY=your-public-key
   ```

3. **Deploy edge function** for periodic alert checking

4. **Set up cron schedule** in Supabase to run the edge function

5. **Test notifications** with a sample habit and alert

## Demo Mode Support

The implementation includes full demo mode support:
- Alerts are stored in localStorage when in demo mode
- All CRUD operations work offline
- Data persists across page reloads
- Automatic fallback when Supabase is not configured

## Type Safety

All components maintain full TypeScript type safety:
- Database types auto-generated from schema
- Service layer properly typed
- UI components use strict typing
- No `any` types used

## Testing

### Manual Testing Steps

1. **Create a habit** with a goal
2. **Configure alerts**:
   - Add a daily alert
   - Add a weekday-only alert (Mon-Fri)
   - Add a weekend alert (Sat-Sun)
3. **Verify monthly view**:
   - Check that bell icons appear on correct days
   - Verify dots show on cells with alerts
   - Check tooltips display alert status
4. **Test enable/disable**:
   - Disable an alert
   - Verify indicators disappear
   - Re-enable and verify indicators return
5. **Test deletion**:
   - Delete an alert
   - Verify it's removed from UI and database

### Database Testing

```sql
-- Insert a test alert
INSERT INTO habit_alerts (habit_id, alert_time, days_of_week)
VALUES (
  'your-habit-id',
  '08:00:00',
  ARRAY[1,2,3,4,5]  -- Monday through Friday
);

-- Query alerts for a habit
SELECT * FROM habit_alerts WHERE habit_id = 'your-habit-id';

-- Check which day of week
SELECT EXTRACT(DOW FROM NOW());  -- 0=Sunday, 1=Monday, etc.
```

## Architecture Notes

### Why Two Tables? (habit_alerts vs habit_reminders)

- **`habit_alerts`**: For the original `habits` table (tied to goals)
  - Used by the main habit tracking UI
  - Integrated with goals system
  - This implementation

- **`habit_reminders`**: For the advanced `habits_v2` table
  - Part of the comprehensive habits module
  - Standalone habit tracking system
  - Includes additional features like geo-location

Both tables serve the same purpose but for different habit tracking systems in the app.

### Service Layer Design

The service layer is split into two files for clarity:
- **`habitAlerts.ts`**: Pure CRUD operations on the database
- **`habitAlertNotifications.ts`**: Integration with notification system

This separation makes it easy to:
- Test database operations independently
- Swap out notification implementations
- Maintain clean code boundaries

## Performance Considerations

- **Monthly View**: Alert summaries are loaded once per month change
- **Database Queries**: Indexed on `habit_id` and `enabled` for fast lookups
- **RLS Policies**: Efficient with proper joins to verify ownership
- **Client-Side Caching**: Alert summaries cached in component state

## Security

- **Row Level Security**: Users can only access alerts for their own habits
- **Input Validation**: Time format and day of week validated
- **XSS Protection**: All user input properly escaped in UI
- **Demo Mode**: Local storage used, no server access

## Future Enhancements

Potential improvements for future development:

1. **Snooze Functionality**: Allow users to snooze alerts
2. **Smart Scheduling**: ML-based optimal alert times
3. **Location-Based Alerts**: Trigger when user is at a location
4. **Reminder History**: Track which reminders were sent
5. **Custom Messages**: Personalized alert messages
6. **Sound Selection**: Different notification sounds
7. **Batch Operations**: Enable/disable all alerts for a habit
8. **Template Alerts**: Save common alert configurations
9. **Analytics**: Track which alerts lead to completions

## Troubleshooting

### Alerts not showing in monthly view
- Check that alerts are enabled (`enabled = true`)
- Verify days_of_week matches the displayed month
- Refresh the page to reload alert summaries

### Modal not opening
- Check browser console for errors
- Verify HabitAlertConfig.css is loaded
- Check that habit ID is valid

### Database errors
- Verify migration was run successfully
- Check RLS policies are in place
- Ensure user is authenticated

## Contributing

When contributing to this feature:
1. Maintain TypeScript type safety
2. Update tests for new functionality
3. Document any new database changes
4. Follow existing code style and patterns
5. Test in both demo mode and with Supabase

## Support

For issues or questions:
1. Check this documentation first
2. Review the code comments in the service files
3. Check the SQL migration for schema details
4. Refer to existing notification system docs

---

**Last Updated**: 2025-11-21
**Version**: 1.0.0
**Author**: GitHub Copilot Implementation
