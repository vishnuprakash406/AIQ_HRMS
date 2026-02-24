# Troubleshooting Guide - Multi-Tenant HRMS

## Common Issues & Solutions

---

## 🔴 Backend Issues

### Issue: "Port 3000 already in use"

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**

Option 1: Kill the process using port 3000
```bash
# macOS/Linux
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Then restart
cd backend && npm run dev
```

Option 2: Use a different port
```bash
PORT=3001 npm run dev
```

---

### Issue: "Cannot find module" errors

**Symptoms:**
```
Error: Cannot find module 'bcryptjs'
Error: Cannot find module 'jsonwebtoken'
```

**Solutions:**

1. Install dependencies
```bash
cd backend
npm install
```

2. Verify package.json has required dependencies
```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "express": "^4.19.2",
    "pg": "^8.11.5"
  }
}
```

---

### Issue: "Database connection refused"

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions:**

1. Verify PostgreSQL is running
```bash
# Check if PostgreSQL service is running
brew services list | grep postgresql  # macOS
sudo systemctl status postgresql      # Linux

# Start if not running
brew services start postgresql        # macOS
sudo systemctl start postgresql       # Linux
```

2. Verify database credentials
```bash
# Test connection
PGPASSWORD='TheAIQ!@2026' psql -h localhost -U theaiq -d hrms -c "SELECT 1"
```

3. Check connection string in env
```bash
# Verify DATABASE_URL format
DATABASE_URL=postgresql://theaiq:TheAIQ!@2026@localhost:5432/hrms
```

---

### Issue: "JWT_SECRET not defined"

**Symptoms:**
```
Error: Cannot use undefined JWT_SECRET
```

**Solutions:**

1. Set environment variable
```bash
# In .env file
JWT_SECRET=your-super-secret-key-here-at-least-32-chars

# Or export before running
export JWT_SECRET=your-secret-key
npm run dev
```

2. Or use default (development only)
```javascript
// In controller:
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key-change-in-production';
```

---

### Issue: "Master login fails - Invalid username or password"

**Symptoms:**
```json
{
  "status": "error",
  "message": "Invalid username or password"
}
```

**Root Causes & Solutions:**

1. **Master not in database**
   ```bash
   # Check if master exists
   PGPASSWORD='TheAIQ!@2026' psql -h localhost -U theaiq -d hrms \
     -c "SELECT * FROM masters WHERE username='master';"
   
   # If empty, insert one:
   # Generate password hash first
   cd backend && node -e "require('bcryptjs').hash('master123', 10).then(h => console.log(h))"
   
   # Copy the hash output and insert:
   PGPASSWORD='TheAIQ!@2026' psql -h localhost -U theaiq -d hrms \
     -c "INSERT INTO masters (username, password_hash, email) VALUES ('master', '\$2a\$10\$COPIED_HASH_HERE', 'master@aiq.com');"
   ```

2. **Password hash incorrect**
   ```bash
   # Update with correct hash
   HASH=$(cd backend && node -e "require('bcryptjs').hash('master123', 10).then(h => console.log(h))")
   PGPASSWORD='TheAIQ!@2026' psql -h localhost -U theaiq -d hrms \
     -c "UPDATE masters SET password_hash='$HASH' WHERE username='master';"
   ```

3. **Wrong password in request**
   - Verify exact password used when creating master
   - Case-sensitive

---

### Issue: "Company creation fails - Company code already exists"

**Symptoms:**
```json
{
  "status": "error",
  "message": "Company code or username already exists"
}
```

**Solutions:**

1. Use unique company code
```bash
# Check existing companies
PGPASSWORD='TheAIQ!@2026' psql -h localhost -U theaiq -d hrms \
  -c "SELECT company_code, name FROM companies;"

# Use a different code if exists
```

2. Or delete the company (for testing)
```bash
PGPASSWORD='TheAIQ!@2026' psql -h localhost -U theaiq -d hrms \
  -c "DELETE FROM companies WHERE company_code='ACME-001';"
```

---

### Issue: "Module toggle fails - Module not found"

