import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    employees: 0,
    leaves: 0,
    inventory: 0,
    payslips: 0,
    leavePlans: 0
  });
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Check for company or employee token
        const token = localStorage.getItem('companyToken') || localStorage.getItem('accessToken');
        if (!token) {
          const userRole = localStorage.getItem('userRole');
          if (userRole === 'company_admin') {
            window.location.href = '/company-login';
          } else {
            window.location.href = '/login';
          }
          return;
        }

        const [empRes, leavRes, invRes, payRes, planRes] = await Promise.all([
          api.get('/company/employees').catch((err) => {
            console.error('Error fetching employees:', err.message);
            return { data: { data: { employees: [] } } };
          }),
          api.get('/leave/all').catch((err) => {
            console.error('Error fetching leaves:', err.message);
            return { data: { leaves: [] } };
          }),
          api.get('/inventory').catch((err) => {
            console.error('Error fetching inventory:', err.message);
            return { data: { items: [] } };
          }),
          api.get('/payroll/payslips/all').catch((err) => {
            console.error('Error fetching payslips:', err.message);
            return { data: { payslips: [] } };
          }),
          api.get('/leave-plan/types').catch((err) => {
            console.error('Error fetching leave plans:', err.message);
            return { data: { leaveTypes: [] } };
          })
        ]);

        setStats({
          employees: (empRes.data.data?.employees || empRes.data.employees)?.length || 0,
          leaves: leavRes.data.leaves?.filter(l => l.status === 'pending').length || 0,
          inventory: invRes.data.items?.length || 0,
          payslips: payRes.data.payslips?.length || 0,
          leavePlans: planRes.data.leaveTypes?.length || 0
        });
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

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

  const adminModules = [
    {
      title: 'Manage Employees',
      description: 'Add, view, and manage employee profiles',
      icon: '👥',
      path: '/admin/employees'
    },
    {
      title: 'Password Management',
      description: 'Reset passwords for employee accounts',
      icon: '🔐',
      path: '/admin/password-management'
    },
    {
      title: 'Leave Plan',
      description: 'Define company leave types and quotas',
      icon: '📋',
      path: '/admin/leave-plan'
    },
    {
      title: 'Leave Approvals',
      description: 'Approve or reject employee leave requests',
      icon: '✅',
      path: '/admin/leave'
    },
    {
      title: 'Payroll Management',
      description: 'Upload and manage employee payslips',
      icon: '💰',
      path: '/admin/payroll'
    },
    {
      title: 'Inventory Management',
      description: 'Add and allocate inventory items',
      icon: '📦',
      path: '/admin/inventory'
    },
    {
      title: 'Onboarding',
      description: 'Create tasks and assign to new employees',
      icon: '🚀',
      path: '/admin/onboarding'
    },
    {
      title: 'Attendance Tracking',
      description: 'View employee locations and attendance records',
      icon: '📍',
      path: '/admin/attendance'
    },
    {
      title: 'Geofencing',
      description: 'Configure geofence zones for office attendance',
      icon: '🗺️',
      path: '/admin/geofencing'
    }
  ];

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading dashboard...</div>;
  }

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
        <h1 style={{ margin: 0 }}>🏢 Company Admin Dashboard</h1>
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
      </div>

      {success && <div style={{
        padding: '12px 16px',
        backgroundColor: '#d4edda',
        border: '1px solid #c3e6cb',
        borderRadius: '4px',
        color: '#155724',
        marginBottom: '20px'
      }}>{success}</div>}
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
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

      <h2>Management Modules</h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px'
      }}>
        {adminModules.map((module) => (
          <Link 
            key={module.path}
            to={module.path}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div style={{
              padding: '20px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.3s',
              backgroundColor: '#f9f9f9',
              '&:hover': {
                boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
              }
            }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
            >
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>{module.icon}</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
                {module.title}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                {module.description}
              </div>
            </div>
          </Link>
        ))}
      </div>

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
