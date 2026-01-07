# Body Tab Development Plan

## Vision
A modular health and vitality dashboard with core features + customizable widgets that users can enable based on their needs.

## Architecture
- **Core System**: Always visible overview and health goals integration
- **Widget System**: Modular, opt-in components for specific health tracking needs
- **Data Integration**: Links to existing Goals and Habits features

## Implementation Phases

### Phase 0: Foundation (THIS PR)
- [x] Fix any broken Body tab integration
- [x] Create this development plan
- [x] Document widget architecture
- [ ] Define data models

### Phase 1: Core UI & Overview (Milestone 1)
**Goal**: Basic Body tab with overview card and widget management UI

**Tasks**:
1. Create core Body tab layout component
2. Build "Quick Overview" card showing health status summary
3. Implement "Active Body Goals" integration (pull from Goals feature)
4. Create widget management/customization screen
5. Build widget registry system
6. Implement drag-and-drop widget reordering
7. Add user preferences persistence for enabled widgets

**Files to Create**:
- `src/features/body/BodyTabCore.tsx`
- `src/features/body/BodyOverviewCard.tsx`
- `src/features/body/WidgetManager.tsx`
- `src/features/body/widgetRegistry.ts`
- `src/features/body/types.ts`
- `src/services/bodyTabPreferences.ts`

**Acceptance Criteria**:
- Body tab renders with overview card
- User can see linked health/fitness goals from Goals tab
- Widget customization screen opens and shows available widgets
- User preferences are saved and persist across sessions

---

### Phase 2: Essential Widget #1 - Health Checkups (Milestone 2)
**Goal**: Implement the Health Checkups tracking widget

**Tasks**:
1. Design database schema for health checkups
2. Create HealthCheckupsWidget component
3. Implement "Add Checkup" form (dentist, physical, eye exam, etc.)
4. Build checkup status indicators (overdue, due soon, up-to-date)
5. Add reminder calculation logic
6. Create checkup detail/edit view
7. Implement delete functionality

