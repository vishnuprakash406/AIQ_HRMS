-- Migration: Add employee_code to users table
-- Date: 2026-02-25
-- Description: Auto-generated employee codes for login (CompanyCode + sequential number)

-- Add employee_code column
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_code VARCHAR(20) UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_employee_code ON users(employee_code);

-- Function to generate employee code
CREATE OR REPLACE FUNCTION generate_employee_code(p_company_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_company_code VARCHAR(10);
  v_max_sequence INTEGER;
  v_new_code VARCHAR(20);
BEGIN
  -- Get company code
  SELECT company_code INTO v_company_code 
  FROM companies 
  WHERE id = p_company_id;
  
  IF v_company_code IS NULL THEN
    RAISE EXCEPTION 'Company not found';
  END IF;
  
  -- Get max sequence number for this company
  SELECT COALESCE(
    MAX(
      CASE 
        WHEN employee_code ~ ('^' || v_company_code || '[0-9]+$')
        THEN CAST(SUBSTRING(employee_code FROM length(v_company_code) + 1) AS INTEGER)
        ELSE 0
      END
    ), 0
  ) INTO v_max_sequence
  FROM users
  WHERE company_id = p_company_id;
  
  -- Generate new code with leading zeros (e.g., ABCD0001)
  v_new_code := v_company_code || LPAD((v_max_sequence + 1)::TEXT, 4, '0');
  
  RETURN v_new_code;
END;
$$ LANGUAGE plpgsql;

-- Generate employee codes for existing users (if they don't have one)
DO $$
DECLARE
  user_record RECORD;
  new_code VARCHAR(20);
BEGIN
  FOR user_record IN 
    SELECT id, company_id 
    FROM users 
    WHERE employee_code IS NULL 
      AND company_id IS NOT NULL  -- Only process users with valid company_id
    ORDER BY company_id, created_at
  LOOP
    new_code := generate_employee_code(user_record.company_id);
    UPDATE users 
    SET employee_code = new_code 
    WHERE id = user_record.id;
  END LOOP;
END $$;

-- Note: Not making employee_code NOT NULL to support legacy users without company_id
-- For new users created via API, employee_code will be auto-generated

COMMENT ON COLUMN users.employee_code IS 'Auto-generated unique employee code for login (CompanyCode + sequential number)';
COMMENT ON FUNCTION generate_employee_code(UUID) IS 'Generates next sequential employee code for a company';
