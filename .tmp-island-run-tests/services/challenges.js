"use strict";
// Challenge System service for daily and weekly gamification challenges
// Supports demo mode via localStorage with deterministic challenge generation
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureChallengeState = ensureChallengeState;
exports.incrementChallengeProgress = incrementChallengeProgress;
exports.recordChallengeActivity = recordChallengeActivity;
exports.getActiveChallenges = getActiveChallenges;
exports.getChallengeStats = getChallengeStats;
const gamification_1 = require("../types/gamification");
// =====================================================
// CHALLENGE DEFINITIONS
// =====================================================
const DAILY_CHALLENGES = [
    {
        id: 'daily-habits-3',
        title: 'Complete 3 habits today',
        description: 'Mark at least 3 habits as done before the day ends.',
        icon: '✅',
        period: 'daily',
        category: 'habit',
        targetValue: 3,
        xpReward: gamification_1.XP_REWARDS.CHALLENGE_DAILY,
    },
    {
        id: 'daily-habits-5',
        title: 'High-five habits',
        description: 'Complete 5 habits in a single day.',
        icon: '🖐️',
        period: 'daily',
        category: 'habit',
        targetValue: 5,
        xpReward: gamification_1.XP_REWARDS.CHALLENGE_DAILY,
    },
    {
        id: 'daily-journal-1',
        title: 'Reflect and write',
        description: 'Write at least one journal entry today.',
        icon: '📝',
        period: 'daily',
        category: 'journal',
        targetValue: 1,
        xpReward: gamification_1.XP_REWARDS.CHALLENGE_DAILY,
    },
    {
        id: 'daily-checkin-1',
        title: 'Life wheel check-in',
        description: 'Complete a life wheel check-in today.',
        icon: '🎯',
        period: 'daily',
        category: 'checkin',
        targetValue: 1,
        xpReward: gamification_1.XP_REWARDS.CHALLENGE_DAILY,
    },
    {
        id: 'daily-early-2',
        title: 'Early bird',
        description: 'Complete 2 habits before 9 AM.',
        icon: '🌅',
        period: 'daily',
        category: 'habit',
        targetValue: 2,
        xpReward: gamification_1.XP_REWARDS.CHALLENGE_DAILY,
    },
    {
        id: 'daily-mixed-streak',
        title: 'Keep the fire burning',
        description: 'Continue your streak by completing at least 1 activity today.',
        icon: '🔥',
        period: 'daily',
        category: 'streak',
        targetValue: 1,
        xpReward: gamification_1.XP_REWARDS.CHALLENGE_DAILY,
    },
];
const WEEKLY_CHALLENGES = [
    {
        id: 'weekly-habits-15',
        title: 'Habit marathon',
        description: 'Complete 15 habits this week across any category.',
        icon: '🏃',
        period: 'weekly',
        category: 'habit',
        targetValue: 15,
        xpReward: gamification_1.XP_REWARDS.CHALLENGE_WEEKLY,
    },
    {
        id: 'weekly-journal-3',
        title: 'Thoughtful week',
        description: 'Write 3 journal entries this week.',
        icon: '📖',
        period: 'weekly',
        category: 'journal',
        targetValue: 3,
        xpReward: gamification_1.XP_REWARDS.CHALLENGE_WEEKLY,
    },
    {
        id: 'weekly-checkin-2',
        title: 'Balance check',
        description: 'Complete 2 life wheel check-ins this week.',
        icon: '⚖️',
        period: 'weekly',
        category: 'checkin',
        targetValue: 2,
        xpReward: gamification_1.XP_REWARDS.CHALLENGE_WEEKLY,
    },
    {
        id: 'weekly-streak-5',
        title: 'Five-day streak',
        description: 'Maintain a 5-day activity streak this week.',
        icon: '🔥',
        period: 'weekly',
        category: 'streak',
        targetValue: 5,
        xpReward: gamification_1.XP_REWARDS.CHALLENGE_WEEKLY,
    },
    {
        id: 'weekly-perfect-3',
        title: 'Perfect trio',
        description: 'Complete all your daily habits on 3 separate days this week.',
        icon: '⭐',
        period: 'weekly',
        category: 'mixed',
        targetValue: 3,
        xpReward: gamification_1.XP_REWARDS.CHALLENGE_WEEKLY,
    },
    {
        id: 'weekly-habits-25',
        title: 'Consistency champion',
        description: 'Complete 25 habits this week to prove your dedication.',
        icon: '🏆',
        period: 'weekly',
        category: 'habit',
        targetValue: 25,
        xpReward: gamification_1.XP_REWARDS.CHALLENGE_WEEKLY,
    },
];
// =====================================================
// HELPER FUNCTIONS
// =====================================================
function normalizeDate(date) {
    return date.toISOString().slice(0, 10);
}
function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}
function getWeekEndDate(date) {
    const monday = getMonday(date);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    return normalizeDate(sunday);
}
/** Deterministic selection based on a seed string */
function selectByHash(seed, pool, count) {
    if (pool.length <= count)
        return [...pool];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
    }
    const indices = new Set();
    let attempt = Math.abs(hash);
    while (indices.size < count) {
        indices.add(attempt % pool.length);
        attempt = ((attempt * 31 + 7) | 0) >>> 0;
    }
    return Array.from(indices).map((i) => pool[i]);
}
function buildInstance(def, startDate, endDate) {
    return {
        id: `${def.id}-${startDate}`,
        definitionId: def.id,
        title: def.title,
        description: def.description,
        icon: def.icon,
        period: def.period,
        category: def.category,
        targetValue: def.targetValue,
        currentProgress: 0,
        xpReward: def.xpReward,
        status: 'active',
        startDate,
        endDate,
    };
}
// =====================================================
// STATE MANAGEMENT (localStorage)
// =====================================================
function loadState(userId) {
    try {
        const stored = localStorage.getItem(`${gamification_1.DEMO_CHALLENGES_KEY}_${userId}`);
        return stored ? JSON.parse(stored) : null;
    }
    catch {
        return null;
    }
}
function saveState(userId, state) {
    localStorage.setItem(`${gamification_1.DEMO_CHALLENGES_KEY}_${userId}`, JSON.stringify(state));
}
// =====================================================
// PUBLIC API
// =====================================================
/**
 * Load or create the challenge state, rotating daily/weekly challenges as needed.
 */
