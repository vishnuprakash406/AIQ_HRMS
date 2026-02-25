-- Migration: Rename branch module permission columns from can_modify/can_update to can_edit/can_delete
-- This makes the permission names more intuitive and consistent with standard CRUD operations

-- Rename columns in branch_modules table
ALTER TABLE branch_modules 
RENAME COLUMN can_modify TO can_edit;

ALTER TABLE branch_modules 
RENAME COLUMN can_update TO can_delete;

-- Update column comments
COMMENT ON COLUMN branch_modules.can_view IS 'Branch can view/read data in this module';
COMMENT ON COLUMN branch_modules.can_edit IS 'Branch can create and edit records in this module';
COMMENT ON COLUMN branch_modules.can_delete IS 'Branch can delete records in this module';
