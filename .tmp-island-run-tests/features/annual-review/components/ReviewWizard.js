"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewWizard = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const canvas_confetti_1 = __importDefault(require("canvas-confetti"));
const StatsRetrospective_1 = require("./StatsRetrospective");
const LifeWheelAudit_1 = require("./LifeWheelAudit");
const VisionBoardManifest_1 = require("./VisionBoardManifest");
const HabitPlanning_1 = require("./HabitPlanning");
const LifeWheelCheckins_1 = require("../../checkins/LifeWheelCheckins");
const annualReviews_1 = require("../../../services/annualReviews");
const supabaseClient_1 = require("../../../lib/supabaseClient");
const ReviewWizard = ({ onComplete }) => {
    const [step, setStep] = (0, react_1.useState)(1);
    const totalSteps = 4;
    // Default to reviewing the previous year (current year - 1)
    const [reviewYear] = (0, react_1.useState)(new Date().getFullYear() - 1);
    const [lifeWheelData, setLifeWheelData] = (0, react_1.useState)(null);
    const [reviewId, setReviewId] = (0, react_1.useState)(null);
    const [isSaving, setIsSaving] = (0, react_1.useState)(false);
    const [saveError, setSaveError] = (0, react_1.useState)(null);
    // Load existing review on mount
    (0, react_1.useEffect)(() => {
        const loadExistingReview = async () => {
            const { data, error } = await (0, annualReviews_1.fetchAnnualReviewByYear)(reviewYear);
            if (!error && data) {
                setReviewId(data.id);
                // Parse reflection_text to restore lifeWheelData if it exists
                if (data.reflection_text) {
                    try {
                        const parsedData = JSON.parse(data.reflection_text);
                        setLifeWheelData(parsedData);
                    }
                    catch (parseError) {
                        console.error('Failed to parse reflection text:', parseError);
                        // Continue without restoring data
                    }
                }
            }
        };
        loadExistingReview();
    }, [reviewYear]);
    const nextStep = () => setStep((prev) => Math.min(prev + 1, totalSteps));
    const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));
    const handleLifeWheelNext = async (data) => {
        setLifeWheelData(data);
        setSaveError(null);
        setIsSaving(true);
        try {
            // Calculate overall rating as average of all category ratings
            const ratings = LifeWheelCheckins_1.LIFE_WHEEL_CATEGORIES.map(cat => data[cat.key].rating);
            const overallRating = Math.round(ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length);
            // Serialize the life wheel data as JSON for storage
            const reflectionText = JSON.stringify(data);
            const supabase = (0, supabaseClient_1.getSupabaseClient)();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('User not authenticated');
            }
            if (reviewId) {
                // Update existing review
                const { error } = await (0, annualReviews_1.updateAnnualReview)(reviewId, {
                    reflection_text: reflectionText,
                    overall_rating: overallRating,
                });
                if (error)
                    throw error;
            }
            else {
                // Create new review
                const { data: newReview, error } = await (0, annualReviews_1.createAnnualReview)({
                    user_id: user.id,
                    year: reviewYear,
                    reflection_text: reflectionText,
                    overall_rating: overallRating,
                });
                if (error)
                    throw error;
                if (newReview) {
                    setReviewId(newReview.id);
                }
            }
            nextStep();
        }
        catch (error) {
            console.error('Failed to save annual review:', error);
            setSaveError('Failed to save your review. Please try again.');
        }
        finally {
            setIsSaving(false);
        }
    };
    const handleComplete = async () => {
        (0, canvas_confetti_1.default)({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 }
        });
        // Save completion state if we have a reviewId
        if (reviewId) {
            try {
                await (0, annualReviews_1.markAnnualReviewComplete)(reviewId);
            }
            catch (error) {
                console.error('Failed to mark review as complete:', error);
                // Continue anyway - don't block the user's celebration
            }
        }
        // Show success message briefly before redirecting
        setTimeout(() => {
            if (onComplete) {
                onComplete();
            }
            else {
                // Default behavior: show a friendly message
                // The parent component or app should handle navigation
                alert("Annual Review Completed! Your manifestation for the new year is set. 🎉");
            }
        }, 2000); // Wait 2 seconds to let confetti show
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "container", style: { maxWidth: '800px', padding: '2rem 1rem' }, children: [(0, jsx_runtime_1.jsxs)("header", { style: { marginBottom: '2rem', textAlign: 'center' }, children: [(0, jsx_runtime_1.jsx)("h1", { style: { fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }, children: "Annual Review & Manifestation" }), (0, jsx_runtime_1.jsx)("p", { style: { color: '#64748b' }, children: "Reflect on the past, design the future." })] }), (0, jsx_runtime_1.jsx)("div", { style: { background: '#e2e8f0', height: '8px', borderRadius: '4px', marginBottom: '2rem' }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                        width: `${(step / totalSteps) * 100}%`,
                        background: 'linear-gradient(to right, #06b6d4, #3b82f6)',
                        height: '100%',
                        borderRadius: '4px',
                        transition: 'width 0.3s ease'
                    } }) }), (0, jsx_runtime_1.jsxs)("div", { className: "review-card", style: {
                    background: 'white',
                    padding: '2rem',
                    borderRadius: '24px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    minHeight: '400px',
                    display: 'flex',
                    flexDirection: 'column'
                }, children: [step === 1 && (0, jsx_runtime_1.jsx)(StatsRetrospective_1.StatsRetrospective, { year: reviewYear, onNext: nextStep }), step === 2 && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(LifeWheelAudit_1.LifeWheelAudit, { onNext: handleLifeWheelNext, onBack: prevStep, reviewYear: reviewYear, initialData: lifeWheelData || undefined, isLoading: isSaving }), saveError && ((0, jsx_runtime_1.jsx)("div", { style: {
                                    marginTop: '1rem',
                                    padding: '0.75rem',
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    borderRadius: '8px',
                                    color: '#991b1b',
                                    fontSize: '0.875rem'
                                }, children: saveError }))] })), step === 3 && ((0, jsx_runtime_1.jsx)(VisionBoardManifest_1.VisionBoardManifest, { onNext: nextStep, onBack: prevStep, reviewId: reviewId, reviewYear: reviewYear })), step === 4 && ((0, jsx_runtime_1.jsx)(HabitPlanning_1.HabitPlanning, { onBack: prevStep, onComplete: handleComplete, reviewId: reviewId, reviewYear: reviewYear }))] }), (0, jsx_runtime_1.jsx)("style", { children: `
        .step-actions {
          margin-top: auto;
          padding-top: 2rem;
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
        }
        .btn-primary {
          background: #06b6d4;
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 999px;
          border: none;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .btn-primary:hover {
          opacity: 0.9;
        }
        .btn-secondary {
          background: transparent;
          color: #64748b;
          padding: 0.75rem 1.5rem;
          border-radius: 999px;
          border: 1px solid #cbd5e1;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-secondary:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        .review-step {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .review-step h2 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
          color: #0f172a;
        }
        .review-step p {
          color: #64748b;
          margin-bottom: 1.5rem;
        }
      ` })] }));
};
exports.ReviewWizard = ReviewWizard;
