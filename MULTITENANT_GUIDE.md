# Multi-Tenant HRMS - Implementation Complete

## System Overview

The AIQ HRMS has been successfully upgraded to support **multi-tenant architecture** with three authentication tiers:

1. **Master** - System administrator who creates and manages companies
2. **Company Admin** - Company representative who manages employees and modules  
3. **Employee** - Regular employee with limited access

---

## Database Schema

### New Multi-Tenant Tables Created:

**1. masters** - Master user accounts
```sql
- id (UUID primary key)
- username (VARCHAR unique)
- password_hash (TEXT)
- email (VARCHAR)
- created_at (TIMESTAMPTZ)
```

**2. companies** - Company accounts created by masters
```sql
- id (UUID primary key)
- company_code (VARCHAR unique) - e.g., "ACME-001"
- name (VARCHAR) - Company name
- username (VARCHAR unique) - Company admin username
- password_hash (TEXT)
- employee_limit (INTEGER) - Max employees allowed
- is_active (BOOLEAN)
- created_at / updated_at (TIMESTAMPTZ)
```

**3. company_modules** - Module access control per company
```sql
- id (UUID primary key)
- company_id (UUID, foreign key)
- module_name (VARCHAR) - e.g., "inventory", "attendance", "payroll"
- is_enabled (BOOLEAN)
- UNIQUE(company_id, module_name)
```

**4. users** - Modified to support multi-tenancy
```sql
- Added: company_id (UUID, foreign key to companies)
- Allows company-specific employee grouping
```

---

## API Endpoints

### 1. MASTER AUTHENTICATION & MANAGEMENT

#### Login
```
POST /api/v1/master/login
Content-Type: application/json

{
  "username": "master",
  "password": "master123"
}

Response: {
  "status": "success",
  "message": "Master login successful",
  "token": "<JWT_TOKEN>",
  "role": "master"
}
```

#### Create Company
```
POST /api/v1/master/companies
Authorization: Bearer <MASTER_TOKEN>
Content-Type: application/json

{
  "company_code": "ACME-001",
  "name": "ACME Corporation",
  "username": "admin",
  "password": "admin123",
  "employee_limit": 50,
  "default_modules": ["attendance", "inventory", "payroll", "employee_management"]
}

Response: {
  "status": "success",
  "message": "Company created successfully",
  "data": {
    "id": "<UUID>",
    "company_code": "ACME-001",
    "name": "ACME Corporation",
    "employee_limit": 50,
    "modules": ["attendance", "inventory", "payroll", "employee_management"]
  }
}
```

#### Get All Companies
```
GET /api/v1/master/companies
Authorization: Bearer <MASTER_TOKEN>

Response: {
  "status": "success",
  "message": "Companies retrieved successfully",
  "data": [
    {
      "id": "<UUID>",
      "company_code": "ACME-001",
      "name": "ACME Corporation",
      "employee_limit": 50,
      "is_active": true,
      "created_at": "2025-02-25T10:30:00Z"
    }
  ]
}
```

#### Get Company Details
```
GET /api/v1/master/companies/:companyId
Authorization: Bearer <MASTER_TOKEN>

Response: {
  "status": "success",
  "message": "Company details retrieved successfully",
  "data": {
    "id": "<UUID>",
    "company_code": "ACME-001",
    "name": "ACME Corporation",
    "employee_limit": 50,
    "is_active": true,
    "modules": [
      { "module_name": "attendance", "is_enabled": true },
      { "module_name": "inventory", "is_enabled": true }
    ],
    "employee_count": 15
  }
}
```

#### Update Company
```
PUT /api/v1/master/companies/:companyId
Authorization: Bearer <MASTER_TOKEN>
Content-Type: application/json

{
  "name": "ACME Corporation Ltd",
  "employee_limit": 100,
  "is_active": true
}

Response: {
  "status": "success",
  "message": "Company updated successfully",
  "data": { ... }
}
```

---

### 2. COMPANY AUTHENTICATION & MANAGEMENT

