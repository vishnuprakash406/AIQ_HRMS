-- Migration: Add location column to branches table

ALTER TABLE branches
ADD COLUMN IF NOT EXISTS location VARCHAR(255);

-- Create an index on location for faster searches
CREATE INDEX IF NOT EXISTS idx_branches_location ON branches(location);

-- Add comment for documentation
COMMENT ON COLUMN branches.location IS 'Geographic location or address of the branch office';
