"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShareableYearInReview = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const LifeWheelCheckins_1 = require("../../checkins/LifeWheelCheckins");
/**
 * Shareable Year in Review component - designed for social media sharing
 * This component is optimized for capture as an image (1080x1080px for Instagram)
 */
const ShareableYearInReview = ({ year, stats }) => {
    // Get the label for the most active category
    const getMostActiveCategoryLabel = (categoryKey) => {
        if (!categoryKey)
            return 'N/A';
        const category = LifeWheelCheckins_1.LIFE_WHEEL_CATEGORIES.find(cat => cat.key === categoryKey);
        return category?.label || categoryKey;
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "shareable-year-review", style: {
            width: '1080px',
            height: '1080px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '80px 60px',
            boxSizing: 'border-box',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
        }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { textAlign: 'center' }, children: [(0, jsx_runtime_1.jsx)("h1", { style: {
                            fontSize: '80px',
                            fontWeight: '900',
                            margin: '0 0 20px 0',
                            textShadow: '0 4px 20px rgba(0,0,0,0.3)',
                            letterSpacing: '-2px'
                        }, children: year }), (0, jsx_runtime_1.jsx)("p", { style: {
                            fontSize: '40px',
                            margin: '0',
                            fontWeight: '600',
                            opacity: 0.95
                        }, children: "My Year in Review" })] }), (0, jsx_runtime_1.jsxs)("div", { style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '30px',
                    margin: '40px 0'
                }, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                            background: 'rgba(255, 255, 255, 0.15)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '30px',
                            padding: '40px',
                            border: '2px solid rgba(255, 255, 255, 0.2)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                        }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                    fontSize: '36px',
                                    marginBottom: '15px',
                                    opacity: 0.9,
                                    fontWeight: '600'
                                }, children: "\uD83C\uDFAF Habits Completed" }), (0, jsx_runtime_1.jsx)("div", { style: {
                                    fontSize: '100px',
                                    fontWeight: '900',
                                    lineHeight: '1',
                                    textShadow: '0 4px 20px rgba(0,0,0,0.2)'
                                }, children: stats.total_habits_completed })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: '30px' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                                    flex: 1,
                                    background: 'rgba(255, 255, 255, 0.15)',
                                    backdropFilter: 'blur(10px)',
                                    borderRadius: '30px',
                                    padding: '40px',
                                    border: '2px solid rgba(255, 255, 255, 0.2)',
                                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                                }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                            fontSize: '32px',
                                            marginBottom: '15px',
                                            opacity: 0.9,
                                            fontWeight: '600'
                                        }, children: "\uD83D\uDD25 Best Streak" }), (0, jsx_runtime_1.jsx)("div", { style: {
                                            fontSize: '70px',
                                            fontWeight: '900',
                                            lineHeight: '1',
                                            textShadow: '0 4px 20px rgba(0,0,0,0.2)'
                                        }, children: stats.longest_streak }), (0, jsx_runtime_1.jsx)("div", { style: {
                                            fontSize: '28px',
                                            marginTop: '10px',
                                            opacity: 0.85
                                        }, children: "days" })] }), (0, jsx_runtime_1.jsxs)("div", { style: {
                                    flex: 1,
                                    background: 'rgba(255, 255, 255, 0.15)',
                                    backdropFilter: 'blur(10px)',
                                    borderRadius: '30px',
                                    padding: '40px',
                                    border: '2px solid rgba(255, 255, 255, 0.2)',
                                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center'
                                }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                            fontSize: '32px',
                                            marginBottom: '15px',
                                            opacity: 0.9,
                                            fontWeight: '600'
                                        }, children: "\u2B50 Top Area" }), (0, jsx_runtime_1.jsx)("div", { style: {
                                            fontSize: '36px',
                                            fontWeight: '800',
                                            lineHeight: '1.2',
                                            textShadow: '0 4px 20px rgba(0,0,0,0.2)',
                                            wordBreak: 'break-word'
                                        }, children: getMostActiveCategoryLabel(stats.most_active_category) })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { style: {
                    textAlign: 'center',
                    opacity: 0.9
                }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                            fontSize: '32px',
                            fontWeight: '700',
                            marginBottom: '10px'
                        }, children: "LifeGoal App" }), (0, jsx_runtime_1.jsx)("div", { style: {
                            fontSize: '24px',
                            opacity: 0.8
                        }, children: "Track your journey, achieve your goals" })] })] }));
};
exports.ShareableYearInReview = ShareableYearInReview;
