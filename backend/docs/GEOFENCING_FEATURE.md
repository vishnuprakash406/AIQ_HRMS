# Employee Attendance with Geofencing - Feature Documentation

## Overview

This is a comprehensive employee attendance tracking system with GPS-based geofencing. It allows:

1. **Employees** to check-in/check-out with GPS coordinates
2. **Geofence validation** - automatically detects if employee is inside/outside office area
3. **Admin management** - configure office geofence zones
4. **Attendance tracking** - history and statistics with geofence status

## Features

### For Employees
- ✅ Check-in with GPS location (requires browser geolocation permission)
- ✅ Check-out with GPS location
- ✅ Real-time geofence status (inside/outside office zone)
- ✅ View today's attendance and check-in/check-out times
- ✅ View 7-day attendance history with geofence status
- ✅ Automatic distance calculation from office

### For Administrators
- ✅ Create multiple geofence zones (office, project sites, etc.)
- ✅ Configure zone coordinates and radius
- ✅ View all employee attendance records
- ✅ See attendance with geofence status indicators
- ✅ Manage geofence zones (add, edit, delete)

## Database Schema

### attendance_logs Table
```sql
CREATE TABLE attendance_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  check_in TIMESTAMPTZ NOT NULL,
  check_in_lat NUMERIC,
  check_in_lng NUMERIC,
  check_in_geofence_status TEXT, -- 'inside' or 'outside'
  check_out TIMESTAMPTZ,
  check_out_lat NUMERIC,
  check_out_lng NUMERIC,
  check_out_geofence_status TEXT, -- 'inside' or 'outside'
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### geofence_zones Table
```sql
CREATE TABLE geofence_zones (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  radius_meters NUMERIC NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Backend API Endpoints

### Employee Endpoints (Authenticated)

#### 1. Check-In
```
POST /api/v1/attendance/checkin
Content-Type: application/json
Authorization: Bearer {token}

{
  "latitude": 40.7128,
  "longitude": -74.0060
}

Response:
{
  "message": "Checked in successfully",
  "attendance": {
    "id": "uuid",
    "check_in": "2026-02-24T09:00:00Z",
    "check_in_lat": "40.7128",
    "check_in_lng": "-74.0060",
    "check_in_geofence_status": "inside"
  },
  "geofence": {
    "status": "inside",
    "zone_id": "uuid",
    "zone_name": "Main Office",
    "distance": 45.23
  }
}
```

#### 2. Check-Out
```
POST /api/v1/attendance/checkout
Content-Type: application/json
Authorization: Bearer {token}

{
  "latitude": 40.7128,
  "longitude": -74.0060
}

Response:
{
  "message": "Checked out successfully",
  "attendance": {...},
  "geofence": {...},
  "duration": {
    "minutes": 480,
    "hours": "8.00"
  }
}
```

#### 3. Get Today's Attendance Status
```
GET /api/v1/attendance/status/{employeeId}
Authorization: Bearer {token}

Response:
{
  "today": {
    "id": "uuid",
    "check_in": "2026-02-24T09:00:00Z",
    "check_out": "2026-02-24T17:00:00Z",
    "check_in_geofence_status": "inside",
    "check_out_geofence_status": "inside"
  },
  "stats": {
    "totalDays": 20,
    "completeDays": 18,
    "insideCheckins": 18,
    "outsideCheckins": 2
  }
}
```

#### 4. Get Attendance History
```
GET /api/v1/attendance/history/{employeeId}?days=30
Authorization: Bearer {token}

Response:
{
  "attendance": [
    {
      "id": "uuid",
      "check_in": "2026-02-24T09:00:00Z",
      "check_out": "2026-02-24T17:00:00Z",
      "check_in_lat": "40.7128",
      "check_in_lng": "-74.0060",
      "check_in_geofence_status": "inside",
      "check_out_geofence_status": "inside"
    }
  ]
}
```

### Admin Endpoints (Admin Role Required)

#### 1. Get All Geofence Zones
```
GET /api/v1/attendance/geofence/zones
Authorization: Bearer {token}

Response:
{
  "zones": [
    {
      "id": "uuid",
      "name": "Main Office",
      "latitude": "40.7128",
      "longitude": "-74.0060",
      "radius_meters": "100",
      "description": "Head office building",
      "is_active": true,
      "created_at": "2026-02-20T10:00:00Z"
    }
  ]
}
```

#### 2. Create Geofence Zone
```
POST /api/v1/attendance/geofence/zones
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Main Office",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "radius_meters": 100,
  "description": "Head office"
}

Response:
{
  "message": "Geofence zone created",
  "zone": {...}
}
```

#### 3. Update Geofence Zone
```
PUT /api/v1/attendance/geofence/zones/{zoneId}
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Main Office",
  "radius_meters": 150
}

Response:
{
  "message": "Geofence zone updated",
  "zone": {...}
}
```

#### 4. Delete Geofence Zone
```
DELETE /api/v1/attendance/geofence/zones/{zoneId}
Authorization: Bearer {token}

Response:
{
  "message": "Geofence zone deleted"
}
```

## Geofence Validation Logic

The system uses the **Haversine formula** to calculate the distance between an employee's GPS location and the center of a geofence zone:

```javascript
// Distance = R × 2 × atan2(√a, √(1−a))
// where:
// R = Earth's radius (6,371 km)
// a = sin²(Δφ/2) + cos(φ1) × cos(φ2) × sin²(Δλ/2)
// φ = latitude, λ = longitude

const distance = calculateDistance(
  employeeLatitude, employeeLongitude,
  zoneLatitude, zoneLongitude
);

const isInside = distance <= zoneRadiusMeters;
```

## How It Works - Step by Step

### Check-In Process
1. Employee navigates to Attendance page
2. Browser requests GPS permission (required)
3. Employee clicks "Check In" button
4. System records: timestamp, latitude, longitude
5. System checks all active geofence zones:
   - Calculates distance from employee to each zone center
   - If distance ≤ zone radius → Status: "inside"
   - Otherwise → Status: "outside"
6. Record saved with geofence status
7. Employee sees confirmation with geofence status

### Check-Out Process
1. Employee clicks "Check Out" button
2. System captures current GPS coordinates
3. Calculates work duration
4. Validates geofence status
5. Updates attendance record with check-out time and geofence status
6. Displays duration worked

### Admin Zone Configuration
1. Admin navigates to Attendance & Geofencing page
2. Finds office location on Google Maps
3. Gets exact coordinates (right-click → "What's here?")
4. Creates geofence zone with:
   - Zone name (e.g., "Main Office")
   - Latitude and longitude
   - Radius in meters (typically 50-200m)
   - Optional description
5. Zone becomes active immediately
6. All future check-ins validate against this zone

## Privacy & Security

### Data Collected
- ✅ Check-in/check-out timestamps (required for payroll)
- ✅ GPS coordinates (required for geofencing)
- ✅ Geofence status (inside/outside)
- ✅ Work duration

### Privacy Protection
- ✅ Location only tracked during work hours (check-in to check-out)
- ✅ Sensitive location data stored securely in database
- ✅ Only accessible to authenticated users
- ✅ Admins can only see aggregated attendance data
- ✅ Can be disabled by removing geofence zones

### Security Measures
- ✅ JWT authentication required for all endpoints
- ✅ Role-based access control (employees vs admins)
- ✅ GPS coordinates validated server-side
- ✅ Geofence validation uses precise Haversine calculation

## Usage Guide

### For Employees

1. **Enable Geolocation**:
   - Go to Attendance page
   - Allow browser to access your location
   - System will show: Latitude, Longitude, Accuracy

2. **Check In**:
   - Click "Check In" button
   - Wait for location to be acquired
   - See geofence status (✅ Inside or ⚠️ Outside)
   - Check-in time is recorded

3. **During Work**:
   - Status is updated if you move
   - You can view today's attendance anytime
   - Can see last 7 days of history

4. **Check Out**:
   - Click "Check Out" button
   - Work duration is calculated
   - Geofence status at check-out is recorded

### For Administrators

1. **Set Up Geofence Zone**:
   - Go to Admin Dashboard
   - Click "Attendance & Geofencing"
   - Find your office on Google Maps
   - Right-click location → "What's here?"
   - Copy latitude and longitude
   - Set radius (50-200m depending on office size)
   - Click "Create Zone"

2. **Manage Multiple Zones**:
   - Can create zones for multiple office locations
   - Can create project-site zones
   - Enable/disable zones as needed
   - Edit zones to adjust radius or location

3. **Monitor Attendance**:
   - View attendance records with geofence status
   - See employee patterns (inside vs outside)
   - Use data for payroll and analytics

## Troubleshooting

### Employee can't check in

**Problem**: "Waiting for GPS location..."
- **Solution**: 
  - Check browser has location permission
  - Move to open area (GPS needs sky view)
  - Try refreshing the page
  - Check GPS is enabled on device

**Problem**: "You are outside geofence zone"
- **Solution**:
  - Check if you're actually near office
  - Admin should verify geofence zone coordinates
  - Increase zone radius if office is large

### Geofence zone not working

**Problem**: Check-in shows "outside" when should be "inside"
- **Solution**:
  - Verify zone latitude/longitude on Google Maps
  - Increase radius_meters (e.g., from 100 to 150)
  - Check GPS accuracy (±50m or better needed)
  - Ensure zone is_active = true

**Problem**: Zone coordinates are wrong
- **Solution**:
  - Go back to Google Maps
  - Right-click exact office location
  - Copy the coordinates shown at bottom
  - Update zone with correct coordinates

## Examples

### Example 1: New office setup
```json
{
  "name": "Headquarters",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "radius_meters": 150,
  "description": "Main office building, 5th floor"
}
```

### Example 2: Project site
```json
{
  "name": "Project Site - Building A",
  "latitude": 40.7489,
  "longitude": -73.9680,
  "radius_meters": 200,
  "description": "Temporary project site"
}
```

### Example 3: Multiple zones
```json
[
  { "name": "Office", "latitude": 40.7128, "longitude": -74.0060, "radius_meters": 100 },
  { "name": "Warehouse", "latitude": 40.7580, "longitude": -73.9855, "radius_meters": 200 }
]
```

## Performance Considerations

- **Geofence Validation**: O(n) where n = number of active zones
- **GPS Accuracy**: Typically ±5-20m in urban areas, ±50m in rural areas
- **Calculation**: Haversine formula is fast (~1ms) even for 100+ zones
- **Database**: Attendance records are indexed by user_id and created_at

## Future Enhancements

Possible future features:
- Real-time location tracking during work hours
- Automatic check-out if employee leaves zone
- Multiple check-ins per day (for shift workers)
- Geofence upload/import from CSV
- Location alerts (notify admin if outside zone)
- Heat maps showing most common work locations
- Mobile app with background geofencing
- WiFi-based geofencing (fallback when GPS unavailable)

---

**Last Updated**: February 24, 2026
**Version**: 1.0
