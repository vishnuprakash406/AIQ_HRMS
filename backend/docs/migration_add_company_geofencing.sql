-- Add company_id to geofence_zones for multi-tenant support
ALTER TABLE geofence_zones ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX idx_geofence_company ON geofence_zones(company_id);

-- Add geofence_zone_id to users for employee assignment
ALTER TABLE users ADD COLUMN geofence_zone_id UUID REFERENCES geofence_zones(id) ON DELETE SET NULL;

-- Create index for employee geofence lookup
CREATE INDEX idx_user_geofence ON users(geofence_zone_id);

-- Create employee_geofence_zones table for multiple zone assignments
CREATE TABLE IF NOT EXISTS employee_geofence_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  geofence_zone_id UUID NOT NULL REFERENCES geofence_zones(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, geofence_zone_id)
);

CREATE INDEX idx_employee_geofence ON employee_geofence_zones(user_id);
CREATE INDEX idx_geofence_employee ON employee_geofence_zones(geofence_zone_id);

-- Log message
SELECT 'Geofencing multi-tenant and employee assignment migration completed successfully' as status;
