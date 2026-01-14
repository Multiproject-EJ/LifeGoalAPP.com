import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { fetchGoals } from '../../../services/goals';
import { DEMO_USER_ID } from '../../../services/demoData';

interface ProjectGoalLinkProps {
  session: Session | null;
  currentGoalId: string | null;
  onLink: (goalId: string | null) => void;
}

export function ProjectGoalLink({ session, currentGoalId, onLink }: ProjectGoalLinkProps) {
  const [goals, setGoals] = useState<Array<{ id: string; title: string; life_wheel_category: string | null }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGoals = async () => {
      setLoading(true);
      const { data } = await fetchGoals();
      if (data) {
        setGoals(data.map(g => ({
          id: g.id,
          title: g.title,
          life_wheel_category: g.life_wheel_category
        })));
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
            {goal.title} {goal.life_wheel_category ? `(${goal.life_wheel_category})` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
