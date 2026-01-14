# Phase 2 Implementation Complete: Auto-Cleanup System

## Summary

Phase 2 of the Actions Feature has been successfully implemented! This phase adds intelligent time-based automation to the 3-day rolling todo list, automatically managing action lifecycle and migration.

## What Was Built

### 1. Per-Task Timer System 🕐

**ActionTimer Component** (`src/features/actions/components/ActionTimer.tsx`)
- Real-time countdown display integrated into each action item
- Smart formatting based on urgency:
  - More than 1 day: "2d 5h" format
  - Less than 24 hours: "5h 30m" with **warning color** 
  - Less than 1 hour: "45m" with **pulsing animation**
  - Expired: "Expired" badge
- MUST DO actions display "∞" (never expire)
- Updates every minute automatically
- Fully styled with CSS animations

### 2. Automatic Cleanup System 🧹

**Cleanup Service** (`src/services/actionsCleanup.ts`)

Three core functions handle expiration:

```typescript
// Get all expired actions
fetchExpiredActions(): Promise<{ data: Action[], error: Error | null }>

// Delete expired NICE TO DO actions (auto-cleanup)
deleteExpiredNiceToDoActions(): Promise<{ count: number, error: Error | null }>

// Get PROJECT actions ready for migration
getExpiredProjectActions(): Promise<{ data: Action[], error: Error | null }>

// Run full cleanup orchestration
runActionsCleanup(): Promise<{ 
  deletedCount: number, 
  actionsToMigrate: Action[], 
  error: Error | null 
}>
```

**Behavior by Category:**
- **MUST DO** (`must_do`): Never expires, stays until manually completed
- **NICE TO DO** (`nice_to_do`): Auto-deletes when expires_at is reached
- **PROJECT** (`project`): Auto-migrates to Projects table when expires_at is reached

### 3. Project Migration System 🔄

**Migration Service** (`src/services/actionsMigration.ts`)

When a PROJECT action expires, it's automatically converted to a full Project:

```typescript
// Migrate single action
migrateActionToProject(action: Action): Promise<MigrationResult>

// Batch migration
migrateExpiredProjectActions(actions: Action[]): Promise<MigrationResult[]>

// Full migration orchestration
runActionsMigration(): Promise<{ 
  results: MigrationResult[], 
  successCount: number, 
  failureCount: number 
}>
```

**Migration Process:**
1. Create new Project with action's title and notes
2. Set project status to "planning"
3. Link action to project via `migrated_to_project_id`
4. Mark action as completed
5. Return migration result with success/failure status

### 4. Notification System 🔔

**Notification Hook** (`src/hooks/useActionNotifications.ts`)

Monitors actions and triggers callbacks for:
- Actions expiring within 24 hours ("expiring_soon")
- Actions that have just expired ("expired")
- Actions migrated to projects ("migrated")
- Actions auto-deleted ("deleted")

```typescript
useActionNotifications({
  actions: Action[],
  onNotification?: (notification: ActionNotification) => void,
  checkIntervalMs?: number // default: 60000 (1 minute)
})
```

**Smart Notification Tracking:**
- Tracks already-notified actions to prevent spam
- Auto-cleanup of stale notification keys
- Respects action category (skips MUST DO)

### 5. Server-Side Cleanup (Supabase Edge Function) ☁️

**Edge Function** (`supabase/functions/actions-cleanup/index.ts`)

Production-ready server-side cleanup that:
- Runs on schedule (designed for hourly cron job)
- Deletes expired NICE TO DO actions
- Migrates expired PROJECT actions to Projects
- Returns detailed results with error tracking
- Full CORS support for API access

**Response Format:**
```json
{
  "success": true,
  "timestamp": "2026-01-14T21:00:00.000Z",
  "deletedCount": 5,
  "migratedCount": 2,
  "errors": []
}
```

## Technical Implementation Details

### Type System Updates

Added `migrated_to_project_id` to `UpdateActionInput`:

```typescript
export interface UpdateActionInput {
  title?: string;
  category?: ActionCategory;
  completed?: boolean;
  notes?: string;
  order_index?: number;
  migrated_to_project_id?: string; // NEW
}
```

### Demo Mode Support ✅

All services fully support demo mode:
- Uses `canUseSupabaseData()` to detect environment
- Falls back to localStorage via `demoData.ts` functions
- Same API surface for authenticated and demo modes

### Integration Points

**ActionTimer Integration:**
```tsx
// In ActionItem.tsx
import { ActionTimer } from './ActionTimer';

<ActionTimer action={action} />
```

**Cleanup Integration (Example):**
```typescript
import { runActionsCleanup } from '../services/actionsCleanup';
import { runActionsMigration } from '../services/actionsMigration';

// Run cleanup
const { deletedCount, actionsToMigrate } = await runActionsCleanup();

// Run migration
const { successCount, failureCount } = await runActionsMigration();
```

## File Structure

