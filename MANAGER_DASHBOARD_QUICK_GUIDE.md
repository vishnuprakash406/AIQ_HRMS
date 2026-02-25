# Manager Dashboard - Quick Reference Guide

## 🎯 For Managers

### Login & Dashboard
1. **Login URL:** `/company-login`
2. **Credentials needed:**
   - Company Code (e.g., `ACME-001`)
   - Username: Employee Code, Email, or Phone
   - Password: Your account password

3. **After Login:**
   - You'll be redirected to **Manager Dashboard**
   - You'll see modules you have been assigned
   - Click any module card to access it

### What You Can Do
- ✅ View assigned modules only
- ✅ Access modules based on your permissions (View, Edit, Modify)
- ✅ Change your password (🔑 button top-right)
- ✅ View branch information in dashboard header
- ✅ See statistics relevant to your modules

### What You Cannot Do
- ❌ Assign yourself new modules
- ❌ Change your permissions
- ❌ Access unauthorized modules
- ❌ Manage other managers

### If You See "📭 No Modules Assigned"
This means no modules have been assigned to your account yet.
- **Action:** Contact your Company Administrator
- **Tell them:** "I don't have access to any modules on my dashboard"
- **They will:** Use the Company Dashboard to assign modules to you

---

## 🛠️ For Company Administrators

### Assign Modules to a Manager

**Step-by-Step:**

1. **Login to Company Dashboard**
   - URL: `/company-login`
   - Login as Company Admin (main company account)

2. **Navigate to Branch**
   - On dashboard, find and click target branch
   - Or navigate to: `/admin/branch/{branchId}`

3. **Find Manager Module Access Section**
   - Scroll down to "📋 Manager Module Access"

4. **Locate the Manager**
   - Look for manager's name and contact info
   - See their currently assigned modules (if any)

5. **Click "⚙️ Manage Permissions" Button**
   - Opens modal dialog

6. **In Modal - Assign Module**
   - Select module from "Select Module" dropdown
   - Check permissions:
     - ✓ **View** (can see the module)
     - ☐ **Edit** (can create/modify)
     - ☐ **Update** (can update existing)
   - Click "✅ Assign Module"

7. **Verify Assignment**
   - See module appear in manager's badge list
   - Or manager can refresh their dashboard

### Modify Manager Permissions

1. Same steps 1-5 above
2. In Modal, find the module in the list
3. Click ✏️ button next to module
4. Change permissions as needed
5. Click "💾 Update"

### Remove Module from Manager

1. Same steps 1-5 above
2. In Modal, find the module in the list
3. Click 🗑️ trash icon next to module
4. Confirm removal

---

## 📊 Module Codes & Names

| Code | Display Name | Description |
|------|--------------|-------------|
| `employees` | Manage Employees | Add, view, manage employee profiles |
| `password_management` | Password Management | Reset employee passwords |
| `leave_plan` | Leave Plan | Define leave types and quotas |
| `leave_approvals` | Leave Approvals | Approve/reject leave requests |
| `payroll` | Payroll Management | Upload and manage payslips |
| `inventory` | Inventory Management | Add and allocate inventory |
| `onboarding` | Onboarding | Create onboarding tasks |
| `attendance` | Attendance Tracking | View employee locations |
| `geofencing` | Geofencing | Configure geofence zones |

---

## 🔑 Permissions Explained

### View (👁️)
- **What:** Can see the module and view its content
- **Required:** Always needed to access module
- **Example:** Read-only access to employee data

### Edit (✏️)
- **What:** Can create new records in the module
- **Requires:** View permission also enabled
- **Example:** Add new employees, create new leaves

### Modify (🔧) / Update
- **What:** Can modify existing records
- **Requires:** View permission also enabled
- **Example:** Edit employee details, update leave records

---

## 🐛 Debugging

### Check Dashboard Info
In the ManagerDashboard "No Modules Assigned" message:
- 📋 Shows total modules fetched
- 🆔 Shows Branch ID
- 👤 Shows Manager ID
- 📝 Shows detailed module data

### Browser Console
Press F12 while on Manager Dashboard:
1. Click **Console** tab
2. Look for logs starting with "ManagerDashboard Debug:"
3. Check for any red error messages
4. Copy relevant errors to share with support

### Common Issues

| Problem | Check |
|---------|-------|
| Blank dashboard | F12 → Application → Local Storage → Check `manager_id` and `branch_id` |
| No modules showing | Are modules assigned? (Ask admin) |
| Stats not updating | Check browser console for API errors |
| Can't change password | Make sure old password is correct |
| Can't access modules | Check `can_view` permission is enabled |

---

## 🔗 Useful Links

- Manager Dashboard: `/manager-dashboard`
- Company Login: `/company-login`
- Company Admin Dashboard: `/company-dashboard`
- Admin Branch Details: `/admin/branch/{branchId}`

---

## 📞 Support

**For Managers:** Contact your Company Administrator

**For Administrators:** Check the troubleshooting section in `MANAGER_DASHBOARD_IMPLEMENTATION.md`

**For Developers:** Review logs in browser console (F12) and backend server logs
