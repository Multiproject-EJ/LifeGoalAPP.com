"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MYSTERY_BOX_TOKEN_TIERS = exports.MYSTERY_BOX_DICE_TIERS = exports.DICE_PACK_DEFINITIONS = exports.ECONOMY_MATRIX = exports.ZEN_TOKEN_REWARDS = exports.GOLD_PER_DIAMOND = exports.XP_TO_GOLD_RATIO = void 0;
exports.convertXpToGold = convertXpToGold;
exports.splitGoldBalance = splitGoldBalance;
exports.XP_TO_GOLD_RATIO = 0.1;
exports.GOLD_PER_DIAMOND = 1000;
function convertXpToGold(xpAmount) {
    return Math.floor(xpAmount * exports.XP_TO_GOLD_RATIO);
}
function splitGoldBalance(balance) {
    const safeBalance = Math.max(0, Math.floor(balance));
    const diamonds = Math.floor(safeBalance / exports.GOLD_PER_DIAMOND);
    const goldRemainder = safeBalance % exports.GOLD_PER_DIAMOND;
    return { diamonds, goldRemainder };
}
exports.ZEN_TOKEN_REWARDS = {
    MEDITATION_SESSION: 1,
    BREATHING_SESSION: 1,
    MEDITATION_LONG_SESSION_BONUS: 1,
};
exports.ECONOMY_MATRIX = {
    earnSources: {
        habits: 'Habits + routines completion',
        goals: 'Goal progress & milestones',
        meditation: 'Meditation, breathing, and mindfulness',
        spin_wheel: 'Daily spin wheel rewards',
        daily_treats: 'Daily treats scratch card rewards',
        achievements: 'Achievements & streak milestones',
        power_ups: 'Power-up bonuses (XP multipliers, boosts)',
        lucky_roll: 'Lucky Roll board tile rewards',
        task_tower: 'Task Tower line clear rewards',
        shooter_blitz: 'Shooter Blitz mission completion rewards',
        vision_quest: 'Vision Quest passive multipliers',
        wheel_of_wins: 'Wheel of Wins spin prizes',
        dice_packs: 'Dice pack purchases with essence or event rewards',
    },
    currencies: {
        xp: {
            label: 'XP',
            description: 'Progression currency that powers levels.',
            earnedFrom: ['habits', 'goals', 'meditation', 'spin_wheel', 'achievements', 'power_ups'],
        },
        gold: {
            label: 'Gold',
            description: 'Spendable currency derived from XP (1 gold per 10 XP).',
            earnedFrom: ['xp', 'spin_wheel', 'achievements', 'daily_treats'],
        },
        zen_tokens: {
            label: 'Zen Tokens',
            description: 'Meditation-only currency for Zen Garden rewards.',
            earnedFrom: ['meditation'],
        },
        dice: {
            label: 'Dice',
            description: 'Rolling currency for the Island Run board. Regenerates over time and earned from reward bar.',
            earnedFrom: ['lucky_roll', 'task_tower', 'shooter_blitz', 'daily_treats'],
        },
        game_tokens: {
            label: 'Game Tokens',
            description: 'Entry currency for mini-games. Earned from reward bar and Lucky Roll tiles.',
            earnedFrom: ['lucky_roll'],
        },
        essence: {
            label: 'Essence',
            description: 'Island Run soft currency for stop upgrades. Earned from tile landings and reward bar. Subject to Monopoly GO-style pressure — spend it or lose it.',
            earnedFrom: ['lucky_roll'],
        },
        shards: {
            label: 'Egg Shards',
            description: 'Sanctuary currency for creature feeding and upgrades. Earned from tiles, eggs, and island progression.',
            earnedFrom: ['lucky_roll', 'daily_treats'],
        },
    },
    spendingSinks: {
        shop_upgrades: 'Store upgrades and boosters',
        cosmetics: 'Cosmetics and visual customizations',
        trophies: 'Trophies, plaques, and medals',
        zen_garden: 'Zen Garden-only purchases (Zen Tokens)',
        dice_packs: 'Dice packs available via reward bar and events',
        game_entry: 'Game token cost to enter mini-games',
    },
};
/** @deprecated Heart-based dice packs are retired. Dice are now earned via regen + reward bar. */
exports.DICE_PACK_DEFINITIONS = [
    { id: 'starter', label: 'Starter Pack', heartCost: 0, essenceCost: 30, diceCount: 15, tokenCount: 4, description: 'A casual session bundle' },
    { id: 'value', label: 'Value Pack', heartCost: 0, essenceCost: 60, diceCount: 35, tokenCount: 10, description: 'A solid play session' },
    { id: 'power', label: 'Power Pack', heartCost: 0, essenceCost: 100, diceCount: 50, tokenCount: 18, description: 'Extended session, best value' },
    { id: 'mystery', label: 'Mystery Box', heartCost: 0, essenceCost: 50, diceCount: -1, tokenCount: -1, description: 'Blind box: 5–750 dice, could be amazing' },
];
exports.MYSTERY_BOX_DICE_TIERS = [
    { min: 5, max: 15, weight: 40, label: 'Common' },
    { min: 16, max: 35, weight: 30, label: 'Decent' },
    { min: 36, max: 75, weight: 15, label: 'Good' },
    { min: 76, max: 150, weight: 8, label: 'Great' },
    { min: 151, max: 350, weight: 4, label: 'Amazing' },
    { min: 351, max: 750, weight: 3, label: 'Jackpot' },
];
exports.MYSTERY_BOX_TOKEN_TIERS = [
    { min: 1, max: 5, weight: 40, label: 'Common' },
    { min: 6, max: 15, weight: 30, label: 'Decent' },
    { min: 16, max: 40, weight: 15, label: 'Good' },
    { min: 41, max: 80, weight: 8, label: 'Great' },
    { min: 81, max: 200, weight: 4, label: 'Amazing' },
    { min: 201, max: 500, weight: 3, label: 'Jackpot' },
];
