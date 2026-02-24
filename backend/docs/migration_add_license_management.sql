-- Migration: Add License Management System
-- Purpose: Track company licenses with expiration and remaining days

-- Add created_at and updated_at to users table if not exists
ALTER TABLE users
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create company_licenses table
CREATE TABLE IF NOT EXISTS company_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE,
  company_code VARCHAR(50) NOT NULL UNIQUE,
  license_start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  license_duration_value INTEGER NOT NULL DEFAULT 1,
  license_duration_type VARCHAR(20) NOT NULL CHECK (license_duration_type IN ('months', 'years')),
  license_end_date TIMESTAMP NOT NULL,
  remaining_days INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Create index on company_code for quick lookups
CREATE INDEX IF NOT EXISTS idx_company_licenses_company_code ON company_licenses(company_code);
CREATE INDEX IF NOT EXISTS idx_company_licenses_company_id ON company_licenses(company_id);

-- Function to calculate remaining days
CREATE OR REPLACE FUNCTION calculate_remaining_days(end_date TIMESTAMP)
RETURNS INTEGER AS $$
BEGIN
  RETURN CEIL(EXTRACT(EPOCH FROM (end_date - CURRENT_TIMESTAMP)) / 86400);
END;
$$ LANGUAGE plpgsql;

-- Function to update remaining days for all active licenses
CREATE OR REPLACE FUNCTION update_remaining_days()
RETURNS void AS $$
BEGIN
  UPDATE company_licenses
  SET remaining_days = calculate_remaining_days(license_end_date),
      is_active = CASE 
        WHEN calculate_remaining_days(license_end_date) > 0 THEN TRUE
        ELSE FALSE
      END,
      updated_at = CURRENT_TIMESTAMP
  WHERE is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job function (to be called by application)
CREATE OR REPLACE FUNCTION check_license_validity(company_code_param VARCHAR(50))
RETURNS TABLE(is_valid BOOLEAN, remaining_days INTEGER, message VARCHAR(255)) AS $$
DECLARE
  license_record RECORD;
BEGIN
  SELECT * INTO license_record FROM company_licenses 
  WHERE company_code = company_code_param AND is_active = TRUE;
  
  IF license_record IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'License not found or inactive'::VARCHAR(255);
  ELSIF license_record.remaining_days <= 0 THEN
    RETURN QUERY SELECT FALSE, 0, 'License has expired'::VARCHAR(255);
  ELSE
    RETURN QUERY SELECT TRUE, license_record.remaining_days, 'License is valid'::VARCHAR(255);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Insert licenses for existing companies
INSERT INTO company_licenses (company_id, company_code, license_start_date, license_duration_value, license_duration_type, license_end_date, remaining_days, is_active)
SELECT 
  c.id,
  c.company_code,
  CURRENT_TIMESTAMP,
  1,
  'years',
  CURRENT_TIMESTAMP + INTERVAL '1 year',
  365,
  TRUE
FROM companies c
WHERE NOT EXISTS (SELECT 1 FROM company_licenses WHERE company_id = c.id);

-- Log the migration
SELECT 'Company Licenses table created successfully. Records: ' || COUNT(*)::VARCHAR FROM company_licenses;
