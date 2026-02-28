import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles.css';

export default function CompanyDashboard() {
  const [companyInfo, setCompanyInfo] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchFormData, setBranchFormData] = useState({ name: '', employee_limit: 0 });
  const [savingBranch, setSavingBranch] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [stats, setStats] = useState({
    employees: 0,
    leaves: 0,
    inventory: 0,
    payslips: 0,
    leavePlans: 0
  });
  const [branchInfo, setBranchInfo] = useState(null);
  const [branchEmployees, setBranchEmployees] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showModuleAccessModal, setShowModuleAccessModal] = useState(false);
  const [selectedBranchForModules, setSelectedBranchForModules] = useState(null);
  const [branchModules, setBranchModules] = useState([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const navigate = useNavigate();

  const token = localStorage.getItem('companyToken');
  const companyName = localStorage.getItem('company_name');
  const userRole = localStorage.getItem('userRole');

  useEffect(() => {
    if (!token) {
      navigate('/company-login');
      return;
    }
    if (userRole === 'branch_manager') {
      navigate('/manager-dashboard');
      return;
    }
    fetchCompanyInfo();
    fetchStats();
  }, [token, navigate, userRole]);

  const fetchStats = async () => {
    try {
      const [empRes, leavRes, invRes, payRes, planRes] = await Promise.all([
        fetch('http://localhost:3000/api/v1/company/employees', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json()).catch(() => ({ data: { employees: [] } })),
        
        fetch('http://localhost:3000/api/v1/leave/all', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json()).catch(() => ({ leaves: [] })),
        
        fetch('http://localhost:3000/api/v1/inventory', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json()).catch(() => ({ items: [] })),
        
        fetch('http://localhost:3000/api/v1/payroll/payslips/all', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json()).catch(() => ({ payslips: [] })),
        
        fetch('http://localhost:3000/api/v1/leave-plan/types', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json()).catch(() => ({ leaveTypes: [] }))
      ]);

      setStats({
        employees: (empRes.data?.employees || empRes.employees || []).length,
        leaves: (leavRes.leaves || []).filter(l => l.status === 'pending').length,
        inventory: (invRes.items || []).length,
        payslips: (payRes.payslips || []).length,
        leavePlans: (planRes.leaveTypes || []).length
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchCompanyInfo = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/v1/company/info', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch company info');
      }

      const data = await response.json();
      setCompanyInfo(data.data);
      setBranches(data.data.branches || []);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      console.error(err);
      setLoading(false);
    }
  };

  const fetchBranchSummary = async () => {
    try {
      setLoading(true);
      const branchId = localStorage.getItem('branch_id');

      const branchesResponse = await fetch('http://localhost:3000/api/v1/company/branches', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!branchesResponse.ok) {
        throw new Error('Failed to fetch branch info');
      }

      const branchesData = await branchesResponse.json();
      const currentBranch = (branchesData.branches || [])[0] || null;
      setBranchInfo(currentBranch);
      setBranches(branchesData.branches || []);

      if (branchId) {
        // Fetch employees
        const employeesResponse = await fetch(`http://localhost:3000/api/v1/company/branches/${branchId}/employees`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!employeesResponse.ok) {
          throw new Error('Failed to fetch branch employees');
        }

        const employeesData = await employeesResponse.json();
        setBranchEmployees(employeesData.employees || []);

        // Fetch branch module access
        try {
          const modulesResponse = await fetch(`http://localhost:3000/api/v1/company/branches/${branchId}/modules`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (modulesResponse.ok) {
            const modulesData = await modulesResponse.json();
            setBranchModules(modulesData.modules || []);
          }
        } catch (moduleErr) {
          console.error('Failed to fetch module access:', moduleErr);
        }
      }

      setLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to load branch dashboard');
      console.error(err);
      setLoading(false);
    }
  };

  const openBranchModal = (branch = null) => {
    if (branch) {
      setEditingBranch(branch);
      setBranchFormData({ name: branch.name, location: branch.location || '', employee_limit: branch.employee_limit });
    } else {
      setEditingBranch(null);
      setBranchFormData({ name: '', location: '', employee_limit: 0 });
    }
    setShowBranchModal(true);
  };

  const closeBranchModal = () => {
    setShowBranchModal(false);
    setEditingBranch(null);
    setBranchFormData({ name: '', location: '', employee_limit: 0 });
  };

  const handleBranchFormChange = (e) => {
    const { name, value } = e.target;
    setBranchFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveBranch = async (e) => {
    e.preventDefault();
    
    if (!branchFormData.name.trim()) {
      alert('Branch name is required');
      return;
    }

    const employee_limit = parseInt(branchFormData.employee_limit, 10) || 0;

    if (employee_limit <= 0) {
      alert('Employee limit must be greater than 0');
      return;
    }

    setSavingBranch(true);
    try {
      const url = editingBranch
        ? `http://localhost:3000/api/v1/company/branches/${editingBranch.id}`
        : 'http://localhost:3000/api/v1/company/branches';

      const method = editingBranch ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...branchFormData,
          employee_limit
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save branch');
      }

      const data = await response.json();
      if (editingBranch) {
        setBranches(branches.map(b => b.id === editingBranch.id ? data.branch : b));
      } else {
        setBranches([...branches, data.branch]);
      }
      closeBranchModal();
      // Refresh company info to update branch list
      await fetchCompanyInfo();
      alert(editingBranch ? 'Branch updated successfully' : 'Branch created successfully');
    } catch (err) {
      alert(`Error: ${err.message}`);
      console.error(err);
    } finally {
      setSavingBranch(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/v1/company/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setPasswordSuccess('✅ Password changed successfully!');
        setShowPasswordModal(false);
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setTimeout(() => setPasswordSuccess(''), 3000);
      } else {
        setPasswordError(data.message || 'Failed to change password');
      }
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('companyToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('company_id');
    localStorage.removeItem('company_name');
    localStorage.removeItem('modules');
    navigate('/company-login');
  };

  const openModuleAccessModal = async (branch) => {
    setSelectedBranchForModules(branch);
    setShowModuleAccessModal(true);
    setLoadingModules(true);
    
    // Define all available modules
    const allModules = [
      { module_name: 'Employees', icon: '👥' },
      { module_name: 'Attendance', icon: '📅' },
      { module_name: 'Leave', icon: '🏖️' },
      { module_name: 'Inventory', icon: '📦' },
      { module_name: 'Payroll', icon: '💰' },
      { module_name: 'Documents', icon: '📄' },
      { module_name: 'Onboarding', icon: '👋' },
      { module_name: 'Support', icon: '🎫' },
      { module_name: 'LeavePlan', icon: '📋' }
    ];
    
    try {
      const response = await fetch(`http://localhost:3000/api/v1/company/branches/${branch.id}/modules`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      let existingModules = [];
      if (response.ok) {
        const data = await response.json();
        existingModules = data.modules || [];
      }

      // Create a map of existing module permissions
      const moduleMap = {};
      existingModules.forEach(mod => {
        moduleMap[mod.module_name] = mod;
      });

      // Merge with all modules
      const mergedModules = allModules.map(mod => ({
        module_name: mod.module_name,
        icon: mod.icon,
        can_view: moduleMap[mod.module_name]?.can_view || false,
        can_edit: moduleMap[mod.module_name]?.can_edit || false,
        can_delete: moduleMap[mod.module_name]?.can_delete || false
      }));

      setBranchModules(mergedModules);
    } catch (err) {
      console.error('Error fetching branch modules:', err);
      // Initialize with all modules and no permissions
      const defaultModules = allModules.map(mod => ({
        module_name: mod.module_name,
        icon: mod.icon,
        can_view: false,
        can_edit: false,
        can_delete: false
      }));
      setBranchModules(defaultModules);
    } finally {
      setLoadingModules(false);
    }
  };

  const closeModuleAccessModal = () => {
    setShowModuleAccessModal(false);
    setSelectedBranchForModules(null);
    setBranchModules([]);
  };

  const handleModulePermissionChange = (moduleName, permission) => {
    setBranchModules(prev => 
      prev.map(module => 
        module.module_name === moduleName
          ? { ...module, [permission]: !module[permission] }
          : module
      )
    );
  };

  const handleSaveModuleAccess = async () => {
    if (!selectedBranchForModules) return;

    try {
      const response = await fetch(`http://localhost:3000/api/v1/company/branches/${selectedBranchForModules.id}/modules`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ modules: branchModules })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save module access');
      }

      alert('✅ Module access updated successfully');
      closeModuleAccessModal();
    } catch (err) {
      alert(`Error: ${err.message}`);
      console.error(err);
    }
  };

  if (loading) {
    return <div className="loading">Loading company dashboard...</div>;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h1>🏢 Company Dashboard</h1>
          <p style={{ color: 'rgba(255,255,255,0.9)', margin: '5px 0 0 0' }}>
            {companyName}
          </p>
          {userRole !== 'branch_manager' && (
            <div style={tabStyles.tabs}>
              <button
                style={{ ...tabStyles.tab, ...(activeTab === 'dashboard' ? tabStyles.activeTab : {}) }}
                onClick={() => setActiveTab('dashboard')}
              >
                📊 Dashboard
              </button>
              <button
                style={{ ...tabStyles.tab, ...(activeTab === 'company' ? tabStyles.activeTab : {}) }}
                onClick={() => setActiveTab('company')}
              >
                🏢 Company Details
              </button>
              <button
                style={{ ...tabStyles.tab, ...(activeTab === 'branches' ? tabStyles.activeTab : {}) }}
                onClick={() => setActiveTab('branches')}
              >
                🌿 Branches ({branches.length})
              </button>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {userRole !== 'branch_manager' && (
            <button
              onClick={() => setShowPasswordModal(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#8e44ad',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              🔑 Change Password
            </button>
          )}
          <button onClick={handleLogout} className="logout-btn">🚪 Logout</button>
        </div>
      </header>

      <main className="dashboard-content">
        {error && <div className="error-message">⚠️ {error}</div>}
        {userRole === 'branch_manager' ? (
          <div style={{ display: 'grid', gap: '20px' }}>
            <div style={{
              padding: '20px',
              backgroundColor: '#fff',
              borderRadius: '10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}>
              <h2 style={{ marginTop: 0 }}>🌿 Branch Dashboard</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                <div>
                  <div style={{ color: '#666', fontSize: '12px' }}>Branch</div>
                  <div style={{ fontWeight: 'bold' }}>{branchInfo?.name || localStorage.getItem('branch_name') || 'Branch'}</div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: '12px' }}>Employees</div>
                  <div style={{ fontWeight: 'bold' }}>{branchEmployees.length}</div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: '12px' }}>Employee Limit</div>
                  <div style={{ fontWeight: 'bold' }}>{branchInfo?.employee_limit ?? '-'}</div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: '12px' }}>Status</div>
                  <div style={{ fontWeight: 'bold' }}>{branchInfo?.is_active ? 'Active' : 'Inactive'}</div>
                </div>
              </div>
            </div>

            <div style={{
              padding: '20px',
              backgroundColor: '#fff',
              borderRadius: '10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}>
              <h3 style={{ marginTop: 0 }}>🔑 Your Module Access</h3>
              {branchModules.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                  {branchModules.map(module => {
                    const permissions = [];
                    if (module.can_view) permissions.push({ icon: '👁️', label: 'View', color: '#2196F3' });
                    if (module.can_edit) permissions.push({ icon: '✏️', label: 'Edit', color: '#ff9800' });
                    if (module.can_delete) permissions.push({ icon: '🗑️', label: 'Delete', color: '#f44336' });
                    
                    if (permissions.length === 0) return null;
                    
                    return (
                      <div key={module.module_name} style={{
                        padding: '14px',
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        fontSize: '13px'
                      }}>
                        <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>
                          {module.module_name}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', fontSize: '11px' }}>
                          {permissions.map((perm, idx) => (
                            <span key={idx} style={{
                              backgroundColor: `${perm.color}15`,
                              color: perm.color,
                              padding: '3px 8px',
                              borderRadius: '4px',
                              border: `1px solid ${perm.color}40`,
                              fontWeight: '500'
                            }}>
                              {perm.icon} {perm.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
                  No module access assigned. Contact your company admin.
                </p>
              )}
            </div>

            <div style={{
              padding: '20px',
              backgroundColor: '#fff',
              borderRadius: '10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}>
              <h3 style={{ marginTop: 0 }}>👥 Branch Employees</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '1px solid #eee' }}>
                      <th style={{ textAlign: 'left', padding: '10px' }}>Name</th>
                      <th style={{ textAlign: 'left', padding: '10px' }}>Designation</th>
                      <th style={{ textAlign: 'left', padding: '10px' }}>Email</th>
                      <th style={{ textAlign: 'left', padding: '10px' }}>Phone</th>
                      <th style={{ textAlign: 'left', padding: '10px' }}>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branchEmployees.map((emp) => (
                      <tr key={emp.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '10px' }}>{emp.fullName || emp.full_name || 'N/A'}</td>
                        <td style={{ padding: '10px' }}>{emp.designation || '-'}</td>
                        <td style={{ padding: '10px' }}>{emp.email || '-'}</td>
                        <td style={{ padding: '10px' }}>{emp.phone || '-'}</td>
                        <td style={{ padding: '10px' }}>{emp.role || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {branchEmployees.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#777' }}>
                  No employees found for this branch.
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {passwordSuccess && <div style={{
              padding: '12px 16px',
              backgroundColor: '#d4edda',
              border: '1px solid #c3e6cb',
              borderRadius: '4px',
              color: '#155724',
              marginBottom: '20px'
            }}>{passwordSuccess}</div>}

            {activeTab === 'dashboard' && (
          <>
            {/* Statistics Cards */}
            <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '20px',
          marginBottom: '30px'
        }}>
          <div style={{ padding: '20px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.employees}</div>
            <div style={{ fontSize: '14px', color: '#666' }}>Employees</div>
          </div>
          <div style={{ padding: '20px', backgroundColor: '#ede7f6', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.leavePlans}</div>
            <div style={{ fontSize: '14px', color: '#666' }}>Leave Types</div>
          </div>
          <div style={{ padding: '20px', backgroundColor: '#f3e5f5', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.leaves}</div>
            <div style={{ fontSize: '14px', color: '#666' }}>Pending Approvals</div>
          </div>
          <div style={{ padding: '20px', backgroundColor: '#e8f5e9', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.inventory}</div>
            <div style={{ fontSize: '14px', color: '#666' }}>Inventory Items</div>
          </div>
          <div style={{ padding: '20px', backgroundColor: '#fff3e0', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.payslips}</div>
            <div style={{ fontSize: '14px', color: '#666' }}>Payslips</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions" style={{ marginBottom: '30px' }}>
          <button 
            className="action-card"
            onClick={() => navigate('/admin/employees')}
          >
            <span className="action-icon">👥</span>
            <span className="action-title">Manage Employees</span>
            <span className="action-desc">Add, view, and manage employee profiles</span>
          </button>
          <button 
            className="action-card"
            onClick={() => navigate('/admin/employee-module-access')}
          >
            <span className="action-icon">🔑</span>
            <span className="action-title">Module Access</span>
            <span className="action-desc">Manage permissions for employees</span>
          </button>
          <button 
            className="action-card"
            onClick={() => navigate('/admin/leave-plan')}
          >
            <span className="action-icon">📋</span>
            <span className="action-title">Leave Plan</span>
            <span className="action-desc">Define leave types and quotas</span>
          </button>
          <button 
            className="action-card"
            onClick={() => navigate('/admin/leave')}
          >
            <span className="action-icon">✅</span>
            <span className="action-title">Leave Approvals</span>
            <span className="action-desc">Review employee leave requests</span>
          </button>
          <button 
            className="action-card"
            onClick={() => navigate('/admin/payroll')}
          >
            <span className="action-icon">💰</span>
            <span className="action-title">Payroll</span>
            <span className="action-desc">Upload and manage payslips</span>
          </button>
          <button 
            className="action-card"
            onClick={() => navigate('/admin/inventory')}
          >
            <span className="action-icon">📦</span>
            <span className="action-title">Inventory</span>
            <span className="action-desc">Manage inventory and stock</span>
          </button>
          <button 
            className="action-card"
            onClick={() => navigate('/admin/onboarding')}
          >
            <span className="action-icon">🚀</span>
            <span className="action-title">Onboarding</span>
            <span className="action-desc">Create tasks for new employees</span>
          </button>
          <button 
            className="action-card"
            onClick={() => navigate('/admin/attendance')}
          >
            <span className="action-icon">📍</span>
            <span className="action-title">Attendance</span>
            <span className="action-desc">View employee attendance records</span>
          </button>
          <button 
            className="action-card"
            onClick={() => navigate('/admin/geofencing')}
          >
            <span className="action-icon">🗺️</span>
            <span className="action-title">Geofencing</span>
            <span className="action-desc">Configure geofence zones</span>
          </button>
        </div>
          </>
        )}

        {activeTab === 'company' && (
          <div className="company-info-card" style={{ marginBottom: '30px' }}>
            <h2>📊 Company Information</h2>
            {companyInfo ? (
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">📌 Company Code:</span>
                  <span className="value">{companyInfo.company_code}</span>
                </div>
                <div className="info-item">
                  <span className="label">👥 Employees:</span>
                  <span className="value">
                    {companyInfo.employee_count} / {companyInfo.employee_limit}
                  </span>
                </div>
                <div className="info-item">
                  <span className="label">✓ Status:</span>
                  <span className={`status ${companyInfo.is_active ? 'active' : 'inactive'}`}>
                    {companyInfo.is_active ? '🟢 Active' : '🔴 Inactive'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="label">🌿 Branch Limit:</span>
                  <span className="value">{branches.length} / {companyInfo.branch_limit || 1}</span>
                </div>
              </div>
            ) : (
              <p>Company information not available.</p>
            )}
          </div>
        )}

        {activeTab === 'branches' && (
          <section className="branches-section">
            <div className="section-header">
              <h2>🏢 Branches</h2>
              {companyInfo && branches.length < (companyInfo.branch_limit || 1) && (
                <button
                  className="btn btn-success"
                  onClick={() => openBranchModal()}
                >
                  ➕ Add Branch
                </button>
              )}
            </div>

            {branches.length === 0 ? (
              <div className="empty-state">
                <p>📌 No branches yet. Company admin acts as a single branch.</p>
                {companyInfo && companyInfo.branch_limit > 0 && (
                  <button
                    className="btn btn-primary"
                    onClick={() => openBranchModal()}
                  >
                    Create First Branch
                  </button>
                )}
              </div>
            ) : (
              <div className="branches-table-container">
                <table className="branches-table">
                  <thead>
                    <tr>
                      <th>Branch Name</th>
                      <th>Location</th>
                      <th>Employee Limit</th>
                      <th>Current Employees</th>
                      <th>Utilisation</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branches.map((branch) => {
                      const utilisation = branch.employee_limit > 0
                        ? Math.round((branch.employee_count / branch.employee_limit) * 100)
                        : 0;
                      return (
                        <tr key={branch.id}>
                          <td className="branch-name">
                            <button 
                              onClick={() => navigate(`/admin/branch/${branch.id}`)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#2196F3',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                fontSize: 'inherit',
                                fontWeight: 'bold'
                              }}
                            >
                              {branch.name}
                            </button>
                          </td>
                          <td>
                            <span style={{ color: '#666', fontSize: '14px' }}>
                              📍 {branch.location || 'Not specified'}
                            </span>
                          </td>
                          <td>{branch.employee_limit}</td>
                          <td>{branch.employee_count || 0}</td>
                          <td>
                            <div className="utilisation-bar">
                              <div
                                className={`utilisation-fill ${utilisation >= 80 ? 'critical' : utilisation >= 60 ? 'warning' : 'normal'}`}
                                style={{ width: `${Math.min(utilisation, 100)}%` }}
                              ></div>
                              <span>{utilisation}%</span>
                            </div>
                          </td>
                          <td>
                            <span className={`status ${branch.is_active ? 'active' : 'inactive'}`}>
                              {branch.is_active ? '🟢 Active' : '🔴 Inactive'}
                            </span>
                          </td>
                          <td className="actions">
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => openBranchModal(branch)}
                              title="Edit"
                              style={{ marginRight: '8px' }}
                            >
                              ✏️
                            </button>
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => openModuleAccessModal(branch)}
                              title="Manage Module Access"
                            >
                              🔑
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {showBranchModal && (
          <div className="modal-overlay" onClick={closeBranchModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editingBranch ? '✏️ Edit Branch' : '➕ Add New Branch'}</h3>
                <button className="modal-close" onClick={closeBranchModal}>✕</button>
              </div>
              <form onSubmit={handleSaveBranch}>
                <div className="form-group">
                  <label htmlFor="branch-name">Branch Name *</label>
                  <input
                    id="branch-name"
                    type="text"
                    name="name"
                    value={branchFormData.name}
                    onChange={handleBranchFormChange}
                    placeholder="e.g., Main Branch, North Branch"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="branch-location">Branch Location</label>
                  <input
                    id="branch-location"
                    type="text"
                    name="location"
                    value={branchFormData.location || ''}
                    onChange={handleBranchFormChange}
                    placeholder="e.g., New York, Downtown Office"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="employee-limit">Employee Limit *</label>
                  <input
                    id="employee-limit"
                    type="number"
                    name="employee_limit"
                    value={branchFormData.employee_limit}
                    onChange={handleBranchFormChange}
                    min="1"
                    placeholder="e.g., 50"
                    required
                  />
                  <small>Maximum number of employees this branch can have</small>
                </div>
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeBranchModal}
                    disabled={savingBranch}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingBranch}
                  >
                    {savingBranch ? '💾 Saving...' : '💾 Save Branch'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Password Change Modal */}
        {showPasswordModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              minWidth: '400px',
              maxWidth: '500px'
            }}>
              <h3>🔑 Change Company Password</h3>
              {passwordError && <div style={{
                padding: '10px',
                backgroundColor: '#f8d7da',
                border: '1px solid #f5c6cb',
                borderRadius: '4px',
                color: '#721c24',
                marginBottom: '15px'
              }}>{passwordError}</div>}
              <form onSubmit={handlePasswordChange}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '4px',
                      border: '1px solid #bdc3c7',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    New Password (min 6 characters)
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '4px',
                      border: '1px solid #bdc3c7',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '4px',
                      border: '1px solid #bdc3c7',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button
                    type="submit"
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#3498db',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    ✅ Change Password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      setPasswordError('');
                    }}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#95a5a6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    ❌ Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showModuleAccessModal && (
          <div className="modal-overlay" onClick={closeModuleAccessModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '80vh', overflowY: 'auto' }}>
              <div className="modal-header">
                <h3>🔑 Manage Module Access - {selectedBranchForModules?.name}</h3>
                <button className="modal-close" onClick={closeModuleAccessModal}>✕</button>
              </div>
              
              {loadingModules ? (
                <div style={{ textAlign: 'center', padding: '30px' }}>
                  <p>Loading module permissions...</p>
                </div>
              ) : (
                <>
                  <p style={{ color: '#666', marginBottom: '20px' }}>
                    Configure which modules this branch can access and what actions they can perform.
                  </p>
                  
                  <div style={{ display: 'grid', gap: '15px' }}>
                    {branchModules.map((module) => (
                      <div
                        key={module.module_name}
                        style={{
                          padding: '20px',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '8px',
                          border: '1px solid #e0e0e0'
                        }}
                      >
                        <div style={{ 
                          fontWeight: 'bold', 
                          fontSize: '16px', 
                          marginBottom: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <span>{module.icon || '📦'}</span>
                          <span>{module.module_name}</span>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                          <label style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px',
                            cursor: 'pointer',
                            padding: '8px 12px',
                            backgroundColor: module.can_view ? '#e1f5fe' : '#fff',
                            borderRadius: '6px',
                            border: `2px solid ${module.can_view ? '#2196F3' : '#ddd'}`,
                            transition: 'all 0.2s',
                            fontWeight: module.can_view ? '600' : '400'
                          }}>
                            <input
                              type="checkbox"
                              checked={module.can_view}
                              onChange={() => handleModulePermissionChange(module.module_name, 'can_view')}
                            />
                            <span>👁️ View</span>
                          </label>
                          
                          <label style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px',
                            cursor: 'pointer',
                            padding: '8px 12px',
                            backgroundColor: module.can_edit ? '#fff3e0' : '#fff',
                            borderRadius: '6px',
                            border: `2px solid ${module.can_edit ? '#ff9800' : '#ddd'}`,
                            transition: 'all 0.2s',
                            fontWeight: module.can_edit ? '600' : '400'
                          }}>
                            <input
                              type="checkbox"
                              checked={module.can_edit}
                              onChange={() => handleModulePermissionChange(module.module_name, 'can_edit')}
                            />
                            <span>✏️ Edit</span>
                          </label>
                          
                          <label style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px',
                            cursor: 'pointer',
                            padding: '8px 12px',
                            backgroundColor: module.can_delete ? '#ffebee' : '#fff',
                            borderRadius: '6px',
                            border: `2px solid ${module.can_delete ? '#f44336' : '#ddd'}`,
                            transition: 'all 0.2s',
                            fontWeight: module.can_delete ? '600' : '400'
                          }}>
                            <input
                              type="checkbox"
                              checked={module.can_delete}
                              onChange={() => handleModulePermissionChange(module.module_name, 'can_delete')}
                            />
                            <span>🗑️ Delete</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="form-actions" style={{ marginTop: '25px' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleSaveModuleAccess}
                    >
                      💾 Save Module Access
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={closeModuleAccessModal}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
          </>
        )}
      </main>
    </div>
  );
}

const tabStyles = {
  tabs: {
    display: 'flex',
    gap: '10px',
    borderBottom: '2px solid rgba(255,255,255,0.2)',
    alignItems: 'center'
  },
  tab: {
    padding: '10px 20px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'rgba(255,255,255,0.85)',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    borderBottom: '3px solid transparent',
    transition: 'all 0.3s'
  },
  activeTab: {
    color: '#ffffff',
    borderBottom: '3px solid #ffffff'
  }
};