**Symptoms:**
```json
{
  "status": "error",
  "message": "Module not found"
}
```

**Solutions:**

1. Verify module exists for company
```bash
# Check modules for company
PGPASSWORD='TheAIQ!@2026' psql -h localhost -U theaiq -d hrms \
  -c "SELECT c.company_code, m.module_name FROM company_modules m 
      JOIN companies c ON m.company_id = c.id 
      WHERE c.company_code='ACME-001';"
```

2. Module name must match exactly
   - Use lowercase with underscores: `inventory`, `employee_management`
   - Not: `Inventory`, `INVENTORY`, `inventory_module`

---

### Issue: "401 Unauthorized - Invalid token"

**Symptoms:**
```json
{
  "status": "error",
  "message": "Invalid or expired token"
}
```

**Causes & Solutions:**

1. **Token expired**
   - Tokens valid for 7 days
   - Re-login to get fresh token

2. **Wrong token secret**
   ```bash
   # Verify JWT_SECRET matches between login and subsequent requests
   echo $JWT_SECRET  # Should be same value everywhere
   ```

3. **Token not in correct header format**
   ```
   ❌ Wrong: Authorization: <TOKEN>
   ✅ Correct: Authorization: Bearer <TOKEN>
   ```

4. **Token copied with extra spaces**
   - Copy token carefully, verify no leading/trailing spaces

---

### Issue: "403 Forbidden - Only masters can access"

**Symptoms:**
```json
{
  "status": "error",
  "message": "Only masters can access this endpoint"
}
```

**Solutions:**

1. Using company token on master endpoint
   - Master endpoints: Use master token (role: 'master')
   - Company endpoints: Use company token (role: 'company_admin')
   - Employee endpoints: Use employee token (role: 'employee')

2. Verify token is correct
   ```bash
   # Decode token at https://jwt.io
   # Check role field matches endpoint requirement
   ```

---

## 🔴 Frontend Issues

### Issue: "Cannot navigate to master dashboard"

**Symptoms:**
- Click master login, page remains on login
- No redirect after successful login
- Error in console: "Cannot read property 'token' of undefined"

**Solutions:**

1. Check browser console (F12) for errors
   - Look for network errors
   - Check if API returns expected response

2. Verify localStorage is working
   ```javascript
   // In browser console:
   localStorage.setItem('test', 'value');
   localStorage.getItem('test');  // Should return 'value'
   ```

3. Verify API returns correct format
   ```bash
   curl -X POST http://localhost:3000/api/v1/master/login \
     -H "Content-Type: application/json" \
     -d '{"username":"master","password":"master123"}' | python3 -m json.tool
   
   # Should return:
   # {
   #   "status": "success",
   #   "token": "eyJ...",
   #   "role": "master"
   # }
   ```

---

### Issue: "CORS error - blocked by CORS policy"

**Symptoms:**
```
Access to XMLHttpRequest at 'http://localhost:3000/...' 
blocked by CORS policy
```

**Solutions:**

1. Verify backend has CORS enabled
```javascript
// In app.js
app.use(cors({ 
  origin: 'http://localhost:5174',  // Frontend URL
  credentials: true 
}));
```

2. Restart backend after CORS changes
```bash
cd backend && npm run dev
```

3. Clear browser cache
```
Ctrl+Shift+Delete (Windows/Linux)
Cmd+Shift+Delete (macOS)
```

---

### Issue: "Form won't submit - all fields show red"

**Symptoms:**
- Form fields have red border
- Cannot submit form
- No error message

**Solutions:**

1. Ensure all required fields filled
   - Company Code (for company login)
   - Username
   - Password
   - Name (for create company form)

2. Check browser console for validation errors

3. Try submitting through API directly
```bash
curl -X POST http://localhost:3000/api/v1/company/login \
  -H "Content-Type: application/json" \
  -d '{"company_code":"ACME-001","username":"admin","password":"admin123"}'
```

---

### Issue: "Module toggle button not working"

**Symptoms:**
- Click toggle button
- Button shows "Updating..."
- Never finishes, or fails silently

