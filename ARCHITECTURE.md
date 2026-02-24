# Multi-Tenant HRMS Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + Vite)                      │
│                      http://localhost:5174                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Master Login    │  │ Company Login    │  │ Employee Login   │  │
│  │    /master-login │  │ /company-login   │  │    /login        │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  │
│           │                     │                     │            │
│           ▼                     ▼                     ▼            │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Master Dashboard │  │ Company Dashboard│  │ Employee Dash    │  │
│  │ - View Companies │  │ - View Info      │  │ - Attendance     │  │
│  │ - Create Company │  │ - Toggle Modules │  │ - Leave          │  │
│  │ - Manage Config  │  │ - View Modules   │  │ - Payroll        │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  │
│           │                     │                     │            │
│           └─────────────────────┼─────────────────────┘            │
│                                 │                                   │
│                         JWT Tokens + API Calls                      │
│                                 │                                   │
└─────────────────────────────────┼───────────────────────────────────┘
                                  │
                                  ▼
              ┌───────────────────────────────────────────────┐
              │       BACKEND (Express.js + Node.js)          │
              │          http://localhost:3000                │
              ├───────────────────────────────────────────────┤
              │                                               │
              │  ┌─────────────────────────────────────────┐ │
              │  │   Middleware (Authentication, Logging)  │ │
              │  │  - verifyMasterToken()                  │ │
              │  │  - verifyCompanyToken()                 │ │
              │  │  - authenticate()  [employees]          │ │
              │  └─────────────────────────────────────────┘ │
              │                                               │
              │  ┌─────────────────────────────────────────┐ │
              │  │     Router & Controllers                │ │
              │  │                                         │ │
              │  │  /api/v1/master                         │ │
              │  │  ├─ POST /login                         │ │
              │  │  ├─ POST /companies                     │ │
              │  │  ├─ GET /companies                      │ │
              │  │  ├─ GET /companies/:id                  │ │
              │  │  └─ PUT /companies/:id                  │ │
              │  │                                         │ │
              │  │  /api/v1/company                        │ │
              │  │  ├─ POST /login                         │ │
              │  │  ├─ GET /info                           │ │
              │  │  ├─ GET /modules                        │ │
              │  │  └─ PUT /modules/:name                  │ │
              │  │                                         │ │
              │  │  /api/v1/auth [employees]              │ │
              │  │  ├─ POST /login                         │ │
              │  │  ├─ GET /profile                        │ │
              │  │  └─ POST /logout                        │ │
              │  │                                         │ │
              │  │  /api/v1/attendance                     │ │
              │  │  /api/v1/inventory                      │ │
              │  │  /api/v1/payroll                        │ │
              │  │  ... (other modules)                    │ │
              │  │                                         │ │
              │  └─────────────────────────────────────────┘ │
              │                                               │
              └───────────────────┬───────────────────────────┘
                                  │ SQL Queries
                                  │
                                  ▼
              ┌───────────────────────────────────────────────┐
              │         PostgreSQL Database                   │
              │          hrms (Database)                      │
              ├───────────────────────────────────────────────┤
              │                                               │
              │  Multi-Tenant Tables:                         │
              │  ├─ masters                                   │
              │  │  ├─ id (UUID)                              │
              │  │  ├─ username (unique)                      │
              │  │  └─ password_hash                          │
              │  │                                            │
              │  ├─ companies                                 │
              │  │  ├─ id (UUID)                              │
              │  │  ├─ company_code (unique)                  │
              │  │  ├─ name                                   │
              │  │  ├─ username (unique)                      │
              │  │  ├─ password_hash                          │
              │  │  ├─ employee_limit                         │
              │  │  └─ is_active                              │
              │  │                                            │
              │  ├─ company_modules                           │
              │  │  ├─ company_id (FK)                        │
              │  │  ├─ module_name                            │
              │  │  └─ is_enabled                             │
              │  │                                            │
              │  ├─ users (modified)                          │
              │  │  ├─ id                                     │
              │  │  ├─ username                               │
              │  │  ├─ email                                  │
              │  │  ├─ company_id (FK) [NEW]                  │
              │  │  └─ role                                   │
              │  │                                            │
              │  ├─ attendance_logs                           │
              │  ├─ documents                                 │
              │  ├─ employee_profiles                         │
              │  └─ ... (other existing tables)               │
              │                                               │
              └───────────────────────────────────────────────┘
```

---

## Authentication Flow

### Master Login Flow
```
┌─────────────┐
│ Master User │
└──────┬──────┘
       │ 1. POST /api/v1/master/login
       │    { username, password }
       ▼
┌──────────────────────┐
│ Master Login Handler │
└─────────┬────────────┘
          │ 2. Query masters table
          │    WHERE username = ?
          ▼
┌──────────────────────┐
│ Password Verification│
│ bcrypt.compare()     │
└─────────┬────────────┘
          │ 3. Valid? Generate JWT
          │    { id, username, role: 'master' }
          ▼
┌──────────────────────┐
│ Return JWT Token     │
│ Token expires in 7d  │
└─────────┬────────────┘
          │ 4. Store in localStorage
          │    as 'masterToken'
          ▼
