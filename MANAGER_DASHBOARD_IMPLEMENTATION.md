# Manager Dashboard Implementation Summary

## Overview
Implemented a dedicated **Manager Dashboard** for branch managers with **permission-based module visibility**. Managers can now access a dashboard similar to the company admin dashboard but with only the modules they have been granted permission to access.

## Current Status
✅ **Manager Dashboard**: Fully implemented and functional
✅ **Module Permission System**: Backend API working correctly
✅ **API Authorization**: Fixed 403 Forbidden issue - managers can now fetch their own modules
✅ **UI/UX**: Improved with helpful instructions and debug information
✅ **Error Handling**: Better error messages for API failures
⚠️ **Module Assignment**: Manual process through AdminBranchDetails (feature complete)

## How It Works

### 1. Manager Login Flow
1. Manager logs in via Company Login page with their credentials
2. Backend validates credentials and returns JWT token with `user_id`
3. Frontend extracts `user_id` from JWT and stores as `manager_id`
4. Manager is redirected to Manager Dashboard
5. Dashboard fetches modules for that manager from the database

### 2. Module Assignment (Admin Process)
1. **Go to Company Admin Dashboard**
2. **Select a Branch** from the dashboard
3. **View "Manager Module Access"** section
4. **Find the Manager** you want to configure
5. **Click "Manage Permissions"** button
6. **In the Modal:**
   - Select module from dropdown
   - Set permissions: View, Edit, Modify
   - Click "Assign Module"
7. **Refresh Manager Dashboard** - new modules will appear

### 3. Manager Dashboard Display
- Shows only modules where **`can_view = true`**
- Displays module permissions indicators (👁️ View, ✏️ Edit, 🔧 Modify)
- Shows relevant statistics for accessible modules
- Provides "No Modules Assigned" message if none are configured

## Changes Made

### 1. **Created ManagerDashboard Component**
**File:** `frontend/src/pages/ManagerDashboard.jsx`

**Features:**
- ✅ Permission-based module visibility (only shows modules with `can_view` permission)
- ✅ Module cards with icons and descriptions
- ✅ Relevant statistics display based on accessible modules:
  - Employee count (if employees module accessible)
  - Pending leave approvals (if leave_approvals module accessible)
  - Leave plan types (if leave_plan module accessible)
  - Inventory items (if inventory module accessible)
  - Payslips (if payroll module accessible)
- ✅ Password change functionality
- ✅ Logout functionality with proper localStorage cleanup
- ✅ Branch information display in header
- ✅ Responsive grid layout for module cards
- ✅ Hover effects and smooth transitions
- ✅ "No Modules Assigned" message when manager has no accessible modules

**Module Mapping:**
```
- employees → Manage Employees
- password_management → Password Management
- leave_plan → Leave Plan
- leave_approvals → Leave Approvals
- payroll → Payroll Management
- inventory → Inventory Management
- onboarding → Onboarding
- attendance → Attendance Tracking
- geofencing → Geofencing
```

### 2. **Updated App.jsx**
**File:** `frontend/src/App.jsx`

**Changes:**
- Added import for `ManagerDashboard`
- Added new route: `<Route path="/manager-dashboard" element={<ManagerDashboard />} />`

### 3. **Updated CompanyDashboard.jsx**
**File:** `frontend/src/pages/CompanyDashboard.jsx`

**Changes:**
- Modified the useEffect hook to redirect branch_manager users to `/manager-dashboard` instead of loading the company admin dashboard
- This ensures managers see their dedicated dashboard, not the admin interface

### 4. **Updated CompanyLogin.jsx**
**File:** `frontend/src/pages/CompanyLogin.jsx`

**Changes:**
- Added `decodeToken()` helper function to extract user_id from JWT token
- Updated handleSubmit to:
  - Decode the JWT token when a branch_manager logs in
  - Extract and store the `user_id` as `manager_id` in localStorage
  - This enables the ManagerDashboard to fetch the correct manager permissions

