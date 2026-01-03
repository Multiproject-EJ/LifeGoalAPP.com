import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { StatsRetrospective } from './StatsRetrospective';
import { LifeWheelAudit, LifeWheelAuditData } from './LifeWheelAudit';
import { VisionBoardManifest } from './VisionBoardManifest';
import { LIFE_WHEEL_CATEGORIES } from '../../checkins/LifeWheelCheckins';
import { 
  createAnnualReview, 
  updateAnnualReview, 
  fetchAnnualReviewByYear 
} from '../../../services/annualReviews';
import { getSupabaseClient } from '../../../lib/supabaseClient';

// Placeholder components - will be implemented in subsequent steps

const HabitPlanning = ({ onBack, onComplete }: { onBack: () => void; onComplete: () => void }) => (
  <div className="review-step">
    <h2>📅 Habit Planning</h2>
    <p>Translate your goals into daily habits.</p>
    {/* Habit selection content will go here */}
    <div className="step-actions">
      <button className="btn-secondary" onClick={onBack}>Back</button>
      <button className="btn-primary" onClick={onComplete}>Complete Review</button>
    </div>
  </div>
);

export const ReviewWizard: React.FC = () => {
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  // Default to reviewing the previous year (current year - 1)
  const [reviewYear] = useState(new Date().getFullYear() - 1);
  const [lifeWheelData, setLifeWheelData] = useState<LifeWheelAuditData | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load existing review on mount
  useEffect(() => {
    const loadExistingReview = async () => {
      const { data, error } = await fetchAnnualReviewByYear(reviewYear);
      if (!error && data) {
        setReviewId(data.id);
        // TODO: Parse reflection_text to restore lifeWheelData if needed
      }
    };
    loadExistingReview();
  }, [reviewYear]);

  const nextStep = () => setStep((prev) => Math.min(prev + 1, totalSteps));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));
  
  const handleLifeWheelNext = async (data: LifeWheelAuditData) => {
    setLifeWheelData(data);
    setSaveError(null);
    setIsSaving(true);

    try {
      // Calculate overall rating as average of all category ratings
      const ratings = LIFE_WHEEL_CATEGORIES.map(cat => data[cat.key].rating);
      const overallRating = Math.round(
        ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      );

      // Serialize the life wheel data as JSON for storage
      const reflectionText = JSON.stringify(data);

      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (reviewId) {
        // Update existing review
        const { error } = await updateAnnualReview(reviewId, {
          reflection_text: reflectionText,
          overall_rating: overallRating,
        });
        if (error) throw error;
      } else {
        // Create new review
        const { data: newReview, error } = await createAnnualReview({
          user_id: user.id,
          year: reviewYear,
          reflection_text: reflectionText,
          overall_rating: overallRating,
        });
        if (error) throw error;
        if (newReview) {
          setReviewId(newReview.id);
        }
      }

      nextStep();
    } catch (error) {
      console.error('Failed to save annual review:', error);
      setSaveError('Failed to save your review. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleComplete = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 }
    });
    // TODO: Save completion state and redirect
    alert("Annual Review Completed! (Confetti should pop)");
  };

  return (
    <div className="container" style={{ maxWidth: '800px', padding: '2rem 1rem' }}>
      <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Annual Review & Manifestation</h1>
        <p style={{ color: '#64748b' }}>Reflect on the past, design the future.</p>
      </header>
      
      {/* Progress Bar */}
      <div style={{ background: '#e2e8f0', height: '8px', borderRadius: '4px', marginBottom: '2rem' }}>
        <div 
          style={{ 
            width: `${(step / totalSteps) * 100}%`, 
            background: 'linear-gradient(to right, #06b6d4, #3b82f6)', 
            height: '100%', 
            borderRadius: '4px',
            transition: 'width 0.3s ease'
          }} 
        />
      </div>

      {/* Step Container */}
      <div className="review-card" style={{ 
        background: 'white', 
        padding: '2rem', 
        borderRadius: '24px', 
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {step === 1 && <StatsRetrospective year={reviewYear} onNext={nextStep} />}
        {step === 2 && (
          <>
            <LifeWheelAudit 
              onNext={handleLifeWheelNext} 
              onBack={prevStep} 
              reviewYear={reviewYear} 
              initialData={lifeWheelData || undefined}
              isLoading={isSaving}
            />
            {saveError && (
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#991b1b',
                fontSize: '0.875rem'
              }}>
                {saveError}
              </div>
            )}
          </>
        )}
        {step === 3 && (
          <VisionBoardManifest 
            onNext={nextStep} 
            onBack={prevStep} 
            reviewId={reviewId} 
            reviewYear={reviewYear}
          />
        )}
        {step === 4 && <HabitPlanning onBack={prevStep} onComplete={handleComplete} />}
      </div>

      <style>{`
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
      `}</style>
    </div>
  );
};