```
src/
├── features/actions/components/
│   ├── ActionTimer.tsx          # Timer display component
│   └── ActionTimer.css          # Timer styles with animations
├── services/
│   ├── actionsCleanup.ts        # Cleanup orchestration
│   └── actionsMigration.ts      # Migration to projects
├── hooks/
│   └── useActionNotifications.ts # Notification monitoring
└── types/
    └── actions.ts               # Updated with migration field

supabase/functions/
└── actions-cleanup/
    └── index.ts                 # Edge Function for server-side cleanup
```

## Usage Examples

### Client-Side Manual Cleanup

```typescript
import { runActionsCleanup } from './services/actionsCleanup';
import { runActionsMigration } from './services/actionsMigration';

async function manualCleanup() {
  // Delete expired NICE TO DO actions
  const { deletedCount } = await runActionsCleanup();
  console.log(`Deleted ${deletedCount} expired actions`);
  
  // Migrate expired PROJECT actions
  const { successCount } = await runActionsMigration();
  console.log(`Migrated ${successCount} projects`);
}
```

### Using Notifications

```typescript
import { useActionNotifications } from './hooks/useActionNotifications';

function ActionsTab() {
  const { actions } = useActions();
  
  useActionNotifications({
    actions,
    onNotification: (notification) => {
      if (notification.type === 'expiring_soon') {
        showToast(`⏰ ${notification.message}`);
      } else if (notification.type === 'migrated') {
        showToast(`✨ ${notification.message}`);
      }
    },
  });
  
  // ...
}
```

## Deployment Notes

### Edge Function Setup

1. Deploy the Edge Function to Supabase:
   ```bash
   supabase functions deploy actions-cleanup
   ```

2. Set up cron job (using pg_cron or external scheduler):
   ```sql
   -- Run every hour
   SELECT cron.schedule(
     'actions-cleanup-hourly',
     '0 * * * *',
     'SELECT net.http_post(
       url := ''YOUR_FUNCTION_URL'',
       headers := ''{"Authorization": "Bearer YOUR_ANON_KEY"}''::jsonb
     )'
   );
   ```

3. Or use external cron service (e.g., GitHub Actions, Vercel Cron):
   ```yaml
   # .github/workflows/actions-cleanup.yml
   name: Actions Cleanup
   on:
     schedule:
       - cron: '0 * * * *' # Every hour
   jobs:
     cleanup:
       runs-on: ubuntu-latest
       steps:
         - name: Call cleanup function
           run: |
             curl -X POST "${{ secrets.SUPABASE_FUNCTION_URL }}/actions-cleanup" \
               -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
   ```

## Testing Checklist

- [x] TypeScript compilation passes
- [x] Build succeeds without errors
- [x] Timer displays correctly in UI
- [x] Cleanup service works in demo mode
- [x] Migration service works in demo mode
- [x] Edge Function has proper error handling
- [x] Documentation updated

## Success Metrics (from Dev Plan)

- [x] Timer displays correctly for each action
- [x] NICE TO DO actions can auto-delete after 3 days
- [x] PROJECT actions can auto-migrate after 3 days
- [x] MUST DO actions never expire (show ∞)
- [x] Notifications infrastructure in place
- [x] Cleanup runs reliably (Edge Function ready)
- [x] Demo mode simulates cleanup behavior

## Known Limitations & Future Enhancements

### Current Limitations
1. **Manual trigger required**: Client-side cleanup must be called manually (future: background sync)
2. **No UI for migration history**: Can't see which actions became projects (Phase 3)
3. **Single notification per action**: Won't re-notify if user dismisses (by design)

### Future Enhancements (Post-Phase 2)
1. Add background sync worker for client-side cleanup
2. Add "View migrated project" link in action history
3. Add bulk cleanup button in UI
4. Add cleanup statistics dashboard
5. Add user preferences for notification timing

## Phase 3 Preview

Next up: **Projects Foundation**
- Full Projects Manager UI
- Kanban board view
- Project-task relationships
- Link projects to goals
- Progress tracking

## Questions & Support

For questions about this implementation, refer to:
- **Development Plan**: `ACTIONS_FEATURE_DEV_PLAN.md`
- **Database Schema**: `supabase/migrations/0129_actions_feature.sql`
- **Type Definitions**: `src/types/actions.ts`

## Changelog

### 2026-01-14 - Phase 2 Complete
- ✅ ActionTimer component with real-time countdown
- ✅ Cleanup service for NICE TO DO auto-deletion
- ✅ Migration service for PROJECT → Projects conversion
- ✅ Notification hook for expiration alerts
- ✅ Edge Function for server-side automation
- ✅ Full demo mode support
- ✅ Documentation updates

---

**Status**: ✅ Phase 2 Complete  
**Next Phase**: Phase 3 - Projects Foundation  
**Build Status**: ✅ Passing  
**Demo Mode**: ✅ Fully Supported
