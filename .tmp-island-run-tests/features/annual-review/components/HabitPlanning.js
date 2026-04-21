"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HabitPlanning = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const LifeWheelCheckins_1 = require("../../checkins/LifeWheelCheckins");
const annualReviews_1 = require("../../../services/annualReviews");
const habitsV2_1 = require("../../../services/habitsV2");
const supabaseClient_1 = require("../../../lib/supabaseClient");
// Constants for habit creation
const DEFAULT_HABIT_TYPE = 'boolean';
const DEFAULT_SCHEDULE = { mode: 'daily' };
const DEFAULT_EMOJI = '✅';
const HabitPlanning = ({ onBack, onComplete, reviewId, reviewYear, }) => {
    const [goals, setGoals] = (0, react_1.useState)([]);
    const [selectedGoalId, setSelectedGoalId] = (0, react_1.useState)(null);
    const [habitInputs, setHabitInputs] = (0, react_1.useState)({});
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [isSaving, setIsSaving] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        if (!reviewId) {
            setIsLoading(false);
            return;
        }
        const loadGoals = async () => {
            setIsLoading(true);
            const { data, error: fetchError } = await (0, annualReviews_1.fetchAnnualGoalsByReview)(reviewId);
            if (fetchError) {
                setError('Failed to load your goals. You can still complete the review.');
                setIsLoading(false);
                return;
            }
            if (data && data.length > 0) {
                setGoals(data);
                setSelectedGoalId(data[0].id);
                // Initialize habit inputs for each goal
                const initialInputs = {};
                data.forEach(goal => {
                    initialInputs[goal.id] = {
                        goalId: goal.id,
                        category: goal.category,
                        title: '',
                        emoji: DEFAULT_EMOJI,
                    };
                });
                setHabitInputs(initialInputs);
            }
            setIsLoading(false);
        };
        loadGoals();
    }, [reviewId]);
    const handleHabitTitleChange = (goalId, title) => {
        setHabitInputs(prev => ({
            ...prev,
            [goalId]: {
                ...prev[goalId],
                title,
            },
        }));
    };
    const handleComplete = async () => {
        if (!reviewId) {
            onComplete();
            return;
        }
        setIsSaving(true);
        setError(null);
        try {
            const supabase = (0, supabaseClient_1.getSupabaseClient)();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('User not authenticated');
            }
            // Create habits for goals that have a title defined
            for (const goal of goals) {
                const habitInput = habitInputs[goal.id];
                if (!habitInput || habitInput.title.trim() === '') {
                    continue; // Skip goals without habit titles
                }
                // Create a simple daily habit
                const { error: createError } = await (0, habitsV2_1.createHabitV2)({
                    title: habitInput.title.trim(),
                    emoji: habitInput.emoji,
                    type: DEFAULT_HABIT_TYPE,
                    schedule: DEFAULT_SCHEDULE,
                    domain_key: habitInput.category,
                    target_num: null,
                    target_unit: null,
                    archived: false,
                    allow_skip: true,
                }, user.id);
                if (createError) {
                    console.error(`Failed to create habit for goal ${goal.goal_statement}:`, createError);
                    // Continue creating other habits even if one fails
                }
            }
            onComplete();
        }
        catch (error) {
            console.error('Failed to create habits:', error);
            setError(error instanceof Error ? error.message : 'Failed to create habits. You can add them manually later.');
            setIsSaving(false);
        }
    };
    const selectedGoal = goals.find(g => g.id === selectedGoalId);
    const selectedCategory = selectedGoal
        ? LifeWheelCheckins_1.LIFE_WHEEL_CATEGORIES.find(cat => cat.key === selectedGoal.category)
        : null;
    const selectedHabitInput = selectedGoalId ? habitInputs[selectedGoalId] : null;
    const habitsCreatedCount = Object.values(habitInputs).filter(h => h.title.trim() !== '').length;
    if (isLoading) {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "review-step", children: [(0, jsx_runtime_1.jsx)("h2", { children: "\uD83D\uDCC5 Habit Planning" }), (0, jsx_runtime_1.jsx)("p", { children: "Loading your goals..." }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', justifyContent: 'center', padding: '3rem' }, children: (0, jsx_runtime_1.jsx)("div", { className: "loading-spinner" }) }), (0, jsx_runtime_1.jsx)("style", { children: `
          .loading-spinner {
            width: 48px;
            height: 48px;
            border: 4px solid rgba(6, 182, 212, 0.1);
            border-top-color: #06b6d4;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        ` })] }));
    }
    if (goals.length === 0) {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "review-step habit-planning", children: [(0, jsx_runtime_1.jsx)("h2", { children: "\uD83D\uDCC5 Habit Planning" }), (0, jsx_runtime_1.jsx)("p", { children: "No goals were defined in the previous step. You can add habits manually from the Habits section later." }), (0, jsx_runtime_1.jsxs)("div", { className: "step-actions", children: [(0, jsx_runtime_1.jsx)("button", { className: "btn-secondary", onClick: onBack, children: "Back" }), (0, jsx_runtime_1.jsx)("button", { className: "btn-primary", onClick: onComplete, children: "Complete Review" })] })] }));
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "review-step habit-planning", children: [(0, jsx_runtime_1.jsxs)("div", { className: "planning-header", children: [(0, jsx_runtime_1.jsx)("h2", { children: "\uD83D\uDCC5 Habit Planning" }), (0, jsx_runtime_1.jsxs)("p", { children: ["Create daily habits to support your ", reviewYear + 1, " goals."] }), (0, jsx_runtime_1.jsxs)("div", { className: "progress-indicator", children: [(0, jsx_runtime_1.jsxs)("span", { className: "progress-text", children: [habitsCreatedCount, " / ", goals.length, " habits planned"] }), (0, jsx_runtime_1.jsx)("div", { className: "progress-bar-container", children: (0, jsx_runtime_1.jsx)("div", { className: "progress-bar-fill", style: { width: `${(habitsCreatedCount / goals.length) * 100}%` } }) })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "planning-content", children: [(0, jsx_runtime_1.jsx)("div", { className: "goal-tabs", children: goals.map(goal => {
                            const category = LifeWheelCheckins_1.LIFE_WHEEL_CATEGORIES.find(cat => cat.key === goal.category);
                            const hasHabit = habitInputs[goal.id]?.title.trim() !== '';
                            return ((0, jsx_runtime_1.jsxs)("button", { className: `goal-tab ${selectedGoalId === goal.id ? 'active' : ''} ${hasHabit ? 'completed' : ''}`, onClick: () => setSelectedGoalId(goal.id), children: [(0, jsx_runtime_1.jsx)("span", { className: "goal-category", children: category?.label || goal.category }), hasHabit && (0, jsx_runtime_1.jsx)("span", { className: "check-icon", children: "\u2713" })] }, goal.id));
                        }) }), selectedGoal && selectedHabitInput && ((0, jsx_runtime_1.jsxs)("div", { className: "habit-form", children: [(0, jsx_runtime_1.jsx)("h3", { children: selectedCategory?.label }), (0, jsx_runtime_1.jsxs)("div", { className: "goal-summary", children: [(0, jsx_runtime_1.jsx)("strong", { children: "Your Goal:" }), (0, jsx_runtime_1.jsx)("p", { children: selectedGoal.goal_statement })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "habit-title", children: "Daily Habit to Support This Goal" }), (0, jsx_runtime_1.jsx)("p", { className: "help-text", children: "What's one small daily action you can take? Keep it simple and specific." }), (0, jsx_runtime_1.jsx)("input", { id: "habit-title", type: "text", value: selectedHabitInput.title, onChange: (e) => handleHabitTitleChange(selectedGoalId, e.target.value), placeholder: `e.g., "10 minutes of reading", "30-minute walk", "Call a friend"`, "aria-label": "Daily habit title" })] }), (0, jsx_runtime_1.jsx)("div", { className: "habit-preview", children: selectedHabitInput.title.trim() !== '' && ((0, jsx_runtime_1.jsxs)("div", { className: "preview-card", children: [(0, jsx_runtime_1.jsx)("span", { className: "preview-emoji", children: selectedHabitInput.emoji }), (0, jsx_runtime_1.jsx)("span", { className: "preview-title", children: selectedHabitInput.title }), (0, jsx_runtime_1.jsx)("span", { className: "preview-frequency", children: "Daily" })] })) })] }))] }), error && ((0, jsx_runtime_1.jsx)("div", { className: "error-message", children: error })), (0, jsx_runtime_1.jsxs)("div", { className: "step-actions", children: [(0, jsx_runtime_1.jsx)("button", { className: "btn-secondary", onClick: onBack, disabled: isSaving, children: "Back" }), (0, jsx_runtime_1.jsx)("button", { className: "btn-primary", onClick: handleComplete, disabled: isSaving, children: isSaving ? 'Creating Habits...' : 'Complete Review 🎉' })] }), (0, jsx_runtime_1.jsx)("style", { children: `
        .habit-planning {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .planning-header {
          text-align: center;
        }

        .progress-indicator {
          margin-top: 1rem;
        }

        .progress-text {
          display: block;
          font-size: 0.875rem;
          color: #64748b;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }

        .progress-bar-container {
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(to right, #06b6d4, #3b82f6);
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .planning-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .goal-tabs {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 0.5rem;
        }

        .goal-tab {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.6));
          backdrop-filter: blur(10px);
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .goal-tab:hover {
          border-color: #06b6d4;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(6, 182, 212, 0.15);
        }

        .goal-tab.active {
          background: linear-gradient(135deg, #06b6d4, #0891b2);
          border-color: #06b6d4;
          color: white;
        }

        .goal-tab.completed:not(.active) {
          border-color: #3b82f6;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(6, 182, 212, 0.1));
        }

        .goal-category {
          font-size: 0.875rem;
          font-weight: 600;
        }

        .check-icon {
          font-size: 1rem;
          color: #10b981;
        }

        .goal-tab.active .check-icon {
          color: white;
        }

        .habit-form {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.6));
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 1.5rem;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .habit-form h3 {
          font-size: 1.25rem;
          margin-bottom: 1rem;
          color: #0f172a;
          font-weight: 700;
        }

        .goal-summary {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          padding: 1rem;
          border-radius: 12px;
          margin-bottom: 1.5rem;
          border: 1px solid #fbbf24;
        }

        .goal-summary strong {
          display: block;
          font-size: 0.75rem;
          color: #78350f;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .goal-summary p {
          color: #0f172a;
          margin: 0;
          font-size: 0.875rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 0.5rem;
        }

        .help-text {
          font-size: 0.75rem;
          color: #64748b;
          margin-bottom: 0.75rem;
        }

        .form-group input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.875rem;
          font-family: inherit;
          transition: border-color 0.2s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #06b6d4;
          box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.1);
        }

        .form-group input::placeholder {
          color: #94a3b8;
        }

        .habit-preview {
          min-height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .preview-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: white;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          border: 2px solid #06b6d4;
          box-shadow: 0 4px 12px rgba(6, 182, 212, 0.15);
        }

        .preview-emoji {
          font-size: 1.5rem;
        }

        .preview-title {
          flex: 1;
          font-weight: 600;
          color: #0f172a;
        }

        .preview-frequency {
          font-size: 0.75rem;
          color: #64748b;
          background: #f1f5f9;
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          font-weight: 600;
        }

        .error-message {
          padding: 0.75rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #991b1b;
          font-size: 0.875rem;
        }

        @media (max-width: 640px) {
          .goal-tabs {
            grid-template-columns: repeat(2, 1fr);
          }

          .habit-form {
            padding: 1rem;
          }

          .preview-card {
            flex-direction: column;
            text-align: center;
          }
        }
      ` })] }));
};
exports.HabitPlanning = HabitPlanning;
