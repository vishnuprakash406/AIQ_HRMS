# AIQ HRMS - Testing Guide & Feature Summary

## Quick Start

### Starting the Application

1. **Backend Server (Port 3000)**
   ```bash
   cd backend
   npm start
   ```

2. **Frontend Server (Port 5173)**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000/api/v1

---

## Admin Portal

### Admin Login Credentials
- **Email:** admin@example.com
- **Password:** admin123

### Admin Features

#### 1. Dashboard (http://localhost:5173/admin/dashboard)
- View employee count, leave requests, inventory items, and payroll statistics
- Quick access to all management modules

#### 2. Employee Management (http://localhost:5173/admin/employees)
- **Create New Employee:**
  - Full Name
  - Email (unique, must be valid format)
  - Phone Number
  - Password (will be hashed)
  - Role (admin or employee)
- **View Employees:** List all employees with their details
- **Actions:** View employee details

#### 3. Password Management (http://localhost:5173/admin/password-management)
- Search employees by email
- Reset employee passwords
- Enter new password (will be hashed automatically)

#### 4. Leave Plan Configuration (http://localhost:5173/admin/leave-plan)
- **Create Leave Types:**
  - Name (e.g., "Sick Leave", "Casual Leave")
  - Annual Quota (e.g., 12 days)
  - Description
- **View Leave Types:** List all configured leave types
- **Edit/Delete:** Modify or remove leave types

#### 5. Leave Approvals (http://localhost:5173/admin/leave)
- View all pending leave requests
- See employee name, leave type, dates, reason
- Actions:
  - ✅ Approve - Grant the leave
  - ❌ Reject - Deny with reason

#### 6. Payroll Management (http://localhost:5173/admin/payroll)
- **Upload Payslips:**
  - Select employee (dropdown)
  - Choose month/year
  - Upload PDF file
- **View Payslips:** List all payslips by employee and month
- **Delete:** Remove payslips

#### 7. Inventory Management (http://localhost:5173/admin/inventory)
- **Add Items:**
  - Item Name
  - Category
  - Quantity
  - Description
- **View Inventory:** List all items with quantities
- **Edit:** Update item details and quantities
- **Allocate:** Assign items to employees

#### 8. Onboarding Management (http://localhost:5173/admin/onboarding)
- **Create Onboarding Templates:**
  - Task Title
  - Description
  - Due Days (days from start date)
- **View Templates:** List all onboarding tasks
- **Assign to New Employee:** 
  - Select employee
  - Choose template tasks
  - Tasks auto-assigned with calculated due dates

#### 9. Attendance & Geofencing (http://localhost:5173/admin/geofencing)
- **Create Geofence Zones:**
  - Zone Name (e.g., "Main Office")
  - Latitude (e.g., 13.067439)
  - Longitude (e.g., 80.237617)
  - Radius in Meters (e.g., 100)
  - Description
- **View Zones:** List all geofence boundaries
- **Edit:** Update zone coordinates and radius
- **Delete:** Remove zones
- **Helper:** Instructions for finding coordinates on Google Maps

---

## Employee Portal

### Employee Login
- **Method 1: Password Login**
  - Enter your email or phone number
  - Enter your password
  - Click "Log In"

- **Method 2: OTP Login**
  - Enter your email or phone number
  - Click "Request OTP"
  - Check server console for OTP code
  - Enter OTP and click "Verify OTP"

### Employee Features

#### 1. Dashboard (http://localhost:5173/dashboard)
- **Sidebar Navigation (☰ Hamburger Menu):**
  - 📊 Dashboard
  - 📍 Attendance
  - 👤 My Profile
  - 🚀 Onboarding
  - 📋 Leave Requests
  - ✏️ Attendance Corrections
  - 📦 Inventory
  - 💰 Payroll

- **Quick Attendance Section:**
  - Today's Check-in Time
  - Today's Check-out Time
  - Geofence Status (✅ Inside / ⚠️ Outside)
  - **Actions:**
    - 📷 Check In with Photo
    - 📷 Check Out with Photo

- **Photo Capture Modal:**
  - Opens camera for photo capture
  - Takes photo automatically
  - Captures GPS location
  - Validates geofencing status
  - Submits attendance with photo and location

- **Quick Links:**
  - Fast access to Attendance, Leave, Onboarding, Payroll

#### 2. Attendance (http://localhost:5173/attendance)
- **Real-time GPS Location:** Shows current latitude, longitude, and accuracy
- **Geofence Zones:** Displays all active office zones
- **Current Status:** Shows if you're inside or outside geofence
- **Today's Attendance:**
  - Check-in time and geofence status
  - Check-out time and geofence status
- **Attendance History:** Last 7 days with date, times, and geofence status

#### 3. My Profile (http://localhost:5173/profile)
- **View Personal Information:**
  - Full Name
  - Email (cannot be changed)
  - Phone Number
  - Date of Birth
  - Address
  - Role
  - Joined Date
