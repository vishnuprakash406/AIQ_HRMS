-- Migration: Add company_id to all company-specific data tables
-- Purpose: Ensure every query includes company code for proper multi-tenant isolation
-- Date: 2026-02-25

-- Step 1: Add company_id to leave_requests table
ALTER TABLE leave_requests 
ADD COLUMN company_id UUID;

-- Populate company_id from users table
UPDATE leave_requests lr
SET company_id = u.company_id
FROM users u
WHERE lr.user_id = u.id;

-- Set NOT NULL constraint
ALTER TABLE leave_requests
ALTER COLUMN company_id SET NOT NULL;

-- Add foreign key
ALTER TABLE leave_requests
ADD CONSTRAINT leave_requests_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id);

-- Create index for performance
CREATE INDEX idx_leave_requests_company ON leave_requests(company_id);
CREATE INDEX idx_leave_requests_user_company ON leave_requests(user_id, company_id);

-- Step 2: Add company_id to attendance_logs table
ALTER TABLE attendance_logs 
ADD COLUMN company_id UUID;

-- Populate company_id from users table
UPDATE attendance_logs al
SET company_id = u.company_id
FROM users u
WHERE al.user_id = u.id;

-- Set NOT NULL constraint
ALTER TABLE attendance_logs
ALTER COLUMN company_id SET NOT NULL;

-- Add foreign key
ALTER TABLE attendance_logs
ADD CONSTRAINT attendance_logs_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id);

-- Create indexes
CREATE INDEX idx_attendance_logs_company ON attendance_logs(company_id);
CREATE INDEX idx_attendance_logs_user_company ON attendance_logs(user_id, company_id);
CREATE INDEX idx_attendance_logs_company_date ON attendance_logs(company_id, check_in);

-- Step 3: Add company_id to attendance_corrections table
ALTER TABLE attendance_corrections 
ADD COLUMN company_id UUID;

-- Populate company_id from users table
UPDATE attendance_corrections ac
SET company_id = u.company_id
FROM users u
WHERE ac.user_id = u.id;

-- Set NOT NULL constraint
ALTER TABLE attendance_corrections
ALTER COLUMN company_id SET NOT NULL;

-- Add foreign key
ALTER TABLE attendance_corrections
ADD CONSTRAINT attendance_corrections_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id);

-- Create index
CREATE INDEX idx_attendance_corrections_company ON attendance_corrections(company_id);

-- Step 4: Add company_id to inventory_items table
ALTER TABLE inventory_items 
ADD COLUMN company_id UUID;

-- All inventory items need to be assigned to a company
-- Use the first active company as default (can be manually updated later)
UPDATE inventory_items
SET company_id = COALESCE((SELECT id FROM companies LIMIT 1), gen_random_uuid());

-- Set NOT NULL constraint
ALTER TABLE inventory_items
ALTER COLUMN company_id SET NOT NULL;

-- Add foreign key
ALTER TABLE inventory_items
ADD CONSTRAINT inventory_items_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id);

-- Create index
CREATE INDEX idx_inventory_items_company ON inventory_items(company_id);

-- Step 5: Add company_id to inventory_allocations table
ALTER TABLE inventory_allocations 
ADD COLUMN company_id UUID;

-- Populate company_id from users table (via user_id)
UPDATE inventory_allocations ia
SET company_id = u.company_id
FROM users u
WHERE ia.user_id = u.id;

-- Set NOT NULL constraint
ALTER TABLE inventory_allocations
ALTER COLUMN company_id SET NOT NULL;

-- Add foreign key
ALTER TABLE inventory_allocations
ADD CONSTRAINT inventory_allocations_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id);

-- Create indexes
CREATE INDEX idx_inventory_allocations_company ON inventory_allocations(company_id);
CREATE INDEX idx_inventory_allocations_user_company ON inventory_allocations(user_id, company_id);

-- Step 6: Add company_id to payroll_payslips table
ALTER TABLE payroll_payslips 
ADD COLUMN company_id UUID;

-- Populate company_id from users table
UPDATE payroll_payslips pp
SET company_id = u.company_id
FROM users u
WHERE pp.user_id = u.id;

