-- Migration: Add employee module access control with view/modify permissions

-- Create employee_module_access table
CREATE TABLE IF NOT EXISTS employee_module_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_name VARCHAR(100) NOT NULL,
  access_level VARCHAR(20) NOT NULL CHECK (access_level IN ('view', 'modify')),
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, module_name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_employee_module_access_employee_id ON employee_module_access(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_module_access_module_name ON employee_module_access(module_name);

-- Comments for documentation
COMMENT ON TABLE employee_module_access IS 'Stores module access permissions for employees with view or modify levels';
COMMENT ON COLUMN employee_module_access.access_level IS 'Access level: view (read-only) or modify (full access)';