- **Edit Profile:**
  - Click "✏️ Edit Profile"
  - Update name, phone, DOB, address
  - Save changes

#### 4. Onboarding (http://localhost:5173/onboarding)
- View all assigned onboarding tasks
- See task titles, descriptions, and due dates
- **Mark as Complete:**
  - Check the checkbox when task is done
  - Progress bar updates automatically
- **Filter:**
  - All Tasks
  - Pending
  - Completed

#### 5. Leave Requests (http://localhost:5173/leave)
- **View Leave Balance:** See available days for each leave type
- **Apply for Leave:**
  - Select Leave Type (from configured leave plans)
  - Choose Start Date
  - Choose End Date
  - Provide Reason
  - Submit Request
- **View Leave History:**
  - See all past requests
  - Status: Approved / Rejected / Pending
  - Dates and reason displayed

#### 6. Attendance Corrections (http://localhost:5173/attendance-corrections)
- **Request Corrections:**
  - Select correction date
  - Choose type:
    - Late Check-in
    - Early Check-out
    - Missed Check-in
  - Provide detailed reason
  - Submit for admin review
- **View Correction Requests:**
  - See all submitted corrections
  - Status: Approved / Rejected / Pending

#### 7. Inventory (http://localhost:5173/inventory)
- View items allocated to you
- See item name, category, allocated quantity
- Check allocation date

#### 8. Payroll (http://localhost:5173/payroll)
- View all your payslips
- See month, year, and upload date
- Download payslip PDF

---

## Technical Implementation Details

### Backend Architecture

#### Technology Stack
- **Framework:** Node.js with Express
- **Database:** PostgreSQL
- **Authentication:** JWT (JSON Web Tokens)
- **Password Hashing:** bcrypt
- **Server Port:** 3000

#### API Endpoints

**Authentication (`/api/v1/auth`)**
- `POST /admin-login` - Admin login with email/password
- `POST /login-password` - Employee login with email or phone/password
- `POST /request-otp` - Request OTP for phone/email
- `POST /verify-otp` - Verify OTP and get tokens
- `POST /refresh` - Refresh access token
- `POST /reset-password` - Reset password with OTP

**Attendance (`/api/v1/attendance`)**
- `POST /checkin` - Check-in with GPS and photo
- `POST /checkout` - Check-out with GPS and photo
- `GET /status/:employeeId` - Get today's attendance and 7-day stats
- `GET /history/:employeeId` - Get attendance history with filters
- `GET /geofence/zones` - List all geofence zones
- `POST /geofence/zones` - Create new zone (admin only)
- `PUT /geofence/zones/:id` - Update zone (admin only)
- `DELETE /geofence/zones/:id` - Delete zone (admin only)

**Leave Management**
- Available leave types, requests, approvals (implementation in backend)

**Payroll, Inventory, Onboarding**
- Full CRUD operations for each module

#### Database Schema

**Key Tables:**
- `users` - Employee/admin accounts
- `attendance_logs` - Check-in/out records with GPS and geofence status
- `geofence_zones` - Office location boundaries
- `leave_types` - Leave plan configurations
- `leave_requests` - Employee leave applications
- `inventory_items` - Company inventory
- `payroll_payslips` - Payslip records
- `onboarding_checklist` - Onboarding task templates

### Frontend Architecture

#### Technology Stack
- **Framework:** React with Vite
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **Styling:** Inline CSS with responsive design
- **Camera:** HTML5 Media API
- **Geolocation:** HTML5 Geolocation API
- **Server Port:** 5173

#### Key Components

**Pages:**
- `Login.jsx` - Multi-mode login (password/OTP/admin)
- `Dashboard.jsx` - Employee dashboard with sidebar and quick attendance
- `Attendance.jsx` - GPS tracking and attendance history
- `Profile.jsx` - Employee profile view/edit
- `AttendanceCorrections.jsx` - Correction request form
- `EmployeeOnboarding.jsx` - Onboarding task checklist
- `Leave.jsx` - Leave balance and request form
- `Inventory.jsx` - Allocated items view
- `Payroll.jsx` - Payslip downloads
- `AdminDashboard.jsx` - Admin statistics and module cards
- `AdminEmployees.jsx` - Employee CRUD
- `AdminPasswordManagement.jsx` - Password reset tool
- `AdminLeavePlan.jsx` - Leave type configuration
- `AdminLeave.jsx` - Leave approval workflow
- `AdminPayroll.jsx` - Payslip upload
- `AdminInventory.jsx` - Inventory CRUD and allocation
- `AdminOnboarding.jsx` - Onboarding template management
- `AdminGeofencing.jsx` - Geofence zone management

**API Client (`api/client.js`):**
- Base URL: `http://localhost:3000/api/v1`
- Request Interceptor: Adds `Authorization: Bearer <token>` header
- Response Interceptor: Clears tokens and redirects on 401