┌──────────────────────┐
│ Redirect Dashboard   │
│ /master-dashboard    │
└──────────────────────┘
```

### Company Login Flow
```
┌────────────────┐
│ Company Admin  │
└────────┬───────┘
         │ 1. POST /api/v1/company/login
         │    { company_code, username, password }
         ▼
┌────────────────────────────┐
│ Company Login Handler      │
└──────────┬─────────────────┘
           │ 2. Query companies table
           │    WHERE company_code = ?
           │      AND username = ?
           ▼
┌────────────────────────────┐
│ Verify Active & Password   │
└──────────┬─────────────────┘
           │ 3. If valid:
           │    - Query company_modules
           │    - Store modules in JWT
           │    - Generate token with:
           │      { id, company_code,
           │        company_name,
           │        role: 'company_admin' }
           ▼
┌────────────────────────────┐
│ Return JWT + Modules List  │
│ Token expires in 7d        │
└──────────┬─────────────────┘
           │ 4. Store in localStorage
           │    - companyToken
           │    - company_id
           │    - company_name
           │    - modules
           ▼
┌────────────────────────────┐
│ Redirect Company Dashboard │
│ /company-dashboard         │
└────────────────────────────┘
```

---

## Data Isolation Strategy

```
┌─────────────────────────────────────────────────────────────┐
│ HTTP Request                                                │
│ Authorization: Bearer <COMPANY_TOKEN>                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ JWT Token Verification                                      │
│ - Check role == 'company_admin'                            │
│ - Extract company_id from token payload                    │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│ Attach company_id to Request Context                        │
│ req.user.id = <company_id>                                 │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│ SQL Query Execution                                          │
│                                                              │
│ GET /api/v1/company/info                                    │
│                                                              │
│ SELECT * FROM companies                                     │
│ WHERE id = <req.user.id>  ◄─ Automatic company filtering   │
└──────────────────────────────────────────────────────────────┘
```

---

## Module Access Control

```
┌─────────────────────────────────────────────────────────────┐
│ Company Admin Request to Module                             │
│ GET /api/v1/inventory (or other enabled module)           │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│ Check Module Status in company_modules                      │
│                                                              │
│ SELECT is_enabled FROM company_modules                      │
│ WHERE company_id = <from_token>                             │
│   AND module_name = 'inventory'                             │
└────────────────┬────────────────────────────────────────────┘
                 │
         ┌───────┴───────┐
         │               │
    is_enabled=true     is_enabled=false
         │               │
         ▼               ▼
   ┌─────────┐      ┌──────────┐
   │ Execute │      │ Return   │
   │ Request │      │ 403 Error│
   └─────────┘      └──────────┘
```

---

## Company Creation Process

```
┌──────────────────┐
│ Master Dashboard │
│ Click "Create"   │
└────────┬─────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │ Company Creation Form                 │
    │ - Company Code                        │
    │ - Company Name                        │
    │ - Admin Username & Password           │
    │ - Employee Limit                      │
    │ - Select Default Modules (checkboxes) │
    └────────┬─────────────────────────────┘
             │
             ▼
    ┌──────────────────────────────────────┐
    │ POST /api/v1/master/companies         │
    │ Authorization: Bearer <MASTER_TOKEN>  │
    └────────┬─────────────────────────────┘
             │
             ▼
    ┌──────────────────────────────────────┐
    │ Start Transaction                     │
    └────────┬─────────────────────────────┘
             │
             ├─ 1. Hash company.password
             │
             ├─ 2. INSERT INTO companies
             │    { code, name, username,
             │      password_hash, limit }
             │
             ├─ 3. For each selected module:
             │    INSERT INTO company_modules
             │    { company_id, module_name,
             │      is_enabled: true }
             │
             └─ 4. COMMIT Transaction
                    │
                    ▼
         ┌──────────────────────┐
         │ Return Company + ID  │
         │ + Assigned Modules   │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ Update Dashboard UI  │
         │ Show new company     │
         │ in table             │
         └──────────────────────┘
```

---

## Token Structure & Validation

### Master Token
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "id": "6326b0f5-323e-41b8-a073-56ac9552ea20",
    "username": "master",
    "role": "master",
    "iat": 1771947004,
    "exp": 1772551804
  },
  "signature": "sQHnDdRJ8xEcFSHtY8MUW_TR4WA02KzJsvwwWgtM28Q"
}
```

### Company Token
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "id": "725f39c1-85ee-4fc4-9ccc-0ff74f1ced07",
    "company_code": "ACME-001",
    "company_name": "ACME Corporation",
    "role": "company_admin",
    "iat": 1771947054,
    "exp": 1772551854
  },
  "signature": "2hMnago4feObQy1Stw2swWxj-VqG2u1VBk0FkYLF6L4"
}
```

### Employee Token
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "id": "<user_id>",
    "email": "employee@company.com",
    "role": "employee",
    "iat": 1771947054,
    "exp": 1772551854
  },
  "signature": "<signature>"
}
```

---

## Database Relationships

