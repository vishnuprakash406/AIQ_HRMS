-- Add attendance_mode column to users table
-- This allows admin to choose between geofencing (strict) or location_tracking (flexible) per employee

ALTER TABLE users 
ADD COLUMN attendance_mode TEXT NOT NULL DEFAULT 'location_tracking';

-- Add check constraint to ensure valid values
ALTER TABLE users 
ADD CONSTRAINT users_attendance_mode_check 
CHECK (attendance_mode IN ('geofencing', 'location_tracking'));

-- Add index for faster filtering
CREATE INDEX idx_users_attendance_mode ON users(attendance_mode);

-- Update existing users to use location_tracking by default
UPDATE users SET attendance_mode = 'location_tracking' WHERE attendance_mode IS NULL;

COMMENT ON COLUMN users.attendance_mode IS 'Attendance tracking mode: geofencing (enforce location boundaries) or location_tracking (just record GPS)';
