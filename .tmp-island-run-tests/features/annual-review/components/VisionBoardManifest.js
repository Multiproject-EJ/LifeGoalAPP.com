"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisionBoardManifest = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const LifeWheelCheckins_1 = require("../../checkins/LifeWheelCheckins");
const visionBoard_1 = require("../../../services/visionBoard");
const annualReviews_1 = require("../../../services/annualReviews");
const supabaseClient_1 = require("../../../lib/supabaseClient");
const VisionBoardManifest = ({ onNext, onBack, reviewId, reviewYear, }) => {
    const [selectedCategory, setSelectedCategory] = (0, react_1.useState)(LifeWheelCheckins_1.LIFE_WHEEL_CATEGORIES[0].key);
    const [goals, setGoals] = (0, react_1.useState)(() => {
        const initialGoals = {};
        LifeWheelCheckins_1.LIFE_WHEEL_CATEGORIES.forEach(cat => {
            initialGoals[cat.key] = {
                category: cat.key,
                goalStatement: '',
                imageFile: null,
                imageUrl: null,
            };
        });
        return initialGoals;
    });
    const [isSaving, setIsSaving] = (0, react_1.useState)(false);
    const [saveError, setSaveError] = (0, react_1.useState)(null);
    const [uploadProgress, setUploadProgress] = (0, react_1.useState)({});
    // Cleanup object URLs on unmount to prevent memory leaks
    (0, react_1.useEffect)(() => {
        return () => {
            // Revoke all object URLs when component unmounts
            Object.values(goals).forEach(goal => {
                if (goal.imageUrl) {
                    URL.revokeObjectURL(goal.imageUrl);
                }
            });
        };
    }, [goals]);
    // Count how many goals have been defined
    const completedCount = (0, react_1.useMemo)(() => {
        return LifeWheelCheckins_1.LIFE_WHEEL_CATEGORIES.filter(cat => {
            const goal = goals[cat.key];
            return goal.goalStatement.trim() !== '';
        }).length;
    }, [goals]);
    const handleGoalStatementChange = (category, statement) => {
        setGoals(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                goalStatement: statement,
            },
        }));
    };
    const handleImageSelect = async (category, file) => {
        // Create a preview URL for the image
        const previewUrl = URL.createObjectURL(file);
        setGoals(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                imageFile: file,
                imageUrl: previewUrl,
            },
        }));
    };
    const handleRemoveImage = (category) => {
        const currentGoal = goals[category];
        if (currentGoal.imageUrl) {
            URL.revokeObjectURL(currentGoal.imageUrl);
        }
        setGoals(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                imageFile: null,
                imageUrl: null,
            },
        }));
    };
    const handleNext = async () => {
        if (!reviewId) {
            setSaveError('Please complete the previous steps first.');
            return;
        }
        setSaveError(null);
        setIsSaving(true);
        try {
            const supabase = (0, supabaseClient_1.getSupabaseClient)();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('User not authenticated');
            }
            // Save each goal that has a statement
            for (const category of LifeWheelCheckins_1.LIFE_WHEEL_CATEGORIES) {
                const goal = goals[category.key];
                if (goal.goalStatement.trim() === '') {
                    continue; // Skip empty goals
                }
                setUploadProgress(prev => ({ ...prev, [category.key]: true }));
                let visionImageUrl = null;
                // Upload image if provided
                if (goal.imageFile) {
                    const { data: visionImageData, error: uploadError } = await (0, visionBoard_1.uploadVisionImage)({
                        userId: user.id,
                        file: goal.imageFile,
                        fileName: goal.imageFile.name,
                        caption: `${reviewYear + 1} Goal: ${category.label}`,
                        visionType: 'annual-review',
                        linkedGoalIds: null,
                        linkedHabitIds: null,
                    });
                    if (uploadError) {
                        console.error(`Failed to upload image for ${category.label}:`, uploadError);
                        // Continue without the image rather than failing completely
                    }
                    else if (visionImageData && visionImageData.image_path) {
                        // Get the public URL of the uploaded image
                        const { data: urlData } = supabase.storage
                            .from(visionBoard_1.VISION_BOARD_BUCKET)
                            .getPublicUrl(visionImageData.image_path);
                        visionImageUrl = urlData.publicUrl;
                    }
                }
                // Create the annual goal record
                const { error: goalError } = await (0, annualReviews_1.createAnnualGoal)({
                    review_id: reviewId,
                    category: category.key,
                    goal_statement: goal.goalStatement,
                    vision_image_url: visionImageUrl,
                });
                if (goalError) {
                    throw new Error(`Failed to save goal for ${category.label}: ${goalError.message}`);
                }
                setUploadProgress(prev => ({ ...prev, [category.key]: false }));
            }
            onNext();
        }
        catch (error) {
            console.error('Failed to save goals:', error);
            setSaveError(error instanceof Error ? error.message : 'Failed to save your goals. Please try again.');
        }
        finally {
            setIsSaving(false);
        }
    };
    const currentCategory = LifeWheelCheckins_1.LIFE_WHEEL_CATEGORIES.find(cat => cat.key === selectedCategory);
    const currentGoal = goals[selectedCategory];
    return ((0, jsx_runtime_1.jsxs)("div", { className: "review-step vision-manifest", children: [(0, jsx_runtime_1.jsxs)("div", { className: "manifest-header", children: [(0, jsx_runtime_1.jsx)("h2", { children: "\u2728 Vision Board Manifest" }), (0, jsx_runtime_1.jsxs)("p", { children: ["Set your intentions for ", reviewYear + 1, " by defining goals for each life area."] }), (0, jsx_runtime_1.jsxs)("div", { className: "progress-indicator", children: [(0, jsx_runtime_1.jsxs)("span", { className: "progress-text", children: [completedCount, " / ", LifeWheelCheckins_1.LIFE_WHEEL_CATEGORIES.length, " goals defined"] }), (0, jsx_runtime_1.jsx)("div", { className: "progress-bar-container", children: (0, jsx_runtime_1.jsx)("div", { className: "progress-bar-fill", style: { width: `${(completedCount / LifeWheelCheckins_1.LIFE_WHEEL_CATEGORIES.length) * 100}%` } }) })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "manifest-content", children: [(0, jsx_runtime_1.jsx)("div", { className: "category-tabs", children: LifeWheelCheckins_1.LIFE_WHEEL_CATEGORIES.map(category => ((0, jsx_runtime_1.jsxs)("button", { className: `category-tab ${selectedCategory === category.key ? 'active' : ''} ${goals[category.key].goalStatement.trim() !== '' ? 'completed' : ''}`, onClick: () => setSelectedCategory(category.key), "aria-label": `Set goal for ${category.label}`, children: [(0, jsx_runtime_1.jsx)("span", { className: "category-label", children: category.label }), goals[category.key].goalStatement.trim() !== '' && ((0, jsx_runtime_1.jsx)("span", { className: "check-icon", children: "\u2713" }))] }, category.key))) }), (0, jsx_runtime_1.jsxs)("div", { className: "goal-form", children: [(0, jsx_runtime_1.jsx)("h3", { children: currentCategory?.label }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsxs)("label", { htmlFor: "goal-statement", children: ["What's your goal for ", currentCategory?.label.toLowerCase(), " in ", reviewYear + 1, "?"] }), (0, jsx_runtime_1.jsx)("textarea", { id: "goal-statement", value: currentGoal.goalStatement, onChange: (e) => handleGoalStatementChange(selectedCategory, e.target.value), placeholder: `e.g., "Exercise 3 times per week", "Read 12 books", "Spend quality time with family"`, rows: 4, "aria-label": `Goal statement for ${currentCategory?.label}` })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "goal-image", children: "Vision Image (Optional)" }), (0, jsx_runtime_1.jsx)("p", { className: "help-text", children: "Add an inspiring image that represents this goal." }), currentGoal.imageUrl ? ((0, jsx_runtime_1.jsxs)("div", { className: "image-preview", children: [(0, jsx_runtime_1.jsx)("img", { src: currentGoal.imageUrl, alt: "Goal vision" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "btn-remove-image", onClick: () => handleRemoveImage(selectedCategory), "aria-label": "Remove image", children: "\u2715 Remove" })] })) : ((0, jsx_runtime_1.jsxs)("div", { className: "image-upload", children: [(0, jsx_runtime_1.jsx)("input", { id: "goal-image", type: "file", accept: "image/*", onChange: (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        handleImageSelect(selectedCategory, file);
                                                    }
                                                }, style: { display: 'none' } }), (0, jsx_runtime_1.jsx)("label", { htmlFor: "goal-image", className: "upload-button", children: "\uD83D\uDCF7 Choose Image" })] }))] })] })] }), saveError && ((0, jsx_runtime_1.jsx)("div", { className: "error-message", children: saveError })), (0, jsx_runtime_1.jsxs)("div", { className: "step-actions", children: [(0, jsx_runtime_1.jsx)("button", { className: "btn-secondary", onClick: onBack, disabled: isSaving, children: "Back" }), (0, jsx_runtime_1.jsx)("button", { className: "btn-primary", onClick: handleNext, disabled: isSaving, children: isSaving ? 'Saving Goals...' : 'Next: Habit Planning →' })] }), (0, jsx_runtime_1.jsx)("style", { children: `
        .vision-manifest {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .manifest-header {
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

        .manifest-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .category-tabs {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 0.5rem;
        }

        .category-tab {
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

        .category-tab:hover {
          border-color: #06b6d4;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(6, 182, 212, 0.15);
        }

        .category-tab.active {
          background: linear-gradient(135deg, #06b6d4, #0891b2);
          border-color: #06b6d4;
          color: white;
        }

        .category-tab.completed:not(.active) {
          border-color: #3b82f6;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(6, 182, 212, 0.1));
        }

        .category-label {
          font-size: 0.875rem;
          font-weight: 600;
        }

        .check-icon {
          font-size: 1rem;
          color: #10b981;
        }

        .category-tab.active .check-icon {
          color: white;
        }

        .goal-form {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.6));
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 1.5rem;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .goal-form h3 {
          font-size: 1.25rem;
          margin-bottom: 1.5rem;
          color: #0f172a;
          font-weight: 700;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group:last-child {
          margin-bottom: 0;
        }

        .form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 0.5rem;
        }

        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.875rem;
          font-family: inherit;
          resize: vertical;
          transition: border-color 0.2s;
        }

        .form-group textarea:focus {
          outline: none;
          border-color: #06b6d4;
          box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.1);
        }

        .form-group textarea::placeholder {
          color: #94a3b8;
        }

        .help-text {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 0.25rem;
          margin-bottom: 0.75rem;
        }

        .image-preview {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          max-width: 400px;
          margin: 0 auto;
        }

        .image-preview img {
          width: 100%;
          height: auto;
          display: block;
          border-radius: 12px;
        }

        .btn-remove-image {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          background: rgba(239, 68, 68, 0.9);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.5rem 0.75rem;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-remove-image:hover {
          background: rgba(220, 38, 38, 1);
        }

        .image-upload {
          text-align: center;
        }

        .upload-button {
          display: inline-block;
          background: linear-gradient(135deg, #06b6d4, #0891b2);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .upload-button:hover {
          opacity: 0.9;
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
          .category-tabs {
            grid-template-columns: repeat(2, 1fr);
          }

          .goal-form {
            padding: 1rem;
          }
        }
      ` })] }));
};
exports.VisionBoardManifest = VisionBoardManifest;
