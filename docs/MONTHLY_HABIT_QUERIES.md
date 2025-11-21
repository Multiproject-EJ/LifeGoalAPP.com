# Monthly Habit Query Helpers

This document describes the new reusable helper functions for querying habit completions by month.

## Overview

The `habitMonthlyQueries.ts` service provides TypeScript functions to query and analyze habit completion data on a monthly basis. These helpers work with the existing Supabase tables without requiring any schema changes.

## Files Changed

### New Files
- **`src/services/habitMonthlyQueries.ts`** - Contains all monthly query helper functions

### Modified Files
- **`src/features/habits/DailyHabitTracker.tsx`** - Updated to call helpers when user switches month tabs

## Main Functions

### `getHabitCompletionsByMonth(userId, year, month)`

The primary helper function that retrieves habit completion statistics for a specific month.

**Parameters:**
- `userId` (string) - The user's ID
- `year` (number) - The year (e.g., 2025)
- `month` (number) - The month (1-12, where 1 = January)

**Returns:**
```typescript
ServiceResponse<MonthlyHabitCompletions>
```

**Example Usage:**
```typescript
import { getHabitCompletionsByMonth } from '../../services/habitMonthlyQueries';

// Get completions for January 2025
const result = await getHabitCompletionsByMonth('user-123', 2025, 1);

if (result.data) {
  console.log(`Overall completion: ${result.data.overallCompletionPercentage}%`);
  
  result.data.habits.forEach(habit => {
    console.log(
      `${habit.habitName}: ${habit.completedDays}/${habit.totalDays} days (${habit.completionPercentage}%)`
    );
  });
}
```

**Return Structure:**
```typescript
{
  userId: string;
  year: number;
  month: number; // 1-12
  startDate: string; // ISO date (YYYY-MM-DD)
  endDate: string; // ISO date (YYYY-MM-DD)
  habits: HabitMonthlyCompletion[];
  overallCompletionPercentage: number;
}
```

### `getMonthBoundaries(year, month)`

Helper function to calculate the first and last day of a given month.

**Parameters:**
- `year` (number) - The year (e.g., 2025)
- `month` (number) - The month (1-12, where 1 = January)

**Returns:**
```typescript
{
  startDate: string; // ISO date (YYYY-MM-DD)
  endDate: string; // ISO date (YYYY-MM-DD)
}
```

**Example Usage:**
```typescript
import { getMonthBoundaries } from '../../services/habitMonthlyQueries';

const { startDate, endDate } = getMonthBoundaries(2025, 1);
// Returns: { startDate: '2025-01-01', endDate: '2025-01-31' }
```

### `getHabitCompletionsTrend(userId, habitId, startYear, startMonth, endYear, endMonth)`

Gets completion data for a specific habit across multiple months (useful for trend analysis).

**Parameters:**
- `userId` (string) - The user's ID
- `habitId` (string) - The habit ID to track
- `startYear` (number) - Starting year
- `startMonth` (number) - Starting month (1-12)
- `endYear` (number) - Ending year
- `endMonth` (number) - Ending month (1-12)

**Returns:**
```typescript
ServiceResponse<HabitMonthlyCompletion[]>
```

**Example Usage:**
```typescript
import { getHabitCompletionsTrend } from '../../services/habitMonthlyQueries';

// Get trend for habit over 3 months (Jan-Mar 2025)
const result = await getHabitCompletionsTrend(
  'user-123',
  'habit-456',
  2025, 1,  // Start: January 2025
  2025, 3   // End: March 2025
);

if (result.data) {
  result.data.forEach((monthData, index) => {
    console.log(`Month ${index + 1}: ${monthData.completionPercentage}%`);
  });
}
```

## Types

### `HabitMonthlyCompletion`
```typescript
{
  habitId: string;
  habitName: string;
  totalDays: number;
  completedDays: number;
  completionPercentage: number;
  goalTitle?: string | null;
}
```

### `MonthlyHabitCompletions`
```typescript
{
  userId: string;
  year: number;
  month: number; // 1-12 (January = 1)
  startDate: string; // ISO date (YYYY-MM-DD)
  endDate: string; // ISO date (YYYY-MM-DD)
  habits: HabitMonthlyCompletion[];
  overallCompletionPercentage: number;
}
```

## UI Integration

The monthly helpers are integrated into the `DailyHabitTracker` component:

1. **Automatic Loading**: When the component loads or when the user switches to a different month using the month tabs, the `getHabitCompletionsByMonth` helper is called automatically.

2. **Visual Display**: Monthly statistics are displayed in a summary card showing:
   - Per-habit completion percentages
   - Number of completed days vs total days
   - Associated goal for each habit
   - Overall monthly completion rate
   - Color-coded completion percentages:
     - Green (≥80%): Excellent performance
     - Yellow (≥50%): Good performance
     - Red (<50%): Needs improvement

3. **Month Switching**: When clicking on any month tab, the helper queries the data for that month and updates the display.

## Demo Mode Support

All helpers support demo mode (offline usage) and will automatically use demo data when:
- No Supabase credentials are configured, OR
- No active user session exists

This ensures the app works seamlessly in both online and offline modes.

## Database Tables Used

The helpers query these existing tables:
- `habits` - User's habit definitions
- `habit_logs` - Daily completion logs
- `goals` - Associated goals for habits

**Note:** No schema changes were made. These helpers work with the existing table structure.

## Implementation Details

### How It Works

1. **Month Boundaries**: The helper calculates the first and last day of the requested month
2. **Habit Retrieval**: Fetches all habits for the user (with associated goals)
3. **Log Retrieval**: Queries all habit logs within the month date range
4. **Calculation**: For each habit:
   - Counts completed days
   - Calculates completion percentage based on total days in month
   - Aggregates into a structured response
5. **Overall Stats**: Computes overall completion rate across all habits

### Performance Considerations

- Uses efficient date range queries (`gte`, `lte`)
- Fetches only necessary data fields
- Supports pagination for large datasets (via existing Supabase infrastructure)
- Calculates percentages in-memory after fetching data

## Future Enhancements

Potential optimizations mentioned in code comments:
1. Create materialized views for monthly aggregation
2. Add database indexes on `habit_logs(date)` and `habit_logs(habit_id, date)`
3. Implement caching for monthly statistics
4. Add RLS policies for monthly data access

## Example: Full Integration

Here's how the monthly query helpers are used in the DailyHabitTracker component:

```typescript
import { getHabitCompletionsByMonth } from '../../services/habitMonthlyQueries';

// In component
const [monthlyStats, setMonthlyStats] = useState<MonthlyHabitCompletions | null>(null);

// Load stats when month changes
useEffect(() => {
  if (!isConfigured || !session?.user?.id) return;
  
  const loadMonthlyStats = async () => {
    const result = await getHabitCompletionsByMonth(
      session.user.id,
      selectedYear,
      selectedMonth + 1, // Convert from 0-11 to 1-12
    );
    
    if (result.data) {
      setMonthlyStats(result.data);
    }
  };
  
  void loadMonthlyStats();
}, [session?.user?.id, selectedMonth, selectedYear]);

// Render stats in UI
{monthlyStats && monthlyStats.habits.length > 0 && (
  <div>
    {monthlyStats.habits.map((habitStat) => (
      <div key={habitStat.habitId}>
        {habitStat.habitName}: {habitStat.completionPercentage}%
      </div>
    ))}
  </div>
)}
```

## Summary

These helper functions provide a clean, reusable API for querying habit completion data by month. They integrate seamlessly with the existing codebase, support both online and offline modes, and provide a structure that the UI can easily consume to display meaningful habit statistics to users.
