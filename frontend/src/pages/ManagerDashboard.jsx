import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client.js';

export default function ManagerDashboard() {
  const [stats, setStats] = useState({
    employees: 0,
    leaves: 0,
    inventory: 0,
    payslips: 0,
    leavePlans: 0
  });
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [managerModules, setManagerModules] = useState([]);
  const [branchInfo, setBranchInfo] = useState(null);

  const navigate = useNavigate();

  // All available modules mapping
  const allModulesMap = {
    'employees': {
      title: 'Manage Employees',
      description: 'Add, view, and manage employee profiles',
      icon: '👥',
      path: '/admin/employees'
    },
    'password_management': {
      title: 'Password Management',
      description: 'Reset passwords for employee accounts',
      icon: '🔐',
      path: '/admin/password-management'
    },
    'leave_plan': {
      title: 'Leave Plan',
      description: 'Define company leave types and quotas',
      icon: '📋',
      path: '/admin/leave-plan'
    },
    'leave_approvals': {
      title: 'Leave Approvals',
      description: 'Approve or reject employee leave requests',
      icon: '✅',
      path: '/admin/leave'
    },
    'payroll': {
      title: 'Payroll Management',
      description: 'Upload and manage employee payslips',
      icon: '💰',
      path: '/admin/payroll'
    },
    'inventory': {
      title: 'Inventory Management',
      description: 'Add and allocate inventory items',
      icon: '📦',
      path: '/admin/inventory'
    },
    'onboarding': {
      title: 'Onboarding',
      description: 'Create tasks and assign to new employees',
      icon: '🚀',
      path: '/admin/onboarding'
    },
    'attendance': {
      title: 'Attendance Tracking',
      description: 'View employee locations and attendance records',
      icon: '📍',
      path: '/admin/attendance'
    },
    'geofencing': {
      title: 'Geofencing',
      description: 'Configure geofence zones for office attendance',
      icon: '🗺️',
      path: '/admin/geofencing'
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Check for company or manager token
        const token = localStorage.getItem('companyToken') || localStorage.getItem('accessToken');
        const userRole = localStorage.getItem('userRole');
        const branchId = localStorage.getItem('branch_id');
        let managerId = localStorage.getItem('manager_id');

        console.log('ManagerDashboard Debug:', { token: !!token, userRole, branchId, managerId });

        if (!token || userRole !== 'branch_manager') {
          window.location.href = '/company-login';
          return;
        }

        // If manager_id is not set, try to extract it from token
        if (!managerId && token) {
          const decodedToken = decodeToken(token);
          if (decodedToken?.user_id) {
            managerId = decodedToken.user_id;
            localStorage.setItem('manager_id', managerId);
            console.log('Extracted manager_id from token:', managerId);
          }
        }

        // Log token data for debugging
        const decodedTokenForDebug = decodeToken(token);
        console.log('Token payload contains:', {
          user_id: decodedTokenForDebug?.user_id || 'NOT SET',
          role: decodedTokenForDebug?.role,
          branch_id: decodedTokenForDebug?.branch_id,
          company_id: decodedTokenForDebug?.company_id
        });

        // Fetch branch info
        const branchRes = await fetch('http://localhost:3000/api/v1/company/branches', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }).then(r => r.json());

        const currentBranch = (branchRes.branches || [])[0];
        setBranchInfo(currentBranch);

        // Fetch manager's module permissions
        if (branchId && managerId) {
          console.log('Fetching modules for branchId:', branchId, 'managerId:', managerId);
          try {
            const modulesResponse = await fetch(
              `http://localhost:3000/api/v1/company/branches/${branchId}/managers/${managerId}/modules`,
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              }
            );

            if (!modulesResponse.ok) {
              console.error('Module fetch failed:', modulesResponse.status, modulesResponse.statusText);
              
              // Handle 403 Forbidden - authorization issue
              if (modulesResponse.status === 403) {
                console.error('Access denied - you may not have permission to view these modules');
                setError('Access denied: Unable to load your modules. Please contact your administrator.');
              } else if (modulesResponse.status === 404) {
                console.error('Manager or branch not found');
              } else {
                console.error('Server error:', modulesResponse.statusText);
              }
              
              setLoading(false);
              return;
            }

            const modulesRes = await modulesResponse.json();
            console.log('Modules response:', modulesRes);
            setManagerModules(modulesRes.modules || []);

            // Fetch stats based on accessible modules
            await fetchStats(token, modulesRes.modules || []);
          } catch (fetchErr) {
            console.error('Error fetching modules:', fetchErr);
            setLoading(false);
          }
        } else {
          console.warn('Missing branchId or managerId for manager dashboard', { branchId, managerId });
          setError('Missing required information. Please log in again.');
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Helper function to decode JWT token
  const decodeToken = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (err) {
      console.error('Error decoding token:', err);
      return null;
    }
  };

  const fetchStats = async (token, modules) => {
    try {
      const newStats = {
        employees: 0,
        leaves: 0,
        inventory: 0,
        payslips: 0,
        leavePlans: 0
      };

      const branchId = localStorage.getItem('branch_id');

      // Helper function to check if module is accessible
      const hasModuleAccess = (moduleName) => {
        return modules.some(m => 
          m.module_name === moduleName && m.can_view
        );
      };

      // Fetch stats for modules manager has access to
      const promises = [];

      if (hasModuleAccess('employees')) {
        promises.push(
          fetch(`http://localhost:3000/api/v1/company/branches/${branchId}/employees`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }).then(r => r.json()).then(data => {
            newStats.employees = (data.employees || []).length;
          }).catch(() => {})
        );
      }

      if (hasModuleAccess('leave_plan') || hasModuleAccess('leave_approvals')) {
        promises.push(
          fetch('http://localhost:3000/api/v1/leave/all', {
            headers: { 'Authorization': `Bearer ${token}` }
          }).then(r => r.json()).then(data => {
            newStats.leaves = (data.leaves || []).filter(l => l.status === 'pending').length;
          }).catch(() => {})
        );

        promises.push(
          fetch('http://localhost:3000/api/v1/leave-plan/types', {
            headers: { 'Authorization': `Bearer ${token}` }
          }).then(r => r.json()).then(data => {
            newStats.leavePlans = (data.leaveTypes || []).length;
          }).catch(() => {})
        );
      }

      if (hasModuleAccess('inventory')) {
        promises.push(
          fetch('http://localhost:3000/api/v1/inventory', {
            headers: { 'Authorization': `Bearer ${token}` }
          }).then(r => r.json()).then(data => {
            newStats.inventory = (data.items || []).length;
          }).catch(() => {})
        );
      }

      if (hasModuleAccess('payroll')) {
        promises.push(
          fetch('http://localhost:3000/api/v1/payroll/payslips/all', {
            headers: { 'Authorization': `Bearer ${token}` }
          }).then(r => r.json()).then(data => {
            newStats.payslips = (data.payslips || []).length;
          }).catch(() => {})
        );
      }

      await Promise.all(promises);
      setStats(newStats);
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      const response = await api.post('/company/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });

      if (response.data.status === 'success') {
        setSuccess('✅ Password changed successfully!');
        setShowPasswordModal(false);
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('companyToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('company_id');
    localStorage.removeItem('company_name');
    localStorage.removeItem('branch_id');
    localStorage.removeItem('manager_id');
    localStorage.removeItem('modules');
    localStorage.removeItem('username');
    navigate('/company-login');
  };

  // Get manager accessible modules with their details
  const getAccessibleModules = () => {
    return managerModules
      .filter(m => m.can_view) // Only show modules manager can view
      .map(m => {
        const moduleDetails = allModulesMap[m.module_name];
        return {
          ...moduleDetails,
          ...m,
          name: m.module_name
        };
      })
      .filter(m => m.title); // Filter out modules not in the mapping
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading dashboard...</div>;
  }

  const accessibleModules = getAccessibleModules();
  const branchName = branchInfo?.name || 'Branch';

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px'
      }}>
        <div>
          <h1 style={{ margin: 0, marginBottom: '5px' }}>👔 Manager Dashboard</h1>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Branch: <strong>{branchName}</strong></p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
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
          <button
            onClick={handleLogout}
            style={{
              padding: '10px 20px',
              backgroundColor: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {error && <div style={{
        padding: '12px 16px',
        backgroundColor: '#f8d7da',
        border: '1px solid #f5c6cb',
        borderRadius: '4px',
        color: '#721c24',
        marginBottom: '20px'
      }}>⚠️ {error}</div>}

      {success && <div style={{
        padding: '12px 16px',
        backgroundColor: '#d4edda',
        border: '1px solid #c3e6cb',
        borderRadius: '4px',
        color: '#155724',
        marginBottom: '20px'
      }}>{success}</div>}

      {accessibleModules.length === 0 ? (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          backgroundColor: '#e3f2fd',
          borderRadius: '8px',
          color: '#1976d2'
        }}>
          <h3 style={{ marginTop: 0 }}>📭 No Modules Assigned</h3>
          <p style={{ marginBottom: '20px' }}>
            You don't have access to any modules yet. Please contact your company administrator to assign modules to your account.
          </p>
          
          {/* Instructions for Admin */}
          <div style={{
            backgroundColor: 'white',
            border: '2px solid #2196F3',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '20px',
            maxWidth: '600px',
            margin: '20px auto'
          }}>
            <h4 style={{ color: '#1976d2', marginTop: 0 }}>📋 For Company Admin:</h4>
            <ol style={{
              textAlign: 'left',
              color: '#555',
              fontSize: '14px',
              lineHeight: '1.8'
            }}>
              <li><strong>Go to Company Admin Dashboard</strong> → Company Dashboard</li>
              <li><strong>Select a Branch</strong> from the branches section</li>
              <li><strong>Find the Manager</strong> in the "Manager Module Access" section</li>
              <li><strong>Click "Manage Permissions"</strong> button</li>
              <li><strong>Assign Modules</strong> with appropriate permissions (View, Edit, Modify)</li>
              <li><strong>Save and Manager</strong> can now access the modules</li>
            </ol>
          </div>
          
          {/* Debugging Info - Collapsible */}
          <details style={{
            maxWidth: '500px',
            margin: '0 auto',
            textAlign: 'left',
            backgroundColor: 'white',
            border: '1px solid #90caf9',
            borderRadius: '4px',
            padding: '15px',
            cursor: 'pointer'
          }}>
            <summary style={{
              fontWeight: 600,
              color: '#1976d2',
              cursor: 'pointer',
              marginBottom: '10px'
            }}>
              🔍 Debug Information
            </summary>
            <div style={{ color: '#555', fontSize: '12px' }}>
              <p><strong>Status:</strong> {managerModules.length === 0 ? 'No modules found' : `${managerModules.length} modules fetched`}</p>
              <p><strong>Branch ID:</strong> <code style={{ backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '3px' }}>{localStorage.getItem('branch_id') || 'Not set'}</code></p>
              <p><strong>Manager ID:</strong> <code style={{ backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '3px' }}>{localStorage.getItem('manager_id') || 'Not set'}</code></p>
              <p><strong>Modules Data:</strong></p>
              <pre style={{
                backgroundColor: '#f5f5f5',
                padding: '10px',
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '200px',
                fontSize: '11px'
              }}>
                {JSON.stringify(managerModules, null, 2) || 'No modules'}
              </pre>
              <p style={{ fontSize: '11px', color: '#999' }}>
                💡 Open browser console (F12) for detailed logs
              </p>
            </div>
          </details>
        </div>
      ) : (
        <>
          {/* Stats Section */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '20px',
            marginBottom: '40px'
          }}>
            {stats.employees > 0 && (
              <div style={{ padding: '20px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.employees}</div>
                <div style={{ fontSize: '14px', color: '#666' }}>Employees</div>
              </div>
            )}
            {stats.leavePlans > 0 && (
              <div style={{ padding: '20px', backgroundColor: '#ede7f6', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.leavePlans}</div>
                <div style={{ fontSize: '14px', color: '#666' }}>Leave Types</div>
              </div>
            )}
            {stats.leaves > 0 && (
              <div style={{ padding: '20px', backgroundColor: '#f3e5f5', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.leaves}</div>
                <div style={{ fontSize: '14px', color: '#666' }}>Pending Approvals</div>
              </div>
            )}
            {stats.inventory > 0 && (
              <div style={{ padding: '20px', backgroundColor: '#e8f5e9', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.inventory}</div>
                <div style={{ fontSize: '14px', color: '#666' }}>Inventory Items</div>
              </div>
            )}
            {stats.payslips > 0 && (
              <div style={{ padding: '20px', backgroundColor: '#fff3e0', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.payslips}</div>
                <div style={{ fontSize: '14px', color: '#666' }}>Payslips</div>
              </div>
            )}
          </div>

          {/* Modules Section */}
          <h2 style={{ marginBottom: '20px' }}>Assigned Modules</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px'
          }}>
            {accessibleModules.map((module) => (
              <Link
                key={module.name}
                to={module.path}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  style={{
                    padding: '20px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    backgroundColor: '#f9f9f9',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                >
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>{module.icon}</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
                    {module.title}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                    {module.description}
                  </div>
                  <div style={{ fontSize: '12px', color: '#2196F3', fontWeight: '500' }}>
                    {module.can_view && '👁️ View'}
                    {module.can_edit && ' ✏️ Edit'}
                    {module.can_modify && ' 🔧 Modify'}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
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
            <h3>🔑 Change Password</h3>
            {error && <div style={{
              padding: '10px',
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '4px',
              color: '#721c24',
              marginBottom: '15px'
            }}>{error}</div>}
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
                    fontSize: '14px',
                    boxSizing: 'border-box'
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
                    fontSize: '14px',
                    boxSizing: 'border-box'
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
                    fontSize: '14px',
                    boxSizing: 'border-box'
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
                    setError('');
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
    </div>
  );
}
