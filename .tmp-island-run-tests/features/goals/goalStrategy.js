"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_GOAL_STRATEGY = exports.GOAL_STRATEGY_OPTIONS = exports.GOAL_STRATEGY_ORDER = exports.GOAL_STRATEGY_META = void 0;
exports.normalizeGoalStrategy = normalizeGoalStrategy;
exports.getStrategyXpMultiplier = getStrategyXpMultiplier;
exports.GOAL_STRATEGY_META = {
    standard: {
        icon: '🎯',
        label: 'Standard',
        tagline: 'Define → Track → Achieve',
        xpMultiplier: 1.0,
        description: 'The classic approach: set a clear goal, track milestones, and achieve it step by step.',
        bestFor: 'Well-defined goals with clear, measurable outcomes.',
    },
    micro: {
        icon: '⚡',
        label: 'Micro Wins',
        tagline: 'Small steps, big momentum',
        xpMultiplier: 1.2,
        description: 'Break the goal into the smallest possible daily actions. Progress through volume, not size.',
        bestFor: 'Breaking procrastination and building early momentum.',
    },
    anti_goal: {
        icon: '🛡️',
        label: 'Anti-Goal Shield',
        tagline: 'Protect what matters',
        xpMultiplier: 1.0,
        description: 'Frame the goal as protecting something you already have rather than gaining something new.',
        bestFor: 'Health, finances, relationships — things worth defending.',
    },
    process: {
        icon: '⚙️',
        label: 'Process-Based',
        tagline: 'Run the engine, trust the goal',
        xpMultiplier: 1.1,
        description: 'Focus entirely on running a repeatable process. The outcome will follow.',
        bestFor: 'Long-horizon goals where the timeline is uncertain.',
    },
    experiment: {
        icon: '🧪',
        label: 'Experiment Lab',
        tagline: 'Test. Learn. Adapt.',
        xpMultiplier: 1.3,
        description: 'Treat the goal as a testable hypothesis. Run a 30-day experiment and measure the result.',
        bestFor: 'Lifestyle changes, habit experiments, and pivots.',
    },
    identity: {
        icon: '🪞',
        label: 'Identity Builder',
        tagline: 'Become who you want to be',
        xpMultiplier: 1.2,
        description: "Reframe the goal as an identity claim: 'I am someone who…'. Every action reinforces the identity.",
        bestFor: 'Deep personal transformation and character-level change.',
    },
    friction_removal: {
        icon: '🔧',
        label: 'Friction Removal',
        tagline: 'Remove the block, not the goal',
        xpMultiplier: 1.1,
        description: 'Identify and systematically eliminate the specific friction preventing progress.',
        bestFor: 'Goals that keep failing despite genuine motivation.',
    },
    hero_quest: {
        icon: '⚔️',
        label: 'Hero Quest',
        tagline: 'Every goal is a story',
        xpMultiplier: 1.5,
        description: "Structure the goal as a 5-stage hero's journey: Call → Training → Trials → Boss → Transformation.",
        bestFor: 'Big life goals you want to feel epic and meaningful.',
    },
    reverse: {
        icon: '🔄',
        label: 'Reverse Planning',
        tagline: 'Start from success',
        xpMultiplier: 1.1,
        description: 'Visualise the finished goal in detail, then plan backwards to today.',
        bestFor: 'Projects, launches, and creative work with a defined end state.',
    },
    chaos: {
        icon: '🎲',
        label: 'Chaos Dice',
        tagline: 'Spin. Act. Grow.',
        xpMultiplier: 1.4,
        description: 'Spin a dice each day to get a random micro-challenge. No planning — just act.',
        bestFor: 'Fun, exploration, and breaking out of a routine rut.',
    },
    energy_based: {
        icon: '🔋',
        label: 'Energy-Based',
        tagline: 'Match tasks to energy',
        xpMultiplier: 1.0,
        description: 'Assign tasks to high/medium/low energy states. Do what your body allows today.',
        bestFor: 'Creative work and people with variable energy levels.',
    },
    constraint: {
        icon: '🔒',
        label: 'Constraint',
        tagline: 'Less is more',
        xpMultiplier: 1.3,
        description: 'Pick one thing and do only that. Eliminate all competing goals and distractions.',
        bestFor: 'Focus, digital detox, budget discipline, and clarity.',
    },
};
exports.GOAL_STRATEGY_ORDER = [
    'standard',
    'micro',
    'anti_goal',
    'process',
    'experiment',
    'identity',
    'friction_removal',
    'hero_quest',
    'reverse',
    'chaos',
    'energy_based',
    'constraint',
];
exports.GOAL_STRATEGY_OPTIONS = exports.GOAL_STRATEGY_ORDER.map((value) => ({
    value,
    label: exports.GOAL_STRATEGY_META[value].label,
    icon: exports.GOAL_STRATEGY_META[value].icon,
    tagline: exports.GOAL_STRATEGY_META[value].tagline,
}));
exports.DEFAULT_GOAL_STRATEGY = 'standard';
function normalizeGoalStrategy(value) {
    if (!value) {
        return exports.DEFAULT_GOAL_STRATEGY;
    }
    if (exports.GOAL_STRATEGY_ORDER.includes(value)) {
        return value;
    }
    return exports.DEFAULT_GOAL_STRATEGY;
}
function getStrategyXpMultiplier(strategyType) {
    return exports.GOAL_STRATEGY_META[normalizeGoalStrategy(strategyType)].xpMultiplier;
}
