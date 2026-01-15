-- Add project_id column to actions table for project tagging
-- This is different from migrated_to_project_id which is for archiving
ALTER TABLE actions
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_actions_project_id ON actions(project_id) WHERE project_id IS NOT NULL;

-- Add comment to clarify the difference
COMMENT ON COLUMN actions.project_id IS 'Optional project tag to associate an action with a project (different from migrated_to_project_id which is for archiving)';
COMMENT ON COLUMN actions.migrated_to_project_id IS 'Project ID when action is archived/moved to a project (makes action read-only)';
