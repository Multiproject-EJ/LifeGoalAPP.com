-- Migration: Actions Feature (Phase 0)
-- Description: Create tables for Actions and Projects two-tier task management system
-- Reference: ACTIONS_FEATURE_DEV_PLAN.md

-- =====================================================
-- 1. PROJECTS TABLE (Create first due to FK reference from actions)
-- =====================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'archived')),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  start_date DATE,
  target_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT '📋',
  order_index INTEGER NOT NULL DEFAULT 0,
  xp_reward INTEGER DEFAULT 100
);

-- =====================================================
-- 2. ACTIONS TABLE (Simple 3-day rolling tasks)
-- =====================================================
CREATE TABLE IF NOT EXISTS actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('must_do', 'nice_to_do', 'project')),
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '3 days'),
  migrated_to_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  xp_awarded INTEGER DEFAULT 0
);

-- =====================================================
-- 3. PROJECT TASKS TABLE (Subtasks within projects)
-- =====================================================
CREATE TABLE IF NOT EXISTS project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'done')),
  parent_task_id UUID REFERENCES project_tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID REFERENCES project_tasks(id) ON DELETE SET NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  order_index INTEGER NOT NULL DEFAULT 0,
  estimated_hours NUMERIC(5,2),
  actual_hours NUMERIC(5,2)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Actions indexes
CREATE INDEX IF NOT EXISTS idx_actions_user_id ON actions(user_id);
CREATE INDEX IF NOT EXISTS idx_actions_user_category ON actions(user_id, category);
CREATE INDEX IF NOT EXISTS idx_actions_expires_at ON actions(expires_at);
CREATE INDEX IF NOT EXISTS idx_actions_completed ON actions(user_id, completed);

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_status ON projects(user_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_goal_id ON projects(goal_id);

-- Project tasks indexes
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_user_id ON project_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_status ON project_tasks(project_id, status);
CREATE INDEX IF NOT EXISTS idx_project_tasks_parent ON project_tasks(parent_task_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;

-- Actions Policies
CREATE POLICY "Users can view their own actions"
  ON actions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own actions"
  ON actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own actions"
  ON actions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own actions"
  ON actions FOR DELETE
  USING (auth.uid() = user_id);

-- Projects Policies
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- Project Tasks Policies
CREATE POLICY "Users can view tasks for their projects"
  ON project_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create tasks for their projects"
  ON project_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update tasks for their projects"
  ON project_tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete tasks for their projects"
  ON project_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp (reuse if exists)
CREATE OR REPLACE FUNCTION update_actions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for projects
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_actions_updated_at();

-- Triggers for project_tasks
CREATE TRIGGER update_project_tasks_updated_at
  BEFORE UPDATE ON project_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_actions_updated_at();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE actions IS 'Simple 3-day rolling todo list items with categories: must_do, nice_to_do, project';
COMMENT ON TABLE projects IS 'Multi-step project initiatives that can link to goals';
COMMENT ON TABLE project_tasks IS 'Subtasks within projects with dependency support';

COMMENT ON COLUMN actions.category IS 'Task priority: must_do (stays forever), nice_to_do (auto-delete 3 days), project (auto-migrate 3 days)';
COMMENT ON COLUMN actions.expires_at IS 'Per-task expiration timestamp, 3 days from creation';
COMMENT ON COLUMN actions.migrated_to_project_id IS 'Reference to project if this action was migrated';
COMMENT ON COLUMN projects.status IS 'Project lifecycle: planning, active, on_hold, completed, archived';
COMMENT ON COLUMN projects.goal_id IS 'Optional link to a life goal';
COMMENT ON COLUMN project_tasks.depends_on_task_id IS 'Optional dependency - task cannot start until dependency is done';
