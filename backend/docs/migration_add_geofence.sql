-- Migration to add geofence columns to attendance_logs table
-- Run this if you get error: column "check_in_geofence_status" does not exist

-- Add geofence columns to attendance_logs table
ALTER TABLE attendance_logs 
ADD COLUMN IF NOT EXISTS check_in_geofence_status TEXT DEFAULT 'unchecked',
ADD COLUMN IF NOT EXISTS check_out_geofence_status TEXT DEFAULT 'unchecked',
ADD COLUMN IF NOT EXISTS check_in_lat NUMERIC,
ADD COLUMN IF NOT EXISTS check_in_lng NUMERIC,
ADD COLUMN IF NOT EXISTS check_out_lat NUMERIC,
ADD COLUMN IF NOT EXISTS check_out_lng NUMERIC,
ADD COLUMN IF NOT EXISTS check_in_photo_url TEXT;

-- Create geofence_zones table if it doesn't exist
CREATE TABLE IF NOT EXISTS geofence_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  radius_meters NUMERIC NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance_logs(user_id, check_in);
CREATE INDEX IF NOT EXISTS idx_geofence_active ON geofence_zones(is_active);

-- Verify the columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'attendance_logs' 
AND column_name LIKE '%geofence%';
