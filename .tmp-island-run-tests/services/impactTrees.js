"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getImpactTreeLedger = getImpactTreeLedger;
exports.consumeImpactTreeCelebration = consumeImpactTreeCelebration;
exports.hasWeeklyTreeAward = hasWeeklyTreeAward;
exports.awardWeeklyClosureTree = awardWeeklyClosureTree;
exports.awardLevelUpTreeMilestones = awardLevelUpTreeMilestones;
exports.awardStreakTreeMilestone = awardStreakTreeMilestone;
const balanceScore_1 = require("./balanceScore");
const telemetry_1 = require("./telemetry");
const LEDGER_STORAGE_KEY = 'lifegoal_tree_of_life_ledger';
const WEEKLY_AWARD_KEY = 'lifegoal_impact_trees_weekly_awards';
const LEVEL_AWARD_KEY = 'lifegoal_impact_trees_level_awards';
const STREAK_AWARD_KEY = 'lifegoal_impact_trees_streak_awards';
const CELEBRATION_KEY = 'lifegoal_impact_trees_celebration';
const STREAK_TREE_MILESTONES = {
    7: {
        source: 'streak_milestone',
        amount: 1,
        notes: '7-day streak honored. Your Tree of Life grew stronger. 🌱',
    },
    14: {
        source: 'streak_milestone',
        amount: 2,
        notes: '14-day streak honored. Your Tree of Life flourished. 🌿',
    },
    30: {
        source: 'streak_milestone',
        amount: 3,
        notes: '30-day streak honored. Your Tree of Life grew mightier. 🌳',
    },
    100: {
        source: 'streak_milestone',
        amount: 5,
        notes: '100-day streak honored. Your Tree of Life became legendary. 🏆',
    },
};
function getStorageKey(base, userId) {
    return `${base}:${userId}`;
}
function isImpactTreeEntry(entry) {
    if (!entry || typeof entry !== 'object')
        return false;
    const value = entry;
    return (typeof value.id === 'string' &&
        typeof value.date === 'string' &&
        typeof value.source === 'string' &&
        typeof value.amount === 'number');
}
function readCelebration(userId) {
    if (typeof window === 'undefined')
        return null;
    try {
        const raw = window.localStorage.getItem(getStorageKey(CELEBRATION_KEY, userId));
        if (!raw)
            return null;
        const parsed = JSON.parse(raw);
        return isImpactTreeEntry(parsed) ? parsed : null;
    }
    catch (error) {
        console.warn('Unable to read Tree of Life celebration.', error);
        return null;
    }
}
function writeCelebration(userId, entry) {
    if (typeof window === 'undefined')
        return;
    try {
        window.localStorage.setItem(getStorageKey(CELEBRATION_KEY, userId), JSON.stringify(entry));
    }
    catch (error) {
        console.warn('Unable to persist Tree of Life celebration.', error);
    }
}
function clearCelebration(userId) {
    if (typeof window === 'undefined')
        return;
    try {
        window.localStorage.removeItem(getStorageKey(CELEBRATION_KEY, userId));
    }
    catch (error) {
        console.warn('Unable to clear Tree of Life celebration.', error);
    }
}
function readLedger(userId) {
    if (typeof window === 'undefined')
        return [];
    try {
        const raw = window.localStorage.getItem(getStorageKey(LEDGER_STORAGE_KEY, userId));
        if (!raw)
            return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch (error) {
        console.warn('Unable to read Tree of Life ledger.', error);
        return [];
    }
}
function writeLedger(userId, entries) {
    if (typeof window === 'undefined')
        return;
    try {
        window.localStorage.setItem(getStorageKey(LEDGER_STORAGE_KEY, userId), JSON.stringify(entries));
    }
    catch (error) {
        console.warn('Unable to persist Tree of Life ledger.', error);
    }
}
function readWeeklyAwards(userId) {
    if (typeof window === 'undefined')
        return [];
    try {
        const raw = window.localStorage.getItem(getStorageKey(WEEKLY_AWARD_KEY, userId));
        if (!raw)
            return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch (error) {
        console.warn('Unable to read Tree of Life weekly awards.', error);
        return [];
    }
}
function writeWeeklyAwards(userId, weeks) {
    if (typeof window === 'undefined')
        return;
    try {
        window.localStorage.setItem(getStorageKey(WEEKLY_AWARD_KEY, userId), JSON.stringify(weeks));
    }
    catch (error) {
        console.warn('Unable to persist Tree of Life weekly awards.', error);
    }
}
function readLevelAwards(userId) {
    if (typeof window === 'undefined')
        return [];
    try {
        const raw = window.localStorage.getItem(getStorageKey(LEVEL_AWARD_KEY, userId));
        if (!raw)
            return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch (error) {
        console.warn('Unable to read Tree of Life level awards.', error);
        return [];
    }
}
function writeLevelAwards(userId, levels) {
    if (typeof window === 'undefined')
        return;
    try {
        window.localStorage.setItem(getStorageKey(LEVEL_AWARD_KEY, userId), JSON.stringify(levels));
    }
    catch (error) {
        console.warn('Unable to persist Tree of Life level awards.', error);
    }
}
function readStreakAwards(userId) {
    if (typeof window === 'undefined')
        return [];
    try {
        const raw = window.localStorage.getItem(getStorageKey(STREAK_AWARD_KEY, userId));
        if (!raw)
            return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch (error) {
        console.warn('Unable to read Tree of Life streak awards.', error);
        return [];
    }
}
function writeStreakAwards(userId, streaks) {
    if (typeof window === 'undefined')
        return;
    try {
        window.localStorage.setItem(getStorageKey(STREAK_AWARD_KEY, userId), JSON.stringify(streaks));
    }
    catch (error) {
        console.warn('Unable to persist Tree of Life streak awards.', error);
    }
}
function createId() {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return `impact-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function getImpactTreeLedger(userId) {
    const entries = readLedger(userId)
        .filter((entry) => entry && typeof entry.amount === 'number')
        .sort((a, b) => b.date.localeCompare(a.date));
    const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
    return { entries, total };
}
function consumeImpactTreeCelebration(userId) {
    const entry = readCelebration(userId);
    if (entry) {
        clearCelebration(userId);
    }
    return entry;
}
function hasWeeklyTreeAward(userId, referenceDate) {
    const weekId = (0, balanceScore_1.getBalanceWeekId)(referenceDate);
    const weeks = readWeeklyAwards(userId);
    return weeks.includes(weekId);
}
function awardWeeklyClosureTree(userId, referenceDate) {
    const weekId = (0, balanceScore_1.getBalanceWeekId)(referenceDate);
    const weeks = readWeeklyAwards(userId);
    const ledger = readLedger(userId);
    if (weeks.includes(weekId)) {
        const summary = getImpactTreeLedger(userId);
        return { awarded: false, entry: null, entries: summary.entries, total: summary.total };
    }
    const entry = {
        id: createId(),
        date: referenceDate.toISOString(),
        source: 'weekly_closure',
        amount: 1,
        notes: 'Weekly closure ritual completed (Tree of Life watered).',
        partnerBatchId: null,
    };
    const nextEntries = [entry, ...ledger];
    writeLedger(userId, nextEntries);
    writeWeeklyAwards(userId, [...weeks, weekId]);
    const summary = getImpactTreeLedger(userId);
    return { awarded: true, entry, entries: summary.entries, total: summary.total };
}
function awardLevelUpTreeMilestones(userId, levels, referenceDate) {
    if (!levels.length) {
        const summary = getImpactTreeLedger(userId);
        return { awarded: false, entries: summary.entries, total: summary.total };
    }
    const awardedLevels = readLevelAwards(userId);
    const ledger = readLedger(userId);
    const newLevels = levels.filter((level) => !awardedLevels.includes(level));
    if (newLevels.length === 0) {
        const summary = getImpactTreeLedger(userId);
        return { awarded: false, entries: summary.entries, total: summary.total };
    }
    const entries = newLevels.map((level) => ({
        id: createId(),
        date: referenceDate.toISOString(),
        source: 'level_up',
        amount: 1,
        notes: `Reached level ${level}.`,
        partnerBatchId: `level-${level}`,
    }));
    const nextEntries = [...entries, ...ledger];
    writeLedger(userId, nextEntries);
    writeLevelAwards(userId, [...awardedLevels, ...newLevels].sort((a, b) => a - b));
    const summary = getImpactTreeLedger(userId);
    return { awarded: true, entries: summary.entries, total: summary.total };
}
function awardStreakTreeMilestone(userId, streakDays, referenceDate) {
    const milestone = STREAK_TREE_MILESTONES[streakDays];
    if (!milestone) {
        const summary = getImpactTreeLedger(userId);
        return { awarded: false, entry: null, entries: summary.entries, total: summary.total };
    }
    const awardedStreaks = readStreakAwards(userId);
    if (awardedStreaks.includes(streakDays)) {
        const summary = getImpactTreeLedger(userId);
        return { awarded: false, entry: null, entries: summary.entries, total: summary.total };
    }
    const ledger = readLedger(userId);
    const entry = {
        id: createId(),
        date: referenceDate.toISOString(),
        source: milestone.source,
        amount: milestone.amount,
        notes: milestone.notes,
        partnerBatchId: `streak-${streakDays}`,
    };
    const nextEntries = [entry, ...ledger];
    writeLedger(userId, nextEntries);
    writeStreakAwards(userId, [...awardedStreaks, streakDays].sort((a, b) => a - b));
    writeCelebration(userId, entry);
    void (0, telemetry_1.recordTelemetryEvent)({
        userId,
        eventType: 'tree_of_life_awarded',
        metadata: {
            streakDays,
            source: 'streak_milestone',
            entryId: entry.id,
            amount: milestone.amount,
        },
    });
    const summary = getImpactTreeLedger(userId);
    return { awarded: true, entry, entries: summary.entries, total: summary.total };
}
