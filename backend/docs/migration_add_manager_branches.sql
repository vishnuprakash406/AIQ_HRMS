-- Migration: Support managers with access to multiple branches

-- Table to map managers to multiple branches (many-to-many relationship)
CREATE TABLE IF NOT EXISTS manager_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(manager_user_id, branch_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_manager_branches_manager ON manager_branches(manager_user_id);
CREATE INDEX IF NOT EXISTS idx_manager_branches_branch ON manager_branches(branch_id);
CREATE INDEX IF NOT EXISTS idx_manager_branches_primary ON manager_branches(manager_user_id, is_primary);

-- Add comment describing the table
COMMENT ON TABLE manager_branches IS 'Maps branch managers to multiple branches they can access';
COMMENT ON COLUMN manager_branches.is_primary IS 'Indicates the primary/default branch for the manager';