**Solutions:**

1. Check browser console (F12) for network errors
2. Verify company token is stored
   ```javascript
   // In browser console:
   localStorage.getItem('companyToken');  // Should return token
   ```

3. Verify module name is correct
   - Check exact spelling from modules list
   - Must be lowercase with underscores

4. Try API directly
```bash
TOKEN="your_company_token_here"
curl -X PUT http://localhost:3000/api/v1/company/modules/attendance \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_enabled": false}'
```

---

### Issue: "Frontend running on wrong port (5174 instead of 5173)"

**Symptoms:**
- Terminal shows: "Port 5173 is in use, trying another one..."
- Frontend available on http://localhost:5174

**Solutions:**

Option 1: Update frontend URL everywhere
```
Replace: http://localhost:5173
With: http://localhost:5174
```

Option 2: Kill process using 5173
```bash
lsof -i :5173 | grep LISTEN | awk '{print $2}' | xargs kill -9
npm run dev  # Restart, should use 5173
```

---

## 🟡 Database Issues

### Issue: "Migration failed - table already exists"

**Symptoms:**
```
ERROR: relation "masters" already exists
```

**Solutions:**

1. Check if table exists
```bash
PGPASSWORD='TheAIQ!@2026' psql -h localhost -U theaiq -d hrms \
  -c "\dt masters"  # Should list table details
```

2. If exists and you want fresh start:
```bash
# DROP tables (CAREFUL - deletes data)
PGPASSWORD='TheAIQ!@2026' psql -h localhost -U theaiq -d hrms << EOF
DROP TABLE IF EXISTS company_modules CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS masters CASCADE;
EOF

# Then re-run migration
PGPASSWORD='TheAIQ!@2026' psql -h localhost -U theaiq -d hrms \
  -f backend/docs/migration_multi_tenant.sql
```

---

### Issue: "Foreign key constraint violation"

**Symptoms:**
```
ERROR: insert or update on table "company_modules" violates foreign key constraint
```

**Cause:**
- Trying to insert company_id that doesn't exist
- Company was deleted but modules still exist

**Solutions:**

1. Verify company exists before adding modules
```bash
PGPASSWORD='TheAIQ!@2026' psql -h localhost -U theaiq -d hrms \
  -c "SELECT id FROM companies WHERE company_code='ACME-001';"
```

2. Delete orphaned modules
```bash
PGPASSWORD='TheAIQ!@2026' psql -h localhost -U theaiq -d hrms \
  -c "DELETE FROM company_modules WHERE company_id NOT IN (SELECT id FROM companies);"
```

---

### Issue: "Duplicate key value violates unique constraint"

**Symptoms:**
```
ERROR: duplicate key value violates unique constraint "masters_username_key"
```

**Solutions:**

1. Use unique values
   - Master username must be unique
   - Company code must be unique
   - Company username must be unique

2. Check what exists
```bash
PGPASSWORD='TheAIQ!@2026' psql -h localhost -U theaiq -d hrms \
  -c "SELECT username FROM masters;"
```

3. Use different username if duplicate
   - Instead of 'master', try 'master1', 'master_admin'
   - Or delete old record first

---

## 🟡 Network Issues

### Issue: "Backend not responding - ERR_CONNECTION_TIMED_OUT"

**Symptoms:**
- Frontend tries to call API
- Request hangs for 30+ seconds
- Then fails with timeout

**Solutions:**

1. Verify backend is running
```bash
# In another terminal
curl http://localhost:3000/health

# Should respond with: {"status":"ok"}
```

2. Check if port 3000 is actually listening
```bash
lsof -i :3000 | grep LISTEN
# Should show node process
```

3. Check backend logs for errors
   - Look at terminal running `npm run dev`
   - Look for "Error" or "Exception" messages

4. Restart backend
```bash
# Stop current backend (Ctrl+C in terminal)
# Kill if stuck:
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Restart
cd backend && npm run dev
```

---

### Issue: "API returns "Not Found" - 404"

