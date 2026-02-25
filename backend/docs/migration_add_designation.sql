-- Migration: Add designation column to users table
-- Description: Adds designation field for employee job titles/positions

-- Add designation column to users table
ALTER TABLE users 
ADD COLUMN designation TEXT;

-- Add index for better query performance
CREATE INDEX idx_users_designation ON users(designation);

-- Add comment
COMMENT ON COLUMN users.designation IS 'Job title or designation of the user';
