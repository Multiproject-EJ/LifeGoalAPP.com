"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsRetrospective = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const annualReviews_1 = require("../../../services/annualReviews");
const LifeWheelCheckins_1 = require("../../checkins/LifeWheelCheckins");
const StatsCard_1 = require("./StatsCard");
const ShareableYearInReview_1 = require("./ShareableYearInReview");
const imageGenerator_1 = require("../../../utils/imageGenerator");
/**
 * Step 1: The Retrospective - Display year-in-review statistics
 * Shows user's accomplishments in a "Spotify Wrapped" style layout
 */
const StatsRetrospective = ({ year, onNext }) => {
    const [stats, setStats] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [isGeneratingImage, setIsGeneratingImage] = (0, react_1.useState)(false);
    const [shareError, setShareError] = (0, react_1.useState)(null);
    const shareableRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        const loadStats = async () => {
            setIsLoading(true);
            setError(null);
            const { data, error: fetchError } = await (0, annualReviews_1.getYearInReviewStats)(year);
            if (fetchError) {
                setError('Failed to load your year in review. Please try again.');
                setIsLoading(false);
                return;
            }
            setStats(data);
            setIsLoading(false);
        };
        loadStats();
    }, [year]);
    // Get the label for the most active category
    const getMostActiveCategoryLabel = (categoryKey) => {
        if (!categoryKey)
            return 'N/A';
        const category = LifeWheelCheckins_1.LIFE_WHEEL_CATEGORIES.find(cat => cat.key === categoryKey);
        return category?.label || categoryKey;
    };
    // Handle share/download image
    const handleShareImage = async () => {
        if (!shareableRef.current || !stats)
            return;
        setIsGeneratingImage(true);
        setShareError(null);
        try {
            await (0, imageGenerator_1.shareOrDownloadImage)(shareableRef.current, `year-in-review-${year}.png`, {
                title: `My ${year} in Review`,
                text: `Check out my ${year} achievements! I completed ${stats.total_habits_completed} habits! 🎯`,
            });
        }
        catch (error) {
            console.error('Failed to generate image:', error);
            setShareError('Failed to generate image. Please try again.');
        }
        finally {
            setIsGeneratingImage(false);
        }
    };
    if (isLoading) {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "review-step", children: [(0, jsx_runtime_1.jsxs)("h2", { children: ["\uD83D\uDCCA Your ", year, " in Review"] }), (0, jsx_runtime_1.jsx)("p", { children: "Loading your achievements..." }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', justifyContent: 'center', padding: '3rem' }, children: (0, jsx_runtime_1.jsx)("div", { className: "loading-spinner" }) }), (0, jsx_runtime_1.jsx)("style", { children: `
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
    if (error) {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "review-step", children: [(0, jsx_runtime_1.jsxs)("h2", { children: ["\uD83D\uDCCA Your ", year, " in Review"] }), (0, jsx_runtime_1.jsx)("div", { style: {
                        padding: '2rem',
                        background: '#fef2f2',
                        borderRadius: '12px',
                        color: '#991b1b',
                        marginBottom: '1rem'
                    }, children: error }), (0, jsx_runtime_1.jsx)("div", { className: "step-actions", children: (0, jsx_runtime_1.jsx)("button", { className: "btn-primary", onClick: onNext, children: "Continue Anyway" }) })] }));
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "review-step", children: [(0, jsx_runtime_1.jsxs)("div", { className: "retrospective-header", children: [(0, jsx_runtime_1.jsxs)("h2", { children: ["\uD83D\uDCCA Your ", year, " in Review"] }), (0, jsx_runtime_1.jsx)("p", { children: "Let's celebrate what you accomplished this year!" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "stats-grid", children: [(0, jsx_runtime_1.jsx)(StatsCard_1.StatsCard, { icon: "\uD83C\uDFAF", label: "Habits Completed", value: stats?.total_habits_completed || 0, color: "linear-gradient(135deg, #06b6d4, #0891b2)", delay: 0 }), (0, jsx_runtime_1.jsx)(StatsCard_1.StatsCard, { icon: "\uD83D\uDD25", label: "Longest Streak", value: `${stats?.longest_streak || 0} days`, color: "linear-gradient(135deg, #f59e0b, #d97706)", delay: 150 }), (0, jsx_runtime_1.jsx)(StatsCard_1.StatsCard, { icon: "\u2B50", label: "Most Active Area", value: getMostActiveCategoryLabel(stats?.most_active_category || null), color: "linear-gradient(135deg, #8b5cf6, #7c3aed)", delay: 300 })] }), (0, jsx_runtime_1.jsx)("div", { className: "retrospective-message", children: (0, jsx_runtime_1.jsxs)("div", { className: "message-card", children: [(0, jsx_runtime_1.jsx)("h3", { style: { fontSize: '1.25rem', marginBottom: '0.5rem', color: '#0f172a' }, children: "You did amazing! \uD83C\uDF89" }), (0, jsx_runtime_1.jsx)("p", { style: { color: '#64748b', lineHeight: '1.6' }, children: stats?.total_habits_completed && stats.total_habits_completed > 0 ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: ["You completed ", (0, jsx_runtime_1.jsx)("strong", { children: stats.total_habits_completed }), " habits in ", year, ".", stats.longest_streak && stats.longest_streak > 0 && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [" Your dedication shows with a ", stats.longest_streak, "-day streak!"] }))] })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: ["This is a fresh start! Let's make ", year + 1, " your best year yet."] })) })] }) }), shareError && ((0, jsx_runtime_1.jsx)("div", { style: {
                    marginTop: '1rem',
                    padding: '0.75rem',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    color: '#991b1b',
                    fontSize: '0.875rem'
                }, children: shareError })), (0, jsx_runtime_1.jsxs)("div", { className: "step-actions", children: [(0, jsx_runtime_1.jsx)("button", { className: "btn-secondary", onClick: handleShareImage, disabled: isGeneratingImage, style: { marginRight: 'auto' }, children: isGeneratingImage ? '⏳ Generating...' : '📸 Share Image' }), (0, jsx_runtime_1.jsx)("button", { className: "btn-primary", onClick: onNext, children: "Next: Life Wheel Audit \u2192" })] }), (0, jsx_runtime_1.jsx)("div", { style: {
                    position: 'fixed',
                    left: '-9999px',
                    top: '-9999px',
                    visibility: 'hidden'
                }, children: (0, jsx_runtime_1.jsx)("div", { ref: shareableRef, children: stats && (0, jsx_runtime_1.jsx)(ShareableYearInReview_1.ShareableYearInReview, { year: year, stats: stats }) }) }), (0, jsx_runtime_1.jsx)("style", { children: `
        .retrospective-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .stats-grid {
          display: grid;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        @media (min-width: 640px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .retrospective-message {
          margin-top: 2rem;
        }

        .message-card {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          padding: 1.5rem;
          border-radius: 16px;
          border: 2px solid #fbbf24;
          box-shadow: 0 4px 12px rgba(251, 191, 36, 0.2);
        }
      ` })] }));
};
exports.StatsRetrospective = StatsRetrospective;
