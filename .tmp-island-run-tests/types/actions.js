"use strict";
// TypeScript types for the Actions feature
// Reference: ACTIONS_FEATURE_DEV_PLAN.md
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEMO_PROJECT_TASKS_KEY = exports.DEMO_PROJECTS_KEY = exports.DEMO_ACTIONS_KEY = exports.TASK_STATUS_CONFIG = exports.PROJECT_STATUS_CONFIG = exports.ACTION_CATEGORY_CONFIG = exports.ACTIONS_XP_REWARDS = void 0;
exports.calculateTimeRemaining = calculateTimeRemaining;
exports.calculateProjectProgress = calculateProjectProgress;
exports.getActionXpReward = getActionXpReward;
// =====================================================
// XP REWARDS
// =====================================================
exports.ACTIONS_XP_REWARDS = {
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
};
// =====================================================
// CATEGORY LABELS AND ICONS
// =====================================================
exports.ACTION_CATEGORY_CONFIG = {
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
};
exports.PROJECT_STATUS_CONFIG = {
    planning: { label: 'Planning', icon: '📝', color: '#6b7280' },
    active: { label: 'Active', icon: '🚀', color: '#3b82f6' },
    on_hold: { label: 'On Hold', icon: '⏸️', color: '#f59e0b' },
    completed: { label: 'Completed', icon: '✅', color: '#10b981' },
    archived: { label: 'Archived', icon: '📦', color: '#9ca3af' },
};
exports.TASK_STATUS_CONFIG = {
    todo: { label: 'To Do', icon: '📋', color: '#6b7280' },
    in_progress: { label: 'In Progress', icon: '🔄', color: '#3b82f6' },
    blocked: { label: 'Blocked', icon: '🚫', color: '#ef4444' },
    done: { label: 'Done', icon: '✅', color: '#10b981' },
};
// =====================================================
// DEMO MODE TYPES
// =====================================================
exports.DEMO_ACTIONS_KEY = 'lifegoal_demo_actions';
exports.DEMO_PROJECTS_KEY = 'lifegoal_demo_projects';
exports.DEMO_PROJECT_TASKS_KEY = 'lifegoal_demo_project_tasks';
// =====================================================
// UTILITY FUNCTIONS
// =====================================================
/**
 * Calculate time remaining for an action
 */
function calculateTimeRemaining(expiresAt) {
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
function calculateProjectProgress(totalTasks, completedTasks) {
    if (totalTasks === 0)
        return 0;
    return Math.round((completedTasks / totalTasks) * 100);
}
/**
 * Get XP reward for completing an action based on category
 */
function getActionXpReward(category) {
    switch (category) {
        case 'must_do':
            return exports.ACTIONS_XP_REWARDS.COMPLETE_MUST_DO;
        case 'nice_to_do':
            return exports.ACTIONS_XP_REWARDS.COMPLETE_NICE_TO_DO;
        case 'project':
            return exports.ACTIONS_XP_REWARDS.COMPLETE_PROJECT_ACTION;
        default:
            return 0;
    }
}
