# Company Status Management

## Overview
The Master user can activate or deactivate companies to control their access to the system. This feature provides a quick way to enable/disable a company without deleting it.

## Features

### 1. Quick Status Toggle
- **Location**: Company Details page → Details & Modules tab
- **Button**: 
  - 🟢 **Activate Company** (green) - when company is inactive
  - 🔴 **Deactivate Company** (red) - when company is active
- **Confirmation**: Requires confirmation before changing status
- **Effect**: Immediate status update with visual feedback

### 2. Status Visibility
- **Company List**: Shows 🟢 Active or 🔴 Inactive badge
- **Company Details**: Displays current status with color coding
- **Edit Form**: Includes checkbox for status when editing company information

## How to Use

### Activating a Company
1. Navigate to Master Dashboard
2. Click on a company or go to Company Details
3. In the "Details & Modules" tab, click **🟢 Activate Company** button
4. Confirm the action in the dialog
5. Company status changes to Active

### Deactivating a Company
1. Navigate to Master Dashboard
2. Click on a company or go to Company Details
3. In the "Details & Modules" tab, click **🔴 Deactivate Company** button
4. Confirm the action in the dialog (note: this will prevent company access)
5. Company status changes to Inactive

### Filtering by Status
- On Master Dashboard, use the status filter dropdown:
  - **All Companies** - shows all companies
  - **Active** - shows only active companies
  - **Inactive** - shows only inactive companies

## API Endpoint

### Update Company Status
**Endpoint**: `PUT /master/companies/:companyId`

**Headers**:
```
Authorization: Bearer <master-jwt-token>
```

**Request Body**:
```json
{
  "is_active": true
}
```

**Response**:
```json
{
  "status": "success",
  "message": "Company updated successfully",
  "data": {
    "id": 1,
    "company_code": "AIQ001",
    "name": "AIQ Technologies",
    "is_active": true,
    "updated_at": "2025-01-16T10:30:00.000Z"
  }
}
```

## Database Schema

### Companies Table
```sql
CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  company_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  contact_number VARCHAR(50),
  employee_limit INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Security Considerations

1. **Authentication**: Only Master users can update company status
2. **Confirmation Required**: Prevents accidental deactivation
3. **Clear Warning**: Deactivation message warns about access impact
4. **Audit Trail**: Status changes are logged with timestamps

## UI Components

### Status Toggle Button
```jsx
<button 
  onClick={handleToggleStatus} 
  className="btn"
  style={{ 
    backgroundColor: company.is_active ? '#e74c3c' : '#27ae60', 
    color: 'white' 
  }}
  disabled={loading}
>
  {company.is_active ? '🔴 Deactivate Company' : '🟢 Activate Company'}
</button>
```

### Handle Toggle Function
```javascript
const handleToggleStatus = async () => {
  const newStatus = !company.is_active;
  const confirmMessage = newStatus 
    ? `Are you sure you want to ACTIVATE ${company.name}?`
    : `Are you sure you want to DEACTIVATE ${company.name}? This will prevent the company from accessing the system.`;
  
  if (!confirm(confirmMessage)) return;

  try {
    const response = await client.put(`/master/companies/${id}`, { is_active: newStatus });
    if (response.data.status === 'success') {
      setSuccess(`✅ Company ${newStatus ? 'activated' : 'deactivated'} successfully!`);
      await fetchCompanyDetails();
    }
  } catch (err) {
    setError(err.response?.data?.message || 'Failed to update company status');
  }
};
```

## Impact Assessment

### When Company is Deactivated
- ❌ Company admin cannot log in
- ❌ Company employees cannot access the system
- ❌ Company data is preserved (not deleted)
- ✅ Master can still view company details
- ✅ Master can reactivate at any time

### When Company is Activated
- ✅ Company admin can log in
- ✅ Company employees can access their modules
- ✅ All company features become available
- ✅ License validation applies (if implemented)

## Related Features
- [License Management](./LICENSE_MANAGEMENT.md)
- [Company Management](./COMPANY_MANAGEMENT.md)
- [Password Management](./PASSWORD_MANAGEMENT_GUIDE.md)

## Future Enhancements
- [ ] Automatic deactivation when license expires
- [ ] Scheduled activation/deactivation
- [ ] Reason tracking for status changes
- [ ] Email notification to company admin on status change
- [ ] Bulk status updates for multiple companies
- [ ] Status change history/audit log