#### Login
```
POST /api/v1/company/login
Content-Type: application/json

{
  "company_code": "ACME-001",
  "username": "admin",
  "password": "admin123"
}

Response: {
  "status": "success",
  "message": "Company login successful",
  "token": "<JWT_TOKEN>",
  "role": "company_admin",
  "company_id": "<UUID>",
  "company_name": "ACME Corporation",
  "modules": [
    { "module_name": "attendance", "is_enabled": true },
    { "module_name": "inventory", "is_enabled": true }
  ]
}
```

#### Get Company Info
```
GET /api/v1/company/info
Authorization: Bearer <COMPANY_TOKEN>

Response: {
  "status": "success",
  "message": "Company info retrieved successfully",
  "data": {
    "id": "<UUID>",
    "company_code": "ACME-001",
    "name": "ACME Corporation",
    "employee_limit": 50,
    "employee_count": 15,
    "is_active": true,
    "modules": [
      { "module_name": "attendance", "is_enabled": true },
      { "module_name": "inventory", "is_enabled": true }
    ]
  }
}
```

#### Get Company Modules
```
GET /api/v1/company/modules
Authorization: Bearer <COMPANY_TOKEN>

Response: {
  "status": "success",
  "message": "Modules retrieved successfully",
  "modules": [
    { "module_name": "attendance", "is_enabled": true },
    { "module_name": "inventory", "is_enabled": true },
    { "module_name": "payroll", "is_enabled": false }
  ]
}
```

#### Toggle Module
```
PUT /api/v1/company/modules/:moduleName
Authorization: Bearer <COMPANY_TOKEN>
Content-Type: application/json

{
  "is_enabled": true
}

Response: {
  "status": "success",
  "message": "Module updated successfully",
  "data": {
    "module_name": "attendance",
    "is_enabled": true
  }
}
```

---

## Frontend Pages

### 1. Master Login Page
**Location:** `/src/pages/MasterLogin.jsx`
**Route:** `/master-login`

Features:
- Login form for master users
- Redirects to Master Dashboard on success
- Links to Company and Employee login pages

### 2. Master Dashboard
**Location:** `/src/pages/MasterDashboard.jsx`
**Route:** `/master-dashboard`

Features:
- View all companies in a table
- Create new companies with:
  - Company code, name, and admin credentials
  - Employee limit
  - Default modules selection (checkbox list)
- View company details
- Logout

### 3. Company Login Page
**Location:** `/src/pages/CompanyLogin.jsx`
**Route:** `/company-login`

Features:
- Login form with company code, username, password
- Redirects to Company Dashboard on success
- Links to Master and Employee login pages

### 4. Company Dashboard
**Location:** `/src/pages/CompanyDashboard.jsx`
**Route:** `/company-dashboard`

Features:
- Display company information (name, code, employee count vs. limit)
- Module management:
  - View all modules with enable/disable status
  - Toggle modules on/off
  - Access enabled modules
- Logout

### 5. Employee Login (Existing)
**Route:** `/login`

---

## Testing Guide

### Test Master Flow

1. **Login as Master**
   ```
   Navigate to: http://localhost:5174/master-login
   Username: master
   Password: master123
   ```

2. **View Companies**
   - Should see existing companies in a table
   - Click "Create Company" to add a new one

3. **Create New Company**
   ```
   Company Code: ACTEST-001
   Company Name: Test Company
   Admin Username: testadmin
   Admin Password: testpass123
   Employee Limit: 30
   Select Modules: attendance, inventory, payroll
   ```

4. **Verify Company Creation**
   - Company appears in the list
   - Status shows "Active"

### Test Company Flow

1. **Login as Company**
   ```
   Navigate to: http://localhost:5174/company-login
   Company Code: ACME-001
   Username: admin
   Password: admin123
   ```

2. **View Company Dashboard**
   - Displays company name, employee count (15/50), status
   - Shows all modules (enabled and disabled)

3. **Toggle Module**
   - Click "Enable" on a disabled module
   - Module status should update immediately
   - Can "Access Module" for enabled modules only

