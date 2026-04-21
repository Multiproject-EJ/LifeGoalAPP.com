"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LIFE_WHEEL_CATEGORIES = void 0;
exports.LifeWheelCheckins = LifeWheelCheckins;
exports.LifeWheelInsightsPanel = LifeWheelInsightsPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const SupabaseAuthProvider_1 = require("../auth/SupabaseAuthProvider");
const checkins_1 = require("../../services/checkins");
const demoSession_1 = require("../../services/demoSession");
const useGamification_1 = require("../../hooks/useGamification");
const gamification_1 = require("../../types/gamification");
const challenges_1 = require("../../services/challenges");
const annual_review_1 = require("../annual-review");
exports.LIFE_WHEEL_CATEGORIES = [
    { key: 'spirituality_community', label: 'Spirituality & Community' },
    { key: 'finance_wealth', label: 'Finance & Wealth' },
    { key: 'love_relations', label: 'Love & Relations' },
    { key: 'fun_creativity', label: 'Fun & Creativity' },
    { key: 'career_development', label: 'Career & Self Development' },
    { key: 'health_fitness', label: 'Health & Fitness' },
    { key: 'family_friends', label: 'Family & Friends' },
    { key: 'living_spaces', label: 'Living Spaces' },
];
const QUESTIONS = [
    // Spirituality & Community
    { id: 'q1', categoryKey: 'spirituality_community', text: 'How connected do you feel to your spiritual or community practices?', imageNumber: 1 },
    { id: 'q2', categoryKey: 'spirituality_community', text: 'How often do you engage in activities that nurture your sense of purpose?', imageNumber: 2 },
    { id: 'q3', categoryKey: 'spirituality_community', text: 'How supported do you feel by your community or spiritual circle?', imageNumber: 3 },
    // Finance & Wealth
    { id: 'q4', categoryKey: 'finance_wealth', text: 'How satisfied are you with your current financial situation?', imageNumber: 4 },
    { id: 'q5', categoryKey: 'finance_wealth', text: 'How well are you managing your savings and investments?', imageNumber: 5 },
    { id: 'q6', categoryKey: 'finance_wealth', text: 'How confident do you feel about your financial future?', imageNumber: 6 },
    // Love & Relations
    { id: 'q7', categoryKey: 'love_relations', text: 'How fulfilling is your romantic relationship or dating life?', imageNumber: 7 },
    { id: 'q8', categoryKey: 'love_relations', text: 'How well do you communicate with your romantic partner?', imageNumber: 8 },
    { id: 'q9', categoryKey: 'love_relations', text: 'How much quality time do you spend with your loved one?', imageNumber: 9 },
    // Fun & Creativity
    { id: 'q10', categoryKey: 'fun_creativity', text: 'How much time do you dedicate to hobbies and creative pursuits?', imageNumber: 10 },
    { id: 'q11', categoryKey: 'fun_creativity', text: 'How often do you engage in activities that bring you joy?', imageNumber: 11 },
    { id: 'q12', categoryKey: 'fun_creativity', text: 'How satisfied are you with your work-life balance for fun activities?', imageNumber: 12 },
    // Career & Self Development
    { id: 'q13', categoryKey: 'career_development', text: 'How satisfied are you with your career progress?', imageNumber: 13 },
    { id: 'q14', categoryKey: 'career_development', text: 'How much are you learning and growing in your professional life?', imageNumber: 14 },
    { id: 'q15', categoryKey: 'career_development', text: 'How aligned is your work with your personal goals?', imageNumber: 15 },
    // Health & Fitness
    { id: 'q16', categoryKey: 'health_fitness', text: 'How would you rate your overall physical health?', imageNumber: 16 },
    { id: 'q17', categoryKey: 'health_fitness', text: 'How consistent are you with exercise and movement?', imageNumber: 17 },
    { id: 'q18', categoryKey: 'health_fitness', text: 'How well are you taking care of your nutrition and sleep?', imageNumber: 18 },
    // Family & Friends
    { id: 'q19', categoryKey: 'family_friends', text: 'How strong is your connection with family members?', imageNumber: 19 },
    { id: 'q20', categoryKey: 'family_friends', text: 'How often do you spend quality time with friends?', imageNumber: 20 },
    { id: 'q21', categoryKey: 'family_friends', text: 'How supported do you feel by your family and friends?', imageNumber: 21 },
    // Living Spaces
    { id: 'q22', categoryKey: 'living_spaces', text: 'How comfortable and organized is your living environment?', imageNumber: 22 },
    { id: 'q23', categoryKey: 'living_spaces', text: 'How much does your home reflect your personality and values?', imageNumber: 23 },
    { id: 'q24', categoryKey: 'living_spaces', text: 'How satisfied are you with your current living situation?', imageNumber: 24 },
];
const MAX_SCORE = 10;
const RADAR_SIZE = 320;
const RADAR_LEVELS = 5;
const dateFormatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});
function formatISODate(date) {
    return date.toISOString().slice(0, 10);
}
function createDefaultScores() {
    return exports.LIFE_WHEEL_CATEGORIES.reduce((acc, category) => {
        acc[category.key] = 5;
        return acc;
    }, {});
}
function parseCheckinScores(scores) {
    const fallback = createDefaultScores();
    if (scores && typeof scores === 'object' && !Array.isArray(scores)) {
        const record = scores;
        for (const category of exports.LIFE_WHEEL_CATEGORIES) {
            const value = record[category.key];
            fallback[category.key] = typeof value === 'number' ? clampScore(value) : 0;
        }
    }
    return fallback;
}
function clampScore(value) {
    if (Number.isNaN(value))
        return 0;
    return Math.min(MAX_SCORE, Math.max(0, Math.round(value)));
}
function calculateAverage(scores) {
    const total = exports.LIFE_WHEEL_CATEGORIES.reduce((sum, category) => sum + (scores[category.key] ?? 0), 0);
    return Number((total / exports.LIFE_WHEEL_CATEGORIES.length).toFixed(1));
}
function calculateTotal(scores) {
    return exports.LIFE_WHEEL_CATEGORIES.reduce((sum, category) => sum + (scores[category.key] ?? 0), 0);
}
function createTrendInsights(checkins) {
    if (checkins.length < 2) {
        return null;
    }
    const [latest, previous] = checkins;
    const latestScores = parseCheckinScores(latest.scores);
    const previousScores = parseCheckinScores(previous.scores);
    const deltas = exports.LIFE_WHEEL_CATEGORIES.map((category) => {
        const latestValue = clampScore(latestScores[category.key] ?? 0);
        const previousValue = clampScore(previousScores[category.key] ?? 0);
        return {
            key: category.key,
            label: category.label,
            delta: latestValue - previousValue,
            latest: latestValue,
            previous: previousValue,
        };
    });
    const improvements = deltas
        .filter((item) => item.delta > 0)
        .sort((a, b) => b.delta - a.delta)
        .slice(0, 3);
    const declines = deltas
        .filter((item) => item.delta < 0)
        .sort((a, b) => a.delta - b.delta)
        .slice(0, 3);
    const stableCount = deltas.filter((item) => item.delta === 0).length;
    const latestAverage = calculateAverage(latestScores);
    const previousAverage = calculateAverage(previousScores);
    const rawAverageDelta = Number((latestAverage - previousAverage).toFixed(1));
    const averageDelta = Math.abs(rawAverageDelta) < 0.05 ? 0 : rawAverageDelta;
    const averageDirection = averageDelta > 0 ? 'up' : averageDelta < 0 ? 'down' : 'steady';
    return {
        previousLabel: dateFormatter.format(new Date(previous.date)),
        latestAverage,
        previousAverage,
        averageDelta,
        averageDirection,
        improvements,
        declines,
        stableCount,
    };
}
function formatSignedInteger(value) {
    if (value === 0)
        return '0';
    return `${value > 0 ? '+' : '−'}${Math.abs(value)}`;
}
function formatSignedDecimal(value, fractionDigits = 1) {
    if (Math.abs(value) < 0.05)
        return '0';
    const rounded = Math.abs(value).toFixed(fractionDigits);
    return `${value > 0 ? '+' : '−'}${rounded}`;
}
function scaleQuestionScoreToWheel(questionScore) {
    // Scale from 1-3 (question score) to 0-10 (wheel score)
    // 1 (Not Well) -> 0, 2 (Okay) -> 5, 3 (Excellent) -> 10
    return Math.round((questionScore - 1) * 5);
}
function buildRadarGeometry(scores) {
    const center = RADAR_SIZE / 2;
    const radius = center - 36;
    const pointFor = (ratio, index) => {
        const angle = (Math.PI * 2 * index) / exports.LIFE_WHEEL_CATEGORIES.length - Math.PI / 2;
        const x = center + Math.cos(angle) * radius * ratio;
        const y = center + Math.sin(angle) * radius * ratio;
        return { x, y };
    };
    const polygonPoints = exports.LIFE_WHEEL_CATEGORIES.map((category, index) => {
        const score = clampScore(scores[category.key] ?? 0);
        const ratio = score / MAX_SCORE;
        const { x, y } = pointFor(ratio, index);
        return `${x},${y}`;
    }).join(' ');
    const levelPolygons = Array.from({ length: RADAR_LEVELS }, (_, levelIndex) => {
        const ratio = (levelIndex + 1) / RADAR_LEVELS;
        const points = exports.LIFE_WHEEL_CATEGORIES.map((_, index) => {
            const { x, y } = pointFor(ratio, index);
            return `${x},${y}`;
        }).join(' ');
        return { ratio, points };
    });
    const axes = exports.LIFE_WHEEL_CATEGORIES.map((category, index) => {
        const { x, y } = pointFor(1, index);
        return { key: category.key, x1: center, y1: center, x2: x, y2: y };
    });
    const labels = exports.LIFE_WHEEL_CATEGORIES.map((category, index) => {
        const labelRadius = radius + 20;
        const angle = (Math.PI * 2 * index) / exports.LIFE_WHEEL_CATEGORIES.length - Math.PI / 2;
        const x = center + Math.cos(angle) * labelRadius;
        const y = center + Math.sin(angle) * labelRadius;
        let anchor;
        if (Math.abs(Math.cos(angle)) < 0.2) {
            anchor = 'middle';
        }
        else if (Math.cos(angle) > 0) {
            anchor = 'start';
        }
        else {
            anchor = 'end';
        }
        let baseline;
        if (Math.sin(angle) > 0.2) {
            baseline = 'text-before-edge';
        }
        else if (Math.sin(angle) < -0.2) {
            baseline = 'text-after-edge';
        }
        else {
            baseline = 'middle';
        }
        return { key: category.key, text: category.label, x, y, anchor, baseline };
    });
    return { polygonPoints, levelPolygons, axes, labels };
}
function LifeWheelCheckins({ session }) {
    const { isConfigured } = (0, SupabaseAuthProvider_1.useSupabaseAuth)();
    const isDemoExperience = (0, demoSession_1.isDemoSession)(session);
    const { earnXP, recordActivity } = (0, useGamification_1.useGamification)(session);
    const [activeCheckinView, setActiveCheckinView] = (0, react_1.useState)('full');
    const [checkins, setCheckins] = (0, react_1.useState)([]);
    const [submitting, setSubmitting] = (0, react_1.useState)(false);
    const [errorMessage, setErrorMessage] = (0, react_1.useState)(null);
    const [successMessage, setSuccessMessage] = (0, react_1.useState)(null);
    const [formDate, setFormDate] = (0, react_1.useState)(() => formatISODate(new Date()));
    const [formScores, setFormScores] = (0, react_1.useState)(() => createDefaultScores());
    const [selectedCheckinId, setSelectedCheckinId] = (0, react_1.useState)(null);
    const [selectedHistoryYear, setSelectedHistoryYear] = (0, react_1.useState)('all');
    // Questionnaire state
    const [isInQuestionnaireMode, setIsInQuestionnaireMode] = (0, react_1.useState)(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = (0, react_1.useState)(0);
    const [activeQuestionSet, setActiveQuestionSet] = (0, react_1.useState)(QUESTIONS);
    const [questionnaireBaseScores, setQuestionnaireBaseScores] = (0, react_1.useState)(() => createDefaultScores());
    const [questionnaireLabel, setQuestionnaireLabel] = (0, react_1.useState)('Wellbeing Check-in');
    const [selectedAreaCategory, setSelectedAreaCategory] = (0, react_1.useState)('');
    const [answers, setAnswers] = (0, react_1.useState)(new Map());
    const [selectedOption, setSelectedOption] = (0, react_1.useState)(null);
    const [customNote, setCustomNote] = (0, react_1.useState)('');
    const [isQuickCheckinOpen, setIsQuickCheckinOpen] = (0, react_1.useState)(false);
    const loadCheckins = (0, react_1.useCallback)(async () => {
        if (!isConfigured && !isDemoExperience) {
            setCheckins([]);
            setSelectedCheckinId(null);
            return;
        }
        setErrorMessage(null);
        try {
            const { data, error } = await (0, checkins_1.fetchCheckinsForUser)(session.user.id);
            if (error)
                throw error;
            const records = data ?? [];
            setCheckins(records);
            if (records.length > 0) {
                setSelectedCheckinId((current) => current ?? records[0].id);
            }
            else {
                setSelectedCheckinId(null);
            }
        }
        catch (error) {
            setErrorMessage(error instanceof Error
                ? error.message
                : 'Unable to load check-in history right now. Please try again soon.');
        }
    }, [isConfigured, isDemoExperience, session.user.id]);
    (0, react_1.useEffect)(() => {
        if (!isConfigured) {
            return;
        }
        void loadCheckins();
    }, [session?.user?.id, isConfigured, isDemoExperience, loadCheckins]);
    (0, react_1.useEffect)(() => {
        if (!isConfigured && !isDemoExperience) {
            setCheckins([]);
            setSelectedCheckinId(null);
        }
    }, [isConfigured, isDemoExperience]);
    (0, react_1.useEffect)(() => {
        if (checkins.length === 0) {
            setFormScores(createDefaultScores());
            return;
        }
        const latest = checkins[0];
        setFormScores(parseCheckinScores(latest.scores));
    }, [checkins]);
    const selectedCheckin = (0, react_1.useMemo)(() => {
        if (!selectedCheckinId) {
            return checkins[0] ?? null;
        }
        return checkins.find((item) => item.id === selectedCheckinId) ?? null;
    }, [selectedCheckinId, checkins]);
    const selectedScores = (0, react_1.useMemo)(() => {
        return selectedCheckin ? parseCheckinScores(selectedCheckin.scores) : null;
    }, [selectedCheckin]);
    const areaQuestionSet = (0, react_1.useMemo)(() => {
        if (!selectedAreaCategory)
            return [];
        return QUESTIONS.filter((question) => question.categoryKey === selectedAreaCategory);
    }, [selectedAreaCategory]);
    const selectedAreaScore = (0, react_1.useMemo)(() => {
        if (!selectedAreaCategory || !selectedScores)
            return null;
        return selectedScores[selectedAreaCategory] ?? null;
    }, [selectedAreaCategory, selectedScores]);
    const radarGeometry = (0, react_1.useMemo)(() => {
        return selectedScores ? buildRadarGeometry(selectedScores) : null;
    }, [selectedScores]);
    const averageScore = (0, react_1.useMemo)(() => {
        return selectedScores ? calculateAverage(selectedScores) : 0;
    }, [selectedScores]);
    const radarCheckins = (0, react_1.useMemo)(() => {
        const uniqueCheckins = [];
        const seen = new Set();
        [selectedCheckin, ...checkins].forEach((checkin) => {
            if (checkin && !seen.has(checkin.id)) {
                seen.add(checkin.id);
                uniqueCheckins.push(checkin);
            }
        });
        return uniqueCheckins.slice(0, 3);
    }, [selectedCheckin, checkins]);
    const historyYears = (0, react_1.useMemo)(() => {
        const years = Array.from(new Set(checkins.map((checkin) => new Date(checkin.date).getFullYear().toString())));
        return years.sort((a, b) => Number(b) - Number(a));
    }, [checkins]);
    const filteredCheckins = (0, react_1.useMemo)(() => {
        if (selectedHistoryYear === 'all') {
            return checkins;
        }
        return checkins.filter((checkin) => new Date(checkin.date).getFullYear().toString() === selectedHistoryYear);
    }, [checkins, selectedHistoryYear]);
    const checkinTimeline = (0, react_1.useMemo)(() => {
        const ordered = [...filteredCheckins].sort((a, b) => a.date.localeCompare(b.date));
        return ordered.map((checkin) => {
            const scores = parseCheckinScores(checkin.scores);
            return {
                id: checkin.id,
                date: checkin.date,
                label: dateFormatter.format(new Date(checkin.date)),
                average: calculateAverage(scores),
                total: calculateTotal(scores),
            };
        });
    }, [filteredCheckins]);
    const handleScoreChange = (categoryKey) => (event) => {
        const value = clampScore(Number(event.target.value));
        setFormScores((current) => ({ ...current, [categoryKey]: value }));
    };
    const handleFormSubmit = async (event) => {
        event.preventDefault();
        setErrorMessage(null);
        setSuccessMessage(null);
        if (!session) {
            setErrorMessage('Sign in to record your life wheel check-ins.');
            return;
        }
        if (!isConfigured && !isDemoExperience) {
            setErrorMessage('Supabase credentials are missing. Update your environment variables to continue.');
            return;
        }
        setSubmitting(true);
        try {
            const existing = checkins.find((item) => item.date === formDate);
            if (existing) {
                const { data, error } = await (0, checkins_1.updateCheckin)(existing.id, {
                    date: formDate,
                    scores: formScores,
                });
                if (error)
                    throw error;
                if (data) {
                    setCheckins((current) => {
                        const mapped = current.map((item) => (item.id === data.id ? data : item));
                        return mapped.sort((a, b) => b.date.localeCompare(a.date));
                    });
                    setSelectedCheckinId(data.id);
                }
                setSuccessMessage('Check-in updated. Your radar view is refreshed.');
            }
            else {
                const { data, error } = await (0, checkins_1.insertCheckin)({
                    user_id: session.user.id,
                    date: formDate,
                    scores: formScores,
                });
                if (error)
                    throw error;
                if (data) {
                    setCheckins((current) => {
                        const next = [data, ...current];
                        return next.sort((a, b) => b.date.localeCompare(a.date));
                    });
                    setSelectedCheckinId(data.id);
                    // Award XP for check-in (only for new check-ins)
                    // Calculate improvement bonus
                    const previousScores = checkins.length > 0 ? parseCheckinScores(checkins[0].scores) : null;
                    const improvedCategories = calculateImprovedCategories(formScores, previousScores);
                    const bonusXP = improvedCategories * gamification_1.XP_REWARDS.CHECKIN_IMPROVEMENT; // +5 XP per improved category
                    const totalXP = gamification_1.XP_REWARDS.CHECKIN + bonusXP; // 20 base + bonuses
                    await earnXP(totalXP, 'checkin_complete', data.id);
                    await recordActivity();
                    (0, challenges_1.recordChallengeActivity)(session.user.id, 'checkin_complete');
                }
                setSuccessMessage('Check-in saved! Revisit the history to spot your trends.');
            }
        }
        catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Unable to save your check-in right now.');
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleUseLatestScores = () => {
        if (checkins.length === 0) {
            setFormScores(createDefaultScores());
            return;
        }
        setFormScores(parseCheckinScores(checkins[0].scores));
    };
    // Helper function to calculate improved categories
    const calculateImprovedCategories = (current, previous) => {
        if (!previous)
            return 0;
        return exports.LIFE_WHEEL_CATEGORIES.filter(category => {
            const currentScore = current[category.key];
            const previousScore = previous[category.key] || 0;
            return currentScore > previousScore;
        }).length;
    };
    const startQuestionnaire = ({ questionSet = QUESTIONS, baseScores = createDefaultScores(), label = 'Wellbeing Check-in', areaCategoryKey = '', } = {}) => {
        setIsInQuestionnaireMode(true);
        setCurrentQuestionIndex(0);
        setAnswers(new Map());
        setSelectedOption(null);
        setCustomNote('');
        setActiveQuestionSet(questionSet);
        setQuestionnaireBaseScores(baseScores);
        setQuestionnaireLabel(label);
        setFormScores(baseScores);
        setSelectedAreaCategory(areaCategoryKey);
    };
    const exitQuestionnaire = () => {
        setIsInQuestionnaireMode(false);
    };
    const handleAnswerSubmit = () => {
        if (selectedOption === null)
            return;
        const currentQuestion = activeQuestionSet[currentQuestionIndex];
        const answer = {
            questionId: currentQuestion.id,
            score: selectedOption,
            customNote: customNote.trim(),
        };
        const newAnswers = new Map(answers);
        newAnswers.set(currentQuestion.id, answer);
        setAnswers(newAnswers);
        // Update scores for the radar chart
        const categoryAnswers = activeQuestionSet
            .filter(q => q.categoryKey === currentQuestion.categoryKey)
            .map(q => newAnswers.get(q.id)?.score || 0)
            .filter(score => score > 0);
        if (categoryAnswers.length > 0) {
            const avgScore = categoryAnswers.reduce((sum, s) => sum + s, 0) / categoryAnswers.length;
            const scaledScore = scaleQuestionScoreToWheel(avgScore);
            setFormScores(current => ({
                ...current,
                [currentQuestion.categoryKey]: scaledScore,
            }));
        }
        // Move to next question or finish
        if (currentQuestionIndex < activeQuestionSet.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setSelectedOption(null);
            setCustomNote('');
        }
        else {
            // Questionnaire complete, save the check-in
            saveQuestionnaireResults(newAnswers);
        }
    };
    const saveQuestionnaireResults = async (finalAnswers) => {
        setSubmitting(true);
        setErrorMessage(null);
        setSuccessMessage(null);
        try {
            const finalScores = { ...questionnaireBaseScores };
            const questionCategories = new Set(activeQuestionSet.map((question) => question.categoryKey));
            // Calculate final scores for each category
            questionCategories.forEach((categoryKey) => {
                const categoryQuestions = activeQuestionSet.filter(q => q.categoryKey === categoryKey);
                const categoryAnswers = categoryQuestions
                    .map(q => finalAnswers.get(q.id)?.score || 0)
                    .filter(score => score > 0);
                if (categoryAnswers.length > 0) {
                    const avgScore = categoryAnswers.reduce((sum, s) => sum + s, 0) / categoryAnswers.length;
                    finalScores[categoryKey] = scaleQuestionScoreToWheel(avgScore);
                }
            });
            const { data, error } = await (0, checkins_1.insertCheckin)({
                user_id: session.user.id,
                date: formDate,
                scores: finalScores,
            });
            if (error)
                throw error;
            if (data) {
                setCheckins(current => {
                    const next = [data, ...current];
                    return next.sort((a, b) => b.date.localeCompare(a.date));
                });
                setSelectedCheckinId(data.id);
                // Award XP for questionnaire completion
                // For questionnaire, we don't have previous scores to compare
                // So we just award the base XP
                await earnXP(gamification_1.XP_REWARDS.CHECKIN, 'checkin_complete', data.id);
                await recordActivity();
                (0, challenges_1.recordChallengeActivity)(session.user.id, 'checkin_complete');
            }
            setSuccessMessage(`${questionnaireLabel} completed! Your life wheel has been updated.`);
            setIsInQuestionnaireMode(false);
        }
        catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Unable to save your check-in.');
        }
        finally {
            setSubmitting(false);
        }
    };
    // Calculate current progress scores for the radar chart
    const currentProgressScores = (0, react_1.useMemo)(() => {
        if (!isInQuestionnaireMode)
            return null;
        const progressScores = { ...questionnaireBaseScores };
        const questionCategories = new Set(activeQuestionSet.map((question) => question.categoryKey));
        questionCategories.forEach((categoryKey) => {
            const categoryQuestions = activeQuestionSet.filter(q => q.categoryKey === categoryKey);
            const categoryAnswers = categoryQuestions
                .map(q => answers.get(q.id)?.score || 0)
                .filter(score => score > 0);
            if (categoryAnswers.length > 0) {
                const avgScore = categoryAnswers.reduce((sum, s) => sum + s, 0) / categoryAnswers.length;
                progressScores[categoryKey] = scaleQuestionScoreToWheel(avgScore);
            }
        });
        return progressScores;
    }, [isInQuestionnaireMode, answers, activeQuestionSet, questionnaireBaseScores]);
    const progressRadarGeometry = (0, react_1.useMemo)(() => {
        return currentProgressScores ? buildRadarGeometry(currentProgressScores) : null;
    }, [currentProgressScores]);
    const activeAreaLabel = (0, react_1.useMemo)(() => {
        if (!selectedAreaCategory)
            return null;
        return exports.LIFE_WHEEL_CATEGORIES.find((category) => category.key === selectedAreaCategory)?.label ?? null;
    }, [selectedAreaCategory]);
    const handleSelectCheckinView = (view) => {
        setActiveCheckinView(view);
        setSuccessMessage(null);
        setErrorMessage(null);
        setIsQuickCheckinOpen(false);
    };
    const handleStartAreaCheckin = () => {
        if (!selectedAreaCategory || areaQuestionSet.length === 0)
            return;
        const baseScores = selectedScores ?? createDefaultScores();
        startQuestionnaire({
            questionSet: areaQuestionSet,
            baseScores,
            label: `${activeAreaLabel ?? 'Area'} Check-in`,
            areaCategoryKey: selectedAreaCategory,
        });
    };
    const showCheckinStatus = activeCheckinView !== 'annual';
    // Render questionnaire mode
    if (isInQuestionnaireMode) {
        const currentQuestion = activeQuestionSet[currentQuestionIndex];
        const questionCount = Math.max(1, activeQuestionSet.length);
        const progress = ((currentQuestionIndex + 1) / questionCount) * 100;
        return ((0, jsx_runtime_1.jsx)("section", { className: "life-wheel life-wheel--questionnaire", children: (0, jsx_runtime_1.jsxs)("div", { className: "questionnaire-container", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "questionnaire-back", onClick: exitQuestionnaire, children: "Back to check-ins" }), (0, jsx_runtime_1.jsxs)("div", { className: "questionnaire-progress", children: [(0, jsx_runtime_1.jsx)("div", { className: "questionnaire-progress__bar", style: { width: `${progress}%` } }), (0, jsx_runtime_1.jsxs)("span", { className: "questionnaire-progress__text", children: ["Question ", currentQuestionIndex + 1, " of ", questionCount] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "questionnaire-content", children: [(0, jsx_runtime_1.jsx)("div", { className: "questionnaire-image", children: currentQuestion.imageNumber }), (0, jsx_runtime_1.jsx)("h3", { className: "questionnaire-question", children: currentQuestion.text }), (0, jsx_runtime_1.jsx)("p", { className: "questionnaire-subtitle", children: questionnaireLabel }), (0, jsx_runtime_1.jsxs)("div", { className: "questionnaire-options", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", className: `questionnaire-option ${selectedOption === 1 ? 'questionnaire-option--selected' : ''}`, onClick: () => setSelectedOption(1), children: [(0, jsx_runtime_1.jsx)("span", { className: "questionnaire-option__label", children: "Not Well" }), (0, jsx_runtime_1.jsx)("span", { className: "questionnaire-option__score", children: "1" })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", className: `questionnaire-option ${selectedOption === 2 ? 'questionnaire-option--selected' : ''}`, onClick: () => setSelectedOption(2), children: [(0, jsx_runtime_1.jsx)("span", { className: "questionnaire-option__label", children: "Okay" }), (0, jsx_runtime_1.jsx)("span", { className: "questionnaire-option__score", children: "2" })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", className: `questionnaire-option ${selectedOption === 3 ? 'questionnaire-option--selected' : ''}`, onClick: () => setSelectedOption(3), children: [(0, jsx_runtime_1.jsx)("span", { className: "questionnaire-option__label", children: "Excellent" }), (0, jsx_runtime_1.jsx)("span", { className: "questionnaire-option__score", children: "3" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "questionnaire-note", children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "custom-note", children: "Add your thoughts (optional)" }), (0, jsx_runtime_1.jsx)("textarea", { id: "custom-note", value: customNote, onChange: (e) => setCustomNote(e.target.value), placeholder: "Share any additional insights about this area of your life...", rows: 3 })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "questionnaire-submit", onClick: handleAnswerSubmit, disabled: selectedOption === null || submitting, children: submitting
                                    ? 'Saving...'
                                    : currentQuestionIndex === questionCount - 1
                                        ? 'Complete Check-in'
                                        : 'Next Question' })] }, currentQuestion.id), (0, jsx_runtime_1.jsxs)("div", { className: "questionnaire-wheel", children: [(0, jsx_runtime_1.jsx)("h4", { children: "Your Life Wheel" }), progressRadarGeometry ? ((0, jsx_runtime_1.jsxs)("svg", { className: "life-wheel__radar", viewBox: `0 0 ${RADAR_SIZE} ${RADAR_SIZE}`, role: "img", "aria-label": "Your life wheel progress", children: [(0, jsx_runtime_1.jsx)("g", { className: "life-wheel__radar-grid", children: progressRadarGeometry.levelPolygons.map((level) => ((0, jsx_runtime_1.jsx)("polygon", { points: level.points }, level.ratio))) }), (0, jsx_runtime_1.jsx)("g", { className: "life-wheel__radar-axes", children: progressRadarGeometry.axes.map((axis) => ((0, jsx_runtime_1.jsx)("line", { x1: axis.x1, y1: axis.y1, x2: axis.x2, y2: axis.y2 }, axis.key))) }), (0, jsx_runtime_1.jsx)("polygon", { className: "life-wheel__radar-shape", points: progressRadarGeometry.polygonPoints }), (0, jsx_runtime_1.jsx)("g", { className: "life-wheel__radar-labels", children: progressRadarGeometry.labels.map((label) => ((0, jsx_runtime_1.jsx)("text", { x: label.x, y: label.y, textAnchor: label.anchor, dominantBaseline: label.baseline, children: label.text }, label.key))) })] })) : ((0, jsx_runtime_1.jsx)("div", { className: "life-wheel__empty", children: (0, jsx_runtime_1.jsx)("p", { children: "Your wheel will appear as you answer questions" }) }))] })] }) }));
    }
    return ((0, jsx_runtime_1.jsxs)("section", { className: "life-wheel", children: [(0, jsx_runtime_1.jsxs)("div", { className: "life-wheel__chooser", children: [(0, jsx_runtime_1.jsxs)("div", { className: "life-wheel__chooser-header", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Check-ins" }), (0, jsx_runtime_1.jsx)("p", { children: "Choose the check-in flow you want to focus on today." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "life-wheel__chooser-grid", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", className: `life-wheel__chooser-card ${activeCheckinView === 'full' ? 'life-wheel__chooser-card--active' : ''}`, onClick: () => handleSelectCheckinView('full'), "aria-pressed": activeCheckinView === 'full', children: [(0, jsx_runtime_1.jsx)("h3", { children: "Full Check-in" }), (0, jsx_runtime_1.jsx)("p", { children: "Use the full wellbeing wheel and track your overall balance." })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", className: `life-wheel__chooser-card ${activeCheckinView === 'annual' ? 'life-wheel__chooser-card--active' : ''}`, onClick: () => handleSelectCheckinView('annual'), "aria-pressed": activeCheckinView === 'annual', children: [(0, jsx_runtime_1.jsx)("h3", { children: "Annual Review & Manifestation" }), (0, jsx_runtime_1.jsx)("p", { children: "Reflect on the year and set intentions for what comes next." })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", className: `life-wheel__chooser-card ${activeCheckinView === 'area' ? 'life-wheel__chooser-card--active' : ''}`, onClick: () => handleSelectCheckinView('area'), "aria-pressed": activeCheckinView === 'area', children: [(0, jsx_runtime_1.jsx)("h3", { children: "Area Check-in" }), (0, jsx_runtime_1.jsx)("p", { children: "Zoom in on one life wheel area for a focused refresh." })] })] })] }), showCheckinStatus ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [isDemoExperience ? ((0, jsx_runtime_1.jsx)("p", { className: "life-wheel__status life-wheel__status--info", children: "Life wheel entries are stored locally in demo mode. Connect Supabase when you're ready to sync check-ins across devices." })) : !isConfigured ? ((0, jsx_runtime_1.jsx)("p", { className: "life-wheel__status life-wheel__status--warning", children: "Add your Supabase credentials so we can sync your check-ins across devices. Until then your entries stay local." })) : null, errorMessage && (0, jsx_runtime_1.jsx)("p", { className: "life-wheel__status life-wheel__status--error", children: errorMessage }), successMessage && (0, jsx_runtime_1.jsx)("p", { className: "life-wheel__status life-wheel__status--success", children: successMessage })] })) : null, activeCheckinView === 'annual' ? ((0, jsx_runtime_1.jsx)("div", { className: "life-wheel__annual-review", children: (0, jsx_runtime_1.jsx)(annual_review_1.ReviewWizard, { onComplete: () => handleSelectCheckinView('full') }) })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [activeCheckinView === 'area' ? ((0, jsx_runtime_1.jsxs)("div", { className: "life-wheel__area-panel", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { children: "Area Check-in" }), (0, jsx_runtime_1.jsx)("p", { children: "Select one life wheel area and complete a focused set of questions." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "life-wheel__area-controls", children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "life-wheel-area", children: "Choose an area" }), (0, jsx_runtime_1.jsxs)("select", { id: "life-wheel-area", value: selectedAreaCategory, onChange: (event) => {
                                            const value = event.target.value;
                                            setSelectedAreaCategory(value);
                                        }, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Select an area" }), exports.LIFE_WHEEL_CATEGORIES.map((category) => ((0, jsx_runtime_1.jsx)("option", { value: category.key, children: category.label }, category.key)))] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", className: "life-wheel__area-start", onClick: handleStartAreaCheckin, disabled: !selectedAreaCategory || (!isConfigured && !isDemoExperience), children: ["Start Area Check-in", selectedAreaCategory && areaQuestionSet.length > 0 ? ((0, jsx_runtime_1.jsxs)("span", { className: "life-wheel__area-count", children: ["(", areaQuestionSet.length, " questions)"] })) : null] }), selectedAreaCategory ? ((0, jsx_runtime_1.jsxs)("p", { className: "life-wheel__area-meta", children: ["Current score: ", selectedAreaScore ?? 0, "/10"] })) : ((0, jsx_runtime_1.jsx)("p", { className: "life-wheel__area-meta", children: "Pick a focus area to see its latest score." }))] })] })) : null, (0, jsx_runtime_1.jsx)("div", { className: "life-wheel__grid", children: (0, jsx_runtime_1.jsx)("div", { className: "life-wheel__panel life-wheel__panel--chart", children: selectedCheckin && radarGeometry ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("svg", { className: "life-wheel__radar", viewBox: `0 0 ${RADAR_SIZE} ${RADAR_SIZE}`, role: "img", "aria-label": `Life wheel radar chart for ${dateFormatter.format(new Date(selectedCheckin.date))}`, children: [(0, jsx_runtime_1.jsx)("g", { className: "life-wheel__radar-grid", children: radarGeometry.levelPolygons.map((level) => ((0, jsx_runtime_1.jsx)("polygon", { points: level.points }, level.ratio))) }), (0, jsx_runtime_1.jsx)("g", { className: "life-wheel__radar-axes", children: radarGeometry.axes.map((axis) => ((0, jsx_runtime_1.jsx)("line", { x1: axis.x1, y1: axis.y1, x2: axis.x2, y2: axis.y2 }, axis.key))) }), radarCheckins.map((checkin, index) => {
                                                const scores = parseCheckinScores(checkin.scores);
                                                const geometry = buildRadarGeometry(scores);
                                                return ((0, jsx_runtime_1.jsx)("polygon", { className: `life-wheel__radar-shape ${index === 0 ? 'life-wheel__radar-shape--active' : ''}`, points: geometry.polygonPoints }, checkin.id));
                                            }), (0, jsx_runtime_1.jsx)("g", { className: "life-wheel__radar-labels", children: radarGeometry.labels.map((label) => ((0, jsx_runtime_1.jsx)("text", { x: label.x, y: label.y, textAnchor: label.anchor, dominantBaseline: label.baseline, children: label.text }, label.key))) })] }), (0, jsx_runtime_1.jsx)("div", { className: "life-wheel__chart-actions", children: activeCheckinView === 'area' ? ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: "life-wheel__area-start", onClick: handleStartAreaCheckin, disabled: !selectedAreaCategory || (!isConfigured && !isDemoExperience), children: ["Start Area Check-in", selectedAreaCategory && areaQuestionSet.length > 0 ? ((0, jsx_runtime_1.jsxs)("span", { className: "life-wheel__area-count", children: ["(", areaQuestionSet.length, " questions)"] })) : null] })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", className: "life-wheel__start-questionnaire", onClick: () => startQuestionnaire({
                                                        questionSet: QUESTIONS,
                                                        baseScores: createDefaultScores(),
                                                        label: 'Full Check-in',
                                                    }), disabled: !isConfigured && !isDemoExperience, children: ["Start New Wellbeing Check-in", (0, jsx_runtime_1.jsxs)("span", { className: "life-wheel__questionnaire-count", children: ["(", QUESTIONS.length, " questions)"] })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "life-wheel__quick-checkin", onClick: () => setIsQuickCheckinOpen(true), disabled: !isConfigured && !isDemoExperience, children: "Quick Score Check-in" })] })) }), (0, jsx_runtime_1.jsxs)("div", { className: "life-wheel__snapshot", children: [(0, jsx_runtime_1.jsx)("h3", { children: dateFormatter.format(new Date(selectedCheckin.date)) }), (0, jsx_runtime_1.jsxs)("p", { children: ["Average score: ", (0, jsx_runtime_1.jsx)("strong", { children: averageScore }), "/10. Track improvements by logging a new check-in whenever your priorities shift."] })] }), (0, jsx_runtime_1.jsx)("div", { className: "life-wheel__picker", children: (0, jsx_runtime_1.jsxs)("details", { children: [(0, jsx_runtime_1.jsx)("summary", { children: "Change check-in" }), (0, jsx_runtime_1.jsxs)("div", { className: "life-wheel__picker-panel", children: [(0, jsx_runtime_1.jsxs)("div", { className: "life-wheel__picker-header", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h4", { children: "Check-in history" }), (0, jsx_runtime_1.jsx)("p", { children: "Select a date to update the radar view." })] }), (0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("span", { className: "life-wheel__picker-label", children: "Year" }), (0, jsx_runtime_1.jsxs)("select", { value: selectedHistoryYear, onChange: (event) => setSelectedHistoryYear(event.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "all", children: "All" }), historyYears.map((year) => ((0, jsx_runtime_1.jsx)("option", { value: year, children: year }, year)))] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "life-wheel__timeline", children: [(0, jsx_runtime_1.jsx)("h5", { children: "Total score trend" }), checkinTimeline.length > 0 ? ((0, jsx_runtime_1.jsx)("svg", { className: "life-wheel__timeline-chart", viewBox: "0 0 260 100", role: "img", children: (() => {
                                                                        const padding = 16;
                                                                        const width = 260;
                                                                        const height = 100;
                                                                        const totals = checkinTimeline.map((item) => item.total);
                                                                        const min = Math.min(...totals);
                                                                        const max = Math.max(...totals);
                                                                        const range = Math.max(1, max - min);
                                                                        const step = checkinTimeline.length > 1 ? (width - padding * 2) / (checkinTimeline.length - 1) : 0;
                                                                        const points = checkinTimeline.map((item, index) => {
                                                                            const x = padding + step * index;
                                                                            const y = height - padding - ((item.total - min) / range) * (height - padding * 2);
                                                                            return `${x},${y}`;
                                                                        });
                                                                        return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("polyline", { className: "life-wheel__timeline-line", points: points.join(' ') }), points.map((point, index) => ((0, jsx_runtime_1.jsx)("circle", { className: "life-wheel__timeline-point", cx: Number(point.split(',')[0]), cy: Number(point.split(',')[1]), r: 3 }, checkinTimeline[index].id)))] }));
                                                                    })() })) : ((0, jsx_runtime_1.jsx)("p", { className: "life-wheel__timeline-empty", children: "No check-ins in this year yet." }))] }), (0, jsx_runtime_1.jsx)("div", { className: "life-wheel__picker-list", children: checkinTimeline.length > 0 ? ((0, jsx_runtime_1.jsx)("ul", { children: checkinTimeline
                                                                    .slice()
                                                                    .reverse()
                                                                    .map((item) => {
                                                                    const isActive = selectedCheckin ? item.id === selectedCheckin.id : false;
                                                                    return ((0, jsx_runtime_1.jsx)("li", { children: (0, jsx_runtime_1.jsxs)("button", { type: "button", className: `life-wheel__history-item ${isActive ? 'life-wheel__history-item--active' : ''}`, onClick: () => setSelectedCheckinId(item.id), children: [(0, jsx_runtime_1.jsx)("span", { children: item.label }), (0, jsx_runtime_1.jsxs)("span", { children: [item.total, "/80 total"] })] }) }, item.id));
                                                                }) })) : ((0, jsx_runtime_1.jsx)("p", { className: "life-wheel__timeline-empty", children: "Log a check-in to populate this timeline." })) })] })] }) })] })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: "life-wheel__empty", children: (0, jsx_runtime_1.jsx)("p", { children: "Log your first check-in to unlock the radar chart and trend history." }) }), (0, jsx_runtime_1.jsx)("div", { className: "life-wheel__chart-actions", children: activeCheckinView === 'area' ? ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: "life-wheel__area-start", onClick: handleStartAreaCheckin, disabled: !selectedAreaCategory || (!isConfigured && !isDemoExperience), children: ["Start Area Check-in", selectedAreaCategory && areaQuestionSet.length > 0 ? ((0, jsx_runtime_1.jsxs)("span", { className: "life-wheel__area-count", children: ["(", areaQuestionSet.length, " questions)"] })) : null] })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", className: "life-wheel__start-questionnaire", onClick: () => startQuestionnaire({
                                                        questionSet: QUESTIONS,
                                                        baseScores: createDefaultScores(),
                                                        label: 'Full Check-in',
                                                    }), disabled: !isConfigured && !isDemoExperience, children: ["Start New Wellbeing Check-in", (0, jsx_runtime_1.jsxs)("span", { className: "life-wheel__questionnaire-count", children: ["(", QUESTIONS.length, " questions)"] })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "life-wheel__quick-checkin", onClick: () => setIsQuickCheckinOpen(true), disabled: !isConfigured && !isDemoExperience, children: "Quick Score Check-in" })] })) })] })) }) })] })), activeCheckinView !== 'annual' ? ((0, jsx_runtime_1.jsxs)("dialog", { className: "modal life-wheel__quick-checkin-modal", open: isQuickCheckinOpen, children: [(0, jsx_runtime_1.jsx)("div", { className: "modal-backdrop", onClick: () => setIsQuickCheckinOpen(false) }), (0, jsx_runtime_1.jsxs)("div", { className: "modal__panel life-wheel__quick-checkin-panel", onClick: (event) => event.stopPropagation(), children: [(0, jsx_runtime_1.jsxs)("div", { className: "life-wheel__form-header life-wheel__form-header--modal", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { children: "Quick Score Check-in" }), (0, jsx_runtime_1.jsx)("p", { children: "Prefer sliders? Record a check-in directly here." })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "life-wheel__quick-checkin-close", onClick: () => setIsQuickCheckinOpen(false), "aria-label": "Close quick score check-in", children: "\u2715" })] }), (0, jsx_runtime_1.jsxs)("form", { className: "life-wheel__form", onSubmit: handleFormSubmit, children: [(0, jsx_runtime_1.jsxs)("div", { className: "life-wheel__field", children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "life-wheel-date", children: "Check-in date" }), (0, jsx_runtime_1.jsx)("input", { id: "life-wheel-date", type: "date", value: formDate, max: formatISODate(new Date()), onChange: (event) => setFormDate(event.target.value), required: true })] }), (0, jsx_runtime_1.jsx)("div", { className: "life-wheel__field-group", children: exports.LIFE_WHEEL_CATEGORIES.map((category) => ((0, jsx_runtime_1.jsxs)("div", { className: "life-wheel__field", children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: `life-wheel-${category.key}`, children: category.label }), (0, jsx_runtime_1.jsxs)("div", { className: "life-wheel__slider", children: [(0, jsx_runtime_1.jsx)("input", { id: `life-wheel-${category.key}`, type: "range", min: 0, max: MAX_SCORE, step: 1, value: formScores[category.key] ?? 0, onChange: handleScoreChange(category.key) }), (0, jsx_runtime_1.jsx)("span", { children: formScores[category.key] ?? 0 })] })] }, category.key))) }), (0, jsx_runtime_1.jsxs)("div", { className: "life-wheel__actions", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "life-wheel__secondary", onClick: handleUseLatestScores, children: "Use latest scores" }), (0, jsx_runtime_1.jsx)("button", { type: "submit", className: "life-wheel__primary", disabled: submitting, children: submitting ? 'Saving…' : 'Save check-in' })] })] })] })] })) : null] }));
}
function LifeWheelInsightsPanel({ session }) {
    const { isConfigured } = (0, SupabaseAuthProvider_1.useSupabaseAuth)();
    const isDemoExperience = (0, demoSession_1.isDemoSession)(session);
    const [checkins, setCheckins] = (0, react_1.useState)([]);
    const [errorMessage, setErrorMessage] = (0, react_1.useState)(null);
    const [celebrationNote, setCelebrationNote] = (0, react_1.useState)('');
    const [growthNote, setGrowthNote] = (0, react_1.useState)('');
    const [bestRightNow, setBestRightNow] = (0, react_1.useState)('');
    const [needsAttention, setNeedsAttention] = (0, react_1.useState)('');
    const [improvementIdeas, setImprovementIdeas] = (0, react_1.useState)('');
    const [supportIdeas, setSupportIdeas] = (0, react_1.useState)('');
    const loadCheckins = (0, react_1.useCallback)(async () => {
        if (!isConfigured && !isDemoExperience) {
            setCheckins([]);
            return;
        }
        setErrorMessage(null);
        try {
            const { data, error } = await (0, checkins_1.fetchCheckinsForUser)(session.user.id);
            if (error)
                throw error;
            setCheckins(data ?? []);
        }
        catch (error) {
            setErrorMessage(error instanceof Error
                ? error.message
                : 'Unable to load check-in history right now. Please try again soon.');
        }
    }, [isConfigured, isDemoExperience, session.user.id]);
    (0, react_1.useEffect)(() => {
        if (!isConfigured && !isDemoExperience) {
            setCheckins([]);
            return;
        }
        void loadCheckins();
    }, [isConfigured, isDemoExperience, loadCheckins]);
    const trendInsights = (0, react_1.useMemo)(() => createTrendInsights(checkins), [checkins]);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "life-wheel__insights-panel", children: [errorMessage ? (0, jsx_runtime_1.jsx)("p", { className: "life-wheel__status life-wheel__status--error", children: errorMessage }) : null, (0, jsx_runtime_1.jsxs)("div", { className: "life-wheel__focus", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Life wheel focus" }), (0, jsx_runtime_1.jsx)("p", { children: "Capture quick reflections and next steps while your insights are fresh." }), (0, jsx_runtime_1.jsxs)("div", { className: "life-wheel__focus-grid", children: [(0, jsx_runtime_1.jsxs)("div", { className: "life-wheel__focus-card life-wheel__focus-card--positive", children: [(0, jsx_runtime_1.jsx)("h4", { children: "What's working right now" }), (0, jsx_runtime_1.jsx)("textarea", { value: celebrationNote, onChange: (event) => setCelebrationNote(event.target.value), placeholder: "Name a win, a bright spot, or a supportive habit.", rows: 3 }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "life-wheel__claim life-wheel__claim--positive", disabled: true, children: "Claim 100 points" }), (0, jsx_runtime_1.jsx)("span", { className: "life-wheel__claim-note", children: "Future feature" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "life-wheel__focus-card life-wheel__focus-card--improve", children: [(0, jsx_runtime_1.jsx)("h4", { children: "What needs improvement" }), (0, jsx_runtime_1.jsx)("textarea", { value: growthNote, onChange: (event) => setGrowthNote(event.target.value), placeholder: "Call out the area that needs the most care.", rows: 3 }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "life-wheel__claim life-wheel__claim--improve", disabled: true, children: "Claim / Do 1000 points" }), (0, jsx_runtime_1.jsx)("span", { className: "life-wheel__claim-note", children: "Future feature" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "life-wheel__focus-notes", children: [(0, jsx_runtime_1.jsxs)("label", { children: ["Best area right now", (0, jsx_runtime_1.jsx)("textarea", { value: bestRightNow, onChange: (event) => setBestRightNow(event.target.value), placeholder: "Which life area feels the strongest today?", rows: 2 })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Toughest area right now", (0, jsx_runtime_1.jsx)("textarea", { value: needsAttention, onChange: (event) => setNeedsAttention(event.target.value), placeholder: "Which area feels the most challenging?", rows: 2 })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "life-wheel__focus-notes life-wheel__focus-notes--ideas", children: [(0, jsx_runtime_1.jsxs)("label", { children: ["Suggestions for improvement", (0, jsx_runtime_1.jsx)("textarea", { value: improvementIdeas, onChange: (event) => setImprovementIdeas(event.target.value), placeholder: "List one or two small actions that could help.", rows: 2 })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Support that could help", (0, jsx_runtime_1.jsx)("textarea", { value: supportIdeas, onChange: (event) => setSupportIdeas(event.target.value), placeholder: "People, routines, or resources to lean on.", rows: 2 })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "life-wheel__insights", children: [(0, jsx_runtime_1.jsxs)("div", { className: "life-wheel__insights-header", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Trend insights" }), (0, jsx_runtime_1.jsx)("p", { children: trendInsights
                                    ? trendInsights.averageDirection === 'steady'
                                        ? `Overall balance held steady compared to ${trendInsights.previousLabel}.`
                                        : `Overall balance ${trendInsights.averageDirection === 'up' ? 'improved' : 'dipped'} by ${formatSignedDecimal(trendInsights.averageDelta)} points compared to ${trendInsights.previousLabel}.`
                                    : 'Log at least two check-ins to unlock week-over-week highlights.' })] }), trendInsights ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("p", { className: "life-wheel__insights-meta", children: ["Latest average ", (0, jsx_runtime_1.jsx)("strong", { children: trendInsights.latestAverage.toFixed(1) }), "/10 \u2022 Previous", ' ', (0, jsx_runtime_1.jsx)("strong", { children: trendInsights.previousAverage.toFixed(1) }), "/10"] }), (0, jsx_runtime_1.jsxs)("div", { className: "life-wheel__insight-cards", children: [(0, jsx_runtime_1.jsxs)("section", { className: "life-wheel__insight-card life-wheel__insight-card--lift", children: [(0, jsx_runtime_1.jsx)("h4", { children: "Where you gained momentum" }), trendInsights.improvements.length > 0 ? ((0, jsx_runtime_1.jsx)("ul", { className: "life-wheel__insight-list", children: trendInsights.improvements.map((item) => ((0, jsx_runtime_1.jsxs)("li", { children: [(0, jsx_runtime_1.jsx)("span", { className: "life-wheel__insight-label", children: item.label }), (0, jsx_runtime_1.jsx)("span", { className: "life-wheel__insight-delta life-wheel__insight-delta--positive", children: formatSignedInteger(item.delta) }), (0, jsx_runtime_1.jsxs)("span", { className: "life-wheel__insight-score", children: ["Now ", item.latest, "/10"] })] }, item.key))) })) : ((0, jsx_runtime_1.jsx)("p", { className: "life-wheel__insight-empty", children: "No gains yet\u2014celebrate a win with your next check-in." }))] }), (0, jsx_runtime_1.jsxs)("section", { className: "life-wheel__insight-card life-wheel__insight-card--dip", children: [(0, jsx_runtime_1.jsx)("h4", { children: "Where to focus next" }), trendInsights.declines.length > 0 ? ((0, jsx_runtime_1.jsx)("ul", { className: "life-wheel__insight-list", children: trendInsights.declines.map((item) => ((0, jsx_runtime_1.jsxs)("li", { children: [(0, jsx_runtime_1.jsx)("span", { className: "life-wheel__insight-label", children: item.label }), (0, jsx_runtime_1.jsx)("span", { className: "life-wheel__insight-delta life-wheel__insight-delta--negative", children: formatSignedInteger(item.delta) }), (0, jsx_runtime_1.jsxs)("span", { className: "life-wheel__insight-score", children: ["Now ", item.latest, "/10"] })] }, item.key))) })) : ((0, jsx_runtime_1.jsx)("p", { className: "life-wheel__insight-empty", children: "No dips detected\u2014keep nurturing these areas." }))] })] }), trendInsights.stableCount > 0 ? ((0, jsx_runtime_1.jsxs)("p", { className: "life-wheel__insights-stable", children: [trendInsights.stableCount, " ", trendInsights.stableCount === 1 ? 'area' : 'areas', " held steady. Consistency counts."] })) : null] })) : null] })] }));
}
