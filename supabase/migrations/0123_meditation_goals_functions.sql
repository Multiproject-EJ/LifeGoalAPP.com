-- Add helper function for incrementing meditation goal completed days

CREATE OR REPLACE FUNCTION increment_meditation_goal_days(goal_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE meditation_goals
  SET completed_days = completed_days + 1,
      updated_at = NOW()
  WHERE id = goal_id;
END;
$$;

-- Add comment
COMMENT ON FUNCTION increment_meditation_goal_days IS 'Increments the completed_days counter for a meditation goal';