-- Set NOT NULL constraint
ALTER TABLE payroll_payslips
ALTER COLUMN company_id SET NOT NULL;

-- Add foreign key
ALTER TABLE payroll_payslips
ADD CONSTRAINT payroll_payslips_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id);

-- Create indexes
CREATE INDEX idx_payroll_payslips_company ON payroll_payslips(company_id);
CREATE INDEX idx_payroll_payslips_user_company ON payroll_payslips(user_id, company_id);

-- Step 7: Add company_id to documents table
ALTER TABLE documents 
ADD COLUMN company_id UUID;

-- For documents, try to get company_id from owner_id (if owner is a user)
UPDATE documents d
SET company_id = u.company_id
FROM users u
WHERE d.owner_id = u.id;

-- For documents with no owner or owner not in users, assign to first company
UPDATE documents
SET company_id = COALESCE(company_id, (SELECT id FROM companies LIMIT 1), gen_random_uuid())
WHERE company_id IS NULL;

-- Set NOT NULL constraint
ALTER TABLE documents
ALTER COLUMN company_id SET NOT NULL;

-- Add foreign key
ALTER TABLE documents
ADD CONSTRAINT documents_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id);

-- Create index
CREATE INDEX idx_documents_company ON documents(company_id);

-- Step 8: Add company_id to employee_profiles table
ALTER TABLE employee_profiles 
ADD COLUMN company_id UUID;

-- Populate company_id from users table
UPDATE employee_profiles ep
SET company_id = u.company_id
FROM users u
WHERE ep.user_id = u.id;

-- Set NOT NULL constraint
ALTER TABLE employee_profiles
ALTER COLUMN company_id SET NOT NULL;

-- Add foreign key
ALTER TABLE employee_profiles
ADD CONSTRAINT employee_profiles_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id);

-- Create index
CREATE INDEX idx_employee_profiles_company ON employee_profiles(company_id);

-- Step 9: Add company_id to leave_types table (shared across all companies, but with company_id for flexibility)
ALTER TABLE leave_types 
ADD COLUMN company_id UUID;

-- leave_types can be shared or company-specific
-- For now, set all to first company (can be updated to support shared/company-specific)
UPDATE leave_types
SET company_id = (SELECT id FROM companies LIMIT 1)
WHERE company_id IS NULL;

-- Add index
CREATE INDEX idx_leave_types_company ON leave_types(company_id);

-- Final verification
SELECT 
    'leave_requests' as table_name,
    (SELECT COUNT(*) FROM leave_requests) as total_rows,
    (SELECT COUNT(*) FROM leave_requests WHERE company_id IS NOT NULL) as with_company_id
UNION ALL
SELECT 
    'attendance_logs',
    (SELECT COUNT(*) FROM attendance_logs),
    (SELECT COUNT(*) FROM attendance_logs WHERE company_id IS NOT NULL)
UNION ALL
SELECT 
    'attendance_corrections',
    (SELECT COUNT(*) FROM attendance_corrections),
    (SELECT COUNT(*) FROM attendance_corrections WHERE company_id IS NOT NULL)
UNION ALL
SELECT 
    'inventory_items',
    (SELECT COUNT(*) FROM inventory_items),
    (SELECT COUNT(*) FROM inventory_items WHERE company_id IS NOT NULL)
UNION ALL
SELECT 
    'inventory_allocations',
    (SELECT COUNT(*) FROM inventory_allocations),
    (SELECT COUNT(*) FROM inventory_allocations WHERE company_id IS NOT NULL)
UNION ALL
SELECT 
    'payroll_payslips',
    (SELECT COUNT(*) FROM payroll_payslips),
    (SELECT COUNT(*) FROM payroll_payslips WHERE company_id IS NOT NULL)
UNION ALL
SELECT 
    'documents',
    (SELECT COUNT(*) FROM documents),
    (SELECT COUNT(*) FROM documents WHERE company_id IS NOT NULL)
UNION ALL
SELECT 
    'employee_profiles',
    (SELECT COUNT(*) FROM employee_profiles),
    (SELECT COUNT(*) FROM employee_profiles WHERE company_id IS NOT NULL);

-- Status update
SELECT 'Multi-tenant company_id enforcement migration completed successfully' as status;