function ensureChallengeState(userId, now = new Date()) {
    const today = normalizeDate(now);
    const weekStart = normalizeDate(getMonday(now));
    const weekEnd = getWeekEndDate(now);
    const existing = loadState(userId);
    let dailyChallenges;
    let weeklyChallenges;
    let totalCompleted = existing?.totalChallengesCompleted ?? 0;
    // Rotate daily challenges if needed
    if (existing && existing.lastDailyReset === today) {
        dailyChallenges = existing.dailyChallenges;
    }
    else {
        const seed = `${userId}-daily-${today}`;
        const picked = selectByHash(seed, DAILY_CHALLENGES, 3);
        dailyChallenges = picked.map((def) => buildInstance(def, today, today));
    }
    // Rotate weekly challenges if needed
    if (existing && existing.lastWeeklyReset === weekStart) {
        weeklyChallenges = existing.weeklyChallenges;
    }
    else {
        const seed = `${userId}-weekly-${weekStart}`;
        const picked = selectByHash(seed, WEEKLY_CHALLENGES, 2);
        weeklyChallenges = picked.map((def) => buildInstance(def, weekStart, weekEnd));
    }
    const state = {
        userId,
        dailyChallenges,
        weeklyChallenges,
        lastDailyReset: today,
        lastWeeklyReset: weekStart,
        totalChallengesCompleted: totalCompleted,
    };
    saveState(userId, state);
    return state;
}
/**
 * Increment progress on a challenge. Returns the updated challenge and whether it was just completed.
 */
function incrementChallengeProgress(userId, challengeId, amount = 1) {
    const state = ensureChallengeState(userId);
    let justCompleted = false;
    let updatedChallenge = null;
    const updateList = (list) => list.map((challenge) => {
        if (challenge.id !== challengeId || challenge.status !== 'active')
            return challenge;
        const newProgress = Math.min(challenge.currentProgress + amount, challenge.targetValue);
        const wasIncomplete = challenge.status === 'active' && challenge.currentProgress < challenge.targetValue;
        const isNowComplete = newProgress >= challenge.targetValue;
        const newStatus = isNowComplete ? 'completed' : 'active';
        if (wasIncomplete && isNowComplete) {
            justCompleted = true;
            state.totalChallengesCompleted += 1;
        }
        const updated = {
            ...challenge,
            currentProgress: newProgress,
            status: newStatus,
            completedAt: isNowComplete ? new Date().toISOString() : undefined,
        };
        updatedChallenge = updated;
        return updated;
    });
    state.dailyChallenges = updateList(state.dailyChallenges);
    state.weeklyChallenges = updateList(state.weeklyChallenges);
    saveState(userId, state);
    return { state, challenge: updatedChallenge, justCompleted };
}
/**
 * Record a user activity and automatically increment matching challenges.
 * Returns challenges that were just completed.
 */
function recordChallengeActivity(userId, activityType, amount = 1) {
    const state = ensureChallengeState(userId);
    const justCompleted = [];
    const matchCategory = (challenge) => {
        switch (activityType) {
            case 'habit_complete':
                return challenge.category === 'habit';
            case 'journal_entry':
                return challenge.category === 'journal';
            case 'checkin_complete':
                return challenge.category === 'checkin';
            case 'streak_day':
                return challenge.category === 'streak';
            case 'perfect_day':
                return challenge.category === 'mixed';
            default:
                return false;
        }
    };
    const allChallenges = [...state.dailyChallenges, ...state.weeklyChallenges];
    for (const challenge of allChallenges) {
        if (challenge.status !== 'active' || !matchCategory(challenge))
            continue;
        const result = incrementChallengeProgress(userId, challenge.id, amount);
        if (result.justCompleted && result.challenge) {
            justCompleted.push(result.challenge);
        }
    }
    return justCompleted;
}
/**
 * Get all active challenges (daily + weekly).
 */
function getActiveChallenges(userId, now = new Date()) {
    const state = ensureChallengeState(userId, now);
    return [...state.dailyChallenges, ...state.weeklyChallenges];
}
/**
 * Get summary stats.
 */
function getChallengeStats(userId) {
    const state = ensureChallengeState(userId);
    const dailyCompleted = state.dailyChallenges.filter((c) => c.status === 'completed').length;
    const weeklyCompleted = state.weeklyChallenges.filter((c) => c.status === 'completed').length;
    return {
        totalCompleted: state.totalChallengesCompleted,
        dailyCompleted,
        weeklyCompleted,
        dailyTotal: state.dailyChallenges.length,
        weeklyTotal: state.weeklyChallenges.length,
    };
}