### Key Features & Algorithms

#### Geofencing System
**Haversine Formula:**
```javascript
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}
```

**Geofence Validation:**
- Employee's current GPS location is compared against all active geofence zones
- If distance <= zone radius, status = "inside"
- If distance > zone radius for all zones, status = "outside"
- Status is stored in attendance record for both check-in and check-out

#### Photo Capture
**Implementation:**
```javascript
// Start camera
navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
  .then(stream => videoRef.current.srcObject = stream);

// Capture photo
const context = canvasRef.current.getContext('2d');
context.drawImage(videoRef.current, 0, 0, 320, 240);
const photoDataUrl = canvasRef.current.toDataURL('image/jpeg');
```

#### GPS Location Tracking
```javascript
navigator.geolocation.watchPosition(
  (position) => {
    const { latitude, longitude } = position.coords;
    // Use location for attendance submission
  },
  (error) => console.error('GPS error:', error),
  { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
);
```

---

## Testing Checklist

### Admin Tests
- [ ] Login as admin with admin@example.com / admin123
- [ ] Create a new employee with valid details
- [ ] Create leave type "Sick Leave" with 12 days quota
- [ ] Upload a test payslip for an employee
- [ ] Create inventory item "Laptop" with quantity 10
- [ ] Create onboarding template with 3 tasks
- [ ] Create geofence zone for office location
- [ ] View pending leave requests
- [ ] Approve/reject leave request

### Employee Tests
- [ ] Login as employee (use credentials created by admin)
- [ ] Open Dashboard and verify sidebar navigation
- [ ] Click Check In with Photo
- [ ] Grant camera permission and capture photo
- [ ] Verify geofence status (inside/outside)
- [ ] View attendance history
- [ ] Apply for sick leave
- [ ] Complete onboarding tasks
- [ ] View payslips
- [ ] Edit profile information
- [ ] Submit attendance correction request

### Geofencing Tests
- [ ] Admin creates geofence zone with office coordinates
- [ ] Employee checks in from inside office location
- [ ] Verify status shows "✅ Inside"
- [ ] Employee checks in from outside office location
- [ ] Verify status shows "⚠️ Outside"
- [ ] Check attendance history shows geofence status for each record

---

## Troubleshooting

### Backend Not Starting
```bash
# Check if port 3000 is already in use
lsof -i :3000

# Kill the process
lsof -i :3000 | awk '{print $2}' | tail -n +2 | xargs kill -9

# Restart backend
cd backend && npm start
```

### Frontend Not Starting
```bash
# Check if port 5173 is in use
lsof -i :5173

# Kill and restart
cd frontend && npm run dev
```

### Camera Not Working
- Ensure browser has camera permission
- Try in HTTPS or localhost (browsers restrict camera on HTTP)
- Check browser console for errors

### GPS Not Working
- Ensure location permission is granted
- Check if GPS is enabled on device
- Use Chrome or Safari (best GPS support)

### API 401 Errors
- Check if tokens are stored in localStorage
- Clear localStorage and login again
- Verify backend is running on port 3000

### Database Errors
- Ensure PostgreSQL is running
- Check DATABASE_URL in backend/.env
- Run schema initialization: `psql -d hrms -f backend/docs/initial_schema.sql`

---

## Next Steps & Future Enhancements

### Pending Implementation
1. **Attendance Corrections Backend:**
   - Create corrections table
   - Admin approval workflow
   - Apply corrections to attendance records

2. **Leave Balance Deduction:**
   - Deduct days from leave quota on approval
   - Track remaining balance
   - Prevent over-utilization

3. **Photo Storage:**
   - Store photos in AWS S3 or local file system
   - Link photos to attendance records
   - Display photos in admin panel

4. **Email Notifications:**
   - Send OTP via email
   - Notify on leave approval/rejection
   - Alert on onboarding task assignment

5. **Admin Attendance View:**
   - Dashboard showing all employee attendance
   - Filter by date, employee, geofence status
   - Export to CSV/Excel

6. **Mobile Optimization:**
   - Improve touch targets
   - Better mobile camera experience
   - Native app (React Native)

### Enhancement Ideas
- Two-factor authentication
- Biometric login
- Real-time push notifications
- Advanced reporting and analytics
- Integration with payroll systems
- Shift management
- Holiday calendar
- Document management improvements
- Employee performance tracking

---

## Support & Documentation

For detailed technical documentation, see:
- `/backend/docs/initial_schema.sql` - Database schema
- `/backend/docs/GEOFENCING_FEATURE.md` - Geofencing documentation

For questions or issues, check:
- Browser console for frontend errors
- Backend terminal for API errors
- Network tab for failed API calls

---

**Version:** 1.0  
**Last Updated:** February 2026  
**Developers:** AIQ HRMS Team
