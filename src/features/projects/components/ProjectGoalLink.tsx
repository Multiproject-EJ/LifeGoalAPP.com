import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { fetchGoals } from '../../../services/goals';
import { DEMO_USER_ID } from '../../../services/demoData';

interface ProjectGoalLinkProps {
  session: Session | null;
  currentGoalId: string | null;
  onLink: (goalId: string | null) => void;
}

interface Goal {
  id: string;
  title: string;
  category: string;
}

export function ProjectGoalLink({ session, currentGoalId, onLink }: ProjectGoalLinkProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGoals = async () => {
      setLoading(true);
      const { data } = await fetchGoals();
      if (data) {
        setGoals(data as Goal[]);
      }
      setLoading(false);
    };
    loadGoals();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onLink(value === '' ? null : value);
  };

  if (loading) {
    return <div className="project-goal-link">Loading goals...</div>;
  }

  return (
    <div className="project-goal-link">
      <label htmlFor="goal-link">
        Link to Goal
      </label>
      <select
        id="goal-link"
        value={currentGoalId ?? ''}
        onChange={handleChange}
        className="project-goal-link__select"
      >
        <option value="">No goal linked</option>
        {goals.map((goal) => (
          <option key={goal.id} value={goal.id}>
            {goal.title} ({goal.category})
          </option>
        ))}
      </select>
    </div>
  );
}
