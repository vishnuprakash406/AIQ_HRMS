-- Migration: Add missing modules to existing companies
-- This ensures all companies have all available modules

-- Define available modules
CREATE TEMP TABLE available_modules (module_name TEXT);
INSERT INTO available_modules VALUES 
  ('inventory'),
  ('employee_management'),
  ('payroll'),
  ('attendance'),
  ('leave'),
  ('geofencing'),
  ('onboarding'),
  ('support'),
  ('documents');

-- Add missing modules to all companies
INSERT INTO company_modules (company_id, module_name, is_enabled)
SELECT c.id, am.module_name, false
FROM companies c
CROSS JOIN available_modules am
WHERE NOT EXISTS (
  SELECT 1 FROM company_modules cm 
  WHERE cm.company_id = c.id AND cm.module_name = am.module_name
)
ON CONFLICT DO NOTHING;

-- Create index
CREATE INDEX IF NOT EXISTS idx_company_modules_module_name 
ON company_modules(module_name);

-- Verify results
SELECT 
  c.id,
  c.company_code,
  c.name,
  COUNT(cm.id) as module_count
FROM companies c
LEFT JOIN company_modules cm ON c.id = cm.company_id
GROUP BY c.id, c.company_code, c.name
ORDER BY c.company_code;