**Symptoms:**
```json
{
  "message": "Not Found"
}
```

**Causes & Solutions:**

1. Wrong URL path
   - Check: `/api/v1/master/companies` (not `/master/companies`)
   - Check: No typos in endpoint

2. Routes not registered
   - Verify routes imported in `routes/index.js`
   - Verify backend restarted after route changes

3. Wrong HTTP method
   - POST for `/companies` (create)
   - GET for `/companies` (list)
   - PUT for `/companies/:id` (update)

---

## 🛠️ Debugging Techniques

### Check Backend Health
```bash
curl -X GET http://localhost:3000/health -v
```

### Test Master Login
```bash
curl -X POST http://localhost:3000/api/v1/master/login \
  -H "Content-Type: application/json" \
  -H "User-Agent: curl" \
  -d '{"username":"master","password":"master123"}' \
  -v
```

### Decode JWT Token
```bash
# Copy token and paste at https://jwt.io
# Or use command line:
echo "eyJhbGc..." | jq -R 'split(".")[1] | @base64d | fromjson'
```

### Check Database Connection
```bash
PGPASSWORD='TheAIQ!@2026' psql -h localhost -U theaiq -d hrms \
  -c "SELECT version();"
```

### Monitor Backend Logs
```bash
# In terminal running npm run dev:
# Look for:
# - "Error" messages
# - "listening on port 3000"
# - Request logs (if morgan configured)
```

### Enable Verbose Logging
```bash
# In backend code temporarily:
console.log('Request received:', req.method, req.path);
console.log('Body:', req.body);
console.log('Token:', req.headers.authorization);
```

---

## 📋 Verification Checklist

Before declaring system working:

- [ ] Backend starts without errors: `npm run dev` shows "listening on port 3000"
- [ ] Frontend starts: `npm run dev` shows "Local: http://localhost:5174"
- [ ] Database connection works: psql command succeeds
- [ ] Master account exists: Query returns user with username='master'
- [ ] Master login works: GET token with valid credentials
- [ ] Company exists: Query returns company with code='ACME-001'
- [ ] Company login works: GET token with valid company credentials
- [ ] Company modules exist: Query returns 4+ modules for company
- [ ] Toggle module works: PUT request updates is_enabled flag
- [ ] Frontend loads: Browser shows login pages without errors
- [ ] Master login page works: Can enter credentials and submit
- [ ] Company login page works: Can enter all 3 fields and submit

---

## 📞 Getting Help

1. **Check documentation**
   - [MULTITENANT_GUIDE.md](../MULTITENANT_GUIDE.md)
   - [QUICK_START.md](../QUICK_START.md)
   - [ARCHITECTURE.md](../ARCHITECTURE.md)

2. **Check logs**
   - Backend: Terminal where `npm run dev` is running
   - Frontend: Browser DevTools Console (F12)
   - Database: psql command output

3. **Test API directly**
   - Use curl commands from QUICK_START.md
   - Verify API works before debugging frontend

4. **Clear cache & restart**
   - Clear browser cache: Ctrl+Shift+Delete
   - Restart backend: Kill and `npm run dev`
   - Restart frontend: Kill and `npm run dev`

5. **Check token at jwt.io**
   - Decode JWT token
   - Verify role and expiration
   - Ensure not expired

---

## 🎯 Most Common Issues & Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| "Port 3000 in use" | `lsof -i :3000 \| grep LISTEN \| awk '{print $2}' \| xargs kill -9` |
| "Cannot find module" | `npm install` in backend dir |
| "DB connection refused" | Start PostgreSQL: `brew services start postgresql` |
| "Master login fails" | Verify master exists: `psql -c "SELECT * FROM masters;"` |
| "CORS error" | Restart backend, verify origin in cors() middleware |
| "Module not found" | Check exact module name: `_` not spaces, lowercase |
| "401 Unauthorized" | Re-login, get fresh token, verify "Bearer" prefix |
| "404 Not Found" | Check URL path, verify no typos, restart backend |

---

**Last Updated:** 2025-02-25
**Status:** Complete
