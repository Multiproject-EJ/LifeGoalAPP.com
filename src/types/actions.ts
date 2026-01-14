// TypeScript types for the Actions feature
// Reference: ACTIONS_FEATURE_DEV_PLAN.md

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

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent';

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

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done';

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

export const TASK_STATUS_CONFIG = {
  todo: { label: 'To Do', icon: '📋', color: '#6b7280' },
  in_progress: { label: 'In Progress', icon: '🔄', color: '#3b82f6' },
  blocked: { label: 'Blocked', icon: '🚫', color: '#ef4444' },
  done: { label: 'Done', icon: '✅', color: '#10b981' },
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
  migrated_to_project_id?: string;
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

export interface CreateProjectTaskInput {
  project_id: string;
  title: string;
  description?: string;
  parent_task_id?: string;
  depends_on_task_id?: string;
  due_date?: string;
  estimated_hours?: number;
}

export interface UpdateProjectTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  parent_task_id?: string;
  depends_on_task_id?: string;
  completed?: boolean;
  due_date?: string;
  order_index?: number;
  estimated_hours?: number;
  actual_hours?: number;
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

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Calculate time remaining for an action
 */
export function calculateTimeRemaining(expiresAt: string): {
  daysRemaining: number;
  hoursRemaining: number;
  isExpiringSoon: boolean;
  isExpired: boolean;
} {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffMs = expires.getTime() - now.getTime();

  if (diffMs <= 0) {
    return {
      daysRemaining: 0,
      hoursRemaining: 0,
      isExpiringSoon: false, // Already expired, not "expiring soon"
      isExpired: true,
    };
  }

  const hoursTotal = diffMs / (1000 * 60 * 60);
  const daysRemaining = Math.floor(hoursTotal / 24);
  const hoursRemaining = Math.floor(hoursTotal % 24);
  const isExpiringSoon = hoursTotal < 24;

  return {
    daysRemaining,
    hoursRemaining,
    isExpiringSoon,
    isExpired: false,
  };
}

/**
 * Calculate project progress percentage
 */
export function calculateProjectProgress(
  totalTasks: number,
  completedTasks: number
): number {
  if (totalTasks === 0) return 0;
  return Math.round((completedTasks / totalTasks) * 100);
}

/**
 * Get XP reward for completing an action based on category
 */
export function getActionXpReward(category: ActionCategory): number {
  switch (category) {
    case 'must_do':
      return ACTIONS_XP_REWARDS.COMPLETE_MUST_DO;
    case 'nice_to_do':
      return ACTIONS_XP_REWARDS.COMPLETE_NICE_TO_DO;
    case 'project':
      return ACTIONS_XP_REWARDS.COMPLETE_PROJECT_ACTION;
    default:
      return 0;
  }
}
