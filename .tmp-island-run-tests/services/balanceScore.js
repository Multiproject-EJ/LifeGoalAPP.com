"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BALANCE_STATUS_META = exports.BALANCE_AXES = void 0;
exports.createBalanceSnapshot = createBalanceSnapshot;
exports.getBalanceWeekId = getBalanceWeekId;
exports.hasBalanceBonus = hasBalanceBonus;
const LifeWheelCheckins_1 = require("../features/checkins/LifeWheelCheckins");
const supabaseClient_1 = require("../lib/supabaseClient");
const gamification_1 = require("../types/gamification");
exports.BALANCE_AXES = [
    {
        key: 'agency',
        title: 'Agency',
        description: 'Build momentum with intentional career and financial moves.',
        categories: ['career_development', 'finance_wealth'],
    },
    {
        key: 'awareness',
        title: 'Awareness',
        description: 'Stay present with creativity, reflection, and community energy.',
        categories: ['spirituality_community', 'fun_creativity'],
    },
    {
        key: 'rationality',
        title: 'Rationality',
        description: 'Keep your surroundings and relationships clear and aligned.',
        categories: ['living_spaces', 'love_relations'],
    },
    {
        key: 'vitality',
        title: 'Vitality',
        description: 'Protect your energy through health and supportive relationships.',
        categories: ['health_fitness', 'family_friends'],
    },
];
exports.BALANCE_STATUS_META = {
    harmonized: {
        label: 'Harmonized',
        description: 'Your Game of Life rhythms are balanced and moving in sync.',
    },
    steady: {
        label: 'Steady',
        description: 'You are holding a good baseline with small gaps to refine.',
    },
    rebalancing: {
        label: 'Rebalancing',
        description: 'One or two areas need extra care to restore harmony.',
    },
};
const AXIS_BANDS = [
    { key: 'strong', min: 8, label: 'Thriving' },
    { key: 'steady', min: 5, label: 'Steady' },
    { key: 'focus', min: 0, label: 'Needs focus' },
];
function createBalanceSnapshot(checkins) {
    if (checkins.length === 0)
        return null;
    const ordered = [...checkins].sort((a, b) => b.date.localeCompare(a.date));
    const latest = ordered[0];
    const previous = ordered[1];
    const latestScores = parseScores(latest);
    const previousScores = previous ? parseScores(previous) : null;
    const axes = exports.BALANCE_AXES.map((axis) => {
        const score = average(axis.categories.map((category) => latestScores[category]));
        const prevScore = previousScores
            ? average(axis.categories.map((category) => previousScores[category]))
            : null;
        const delta = prevScore !== null ? Number((score - prevScore).toFixed(1)) : null;
        return {
            key: axis.key,
            title: axis.title,
            description: axis.description,
            score,
            band: getAxisBand(score),
            delta,
        };
    });
    const scores = axes.map((axis) => axis.score);
    const averageScore = average(scores);
    const spread = Number((Math.max(...scores) - Math.min(...scores)).toFixed(1));
    const harmonyScore = Math.max(0, Math.min(100, Math.round(averageScore * 10 - spread * 4)));
    const harmonyStatus = getHarmonyStatus(averageScore, spread);
    const previousAverage = previousScores
        ? average(exports.BALANCE_AXES.map((axis) => average(axis.categories.map((category) => previousScores[category]))))
        : null;
    const trendDelta = previousAverage !== null ? Number((averageScore - previousAverage).toFixed(1)) : null;
    const trendDirection = getTrendDirection(trendDelta);
    const nextFocus = [...axes].sort((a, b) => a.score - b.score)[0];
    return {
        referenceDate: latest.date,
        axes,
        averageScore,
        spread,
        harmonyScore,
        harmonyStatus,
        trendDelta,
        trendDirection,
        nextFocus,
    };
}
function getBalanceWeekId(date) {
    const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    const weekNumber = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${target.getUTCFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
}
async function hasBalanceBonus(userId, weekId) {
    if (!(0, supabaseClient_1.canUseSupabaseData)()) {
        const transactions = JSON.parse(localStorage.getItem(gamification_1.DEMO_TRANSACTIONS_KEY) || '[]');
        return transactions.some((transaction) => transaction.source_type === 'balance_week' && transaction.source_id === weekId);
    }
    const supabase = (0, supabaseClient_1.getSupabaseClient)();
    const { count, error } = await supabase
        .from('xp_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('source_type', 'balance_week')
        .eq('source_id', weekId);
    if (error) {
        return false;
    }
    return (count ?? 0) > 0;
}
function getAxisBand(score) {
    const match = AXIS_BANDS.find((band) => score >= band.min);
    return match?.key ?? 'focus';
}
function getHarmonyStatus(averageScore, spread) {
    if (averageScore >= 7 && spread <= 2)
        return 'harmonized';
    if (averageScore >= 5 && spread <= 3)
        return 'steady';
    return 'rebalancing';
}
function getTrendDirection(delta) {
    if (delta === null)
        return 'new';
    if (delta > 0.2)
        return 'up';
    if (delta < -0.2)
        return 'down';
    return 'steady';
}
function parseScores(checkin) {
    const initial = LifeWheelCheckins_1.LIFE_WHEEL_CATEGORIES.reduce((acc, category) => {
        acc[category.key] = 0;
        return acc;
    }, {});
    if (checkin.scores && typeof checkin.scores === 'object' && !Array.isArray(checkin.scores)) {
        const record = checkin.scores;
        LifeWheelCheckins_1.LIFE_WHEEL_CATEGORIES.forEach((category) => {
            const value = record[category.key];
            if (typeof value === 'number' && !Number.isNaN(value)) {
                initial[category.key] = clampScore(value);
            }
        });
    }
    return initial;
}
function clampScore(value) {
    return Math.min(10, Math.max(0, Math.round(value * 10) / 10));
}
function average(values) {
    if (values.length === 0)
        return 0;
    const total = values.reduce((sum, value) => sum + value, 0);
    return Number((total / values.length).toFixed(1));
}
