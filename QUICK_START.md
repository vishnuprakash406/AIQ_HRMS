# Quick Start - Multi-Tenant HRMS Testing

## Prerequisites

- Backend running on `http://localhost:3000`
- Frontend running on `http://localhost:5174`
- PostgreSQL database configured and migrations applied

## 1. Backend Testing (cURL)

### Generate Fresh Master Token

```bash
# Login as master
curl -X POST http://localhost:3000/api/v1/master/login \
  -H "Content-Type: application/json" \
  -d '{"username": "master", "password": "master123"}'

# Save the token from response: TOKEN=<copy_token_from_response>
TOKEN="your_master_token_here"
```

### Create a New Company

```bash
curl -X POST http://localhost:3000/api/v1/master/companies \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company_code": "TEST-2025",
    "name": "Test Company 2025",
    "username": "testadmin",
    "password": "testpass123",
    "employee_limit": 50,
    "default_modules": ["attendance", "inventory", "payroll", "employee_management", "leave"]
  }'
```

### View All Companies

```bash
curl -X GET http://localhost:3000/api/v1/master/companies \
  -H "Authorization: Bearer $TOKEN"
```

### Company Admin Login

```bash
curl -X POST http://localhost:3000/api/v1/company/login \
  -H "Content-Type: application/json" \
  -d '{
    "company_code": "TEST-2025",
    "username": "testadmin",
    "password": "testpass123"
  }'

# Save company token: COMPANY_TOKEN=<copy_token_from_response>
COMPANY_TOKEN="your_company_token_here"
```

### Get Company Info

```bash
curl -X GET http://localhost:3000/api/v1/company/info \
  -H "Authorization: Bearer $COMPANY_TOKEN"
```

### Toggle a Module

```bash
# Disable payroll module
curl -X PUT http://localhost:3000/api/v1/company/modules/payroll \
  -H "Authorization: Bearer $COMPANY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_enabled": false}'
```

---

## 2. Frontend Testing

### Access Master Dashboard

1. Open browser: `http://localhost:5174`
2. Click "Master Login" link (or navigate to `/master-login`)
3. **Credentials:**
   - Username: `master`
   - Password: `master123`

4. **On Dashboard:**
   - View list of all companies
   - Click "Create Company" to add a new one
   - Click "View Details" to see company info

### Access Company Dashboard

1. Navigate to: `http://localhost:5174/company-login`
2. **Credentials for ACME-001:**
   - Company Code: `ACME-001`
   - Username: `admin`
   - Password: `admin123`

3. **On Dashboard:**
   - See company information
   - View all modules with their status
   - Click "Enable"/"Disable" to toggle modules
   - Click "Access Module" for enabled modules (if integration available)

### Test Existing Employee Flow

1. Navigate to: `http://localhost:5174/login`
2. Use existing employee credentials (from previous tests)
3. Verify employee dashboard still works (backward compatibility)

---

## 3. Database Verification

### Check Masters Table

```bash
PGPASSWORD='TheAIQ!@2026' psql -h localhost -U theaiq -d hrms \
  -c "SELECT id, username, email FROM masters LIMIT 5;"
```

### Check Companies Table

```bash
PGPASSWORD='TheAIQ!@2026' psql -h localhost -U theaiq -d hrms \
  -c "SELECT company_code, name, employee_limit, is_active FROM companies;"
```

### Check Company Modules

```bash
PGPASSWORD='TheAIQ!@2026' psql -h localhost -U theaiq -d hrms \
  -c "SELECT c.company_code, m.module_name, m.is_enabled 
      FROM company_modules m 
      JOIN companies c ON m.company_id = c.id 
      ORDER BY c.company_code, m.module_name;"
```

---

## 4. Common Test Scenarios

### Scenario A: Create and Manage a New Company

1. **Master Action:**
   - Login as master
   - Click "Create Company"
   - Fill form:
     - Code: `STARTUP-001`
     - Name: `StartUp Inc`
     - Admin Username: `startup_admin`
     - Admin Password: `startup123`
     - Employee Limit: `20`
     - Enable: Attendance, Employee Management
   - Click "Create Company"

2. **Company Admin Action:**
   - Navigate to company login
   - Enter: code=STARTUP-001, user=startup_admin, pass=startup123
   - See dashboard showing:
     - 0/20 employees
     - Attendance (enabled), Employee Management (enabled)
     - Inventory, Payroll, Leave (disabled)
   - Click "Enable" on Inventory
   - Verify it's now enabled

### Scenario B: Verify Employee Limit

1. Master creates company with `employee_limit: 5`
2. Company admin tries to add 6th employee
   - **Expected:** Error "Employee limit reached" (if validation implemented)

### Scenario C: Module Access Control

1. Company admin disables "Payroll" module
2. Try to access `/payroll` endpoint
   - **Expected:** Module returns modules list with `payroll: {is_enabled: false}`
   - Frontend should not show payroll in navigation (if implemented)

---

## 5. Troubleshooting

### 401 Unauthorized Error

**Cause:** Missing or invalid JWT token
**Solution:**
- Check token is passed in `Authorization: Bearer <TOKEN>` header
- Verify token hasn't expired (tokens expire after 7 days)
- Re-login to get fresh token

### 403 Forbidden Error

**Cause:** Wrong role for endpoint
**Solution:**
- `/master/*` endpoints require `role: master`
- `/company/*` endpoints require `role: company_admin`
- Ensure you're using the correct token type

### Company Not Found

**Cause:** Wrong company code or company doesn't exist
**Solution:**
- Verify company code from masters dashboard
- Check spelling of company code (case-sensitive)

### Module Toggle Not Working

**Cause:** Company token expired or incorrect token
**Solution:**
- Re-login as company admin to get fresh token
- Verify module name spelling matches database

---

## 6. Test Data Reference

### Existing Test Account

```json
{
  "role": "master",
  "username": "master",
  "password": "master123"
}
```

### Pre-created Company

```json
{
  "code": "ACME-001",
  "company_name": "ACME Corporation",
  "admin_username": "admin",
  "admin_password": "admin123",
  "employee_limit": 50,
  "modules": ["attendance", "inventory", "payroll", "employee_management"]
}
```

---

## 7. Port Reference

| Service | Port | URL |
|---------|------|-----|
| Backend | 3000 | http://localhost:3000 |
| Frontend | 5174 | http://localhost:5174 |
| PostgreSQL | 5432 | localhost:5432 |
| Health Check | 3000 | http://localhost:3000/health |

---

## 8. Next Tests to Implement

- [ ] Employee creation within company context
- [ ] Module-based API access control (403 for disabled modules)
- [ ] Employee limit validation
- [ ] Company activation/deactivation enforcement
- [ ] Company module default assignment
- [ ] Module enable/disable cascade effects

---

## Need Help?

1. **Check backend logs:** Terminal where `npm run dev` is running
2. **Check frontend console:** Browser DevTools (F12)
3. **Verify database:** Use psql commands above
4. **Check JWT tokens:** Decode at https://jwt.io
