# Geofencing System Guide

## Overview
The geofencing system allows companies to define geographical zones and assign employees to them. Employees checking in/out will be validated against their assigned geofence zones. This is useful for verifying that employees are physically present at work locations.

## Features

### 1. **Multiple Geofence Zones per Company**
- Companies can create multiple geofence zones
- Each zone has a center point (latitude/longitude) and radius in meters
- Zones are company-exclusive and not visible to other companies

### 2. **Map-Based Zone Creation**
- Interactive map interface to select zone center point
- Click on the map to set coordinates
- Visual representation of zones on the map
- Automatic coordinate formatting to 6 decimal places

### 3. **Employee Zone Assignment**
- Assign employees to one or multiple geofence zones
- Set primary zone for each employee
- Easy assignment/removal from employee details

### 4. **Attendance Validation**
- Check-in/out requests validated against employee's assigned geofence zones
- System records whether employee was inside or outside the zone
- Attendance logs include geofence status

## Database Schema

### geofence_zones Table
```sql
CREATE TABLE geofence_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  radius_meters NUMERIC NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### employee_geofence_zones Table
```sql
CREATE TABLE employee_geofence_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  geofence_zone_id UUID NOT NULL REFERENCES geofence_zones(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, geofence_zone_id)
);
```

### users Table (Extended)
```sql
ALTER TABLE users ADD COLUMN geofence_zone_id UUID REFERENCES geofence_zones(id) ON DELETE SET NULL;
ALTER TABLE geofence_zones ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
```

## API Endpoints

### 1. Geofence Zone Management

#### List Geofence Zones
```
GET /api/v1/attendance/geofence/zones
Authorization: Bearer <company-token>
```
**Response:**
```json
{
  "zones": [
    {
      "id": "uuid",
      "name": "Office Building A",
      "latitude": "37.7749",
      "longitude": "-122.4194",
      "radius_meters": "500",
      "description": "Main office location",
      "is_active": true,
      "company_id": "company-uuid",
      "created_at": "2026-02-25T10:00:00Z"
    }
  ]
}
```

#### Create Geofence Zone
```
POST /api/v1/attendance/geofence/zones
Authorization: Bearer <company-token>
Content-Type: application/json

{
  "name": "Office Building A",
  "latitude": "37.7749",
  "longitude": "-122.4194",
  "radius_meters": "500",
  "description": "Main office location (optional)"
}
```

#### Update Geofence Zone
```
PUT /api/v1/attendance/geofence/zones/:id
Authorization: Bearer <company-token>
Content-Type: application/json

{
  "name": "Updated Name",
  "radius_meters": "600",
  "is_active": true,
  "description": "Updated description"
}
```

#### Delete Geofence Zone
```
DELETE /api/v1/attendance/geofence/zones/:id
Authorization: Bearer <company-token>
```

### 2. Employee Geofence Assignment

#### Assign Employee to Geofence Zone
```
POST /api/v1/company/employees/:employeeId/geofence
Authorization: Bearer <company-token>
Content-Type: application/json

{
  "geofenceZoneId": "zone-uuid"
}
```

#### Get Employee's Assigned Zones
```
GET /api/v1/company/employees/:employeeId/geofence
Authorization: Bearer <company-token>
```
**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "zone-uuid",
      "name": "Office Building A",
      "latitude": "37.7749",
      "longitude": "-122.4194",
      "radius_meters": "500",
      "is_active": true,
      "is_primary": true
    }
  ]
}
```

#### Remove Employee from Geofence Zone
```
DELETE /api/v1/company/employees/:employeeId/geofence/:geofenceZoneId
Authorization: Bearer <company-token>
```

## How to Use

### For Company Admins

#### 1. Create a Geofence Zone
1. Navigate to **Geofencing** page
2. Click **"➕ New Zone"**
3. Enter zone details:
   - **Zone Name**: e.g., "Office Building A"
   - **Radius**: Enter in meters (e.g., 500m)
   - **Latitude & Longitude**: Enter manually or use the map
4. Click **"🗺️ Select Location on Map"** to use interactive map
5. On the map:
   - View existing zones as blue circles
   - Click anywhere to select the zone center
   - Coordinates auto-populate in the form
6. Click **"✅ Create Zone"**

#### 2. View and Edit Zones
- All created zones display in a card grid
- Click **"✎ Edit"** to modify zone details
- Click **"🗑️ Delete"** to remove a zone

#### 3. Assign Employees to Zones
1. Navigate to **Employee Details/Management**
2. Select an employee
3. Go to **Geofencing** section
4. Click **"➕ Assign Zone"**
5. Select from your company's geofence zones
6. Click **"✅ Assign"**

