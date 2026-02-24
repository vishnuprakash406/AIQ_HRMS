-- Add email and contact_number columns to companies table

BEGIN;

-- Add new columns if they don't exist
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS contact_number VARCHAR(20);

-- Create index on email for faster queries
CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email);

COMMIT;

-- Verify the migration
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'companies' 
AND column_name IN ('email', 'contact_number');
