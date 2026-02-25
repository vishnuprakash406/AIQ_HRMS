-- Migration: Add branch_modules table for branch-level module access control
-- This allows configuring which modules each branch can access, independent of managers

-- Create branch_modules table
CREATE TABLE IF NOT EXISTS branch_modules (
  id SERIAL PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL,
  can_view BOOLEAN DEFAULT true NOT NULL,
  can_modify BOOLEAN DEFAULT false NOT NULL,
  can_update BOOLEAN DEFAULT false NOT NULL,
  is_enabled BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(branch_id, module_name)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_branch_modules_branch_id ON branch_modules(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_modules_enabled ON branch_modules(branch_id, is_enabled);

-- Add comment to table
COMMENT ON TABLE branch_modules IS 'Stores module access permissions at the branch level';
COMMENT ON COLUMN branch_modules.can_view IS 'Branch can view/read data in this module';
COMMENT ON COLUMN branch_modules.can_modify IS 'Branch can create new records in this module';
COMMENT ON COLUMN branch_modules.can_update IS 'Branch can update existing records in this module';