**Database Schema**:
```sql
CREATE TABLE health_checkups (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  checkup_type TEXT NOT NULL, -- 'dentist', 'physical', 'eye_exam', etc.
  last_completed_date DATE,
  frequency_months INTEGER, -- 6 for dentist, 12 for physical, etc.
  next_due_date DATE,
  provider_name TEXT,
  provider_contact TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Files to Create**:
- `src/features/body/widgets/HealthCheckupsWidget.tsx`
- `src/features/body/widgets/HealthCheckupsWidget.css`
- `src/services/healthCheckups.ts`
- `sql/health_checkups_schema.sql`

**Acceptance Criteria**:
- Widget appears when enabled in customization
- User can add/edit/delete health checkups
- Status indicators show correct overdue/due soon/healthy states
- Checkups calculate next due date based on frequency

---

### Phase 3: Essential Widget #2 - Body Self-Checks (Milestone 3)
**Goal**: Guided self-examination routines (skin checks, etc.)

**Tasks**:
1. Design database schema for self-check routines and logs
2. Create SelfChecksWidget component
3. Build guided self-check flow screens (step-by-step)
4. Implement self-check types: skin scan, breast/testicular exam, etc.
5. Add photo upload capability for tracking changes
6. Create self-check history view
7. Implement reminder system

**Database Schema**:
```sql
CREATE TABLE self_check_routines (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  check_type TEXT NOT NULL, -- 'skin_scan', 'breast_exam', etc.
  frequency_days INTEGER, -- 30 for monthly, etc.
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE self_check_logs (
  id UUID PRIMARY KEY,
  routine_id UUID REFERENCES self_check_routines,
  user_id UUID REFERENCES auth.users,
  completed_date DATE NOT NULL,
  findings TEXT, -- 'normal', 'concern_flagged'
  notes TEXT,
  photo_urls TEXT[], -- Optional photos for tracking
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Files to Create**:
- `src/features/body/widgets/SelfChecksWidget.tsx`
- `src/features/body/widgets/SelfCheckFlow.tsx`
- `src/features/body/widgets/SelfChecksWidget.css`
- `src/services/selfChecks.ts`
- `sql/self_checks_schema.sql`

**Acceptance Criteria**:
- Widget shows due/overdue self-checks
- Guided flow walks user through checks step-by-step
- User can log findings as normal or flag concerns
- Optional photo upload works
- History shows past check logs

---

### Phase 4: Essential Widget #3 - Body Metrics (Milestone 4)
**Goal**: Long-term body measurement tracking with trend charts

**Tasks**:
1. Design database schema for body metrics
2. Create BodyMetricsWidget component
3. Implement metric logging (weight, body fat %, etc.)
4. Build trend chart visualization (6-month view)
5. Add fitness benchmark tracking (push-ups, run times, etc.)
6. Create metric history view
7. Implement export functionality

**Database Schema**:
```sql
CREATE TABLE body_metrics (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  metric_type TEXT NOT NULL, -- 'weight', 'body_fat_pct', 'fitness_benchmark'
  value NUMERIC NOT NULL,
  unit TEXT, -- 'kg', 'lbs', '%', 'reps', 'minutes'
  benchmark_name TEXT, -- For fitness tests: 'pushups', '5k_time', etc.
  logged_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Files to Create**:
- `src/features/body/widgets/BodyMetricsWidget.tsx`
- `src/features/body/widgets/BodyMetricsWidget.css`
- `src/features/body/widgets/MetricChart.tsx`
- `src/services/bodyMetrics.ts`
- `sql/body_metrics_schema.sql`

**Acceptance Criteria**:
- User can log weight and other metrics
- Trend chart displays 6-month history
- Fitness benchmarks can be logged separately
- Widget shows most recent metric and change from previous

---

### Phase 5: Specialized Widgets (Milestones 5-8)
**Goal**: Implement opt-in specialized tracking widgets

**Widgets to Build** (in order of priority):
1. **Medication Manager Widget** (Milestone 5)
2. **Injury/Pain Tracker Widget** (Milestone 6)
3. **Symptom Logger Widget** (Milestone 7)
4. **Vital Signs Widget** (Milestone 8)

Each widget follows same pattern:
- Database schema design
- Widget component
- CRUD operations
- History view
- Integration with widget system

---

### Phase 6: Advanced Features (Milestone 9)
**Goal**: Polish and advanced functionality

**Tasks**:
1. Implement widget-level notifications/reminders
2. Add data export (CSV download per widget)
3. Build aggregate health dashboard view
4. Create health report generation
5. Add sharing capabilities (export health summary)
6. Implement search/filter across all widgets
7. Add accessibility improvements

---

### Phase 7: Integration & Gamification (Milestone 10)
**Goal**: Deep integration with existing app features

**Tasks**:
1. Link body metrics to balance score system
2. Award XP for completing health checkups
3. Award XP for consistent self-checks
4. Create health-related achievements
5. Suggest body-related habits based on goals
6. Create health insights in AI Coach
7. Add body data access toggles for AI Coach privacy

---

## Widget Architecture

### Widget Interface
```typescript
interface BodyWidget {
  id: string;
  name: string;
  icon: string;
  tier: 'essential' | 'specialized';
  component: React.ComponentType<WidgetProps>;
  defaultConfig: WidgetConfig;
  requiredPermissions?: string[];
}

interface WidgetProps {
  session: Session;
  config: WidgetConfig;
  onUpdate: (config: WidgetConfig) => void;
}

interface WidgetConfig {
  enabled: boolean;
  position: number;
  settings: Record<string, any>;
}
```

### Widget Registry
All widgets registered in `src/features/body/widgetRegistry.ts`:
```typescript
export const WIDGET_REGISTRY: Record<string, BodyWidget> = {
  'health-checkups': {
    id: 'health-checkups',
    name: 'Health Checkups',
    icon: '🏥',
    tier: 'essential',
    component: HealthCheckupsWidget,
    defaultConfig: {
      enabled: true,
      position: 1,
      settings: {}
    }
  },
  'self-checks': {
    id: 'self-checks',
    name: 'Body Self-Checks',
    icon: '🔍',
    tier: 'essential',
    component: SelfChecksWidget,
    defaultConfig: {
      enabled: true,
      position: 2,
      settings: {}
    }
  },
  'body-metrics': {
    id: 'body-metrics',
    name: 'Body Metrics',
    icon: '📊',
    tier: 'essential',
    component: BodyMetricsWidget,
    defaultConfig: {
      enabled: true,
      position: 3,
      settings: {
        showTrends: true,
        timeRange: '6months'
      }
    }
  },
  // ... more widgets
};
```

### Widget Management
Users can:
- Enable/disable widgets
- Reorder widgets via drag-and-drop
- Configure widget-specific settings
- Export widget data individually

### Data Models

#### User Preferences
```typescript
interface BodyTabPreferences {
  userId: string;
  enabledWidgets: string[];
  widgetOrder: string[];
  widgetConfigs: Record<string, WidgetConfig>;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Database Schema for Preferences
```sql
CREATE TABLE body_tab_preferences (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users UNIQUE,
  enabled_widgets TEXT[],
  widget_order TEXT[],
  widget_configs JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Current Implementation Status

### ✅ Completed (Phase 0)
- Body tab component exists at `src/features/body/BodyTab.tsx`
- Properly exported from `src/features/body/index.ts`
- Integrated into main app navigation in `App.tsx`
- Basic UI layout with placeholder sections:
  - At-a-glance status (Body Battery, daily rings, hydration)
  - Active goals section
  - Daily habits section
  - Recent activity feed
  - Body gallery section
  - Floating action button (FAB)
- Comprehensive CSS styling with responsive design
- Mobile-first approach implemented

### 🔄 Next Steps (Phase 1)
1. Refactor existing BodyTab.tsx to use widget architecture
2. Create widget registry system
3. Implement widget manager UI
4. Add user preferences persistence
5. Build overview card component

---

## Design Principles

1. **Mobile First**: All widgets designed for phone screens primarily
2. **Progressive Disclosure**: Show summary, expand for details
3. **Privacy First**: Sensitive health data with explicit permissions
4. **Modular & Optional**: Users choose which widgets to enable
5. **Integration Ready**: Connect with existing Goals, Habits, and Gamification systems
6. **Accessibility**: Full keyboard navigation and screen reader support

---

## Technical Notes

### Dependencies
- React 18.3.1
- TypeScript 5.4.5
- Supabase client for data persistence
- Existing app infrastructure (auth, goals, habits)

### Styling Approach
- CSS modules per widget
- CSS variables for theming
- Responsive breakpoints (576px, 768px, 992px, 1200px, 1400px)
- Dark mode support via `prefers-color-scheme`
- Accessibility features (reduced motion, focus states)

### Testing Strategy
- Unit tests for widget components
- Integration tests for widget system
- E2E tests for user flows
- Accessibility testing with screen readers

---

## Future Enhancements (Beyond Phase 7)

1. **Wearable Integration**: Sync with Apple Health, Google Fit, Fitbit
2. **AI Health Insights**: Pattern recognition in health data
3. **Social Features**: Share achievements, compare progress (opt-in)
4. **Health Professional Export**: Generate reports for doctors
5. **Medication Reminders**: Push notifications for medications
6. **Emergency Contacts**: Quick access to health emergency info
7. **Health Records Import**: Parse and store lab results, medical records

---

## Questions & Decisions Log

1. **Should widgets be drag-and-drop reorderable?** 
   - ✅ Yes, in Phase 1 (enhances personalization)

2. **Should health data be encrypted at rest?**
   - 🔄 To be decided (consider for sensitive data like photos, medical records)

3. **Should we support multiple profiles (e.g., family members)?**
   - 📝 Future enhancement (beyond Phase 7)

4. **How do we handle data export for GDPR compliance?**
   - ✅ Phase 6 includes CSV export per widget

5. **Should widgets communicate with each other?**
   - 📝 Keep widgets independent initially, add inter-widget events in Phase 6 if needed
