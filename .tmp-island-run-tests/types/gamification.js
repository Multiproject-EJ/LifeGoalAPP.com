"use strict";
// TypeScript types for the gamification system
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEMO_REPUTATION_KEY = exports.DEMO_CONTRACT_EVALUATIONS_KEY = exports.DEMO_CONTRACTS_KEY = exports.DEMO_CHALLENGES_KEY = exports.SPIN_PRIZES = exports.DEMO_ACHIEVEMENTS_KEY = exports.DEMO_TRANSACTIONS_KEY = exports.DEMO_ENABLED_KEY = exports.DEMO_PROFILE_KEY = exports.TIER_LABELS = exports.TIER_COLORS = exports.XP_REWARDS = void 0;
// =====================================================
// XP REWARDS CONSTANTS
// =====================================================
exports.XP_REWARDS = {
    // Habit completion rewards
    HABIT_COMPLETE: 10,
    HABIT_COMPLETE_EARLY: 15, // Total XP if completed before 9am
    ALL_DAILY_HABITS: 25, // Bonus for completing all daily habits
    YESTERDAY_RECAP_COLLECT: 50, // Bonus for collecting a missed-day recap
    HABIT_REVIEW_COMPLETED: 20, // Completing a habit review decision
    HABIT_RELAUNCH_STARTED: 30, // Saving a redesigned/replacement habit relaunch
    HABIT_RELAUNCH_7DAY_SUCCESS: 75, // Hitting a 7-day streak after relaunch
    // Goal rewards
    GOAL_MILESTONE: 50,
    GOAL_MILESTONE_EARLY: 25, // Bonus if ahead of schedule
    GOAL_COMPLETE: 200,
    GOAL_COMPLETE_EARLY: 100, // Bonus if completed early
    // Journal rewards
    JOURNAL_ENTRY: 15,
    JOURNAL_LONG_ENTRY: 10, // Bonus for 500+ words
    INTENTIONS_MET: 5, // Completing today's intention from yesterday's note
    // Check-in rewards
    CHECKIN: 20,
    CHECKIN_IMPROVEMENT: 5, // Per improved category
    // Vision board rewards
    VISION_BOARD: 10,
    VISION_BOARD_CAPTION: 5, // Bonus with caption
    VISION_BOARD_STAR: 5,
    // Streak milestone rewards
    STREAK_7_DAYS: 100,
    STREAK_14_DAYS: 250,
    STREAK_30_DAYS: 500,
    STREAK_100_DAYS: 1500,
    // Balance rewards
    BALANCE_WEEK: 75,
    // Rationality rewards
    RATIONALITY_CHECKIN: 20,
    RATIONALITY_STREAK: 10,
    // Micro-quest rewards
    MICRO_QUEST: 25,
    MICRO_QUEST_BONUS: 50,
    // Meditation rewards
    MEDITATION_SESSION: 15, // Per meditation session
    MEDITATION_LONG_SESSION: 10, // Bonus for 10+ minutes
    BREATHING_SESSION: 10, // Per breathing session
    BODY_SESSION: 10, // Per body practice session
    MEDITATION_GOAL_DAY: 20, // Per day completed towards goal
    MEDITATION_GOAL_COMPLETE: 100, // Completing a meditation goal
    DAILY_CHALLENGE_COMPLETE: 50, // Completing meditation daily challenge
    // Challenge system rewards (gamification daily/weekly challenges)
    CHALLENGE_DAILY: 100, // Completing a gamification daily challenge
    CHALLENGE_WEEKLY: 250, // Completing a gamification weekly challenge
};
// =====================================================
// TIER COLORS AND LABELS
// =====================================================
exports.TIER_COLORS = {
    bronze: {
        border: '#CD7F32',
        background: 'linear-gradient(135deg, #CD7F32 0%, #B87333 100%)',
        glow: 'rgba(205, 127, 50, 0.3)',
    },
    silver: {
        border: '#C0C0C0',
        background: 'linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%)',
        glow: 'rgba(192, 192, 192, 0.3)',
    },
    gold: {
        border: '#FFD700',
        background: 'linear-gradient(135deg, #FFD700 0%, #FFC700 100%)',
        glow: 'rgba(255, 215, 0, 0.3)',
    },
    diamond: {
        border: '#B9F2FF',
        background: 'linear-gradient(135deg, #B9F2FF 0%, #81D4FA 100%)',
        glow: 'rgba(185, 242, 255, 0.3)',
    },
};
exports.TIER_LABELS = {
    bronze: '🥉 Bronze',
    silver: '🥈 Silver',
    gold: '🥇 Gold',
    diamond: '💎 Diamond',
};
exports.DEMO_PROFILE_KEY = 'lifegoal_demo_gamification_profile';
exports.DEMO_ENABLED_KEY = 'lifegoal_demo_gamification_enabled';
exports.DEMO_TRANSACTIONS_KEY = 'lifegoal_demo_xp_transactions';
exports.DEMO_ACHIEVEMENTS_KEY = 'lifegoal_demo_user_achievements';
// Prize configuration — multi-currency pool aligned with island-run economy
exports.SPIN_PRIZES = [
    { type: 'essence', value: 10, label: '10 Essence', icon: '🟣', wheelSize: 'medium', wheelWeight: 4 },
    { type: 'essence', value: 25, label: '25 Essence', icon: '🟣', wheelSize: 'medium', wheelWeight: 3 },
    { type: 'essence', value: 50, label: '50 Essence', icon: '🟣', wheelSize: 'large', wheelWeight: 2 },
    { type: 'shards', value: 2, label: '2 Shards', icon: '🔮', wheelSize: 'medium', wheelWeight: 3 },
    { type: 'shards', value: 5, label: '5 Shards', icon: '🔮', wheelSize: 'large', wheelWeight: 2 },
    { type: 'dice', value: 8, label: '8 Dice', icon: '🎲', wheelSize: 'medium', wheelWeight: 3 },
    { type: 'dice', value: 15, label: '15 Dice', icon: '🎲', wheelSize: 'large', wheelWeight: 2 },
    { type: 'game_tokens', value: 2, label: '2 Tokens', icon: '🎟️', wheelSize: 'medium', wheelWeight: 3 },
    { type: 'treasure_chest', value: 1, label: 'Treasure Chest', icon: '🧰', wheelSize: 'small', wheelWeight: 2, details: { rarity: 'rare' } },
    { type: 'mystery', value: 1, label: 'Mystery Box', icon: '🎁', wheelSize: 'small', wheelWeight: 1, details: { rarity: 'legendary' } },
];
exports.DEMO_CHALLENGES_KEY = 'lifegoal_demo_challenges';
exports.DEMO_CONTRACTS_KEY = 'lifegoal_demo_contracts';
exports.DEMO_CONTRACT_EVALUATIONS_KEY = 'lifegoal_demo_contract_evaluations';
exports.DEMO_REPUTATION_KEY = 'lifegoal_demo_reputation';
