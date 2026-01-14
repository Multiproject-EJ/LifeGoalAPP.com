# Actions Feature - Complete Development Plan

## 📋 Table of Contents
1. [Overview](#overview)
2. [Feature Architecture](#feature-architecture)
3. [How to Resume Work](#how-to-resume-work)
4. [Database Schema](#database-schema)
5. [TypeScript Types](#typescript-types)
6. [Component Architecture](#component-architecture)
7. [Development Phases](#development-phases)
8. [UI/UX Design](#uiux-design)
9. [Integration Points](#integration-points)
10. [Success Metrics](#success-metrics)
11. [Known Issues & Future Considerations](#known-issues--future-considerations)

---

## Overview

### What is the Actions Feature?

The Actions Feature is a **two-tier task management system** designed to help users bridge the gap between long-term goals and daily execution. It consists of:

1. **Actions Tab (Simple)** - A 3-day rolling todo list for immediate tasks
2. **Projects Manager (Complex)** - Full-featured project management with Kanban boards, timeline views, and AI assistance

### Why Two Tiers?

- **Actions Tab**: For users who need quick task capture without complexity
- **Projects Manager**: For users managing multi-step initiatives that connect to Goals

The system intelligently promotes tasks from Actions to Projects when they need more structure.

### Current State

**Placeholder exists** in `src/App.tsx` (search for `case 'actions'`):

```tsx
case 'actions':
  return (
    <div className="workspace-content">
      <section className="workspace-actions-placeholder" aria-label="Actions">
        <h2>Actions</h2>
        <p>This space is ready for your next quick-action tools.</p>
      </section>
    </div>
  );
```

**Navigation already configured**:
- Desktop sidebar: `BASE_WORKSPACE_NAV_ITEMS` includes Actions with ⚡️ icon
- Mobile footer: Actions is in `MOBILE_FOOTER_WORKSPACE_IDS` array
- Both route to `'actions'` workspace nav ID

---

## Feature Architecture

### Two-Tier System Design

#### Tier 1: Actions Tab (Simple)
**Purpose**: Quick task capture and daily execution  
**Lifespan**: 3-day rolling window (per-task timer)  
**Categories**:
- **MUST DO** - Critical tasks (stays forever, always at top)
- **NICE TO DO** - Optional tasks (auto-deletes after 3 days)
- **PROJECT** - Multi-step tasks (auto-migrates to Projects after 3 days)

**Key Features**:
- Mobile-first design with swipe gestures
- Quick add with voice input support
- XP rewards for completion
- Minimal friction, maximum speed

#### Tier 2: Projects Manager (Complex)
**Purpose**: Multi-step project management  
**Lifespan**: Until manually completed or archived  
**Views**:
- **Kanban Board** - Drag-and-drop task management
- **Timeline View** - Gantt-style scheduling
- **List View** - Simple task list with hierarchy

**Key Features**:
- AI-powered project breakdown
- Links to Goals and Habits
- Subtasks with dependencies
- Notifications and reminders
- Progress tracking and analytics

### Per-Task Timer Design

Each task tracks its own 3-day countdown from creation:
- **Created**: Task is created at timestamp T
- **Expires**: Task auto-deletes/migrates at T + 3 days
- **No global cleanup cycle** - tasks expire independently
- **More intuitive** - "This task is 2 days old" vs "Next cleanup in X hours"

---

## How to Resume Work

### For AI Agents (or Humans!)

This section helps any developer pick up where previous work left off.

#### Quick Orientation

1. **Check current phase**: Look at the checklist in the active phase section below
2. **Review completed items**: Items marked `[x]` are done
3. **Find next task**: First `[ ]` item in current phase is next
4. **Check dependencies**: Read "Prerequisites" section for that phase

#### Phase Status Reference

| Phase | Status | Next Task |
|-------|--------|-----------|
| Phase 0: Foundation | ✅ Complete | - |
| Phase 1: Simple Actions Tab | ✅ Complete | - |
| Phase 2: Auto-Cleanup | ✅ Complete | - |
| Phase 3: Projects Foundation | ✅ Complete | - |
| Phase 4: Advanced Views | Not Started | Build Kanban board |
| Phase 5: AI Integration | Not Started | Add AI breakdown |
| Phase 6: Desktop Optimization | Not Started | Add keyboard shortcuts |

#### File Organization

All Actions feature files should follow this pattern:
```
src/
  features/
    actions/               # Actions Tab (Phase 1-2)
      ActionsTab.tsx       # Main container
      ActionItem.tsx       # Single action component
      ActionsList.tsx      # List with categories
      QuickAddAction.tsx   # Quick add input
      ActionTimer.tsx      # Countdown display
      index.ts             # Exports
    projects/              # Projects Manager (Phase 3-5)
      ProjectsManager.tsx  # Main container
      ProjectBoard.tsx     # Kanban view
      ProjectTimeline.tsx  # Timeline view
      ProjectDetail.tsx    # Project detail panel
      AIProjectBreakdown.tsx # AI assistance
      index.ts             # Exports
  services/
    actions.ts             # Actions CRUD operations
    projects.ts            # Projects CRUD operations
  types/
    actions.ts             # TypeScript types
```

#### Testing Strategy

- **Manual Testing**: Each phase includes a "Manual Verification" section
- **Demo Mode**: All features must work without Supabase auth
- **Mobile Testing**: Test on real devices, not just browser DevTools
- **Accessibility**: Verify keyboard navigation and screen readers

---

## Database Schema

### Actions Table (Simple Tasks)

```sql
-- Actions table for simple 3-day rolling tasks
CREATE TABLE IF NOT EXISTS public.actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('must_do', 'nice_to_do', 'project')),
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '3 days'),
  migrated_to_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  xp_awarded INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX idx_actions_user_id ON public.actions(user_id);
CREATE INDEX idx_actions_user_category ON public.actions(user_id, category);
CREATE INDEX idx_actions_expires_at ON public.actions(expires_at);
CREATE INDEX idx_actions_completed ON public.actions(user_id, completed);

-- RLS Policies
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own actions"
  ON public.actions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own actions"
  ON public.actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own actions"
  ON public.actions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own actions"
  ON public.actions FOR DELETE
  USING (auth.uid() = user_id);
```

### Projects Table (Complex Tasks)

```sql
-- Projects table for multi-step initiatives
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'archived')),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  goal_id UUID REFERENCES public.life_goals(id) ON DELETE SET NULL,
  start_date DATE,
  target_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT '📋',
  order_index INTEGER NOT NULL DEFAULT 0,
  xp_reward INTEGER DEFAULT 100
);

-- Indexes
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_user_status ON public.projects(user_id, status);
CREATE INDEX idx_projects_goal_id ON public.projects(goal_id);

-- RLS Policies
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);
```

### Project Tasks Table (Subtasks)

```sql
-- Project tasks (subtasks within projects)
CREATE TABLE IF NOT EXISTS public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'done')),
  parent_task_id UUID REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID REFERENCES public.project_tasks(id) ON DELETE SET NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  order_index INTEGER NOT NULL DEFAULT 0,
  estimated_hours NUMERIC(5,2),
  actual_hours NUMERIC(5,2)
);

-- Indexes
CREATE INDEX idx_project_tasks_project_id ON public.project_tasks(project_id);
CREATE INDEX idx_project_tasks_user_id ON public.project_tasks(user_id);
CREATE INDEX idx_project_tasks_status ON public.project_tasks(project_id, status);
CREATE INDEX idx_project_tasks_parent ON public.project_tasks(parent_task_id);

-- RLS Policies
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks for their projects"
  ON public.project_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create tasks for their projects"
  ON public.project_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update tasks for their projects"
  ON public.project_tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete tasks for their projects"
  ON public.project_tasks FOR DELETE
  USING (auth.uid() = user_id);
```

### Triggers for Auto-Updates

```sql
-- Update updated_at timestamp on projects
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION update_projects_updated_at();

-- Update updated_at timestamp on project_tasks
CREATE TRIGGER project_tasks_updated_at
  BEFORE UPDATE ON public.project_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_projects_updated_at();
```

---

## TypeScript Types

### Actions Types

```typescript
// src/types/actions.ts

// =====================================================
// DATABASE ROW TYPES
// =====================================================

export type ActionCategory = 'must_do' | 'nice_to_do' | 'project';

export interface Action {
  id: string;
  user_id: string;
  title: string;
  category: ActionCategory;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  expires_at: string;
  migrated_to_project_id: string | null;
  order_index: number;
  notes: string | null;
  xp_awarded: number;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority | null;
  goal_id: string | null;
  start_date: string | null;
  target_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  color: string;
  icon: string;
  order_index: number;
  xp_reward: number;
}

export interface ProjectTask {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  parent_task_id: string | null;
  depends_on_task_id: string | null;
  completed: boolean;
  completed_at: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  order_index: number;
  estimated_hours: number | null;
  actual_hours: number | null;
}

// =====================================================
// ENUMS AND STATUS TYPES
// =====================================================

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done';

// =====================================================
// UI DISPLAY TYPES
// =====================================================

export interface ActionWithTimeRemaining extends Action {
  daysRemaining: number;
  hoursRemaining: number;
  isExpiringSoon: boolean; // < 24 hours
  isExpired: boolean;
}

export interface ProjectWithProgress extends Project {
  totalTasks: number;
  completedTasks: number;
  progressPercentage: number;
  daysUntilDue: number | null;
  isOverdue: boolean;
}

export interface ProjectTaskWithRelations extends ProjectTask {
  subtasks: ProjectTask[];
  blockedBy: ProjectTask | null;
  canStart: boolean; // Based on dependencies
}

// =====================================================
// GROUPING AND FILTERING
// =====================================================

export interface ActionsByCategory {
  must_do: Action[];
  nice_to_do: Action[];
  project: Action[];
}

export interface ProjectsByStatus {
  planning: Project[];
  active: Project[];
  on_hold: Project[];
  completed: Project[];
  archived: Project[];
}

// =====================================================
// XP REWARDS
// =====================================================

export const ACTIONS_XP_REWARDS = {
  // Simple actions
  COMPLETE_MUST_DO: 50,
  COMPLETE_NICE_TO_DO: 10,
  COMPLETE_PROJECT_ACTION: 25,
  CLEAR_ALL_MUST_DO: 25, // Bonus for clearing all must-do items
  
  // Projects
  CREATE_PROJECT: 10,
  COMPLETE_PROJECT_TASK: 20,
  COMPLETE_PROJECT: 100, // Base reward
  COMPLETE_PROJECT_ON_TIME: 50, // Bonus for on-time completion
  COMPLETE_PROJECT_EARLY: 100, // Bonus for early completion
  
  // Milestones
  COMPLETE_10_ACTIONS: 100,
  COMPLETE_50_ACTIONS: 500,
  COMPLETE_5_PROJECTS: 250,
  COMPLETE_20_PROJECTS: 1000,
} as const;

// =====================================================
// CATEGORY LABELS AND ICONS
// =====================================================

export const ACTION_CATEGORY_CONFIG = {
  must_do: {
    label: 'MUST DO',
    icon: '🔴',
    color: '#ef4444',
    description: 'Critical tasks that stay until completed',
    sortOrder: 1,
  },
  nice_to_do: {
    label: 'NICE TO DO',
    icon: '🟢',
    color: '#10b981',
    description: 'Optional tasks that auto-delete after 3 days',
    sortOrder: 2,
  },
  project: {
    label: 'PROJECT',
    icon: '🟡',
    color: '#f59e0b',
    description: 'Multi-step tasks that migrate to Projects after 3 days',
    sortOrder: 3,
  },
} as const;

export const PROJECT_STATUS_CONFIG = {
  planning: { label: 'Planning', icon: '📝', color: '#6b7280' },
  active: { label: 'Active', icon: '🚀', color: '#3b82f6' },
  on_hold: { label: 'On Hold', icon: '⏸️', color: '#f59e0b' },
  completed: { label: 'Completed', icon: '✅', color: '#10b981' },
  archived: { label: 'Archived', icon: '📦', color: '#9ca3af' },
} as const;

// =====================================================
// FORM INPUT TYPES
// =====================================================

export interface CreateActionInput {
  title: string;
  category: ActionCategory;
  notes?: string;
}

export interface UpdateActionInput {
  title?: string;
  category?: ActionCategory;
  completed?: boolean;
  notes?: string;
  order_index?: number;
}

export interface CreateProjectInput {
  title: string;
  description?: string;
  priority?: ProjectPriority;
  goal_id?: string;
  start_date?: string;
  target_date?: string;
  color?: string;
  icon?: string;
}

export interface UpdateProjectInput {
  title?: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  goal_id?: string;
  start_date?: string;
  target_date?: string;
  color?: string;
  icon?: string;
  order_index?: number;
}

// =====================================================
// DEMO MODE TYPES
// =====================================================

export const DEMO_ACTIONS_KEY = 'lifegoal_demo_actions';
export const DEMO_PROJECTS_KEY = 'lifegoal_demo_projects';
export const DEMO_PROJECT_TASKS_KEY = 'lifegoal_demo_project_tasks';

export interface DemoActionsData {
  actions: Action[];
  projects: Project[];
  projectTasks: ProjectTask[];
}
```

---

## Component Architecture

### Phase Markers Legend
- 🏗️ Phase 0: Foundation (Database & Services)
- 📱 Phase 1: Simple Actions Tab (Mobile UI)
- ⏰ Phase 2: Auto-Cleanup System
- 📋 Phase 3: Projects Foundation
- 🎨 Phase 4: Advanced Views
- 🤖 Phase 5: AI Integration
- 💻 Phase 6: Desktop Optimization

### File Structure

```
src/
  features/
    actions/                           # 📱 Phase 1
      ActionsTab.tsx                   # Main container for Actions workspace
      components/
        ActionItem.tsx                 # Single action card with swipe gestures
        ActionsList.tsx                # Categorized list (MUST DO, NICE TO DO, PROJECT)
        QuickAddAction.tsx             # Quick add input with category selector
        ActionTimer.tsx                # ⏰ Phase 2: Countdown timer display
        ActionEmptyState.tsx           # Empty state with onboarding tips
        CategoryHeader.tsx             # Category section headers with counts
      hooks/
        useActions.ts                  # Hook for CRUD operations
        useActionTimer.ts              # ⏰ Phase 2: Hook for expiration logic
        useActionXP.ts                 # Hook for XP rewards
      ActionsTab.css                   # Mobile-first styles
      index.ts                         # Exports

    projects/                          # 📋 Phase 3
      ProjectsManager.tsx              # Main container with view switcher
      components/
        ProjectCard.tsx                # Project card for list view
        ProjectList.tsx                # List of all projects
        ProjectDetail.tsx              # Detail panel with tasks
        ProjectForm.tsx                # Create/edit project form
        TaskItem.tsx                   # Individual task component
        TaskList.tsx                   # List of tasks
        ProjectProgress.tsx            # Progress bar and stats
        ProjectBoard.tsx               # 🎨 Phase 4: Kanban board view
        ProjectTimeline.tsx            # 🎨 Phase 4: Timeline/Gantt view
        AIProjectBreakdown.tsx         # 🤖 Phase 5: AI assistance panel
        ProjectGoalLink.tsx            # Link project to goals
      hooks/
        useProjects.ts                 # Hook for project CRUD
        useProjectTasks.ts             # Hook for task CRUD
        useProjectProgress.ts          # Hook for progress calculations
        useProjectAI.ts                # 🤖 Phase 5: Hook for AI features
      ProjectsManager.css              # Styles for projects
      index.ts                         # Exports

  services/
    actions.ts                         # 🏗️ Phase 0: Actions CRUD operations
    projects.ts                        # 🏗️ Phase 0: Projects CRUD operations
    actionsCleanup.ts                  # ⏰ Phase 2: Cleanup service
    actionsMigration.ts                # ⏰ Phase 2: Migration to projects

  types/
    actions.ts                         # 🏗️ Phase 0: TypeScript types

  hooks/
    useActionNotifications.ts          # ⏰ Phase 2: Expiration notifications

  styles/
    actions.css                        # Global styles for actions feature
    projects.css                       # Global styles for projects feature
```

### Component Specifications

#### ActionsTab.tsx (Phase 1)
**Purpose**: Main container for the Actions workspace  
**Props**: `{ session: Session | null }`  
**Features**:
- Renders categorized action lists (MUST DO, NICE TO DO, PROJECT)
- Quick add input at top
- Pull-to-refresh on mobile
- Empty state when no actions

**Example**:
```tsx
export function ActionsTab({ session }: { session: Session | null }) {
  const { actions, loading } = useActions(session);
  const { createAction } = useActions(session);
  
  return (
    <div className="actions-tab">
      <QuickAddAction onAdd={createAction} />
      <ActionsList actions={actions} />
    </div>
  );
}
```

#### ActionItem.tsx (Phase 1)
**Purpose**: Single action card with completion checkbox  
**Props**: `{ action: Action; onComplete: () => void; onDelete: () => void }`  
**Features**:
- Swipe left to delete (mobile)
- Tap to complete
- Timer countdown badge (Phase 2)
- Category color indicator

#### ProjectsManager.tsx (Phase 3)
**Purpose**: Main container for Projects workspace  
**Props**: `{ session: Session | null }`  
**Features**:
- View switcher (List, Kanban, Timeline)
- Filter by status and priority
- Create new project button
- Link to goals


---

## Development Phases

### Phase 0: Foundation (Estimated: 2-3 days)

**Goal**: Set up database tables, TypeScript types, and service layer

#### Checklist
- [x] Create database migration file
  - [x] Actions table with RLS policies
  - [x] Projects table with RLS policies
  - [x] Project tasks table with RLS policies
  - [x] Indexes for performance
  - [x] Triggers for updated_at timestamps
- [x] Define TypeScript types (`src/types/actions.ts`)
  - [x] Action, Project, ProjectTask interfaces
  - [x] Status and priority enums
  - [x] XP rewards constants
  - [x] Category configurations
- [x] Build service layer
  - [x] `src/services/actions.ts` - CRUD operations
  - [x] `src/services/projects.ts` - CRUD operations
  - [x] Demo mode support for all services
- [x] Test services in isolation
  - [x] Create, read, update, delete actions
  - [x] Create, read, update, delete projects
  - [x] Verify RLS policies work correctly

#### Success Criteria
- [x] Database migration runs successfully
- [x] All types compile without errors
- [x] Services work in authenticated mode
- [x] Services work in demo mode
- [x] RLS policies prevent unauthorized access

#### Files to Create
1. `supabase/migrations/XXXX_actions_feature.sql`
2. `src/types/actions.ts`
3. `src/services/actions.ts`
4. `src/services/projects.ts`

---

### Phase 1: Simple Actions Tab (Estimated: 4-5 days)

### Pre-Phase Verification Checklist
> ⚠️ **IMPORTANT FOR AI AGENTS**: Before starting this phase, verify ALL items from the previous phase are truly complete:
> 
> 1. **Check files exist**: Verify each file listed in the previous phase actually exists in the repository
> 2. **Check file contents**: Open each file and verify it contains the expected code/schema
> 3. **Check for compilation errors**: Run `npm run build` or equivalent to ensure no TypeScript errors
> 4. **Check database**: If database migrations were added, verify they can be applied without errors
> 5. **Test functionality**: If services were added, verify they work in both authenticated and demo mode
>
> If ANY item is incomplete, fix it before proceeding. Do not assume checkmarks are accurate.

**Goal**: Replace placeholder with functional mobile-first Actions Tab

#### Checklist
- [x] Create feature directory structure
  - [x] `src/features/actions/` folder
  - [x] `src/features/actions/components/` subfolder
  - [x] `src/features/actions/hooks/` subfolder
- [x] Build core components
  - [x] `ActionsTab.tsx` - Main container
  - [x] `ActionsList.tsx` - Categorized list display
  - [x] `ActionItem.tsx` - Single action card
  - [x] `QuickAddAction.tsx` - Quick add input
  - [x] `CategoryHeader.tsx` - Section headers
  - [x] `ActionEmptyState.tsx` - Empty state
- [x] Build hooks
  - [x] `useActions.ts` - CRUD operations hook
  - [x] `useActionXP.ts` - XP rewards hook
- [x] Add mobile-first CSS
  - [x] Touch-friendly tap targets (48px min)
  - [x] Swipe gesture styles
  - [x] Bottom sheet modals
  - [x] Mobile spacing and typography
- [x] Integrate with App.tsx
  - [x] Replace placeholder in switch statement
  - [x] Import ActionsTab component
  - [x] Pass session prop
- [x] XP Integration
  - [x] Award XP on action completion
  - [x] Award bonus XP for clearing all MUST DO
  - [x] Show XP toast notifications

#### Success Criteria
- [ ] Can create actions in all 3 categories
- [ ] Can mark actions as complete
- [ ] Can delete actions
- [ ] Can reorder actions within categories
- [ ] MUST DO items stay at top
- [ ] Empty state appears when no actions
- [ ] XP is awarded correctly
- [ ] Demo mode works without auth
- [ ] UI is touch-friendly on mobile

#### Manual Verification
1. Open Actions tab on mobile viewport
2. Create one action in each category
3. Complete a MUST DO action (verify +50 XP)
4. Complete a NICE TO DO action (verify +10 XP)
5. Swipe to delete an action
6. Verify empty state when all deleted
7. Test in demo mode without login

---

### Phase 2: Auto-Cleanup System (Estimated: 2-3 days)

### Pre-Phase Verification Checklist
> ⚠️ **IMPORTANT FOR AI AGENTS**: Before starting this phase, verify ALL items from Phase 1 are truly complete:
> 
> 1. **Check files exist**: Verify each file listed in Phase 1 actually exists in the repository
> 2. **Check file contents**: Open each file and verify it contains the expected code/schema
> 3. **Check for compilation errors**: Run `npm run build` or equivalent to ensure no TypeScript errors
> 4. **Test functionality**: Verify the Actions Tab loads correctly and all CRUD operations work
> 5. **Test demo mode**: Verify Actions Tab works without authentication
>
> If ANY item is incomplete, fix it before proceeding. Do not assume checkmarks are accurate.

**Goal**: Implement per-task expiration timers and auto-cleanup

#### Checklist
- [x] Add timer display to ActionItem
  - [x] `ActionTimer.tsx` component
  - [x] Show days/hours remaining
  - [x] Red warning when < 24 hours
  - [x] "Expired" badge if past expiration
- [x] Build cleanup service
  - [x] `src/services/actionsCleanup.ts`
  - [x] Function to delete expired NICE TO DO actions
  - [x] Function to migrate expired PROJECT actions
  - [x] Batch processing for efficiency
- [x] Build migration service
  - [x] `src/services/actionsMigration.ts`
  - [x] Convert action to project
  - [x] Create initial project task
  - [x] Link to original action
- [x] Add notification hooks
  - [x] `useActionNotifications.ts`
  - [x] Notify 24 hours before expiration
  - [x] Notify when action is migrated
  - [x] Notify when action is deleted
- [x] Schedule cleanup job (backend)
  - [x] Supabase Edge Function or cron job
  - [x] Run every hour
  - [x] Process all users' expired actions
- [x] Update UI to show timers
  - [x] Timer badge on each ActionItem
  - [x] Sort by expiration (soonest first)
  - [x] Visual indicators for urgency

#### Success Criteria
- [ ] Timer displays correctly for each action
- [ ] NICE TO DO actions auto-delete after 3 days
- [ ] PROJECT actions auto-migrate after 3 days
- [ ] MUST DO actions never expire
- [ ] Notifications sent 24 hours before expiration
- [ ] Cleanup runs reliably every hour
- [ ] Demo mode simulates cleanup behavior

#### Manual Verification
1. Create a NICE TO DO action
2. Manually set `expires_at` to 1 hour from now
3. Wait for timer to show "< 1 hour"
4. Run cleanup service manually
5. Verify action is deleted
6. Create a PROJECT action with near expiration
7. Run cleanup and verify it migrates to Projects

---

### Phase 3: Projects Foundation (Estimated: 5-6 days)

### Pre-Phase Verification Checklist
> ⚠️ **IMPORTANT FOR AI AGENTS**: Before starting this phase, verify ALL items from Phase 2 are truly complete:
> 
> 1. **Check files exist**: Verify timer components and cleanup service exist
> 2. **Check file contents**: Open each file and verify it contains the expected code
> 3. **Check for compilation errors**: Run `npm run build` or equivalent to ensure no TypeScript errors
> 4. **Test functionality**: Verify timers display correctly and cleanup service works
> 5. **Test expiration**: Verify actions expire correctly based on category
>
> If ANY item is incomplete, fix it before proceeding. Do not assume checkmarks are accurate.

**Goal**: Build basic Projects Manager with list view

#### Checklist
- [ ] Create projects directory structure
  - [ ] `src/features/projects/` folder
  - [ ] `src/features/projects/components/` subfolder
  - [ ] `src/features/projects/hooks/` subfolder
- [ ] Build core components
  - [ ] `ProjectsManager.tsx` - Main container
  - [ ] `ProjectList.tsx` - List of all projects
  - [ ] `ProjectCard.tsx` - Single project card
  - [ ] `ProjectDetail.tsx` - Detail panel
  - [ ] `ProjectForm.tsx` - Create/edit form
  - [ ] `TaskItem.tsx` - Individual task
  - [ ] `TaskList.tsx` - List of tasks
  - [ ] `ProjectProgress.tsx` - Progress display
- [ ] Build hooks
  - [ ] `useProjects.ts` - Project CRUD
  - [ ] `useProjectTasks.ts` - Task CRUD
  - [ ] `useProjectProgress.ts` - Progress calculations
- [ ] Add Projects entry to navigation
  - [ ] Add "Projects" workspace nav item
  - [ ] Route to ProjectsManager component
  - [ ] Update mobile footer if needed
- [ ] Link Projects to Goals
  - [ ] `ProjectGoalLink.tsx` component
  - [ ] Dropdown to select goal
  - [ ] Display linked goal in project card
  - [ ] Filter projects by goal
- [ ] Migration from Actions
  - [ ] Button in ProjectDetail to view migrated action
  - [ ] Display migration history
  - [ ] One-click conversion of PROJECT actions
- [ ] XP Integration
  - [ ] Award XP for completing project tasks
  - [ ] Award XP for completing full project
  - [ ] Bonus XP for on-time/early completion

#### Success Criteria
- [ ] Can create projects with title and description
- [ ] Can add tasks to projects
- [ ] Can mark tasks as complete
- [ ] Can link project to a goal
- [ ] Can view progress percentage
- [ ] Can filter by status (planning, active, etc.)
- [ ] Migrated actions appear in Projects
- [ ] XP awarded correctly for completions
- [ ] Demo mode fully functional

#### Manual Verification
1. Create a new project from scratch
2. Add 3 tasks to the project
3. Complete 1 task (verify progress updates)
4. Link project to an existing goal
5. Create a PROJECT action and let it migrate
6. Verify migrated project appears in list
7. Complete project (verify +100 XP base reward)

---

### Phase 4: Advanced Views (Estimated: 5-7 days)

### Pre-Phase Verification Checklist
> ⚠️ **IMPORTANT FOR AI AGENTS**: Before starting this phase, verify ALL items from Phase 3 are truly complete:
> 
> 1. **Check files exist**: Verify all Projects Manager components exist
> 2. **Check file contents**: Open each file and verify it contains the expected code
> 3. **Check for compilation errors**: Run `npm run build` or equivalent to ensure no TypeScript errors
> 4. **Test functionality**: Verify Projects Manager loads and all CRUD operations work
> 5. **Test integration**: Verify project migration from Actions works correctly
>
> If ANY item is incomplete, fix it before proceeding. Do not assume checkmarks are accurate.

**Goal**: Add Kanban board and Timeline views

#### Checklist
- [ ] Build Kanban Board
  - [ ] `ProjectBoard.tsx` component
  - [ ] Columns: To Do, In Progress, Blocked, Done
  - [ ] Drag-and-drop task cards
  - [ ] Update task status on drop
  - [ ] Mobile-friendly (swipe to change status)
- [ ] Build Timeline View
  - [ ] `ProjectTimeline.tsx` component
  - [ ] Gantt-style horizontal bars
  - [ ] Show start date, target date, current progress
  - [ ] Zoom controls (day, week, month)
  - [ ] Highlight overdue projects
- [ ] Add view switcher
  - [ ] Tabs: List, Board, Timeline
  - [ ] Save view preference
  - [ ] Smooth transitions
- [ ] Task dependencies
  - [ ] UI to set "depends on" relationship
  - [ ] Visual indicators of blocked tasks
  - [ ] Prevent moving task to "in progress" if blocked
- [ ] Advanced filtering
  - [ ] Filter by priority
  - [ ] Filter by due date range
  - [ ] Filter by linked goal
  - [ ] Search by title/description

#### Success Criteria
- [ ] Can drag tasks between Kanban columns
- [ ] Task status updates automatically
- [ ] Timeline view shows accurate dates
- [ ] Can zoom timeline in/out
- [ ] Blocked tasks visually indicated
- [ ] Can't start blocked tasks
- [ ] All filters work correctly
- [ ] Views transition smoothly

---

### Phase 5: AI Integration (Estimated: 4-5 days)

### Pre-Phase Verification Checklist
> ⚠️ **IMPORTANT FOR AI AGENTS**: Before starting this phase, verify ALL items from Phase 4 are truly complete:
> 
> 1. **Check files exist**: Verify Kanban and Timeline components exist
> 2. **Check file contents**: Open each file and verify it contains the expected code
> 3. **Check for compilation errors**: Run `npm run build` or equivalent to ensure no TypeScript errors
> 4. **Test functionality**: Verify all three views (List, Kanban, Timeline) work correctly
> 5. **Test drag-and-drop**: Verify task reordering and status changes work
>
> If ANY item is incomplete, fix it before proceeding. Do not assume checkmarks are accurate.

**Goal**: Add AI-powered project breakdown and suggestions

#### Checklist
- [ ] Build AI service
  - [ ] `useProjectAI.ts` hook
  - [ ] Call OpenAI API for project breakdown
  - [ ] Parse response into tasks
  - [ ] Handle errors gracefully
- [ ] Build AI UI components
  - [ ] `AIProjectBreakdown.tsx` panel
  - [ ] Input for project description
  - [ ] "Break down project" button
  - [ ] Display AI-generated tasks
  - [ ] "Add all" and "Add selected" buttons
- [ ] Smart suggestions
  - [ ] Suggest task dependencies
  - [ ] Suggest time estimates
  - [ ] Suggest priority levels
  - [ ] Suggest linked habits
- [ ] Integrate with ProjectForm
  - [ ] Option to use AI during project creation
  - [ ] Auto-populate tasks from AI
  - [ ] Edit AI suggestions before saving
- [ ] Link to Habits
  - [ ] AI suggests relevant habits for project
  - [ ] Display linked habits in project detail
  - [ ] Award bonus XP when completing habit + project task

#### Success Criteria
- [ ] Can describe project and get AI breakdown
- [ ] AI generates realistic task list
- [ ] Can edit AI suggestions before accepting
- [ ] Can add all or selected tasks
- [ ] AI suggests reasonable time estimates
- [ ] Habits integration works
- [ ] Demo mode shows placeholder AI suggestions

---

### Phase 6: Desktop Optimization (Estimated: 3-4 days)

### Pre-Phase Verification Checklist
> ⚠️ **IMPORTANT FOR AI AGENTS**: Before starting this phase, verify ALL items from Phase 5 are truly complete:
> 
> 1. **Check files exist**: Verify AI integration components exist
> 2. **Check file contents**: Open each file and verify it contains the expected code
> 3. **Check for compilation errors**: Run `npm run build` or equivalent to ensure no TypeScript errors
> 4. **Test functionality**: Verify AI project breakdown works correctly
> 5. **Test API integration**: Verify AI API calls work and handle errors gracefully
>
> If ANY item is incomplete, fix it before proceeding. Do not assume checkmarks are accurate.

**Goal**: Optimize UI for desktop with keyboard shortcuts and multi-panel layout

#### Checklist
- [ ] Responsive layout adjustments
  - [ ] Multi-column layout for large screens
  - [ ] Side-by-side project list + detail panel
  - [ ] Wider Kanban columns
  - [ ] Timeline spans full width
- [ ] Keyboard shortcuts
  - [ ] `N` - New action/project
  - [ ] `K` - Quick add action
  - [ ] `/` - Focus search
  - [ ] `1-3` - Switch views (List/Board/Timeline)
  - [ ] `Cmd/Ctrl + Enter` - Complete task
  - [ ] `Cmd/Ctrl + D` - Delete task
  - [ ] `Esc` - Close modal
- [ ] Desktop-specific features
  - [ ] Hover tooltips
  - [ ] Right-click context menus
  - [ ] Bulk select actions/tasks
  - [ ] Multi-select with Shift+Click
  - [ ] Drag-and-drop between projects
- [ ] Keyboard navigation
  - [ ] Tab through all interactive elements
  - [ ] Arrow keys to navigate lists
  - [ ] Enter to activate buttons
  - [ ] Focus indicators visible
- [ ] Desktop notifications
  - [ ] Browser notifications for expirations
  - [ ] Desktop badge for overdue tasks
  - [ ] System tray integration (if PWA)

#### Success Criteria
- [ ] Layout adapts to desktop screens
- [ ] All keyboard shortcuts work
- [ ] Keyboard navigation is smooth
- [ ] Context menus appear on right-click
- [ ] Bulk operations work correctly
- [ ] Desktop notifications appear
- [ ] UI feels native on desktop

---

## UI/UX Design

### Mobile-First Design Principles

#### Touch Targets
- **Minimum size**: 48x48px for all interactive elements
- **Spacing**: 8px minimum between tap targets
- **Swipe gestures**: Support swipe-to-delete, swipe-to-complete

#### Bottom Sheets
- **Actions menu**: Slide up from bottom
- **Project detail**: Full-screen modal on mobile
- **Quick add**: Fixed input at top, keyboard-aware

#### Visual Hierarchy
- **MUST DO**: Red accent, always at top
- **NICE TO DO**: Green accent, middle section
- **PROJECT**: Yellow accent, bottom section
- **Timers**: Small badge, upper-right corner
- **Completion checkbox**: Large, left side

### Desktop Adaptations

#### Layout
- **Two-column**: Project list (33%) + detail panel (67%)
- **Three-column**: List (25%) + Board (50%) + Properties (25%)
- **Toolbar**: Top bar with view switcher, filters, search

#### Interactions
- **Hover states**: Show action buttons on hover
- **Context menus**: Right-click for quick actions
- **Keyboard**: All features accessible via keyboard

### Accessibility

#### Screen Readers
- **ARIA labels**: All interactive elements
- **Live regions**: Announce completions and updates
- **Landmarks**: Proper semantic HTML

#### Keyboard Navigation
- **Tab order**: Logical flow through UI
- **Focus indicators**: Visible focus outlines
- **Shortcuts**: Discoverable via help modal

#### Color Contrast
- **WCAG AA**: 4.5:1 for normal text
- **WCAG AAA**: 7:1 for headings
- **Color blind safe**: Use icons + text, not just color

---

## Integration Points

### Goals Integration

**Purpose**: Connect projects to life goals for strategic alignment

#### Implementation
1. **Project-Goal Link**
   - `project.goal_id` references `life_goals.id`
   - Dropdown in ProjectForm to select goal
   - Display goal badge on project card

2. **Goal Dashboard**
   - Show active projects linked to each goal
   - Progress bar: projects completed / total projects
   - Quick link to create project for goal

3. **XP Synergy**
   - Bonus XP when completing project that advances goal milestone
   - Achievement: "Strategic Executor" - Link 10 projects to goals

---

### Habits Integration

**Purpose**: Link daily habits to project tasks for consistent progress

#### Implementation
1. **Habit-Task Link**
   - Suggest habits when creating project
   - Example: Project "Write a book" → Habit "Write 500 words daily"
   - Display linked habits in project detail

2. **Progress Tracking**
   - Show habit completion rate alongside task completion
   - Bonus XP when both habit + task completed on same day

3. **AI Suggestions**
   - AI recommends habits based on project type
   - User can accept or customize suggestions

---

### Gamification Integration

**Purpose**: Motivate users with XP, achievements, and streaks

#### XP Rewards

| Action | XP | Notes |
|--------|-----|-------|
| Complete MUST DO | 50 | Critical task |
| Complete NICE TO DO | 10 | Optional task |
| Complete PROJECT action | 25 | Multi-step task |
| Clear all MUST DO | +25 | Bonus for inbox zero |
| Complete project task | 20 | Subtask within project |
| Complete project | 100-500 | Based on size |
| Complete project on time | +50 | Bonus for meeting deadline |
| Complete project early | +100 | Bonus for early finish |

#### Achievements

1. **Action Hero** (Bronze) - Complete 10 actions
2. **Task Master** (Silver) - Complete 50 actions  
3. **Action Legend** (Gold) - Complete 200 actions
4. **Project Starter** (Bronze) - Create your first project
5. **Project Manager** (Silver) - Complete 5 projects
6. **Project Pro** (Gold) - Complete 20 projects
7. **Strategic Executor** (Gold) - Link 10 projects to goals
8. **Inbox Zero** (Silver) - Clear all MUST DO items 10 times
9. **On Time Delivery** (Gold) - Complete 10 projects on time
10. **Early Bird** (Diamond) - Complete 5 projects early

#### Streak Integration
- Complete at least 1 action daily to maintain streak
- Completing a project counts as activity for streak
- Award bonus XP at 7, 30, 100-day streaks for actions

---

## Success Metrics

### Phase 0: Foundation
- [ ] Migration runs without errors
- [ ] All RLS policies tested and working
- [ ] Services tested in isolation
- [ ] Demo mode functional

### Phase 1: Simple Actions Tab
- [ ] 100% feature parity with design mockups
- [ ] Actions can be created, completed, deleted
- [ ] XP awards working correctly
- [ ] Mobile UI is touch-friendly
- [ ] Demo mode fully functional

### Phase 2: Auto-Cleanup
- [ ] Timers display accurately
- [ ] Cleanup runs every hour reliably
- [ ] NICE TO DO actions auto-delete
- [ ] PROJECT actions auto-migrate
- [ ] Notifications sent before expiration

### Phase 3: Projects Foundation
- [x] Projects can be created and managed
- [x] Tasks can be added and completed
- [x] Progress tracking accurate
- [x] Goal linking works
- [x] Migration from actions seamless

### Phase 4: Advanced Views
- [ ] Kanban drag-and-drop smooth
- [ ] Timeline view shows accurate dates
- [ ] All filters work correctly
- [ ] Task dependencies enforced
- [ ] Mobile-friendly interactions

### Phase 5: AI Integration
- [ ] AI generates relevant tasks
- [ ] Suggestions can be edited
- [ ] Habits integration working
- [ ] Demo mode has placeholder AI

### Phase 6: Desktop Optimization
- [ ] Keyboard shortcuts work
- [ ] Layout adapts to desktop
- [ ] Desktop notifications appear
- [ ] Accessibility score 100%

---

## Known Issues & Future Considerations

### Known Limitations

1. **Offline Support**
   - Auto-cleanup requires online connection
   - Timer displays may drift if offline for extended period
   - **Workaround**: Queue cleanup operations with Background Sync

2. **Timezone Handling**
   - Expiration times are UTC-based
   - User timezone may cause confusion
   - **Solution Phase 3**: Convert to user's local timezone for display

3. **Scalability**
   - Large number of projects (100+) may slow down list view
   - **Solution Phase 4**: Implement pagination or virtual scrolling

4. **AI Rate Limits**
   - OpenAI API has rate limits
   - **Solution Phase 5**: Implement request queue and caching

### Future Enhancements (Post-Phase 6)

1. **Collaboration** - Share projects with other users
2. **Templates** - Pre-built project templates
3. **Recurring Actions** - Daily, weekly, monthly actions
4. **Advanced Analytics** - Time tracking and burndown charts
5. **Calendar Integration** - Sync tasks to Google Calendar
6. **Voice Input** - Dictate actions and projects
7. **Smart Prioritization** - AI suggests task order

---

## Appendix: UI Mockups

### Actions Tab - Mobile View

```
┌─────────────────────────┐
│ Actions            [+]  │
├─────────────────────────┤
│ [Quick add action...]   │
├─────────────────────────┤
│ 🔴 MUST DO (2)          │
│ ┌─────────────────────┐ │
│ │ ☐ Pay rent      2d ⏱│ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ ☐ Call dentist    ∞│ │
│ └─────────────────────┘ │
├─────────────────────────┤
│ 🟢 NICE TO DO (1)       │
│ ┌─────────────────────┐ │
│ │ ☐ Read article  1d ⏱│ │
│ └─────────────────────┘ │
├─────────────────────────┤
│ 🟡 PROJECT (1)          │
│ ┌─────────────────────┐ │
│ │ ☐ Plan vacation 3h ⏱│ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

### Projects Manager - Desktop View

```
┌──────────────────────────────────────────────────────────────┐
│ Projects                   [List] [Board] [Timeline]  [+ New]│
├─────────────────────┬────────────────────────────────────────┤
│ 🟢 Active Projects  │ 📋 Project: Launch Website            │
│ ┌─────────────────┐│ Goal: Grow Business                    │
│ │ Launch Website  ││ Progress: 5/10 tasks (50%)             │
│ │ 50% • 5d left   ││ Due: Jan 30, 2026                      │
│ └─────────────────┘││                                        │
│ ┌─────────────────┐│ Tasks:                                 │
│ │ Write Book      ││ ☑ Domain registration                  │
│ │ 25% • 20d left  ││ ☑ Design mockups                       │
│ └─────────────────┘││ ☐ Frontend development                 │
│                     ││ ☐ Backend API                          │
│ 📝 Planning (2)     ││ ☐ Content migration                    │
│ ⏸️ On Hold (1)      ││                                        │
│ ✅ Completed (5)    ││ [Add Task] [🤖 AI Breakdown] [⋮ More] │
└─────────────────────┴────────────────────────────────────────┘
```

---

## Conclusion

This development plan provides a **complete roadmap** for building the Actions Feature from foundation to full desktop optimization. Each phase is:

- **Self-contained**: Can be completed independently
- **Testable**: Includes success criteria and verification steps  
- **AI-friendly**: Clear instructions for any agent to resume work
- **User-focused**: Prioritizes mobile-first, then desktop enhancement
- **Integrated**: Connects seamlessly with Goals, Habits, and Gamification

**Next Steps After This PR Merges**:
1. Begin Phase 0: Create database migration
2. Define TypeScript types in `src/types/actions.ts`
3. Build service layer in `src/services/actions.ts` and `src/services/projects.ts`
4. Test services in isolation
5. Proceed to Phase 1: Build mobile UI

**Total Estimated Timeline**: 6-8 weeks (assuming 1 developer, part-time work)

**Ready to build!** 🚀

---

## Verification Log

| Date | Phase | Verified By | Status | Notes |
|------|-------|-------------|--------|-------|
| 2026-01-14 | Phase 0 | AI Agent | ✅ Complete | Created migration 0129_actions_feature.sql, types/actions.ts, services/actions.ts, services/projects.ts. Fixed FK reference from life_goals to goals. All demo mode functions implemented in demoData.ts |
| 2026-01-14 | Phase 1 | AI Agent | ✅ Complete | Refactored ActionsTab into modular structure with separate components (ActionItem, ActionsList, QuickAddAction, CategoryHeader, ActionEmptyState) and hooks (useActions, useActionXP). Integrated with existing gamification system. All components properly typed and mobile-first CSS maintained. |
| 2026-01-14 | Phase 2 | AI Agent | ✅ Complete | Implemented ActionTimer component with countdown display, actionsCleanup.ts service for deleting expired NICE TO DO actions, actionsMigration.ts for migrating PROJECT actions to full projects, useActionNotifications.ts hook for expiration alerts, and Edge Function for server-side cleanup. All services support demo mode. Build passes successfully. |
| 2026-01-14 | Phase 3 | AI Agent | ✅ Complete | Implemented full Projects Manager UI with ProjectsManager container, ProjectList/ProjectCard for display, ProjectDetail panel with TaskList/TaskItem components, ProjectForm modal, ProjectProgress bar, ProjectGoalLink dropdown. Created useProjects, useProjectTasks, useProjectProgress hooks with XP integration. Added Projects to navigation in App.tsx. Mobile-first responsive CSS implemented. Build passes successfully. |
