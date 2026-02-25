-- Add permission columns to branch_manager_modules table
ALTER TABLE branch_manager_modules 
ADD COLUMN IF NOT EXISTS can_view BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS can_modify BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_update BOOLEAN DEFAULT false;

-- Create index for permission queries
CREATE INDEX IF NOT EXISTS idx_branch_manager_modules_permissions 
ON branch_manager_modules(manager_user_id, module_name, is_enabled);