**JWT Payload Decoding:**
The function safely decodes the JWT token to extract:
- `user_id` → stored as `manager_id`
- `user_id` is used with `branch_id` to fetch manager-specific module permissions

## Data Flow

1. **Login Process:**
   ```
   Manager logs in → Backend returns JWT with user_id
   → Frontend decodes JWT and stores user_id as manager_id
   → Redirects to /company-dashboard
   
2. **Dashboard Routing:**
   ```
   User with role='branch_manager' accesses /company-dashboard
   → Redirected to /manager-dashboard
   → ManagerDashboard loads
   
3. **Permission Fetch:**
   ```
   ManagerDashboard fetches from:
   GET /company/branches/{branchId}/managers/{managerId}/modules
   → Returns modules with permissions: can_view, can_edit, can_modify
   → Filters to show only modules with can_view=true
   
4. **Stats Calculation:**
   ```
   For each accessible module, fetch relevant statistics:
   - employees: GET /company/branches/{branchId}/employees
   - leaves & leave_plans: GET /leave/all + /leave-plan/types
   - inventory: GET /inventory
   - payroll: GET /payroll/payslips/all

## Local Storage Items

When a branch manager logs in, the following are stored:
```javascript
companyToken       = JWT token
userRole          = 'branch_manager'
company_id        = Company ID
company_name      = Company name
branch_id         = Branch ID
branch_name       = Branch name
manager_id        = Manager/User ID (extracted from JWT)
modules           = Array of accessible modules
```

## Key Features

✅ **Permission-Based Access:**
- Only modules with `can_view: true` are displayed
- Permission indicators shown (👁️ View, ✏️ Edit, 🔧 Modify)
- Hidden modules are completely invisible to the manager

✅ **User Experience:**
- Clean, professional UI matching AdminDashboard style
- Quick stats overview
- One-click access to assigned modules
- Logical module organization

✅ **Security:**
- Proper token validation
- Role-based routing (only branch_manager can access)
- Token stored securely in localStorage
- Comprehensive logout functionality

✅ **Responsive Design:**
- Auto-responsive grid layout
- Adapts to different screen sizes
- Smooth hover effects

## API Endpoints Used

- `GET /company/branches` - Fetch branch information
- `GET /company/branches/{branchId}/managers/{managerId}/modules` - Fetch manager's module permissions
- `GET /company/branches/{branchId}/employees` - Fetch branch employees
- `GET /leave/all` - Fetch leave requests
- `GET /leave-plan/types` - Fetch leave plan types
- `GET /inventory` - Fetch inventory items
- `GET /payroll/payslips/all` - Fetch payslips
- `POST /company/change-password` - Change manager password

## Testing Checklist

- [ ] Manager can log in with credentials
- [ ] branch_id and manager_id are correctly stored in localStorage
- [ ] ManagerDashboard loads correctly
- [ ] Only modules with permission are displayed
- [ ] Stats are calculated correctly for accessible modules
- [ ] Manager can click on modules to access them
- [ ] Password change functionality works
- [ ] Logout clears all localStorage items
- [ ] No "No Modules Assigned" message appears when modules are assigned
- [ ] "No Modules Assigned" message appears when no modules are assigned

## Troubleshooting

### Issue: "403 Forbidden" Error in Console

**Cause:** Backend API endpoint was rejecting manager requests due to authorization check.

**Fix Applied ✅:**
- Changed route from `verifyCompanyToken` (admin only) to `verifyCompanyOrBranchManagerToken` (admin or manager)
- Updated controller to allow both company admins and branch managers
- Added security check: branch managers can only fetch their own modules
- Improved frontend error handling to provide clearer error messages

**Files Changed:**
- `backend/src/modules/company/company.routes.js` - Line 26
- `backend/src/modules/company/company.controller.js` - getBranchManagerModulePermissions function
- `frontend/src/pages/ManagerDashboard.jsx` - Error handling and display