```
┌─────────────────┐
│     masters     │
├─────────────────┤
│ id (PK)         │
│ username        │
│ password_hash   │
│ email           │
│ created_at      │
└─────────────────┘
        │
        │ (System Admin)
        │
        └──────────────────────────┐
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │       companies          │
                    ├──────────────────────────┤
                    │ id (PK)                  │
                    │ company_code (UNIQUE)    │
                    │ name                     │
                    │ username (UNIQUE)        │
                    │ password_hash            │
                    │ employee_limit           │
                    │ is_active                │
                    │ created_at, updated_at   │
                    └──────┬───────────────────┘
                           │
                ┌──────────┴──────────┐
                │                    │
                ▼                    ▼
    ┌──────────────────────┐  ┌──────────────────────┐
    │  company_modules     │  │      users           │
    ├──────────────────────┤  ├──────────────────────┤
    │ id (PK)              │  │ id (PK)              │
    │ company_id (FK)      │  │ username             │
    │ module_name          │  │ email                │
    │ is_enabled           │  │ password_hash        │
    │ created_at           │  │ company_id (FK) [NEW]│
    │ UNIQUE(company_id,   │  │ role                 │
    │   module_name)       │  │ created_at           │
    └──────────────────────┘  └──────────────────────┘
                                      │
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
        ┌──────────────────┐ ┌───────────────────┐ ┌─────────────────┐
        │ attendance_logs  │ │employee_profiles  │ │   documents     │
        ├──────────────────┤ ├───────────────────┤ ├─────────────────┤
        │ id               │ │ id                │ │ id              │
        │ user_id (FK)     │ │ user_id (FK)      │ │ user_id (FK)    │
        │ check_in_time    │ │ designation       │ │ name            │
        │ check_out_time   │ │ phone             │ │ type            │
        │ mode             │ │ address           │ │ file_path       │
        │ location         │ │ personal_details  │ │ uploaded_at     │
        └──────────────────┘ └───────────────────┘ └─────────────────┘
```

---

## Request Flow Examples

### Example 1: Create Company
```
Browser                          Backend              Database
   │                               │                     │
   ├─ POST /api/v1/master/companies│                    │
   │  + Bearer <MASTER_TOKEN>      │                    │
   │  + { company_code, name, ... }│                    │
   │────────────────────────────────>                   │
   │                               │                    │
   │                               ├─ Verify Master Token
   │                               │  (role == 'master')
   │                               │
   │                               ├─ Hash Password
   │                               │
   │                               ├─ BEGIN TRANSACTION
   │                               ├────────────────────>
   │                               │  INSERT companies
   │                               │<────────────────────
   │                               │  (get company_id)
   │                               │
   │                               ├────────────────────>
   │                               │ INSERT company_modules
   │                               │ (for each selected)
   │                               │<────────────────────
   │                               │
   │                               ├─ COMMIT TRANSACTION
   │                               │<────────────────────
   │                               │
   │<────────────────────────────────
   │  201 { company_code, modules }
   │
```

### Example 2: Toggle Module
```
Browser                          Backend              Database
   │                               │                    │
   ├─ PUT /api/v1/company/modules / │                   │
   │      attendance               │                    │
   │  + Bearer <COMPANY_TOKEN>     │                    │
   │  + { is_enabled: false }      │                    │
   │────────────────────────────────>                   │
   │                               │                    │
   │                               ├─ Verify Company Token
   │                               │  Extract company_id
   │                               │
   │                               ├────────────────────>
   │                               │ UPDATE company_modules
   │                               │ WHERE company_id = ?
   │                               │   AND module_name = ?
   │                               │ SET is_enabled = false
   │                               │<────────────────────
   │                               │
   │<────────────────────────────────
   │  200 { module_name, is_enabled }
   │
```

---

## Deployment Checklist

- [ ] **Environment Variables**
  - JWT_SECRET (secure random string)
  - DATABASE_URL (production DB)
  - CORS_ORIGIN (production domain)

- [ ] **Database**
  - Run migration scripts
  - Create backups
  - Set up replication

- [ ] **Security**
  - Enable HTTPS/SSL
  - Rate limiting on auth endpoints
  - CORS configuration
  - SQL injection prevention (parameterized queries ✓)
  - Password strength requirements

- [ ] **Monitoring**
  - Error logging (Sentry, DataDog, etc.)
  - Performance monitoring
  - Database query monitoring
  - Access logs for master actions

- [ ] **Testing**
  - Unit tests for controllers
  - Integration tests for API flows
  - Load testing (concurrent companies)
  - Security audit

---

## Performance Considerations

### Indexing Strategy
```sql
-- Critical indexes created:
CREATE INDEX idx_companies_company_code ON companies(company_code);
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_company_modules ON company_modules(company_id);
```

### Query Optimization
- Modules loaded with company info (single JOIN)
- Employee count uses COUNT(*) with company_id filter
- JWT tokens reduce database lookups per request

---

## Disaster Recovery

### Backup Strategy
- Daily PostgreSQL backups
- Point-in-time recovery to last 7 days
- Master credentials in secure vault

### Failover Plan
- Read replica for high availability
- Connection pooling with max 10 connections
- Automatic reconnection on pool error
