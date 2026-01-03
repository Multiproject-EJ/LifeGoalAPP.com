import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { fetchAnnualReviews, fetchAnnualGoalsByReview, type AnnualGoal } from '../../../services/annualReviews';
import { isDemoSession } from '../../../services/demoSession';

type FocusWidgetProps = {
  session: Session;
};

export function FocusWidget({ session }: FocusWidgetProps) {
  const [goals, setGoals] = useState<AnnualGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const isDemoExperience = isDemoSession(session);

  useEffect(() => {
    const loadFocusGoals = async () => {
      setLoading(true);
      try {
        // Fetch annual reviews to find the most recent one
        const { data: reviews, error: reviewError } = await fetchAnnualReviews();
        
        if (reviewError || !reviews || reviews.length === 0) {
          setGoals([]);
          setLoading(false);
          return;
        }

        // Get the most recent review (they're already sorted by year DESC)
        const latestReview = reviews[0];
        if (latestReview) {
          setYear(latestReview.year);

          // Fetch goals for this review
          const { data: fetchedGoals, error: goalsError } = await fetchAnnualGoalsByReview(latestReview.id);
          
          if (!goalsError && fetchedGoals) {
            setGoals(fetchedGoals);
          }
        }
      } catch (error) {
        console.error('Failed to load focus goals:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!isDemoExperience) {
      loadFocusGoals();
    } else {
      setLoading(false);
    }
  }, [isDemoExperience]);

  if (loading) {
    return (
      <article className="progress-card progress-card--focus">
        <header>
          <h3>{year} Focus</h3>
          <p>Loading your year's intentions...</p>
        </header>
      </article>
    );
  }

  if (isDemoExperience) {
    return (
      <article className="progress-card progress-card--focus">
        <header>
          <h3>{year} Focus</h3>
          <p>Your manifestation goals and focus areas for the year.</p>
        </header>
        <p className="progress-card__empty">
          Complete the Annual Review wizard to set your {year} focus areas. Connect Supabase to sync your data.
        </p>
      </article>
    );
  }

  if (goals.length === 0) {
    return (
      <article className="progress-card progress-card--focus">
        <header>
          <h3>{year} Focus</h3>
          <p>Your manifestation goals and focus areas for the year.</p>
        </header>
        <p className="progress-card__empty">
          Complete the Annual Review wizard to set your {year} focus areas.
        </p>
      </article>
    );
  }

  return (
    <article className="progress-card progress-card--focus">
      <header>
        <h3>{year} Focus</h3>
        <p>Your manifestation goals and focus areas for the year.</p>
      </header>
      <ul className="focus-widget__goal-list">
        {goals.map((goal) => (
          <li key={goal.id} className="focus-widget__goal-item">
            <div className="focus-widget__goal-header">
              <span className="focus-widget__goal-category">{goal.category}</span>
            </div>
            <p className="focus-widget__goal-statement">{goal.goal_statement}</p>
            {goal.vision_image_url && (
              <img 
                src={goal.vision_image_url} 
                alt={`Vision for ${goal.category}`}
                className="focus-widget__goal-image"
              />
            )}
          </li>
        ))}
      </ul>
    </article>
  );
}