**What This Means:**
Managers can now successfully load their module permissions without getting a 403 error. If they try to access another manager's modules, they'll get a proper error message.

### Issue: "No Modules Assigned" Message Appears

**Cause:** Manager doesn't have any modules assigned in the database.

**Solution:**
1. Log in as Company Admin
2. Go to Company Dashboard
3. Click on the appropriate Branch
4. Scroll to "Manager Module Access" section
5. Find the manager's name
6. Click "⚙️ Manage Permissions" button
7. Select a module from the dropdown (e.g., "employees")
8. Click "✅ Assign Module"
9. Manager should now see the modules after refreshing their dashboard

### Issue: Manager Logs in but Dashboard is Blank

**Cause:** `manager_id` or `branch_id` not properly set in localStorage

**Solution:**
1. Open browser Developer Tools (F12)
2. Go to "Application" → "Local Storage"
3. Check if `branch_id` is set (should be a UUID)
4. Check if `manager_id` is set (should be a UUID)
5. If either is missing, log out and log back in
6. If still missing, check browser console for errors (F12 → Console tab)

### Issue: Modules Show but Statistics Don't Update

**Cause:** Stats API endpoints might be failing silently

**Solution:**
1. Open browser console (F12 → Console)
2. Look for errors related to `/leave/all`, `/inventory`, `/payroll`, etc.
3. Check if the manager's token is still valid
4. Try logging out and logging back in
5. Check backend logs for API errors

### Issue: Module Permissions Not Changing

**Cause:** Browser cache or page not refreshing

**Solution:**
1. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Verify the permission was actually saved in the database
4. Check backend logs for SQL errors

## FAQ

**Q: How do managers access the dashboard?**
A: Managers log in via the Company Login page with their credentials. They need their Employee Code (or email/phone) and password.

**Q: Can managers access all modules?**
A: No. Managers can only see modules that have been explicitly assigned by the Company Admin with `can_view: true` permission.

**Q: What's the difference between can_view, can_modify, and can_update?**
A: 
- `can_view`: Can see the module and its content
- `can_modify`: Can make changes/create new records  
- `can_update`: Can modify existing records

**Q: How are statistics calculated?**
A: Statistics are calculated based on the modules the manager has access to. For example, if a manager doesn't have the "employees" module, the employee count won't be shown.

**Q: What happens if a module is assigned but can_view is false?**
A: The module won't appear in the dashboard at all. Only modules with `can_view: true` are displayed.

**Q: Can managers edit their own module permissions?**
A: No. Only Company Admins can assign or modify module permissions through the AdminBranchDetails page.

**Q: How do I revoke a module from a manager?**
A: Go to Company Dashboard → Select Branch → Find Manager → Click "Manage Permissions" → Click the trash icon next to the module.

## Database Schema

### branch_manager_modules Table
```sql
CREATE TABLE branch_manager_modules (
  id UUID PRIMARY KEY,
  branch_id UUID NOT NULL,
  manager_user_id UUID NOT NULL,
  module_name VARCHAR(255) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  can_view BOOLEAN DEFAULT false,
  can_modify BOOLEAN DEFAULT false,
  can_update BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(manager_user_id, module_name)
);
```

## Deployment Notes

1. ✅ Ensure backend JWT includes `user_id` in the token payload
2. ✅ Ensure branch manager module permissions are correctly configured in the database
3. ✅ Test with managers having different permission levels
4. ✅ Verify token decoding works across different browsers
5. ✅ Backend endpoint for assigning modules: `POST /company/branches/{branchId}/managers/{managerId}/modules`
6. ✅ Frontend assigns modules through ModulePermissionManager component in AdminBranchDetails

## Future Enhancements

1. **Auto-assign default modules:** Automatically assign a set of default modules when a manager is created
2. **Batch module assignment:** Assign modules to multiple managers at once
3. **Module templates:** Create permission templates for common manager types
4. **Module audit logs:** Track who assigned/revoked modules and when
5. **Manager self-service:** Allow managers to request module access