#### 4. View Employee's Zones
- In Employee Details page, the "Geofence Zones" section shows:
  - All available zones in your company
  - Which zones the employee is assigned to
  - Primary zone indicator

### For Employees

#### Check In with Geofencing
1. Open **Check In** page (if geofencing is enabled for your mode)
2. Click **"✅ Check In"**
3. System automatically:
   - Captures your GPS location
   - Validates against your assigned geofence zones
   - Records whether you're inside or outside
4. Response shows geofence status:
   - 🟢 **Inside**: You're within an assigned zone
   - 🔴 **Outside**: You're outside all assigned zones (warning)

#### Attendance Report
Your attendance log shows:
- Check-in/check-out times
- Geofence validation status
- Distance from zone center (if available)

## Geofence Validation Logic

### Check-In Validation
```
For each employee's assigned geofence zone:
  1. Calculate distance from check-in coordinates to zone center
  2. If distance <= zone radius → Status: INSIDE
  3. If distance > zone radius → Status: OUTSIDE
  
Final status: INSIDE (if any zone matches), else OUTSIDE
```

### Storage
- Check-in latitude/longitude stored in `attendance_logs`
- Geofence status (`inside`/`outside`) recorded
- Zone information preserved at time of check-in

## Configuration

### Latitude & Longitude Format
- **Precision**: 6 decimal places (±0.111 meters)
- **Range**: 
  - Latitude: -90 to 90
  - Longitude: -180 to 180

### Radius Recommendations
- **Small office**: 100-300 meters
- **Medium office building**: 300-500 meters
- **Large campus**: 500-1000 meters
- **Warehouse**: 1000+ meters

### Attendance Modes
Companies can set attendance tracking mode per employee:
- **Geofencing**: GPS-based location validation
- **Location Tracking**: Continuous location monitoring

## Example Scenario

### Case: Multi-Location Company
**Company**: TechCorp Inc.

**Locations**:
1. **HQ Building** - 37.7749, -122.4194 (Radius: 500m)
2. **Branch Office** - 37.7849, -122.4294 (Radius: 300m)  
3. **Warehouse** - 37.7649, -122.4094 (Radius: 1000m)

**Employees**:
- **Alice**: Assigned to HQ only
- **Bob**: Assigned to HQ + Branch (primary: HQ)
- **Charlie**: Assigned to Warehouse

**Attendance**:
- Alice checks in at HQ → ✅ Inside HQ (Valid)
- Alice checks in at Branch → ❌ Outside all zones (Warning)
- Bob checks in at Branch → ✅ Inside Branch (Valid)
- Charlie checks in at Warehouse → ✅ Inside Warehouse (Valid)

## Security Considerations

1. **Multi-tenancy**: Each company's zones are isolated
2. **GPS Spoofing**: While not preventable, ensures employee was within zone
3. **Zone Coverage**: Overlapping zones allowed but first match wins
4. **Data Privacy**: Location data only stored in attendance system

## Troubleshooting

### Issue: "Map not loading"
**Solution**: Ensure Leaflet library is available. Check browser console for errors.

### Issue: "Location not precise enough"
**Solution**: Increase decimal precision or use device with better GPS receiver.

### Issue: "Employee keeps showing as outside zone"
**Solution**: 
- Verify zone radius is sufficient for workspace size
- Check GPS accuracy
- Ensure coordinates are correct (test in external map)

### Issue: "Cannot assign employee to zone"  
**Solution**:
- Verify zone belongs to your company
- Check employee belongs to your company
- Ensure zone is active (not deleted)

## API Integration Example

```javascript
// Assign employee to zone
const assignZone = async (employeeId, zoneId) => {
  const response = await fetch('/api/v1/company/employees/' + employeeId + '/geofence', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ geofenceZoneId: zoneId })
  });
  return response.json();
};

// Get employee's zones
const getEmployeeZones = async (employeeId) => {
  const response = await fetch('/api/v1/company/employees/' + employeeId + '/geofence', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  return response.json();
};
```

## Related Features
- [Attendance Management](./ATTENDANCE_MANAGEMENT.md)
- [Employee Management](./EMPLOYEE_MANAGEMENT.md)
- [Company Management](./COMPANY_MANAGEMENT.md)

## Future Enhancements
- [ ] Geofence analytics and heatmaps
- [ ] Zone entry/exit notifications
- [ ] Automatic clock-in/out based on zone presence
- [ ] Zone schedules (only active during business hours)
- [ ] Multiple home location support
- [ ] Route tracking and movement patterns
- [ ] Integration with third-party mapping services
- [ ] Geofence alerts for unauthorized locations
