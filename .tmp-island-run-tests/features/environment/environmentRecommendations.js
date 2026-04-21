"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferEnvironmentRiskTags = inferEnvironmentRiskTags;
exports.buildEnvironmentRecommendations = buildEnvironmentRecommendations;
const environmentAudit_1 = require("./environmentAudit");
const HACK_LIBRARY = [
    {
        id: 'prep-night-before',
        label: 'Prep the night before',
        description: 'Lay out what you need in advance so starting takes less effort.',
        riskTags: ['prep', 'friction', 'time'],
    },
    {
        id: 'remove-distraction',
        label: 'Remove one distraction',
        description: 'Put the biggest distraction out of sight or out of reach before the cue happens.',
        riskTags: ['distraction', 'friction'],
    },
    {
        id: 'attach-to-routine',
        label: 'Attach to a routine',
        description: 'Anchor the action to something you already do every day.',
        riskTags: ['memory', 'time'],
    },
    {
        id: 'visual-cue',
        label: 'Place a visual cue',
        description: 'Put the tool, reminder, or item in the exact place you need it.',
        riskTags: ['memory', 'clutter'],
    },
    {
        id: 'minimum-version',
        label: 'Save a minimum version',
        description: 'Define a tiny fallback version you can still do on low-energy days.',
        riskTags: ['energy', 'time', 'friction'],
    },
];
function inferRiskTagsFromText(value) {
    const text = value.toLowerCase();
    const tags = new Set();
    if (/phone|scroll|social|tv|youtube|netflix|distraction/.test(text))
        tags.add('distraction');
    if (/tired|energy|exhaust|sleep|burnout|fatigue/.test(text))
        tags.add('energy');
    if (/time|busy|schedule|late|rushed/.test(text))
        tags.add('time');
    if (/forget|remember|remind|cue/.test(text))
        tags.add('memory');
    if (/mess|clutter|desk|space|room/.test(text))
        tags.add('clutter');
    if (/prep|prepare|ready|setup|pack/.test(text))
        tags.add('prep');
    if (/hard|friction|effort|start|resistance/.test(text))
        tags.add('friction');
    return [...tags];
}
function inferEnvironmentRiskTags(context) {
    const tags = new Set();
    context?.blocker?.tags?.forEach((tag) => {
        inferRiskTagsFromText(tag).forEach((riskTag) => tags.add(riskTag));
    });
    [
        context?.blocker?.label,
        context?.legacyNote,
        context?.hackPlan?.summary,
        context?.fallback?.label,
    ].forEach((value) => {
        if (!value)
            return;
        inferRiskTagsFromText(value).forEach((riskTag) => tags.add(riskTag));
    });
    return [...tags];
}
function buildEnvironmentRecommendations(context) {
    const audit = (0, environmentAudit_1.computeEnvironmentAudit)(context);
    const riskTags = inferEnvironmentRiskTags(context);
    const primaryRiskTag = riskTags[0] ?? null;
    const topHackSuggestions = HACK_LIBRARY.filter((hack) => riskTags.length === 0 ? hack.id === 'minimum-version' : hack.riskTags.some((tag) => riskTags.includes(tag))).slice(0, 3);
    return {
        riskTags,
        primaryRiskTag,
        topHackSuggestions,
        fallbackSuggestion: context?.fallback?.label ?? (audit.score <= 2 ? 'Create a 2-minute fallback version for low-energy or busy days.' : null),
        recommendedStrategy: audit.score <= 2 ? 'friction_removal' : null,
    };
}