4. **Logout**
   - Returns to login page
   - Clears session tokens

---

## Available Modules

Default modules that can be assigned to companies:

- `attendance` - Attendance tracking with geofencing/location
- `inventory` - Inventory management
- `payroll` - Payroll and salary management
- `employee_management` - Employee profile management
- `leave` - Leave request and management
- `geofencing` - Geofence zone management

---

## Authentication & JWT Tokens

All requests to protected endpoints require:
```
Authorization: Bearer <JWT_TOKEN>
```

JWT Payload includes:
```json
{
  "id": "<UUID>",
  "role": "master|company_admin|employee",
  "username": "<username>",
  "company_code": "<company_code>",  // for company_admin only
  "company_id": "<UUID>",             // for company_admin only
  "iat": <issued_at>,
  "exp": <expiration_time>
}
```

Token Expiration: 7 days

---

## Implementation Details

### Backend Structure
```
backend/src/
├── modules/
│   ├── master/
│   │   ├── master.controller.js
│   │   └── master.routes.js
│   ├── company/
│   │   ├── company.controller.js
│   │   └── company.routes.js
│   ├── auth/ (updated for employee auth)
│   ├── attendance/
│   ├── onboarding/
│   └── ...other modules
├── middleware/
│   ├── auth.js (updated with verifyMasterToken, verifyCompanyToken)
│   └── ...
└── routes/
    └── index.js (registered new master & company routes)
```

### Frontend Structure
```
frontend/src/
├── pages/
│   ├── MasterLogin.jsx
│   ├── MasterDashboard.jsx
│   ├── CompanyLogin.jsx
│   ├── CompanyDashboard.jsx
│   ├── Login.jsx (employee)
│   └── ...other pages
└── App.jsx (added new routes)
```

---

## Data Flow

### Company Creation Flow
1. Master logs in → gets JWT token
2. Master submits company creation form
3. Backend creates:
   - Company record in `companies` table
   - Module entries in `company_modules` table
4. Company admin can now login

### Employee Creation Flow
1. Company admin creates employee
2. Backend creates employee record with `company_id` set
3. Employee data is isolated to that company
4. Employee can login with company-specific JWT

### Module Access Control
1. Company admin toggles module status
2. Frontend checks enabled modules before showing UI
3. Backend enforces module access via middleware (ready for implementation)

---

## Production Checklist

- [ ] Generate secure JWT_SECRET in environment variables
- [ ] Configure email service for master/company account notifications
- [ ] Implement rate limiting on login endpoints
- [ ] Add audit logging for master actions
- [ ] Set up database backups
- [ ] Enable HTTPS/SSL for all endpoints
- [ ] Implement password reset flow
- [ ] Add session management and token refresh
- [ ] Set up centralized error logging
- [ ] Configure CORS appropriately for production domain

---

## Migration Path for Existing Users

Existing users (before multi-tenancy) are currently untouched and can:
1. Continue using employee login
2. Can be migrated to specific companies later
3. Gradual migration strategy:
   - Create default company for legacy users
   - Move users to default company via admin migration tool
   - Assign new users to specific companies

---

## Next Steps (Optional Enhancements)

1. **Employee Limit Enforcement**
   - Check employee count before allowing new employees
   - Warn company admin when approaching limit

2. **Module-Based Feature Gating**
   - Hide UI elements for disabled modules
   - Return 403 Forbidden for disabled module endpoints

3. **Company Subscription Management**
   - Add subscription tiers (Basic, Professional, Enterprise)
   - Different module access per tier

4. **Audit Logging**
   - Log all master actions (company creation, updates)
   - Log all company admin actions (module toggles, employee management)

5. **API Rate Limiting**
   - Limit logins per IP
   - Limit API requests per company

6. **Data Isolation Middleware**
   - Automatically filter all queries by company_id
   - Prevent cross-company data access

---

## Support

For issues or questions about the multi-tenant implementation, refer to the API documentation or check the console for error messages.

**Backend:** http://localhost:3000
**Frontend:** http://localhost:5174
