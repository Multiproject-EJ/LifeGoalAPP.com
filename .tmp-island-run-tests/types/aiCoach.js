"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AI_COACH_ACCESS_FIELDS = exports.DEFAULT_AI_COACH_ACCESS = void 0;
exports.normalizeAiCoachAccess = normalizeAiCoachAccess;
exports.DEFAULT_AI_COACH_ACCESS = {
    goals: true,
    goalEvolution: true,
    habits: true,
    journaling: true,
    reflections: true,
    visionBoard: true,
};
exports.AI_COACH_ACCESS_FIELDS = [
    {
        key: 'goals',
        label: 'Goals',
        description: 'Allow the coach to reference your goal titles, milestones, and progress notes.',
    },
    {
        key: 'goalEvolution',
        label: 'Goal evolution history',
        description: 'Allow the coach to read historical goal snapshots so it understands how your direction has evolved.',
    },
    {
        key: 'habits',
        label: 'Habits',
        description: 'Allow the coach to read habit streaks, schedules, and completion patterns.',
    },
    {
        key: 'journaling',
        label: 'Journaling',
        description: 'Allow the coach to read journal entries you have saved.',
    },
    {
        key: 'reflections',
        label: 'Reflections',
        description: 'Allow the coach to use your goal reflection notes.',
    },
    {
        key: 'visionBoard',
        label: 'Vision board',
        description: 'Allow the coach to reference vision board images and captions.',
    },
];
function normalizeAiCoachAccess(value) {
    return {
        goals: value?.goals ?? exports.DEFAULT_AI_COACH_ACCESS.goals,
        habits: value?.habits ?? exports.DEFAULT_AI_COACH_ACCESS.habits,
        goalEvolution: value?.goalEvolution ?? exports.DEFAULT_AI_COACH_ACCESS.goalEvolution,
        journaling: value?.journaling ?? exports.DEFAULT_AI_COACH_ACCESS.journaling,
        reflections: value?.reflections ?? exports.DEFAULT_AI_COACH_ACCESS.reflections,
        visionBoard: value?.visionBoard ?? exports.DEFAULT_AI_COACH_ACCESS.visionBoard,
    };
}
