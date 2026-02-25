-- Migration: Add branches and branch manager module access

-- Add branch limit per company
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS branch_limit INTEGER NOT NULL DEFAULT 1;

-- Create branches table
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  employee_limit INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, name)
);

-- Add branch_id to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

-- Branch manager module access
CREATE TABLE IF NOT EXISTS branch_manager_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  manager_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_name VARCHAR(100) NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(manager_user_id, module_name)
);

-- Add branch_id to inventory tables
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

ALTER TABLE inventory_allocations
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

-- Add branch_id to geofence_zones
ALTER TABLE geofence_zones
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_branches_company_id ON branches(company_id);
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_manager_modules_branch ON branch_manager_modules(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_manager_modules_manager ON branch_manager_modules(manager_user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_branch_id ON inventory_items(branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_allocations_branch_id ON inventory_allocations(branch_id);
CREATE INDEX IF NOT EXISTS idx_geofence_zones_branch_id ON geofence_zones(branch_id);
CREATE INDEX IF NOT EXISTS idx_geofence_zones_company_id ON geofence_zones(company_id);
