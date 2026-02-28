import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

const BranchDashboard = () => {
  const navigate = useNavigate();
  const [branch, setBranch] = useState(null);
  const [modules, setModules] = useState([]);
  const [managerModules, setManagerModules] = useState([]);
  const [managerInfo, setManagerInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('modules');
  const [stats, setStats] = useState({
    employees: 0,
    leaves: 0,
    inventory: 0,
    payslips: 0
  });

  useEffect(() => {
    const fetchBranchDashboard = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('companyToken');
        const branchId = localStorage.getItem('branch_id');
        const managerId = localStorage.getItem('manager_id');

        if (!token || !branchId) {
          navigate('/company-login');
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        // Fetch branch details, modules, and manager modules in parallel
        const [branchRes, modulesRes, managerModulesRes] = await Promise.all([
          client.get('/company/branches', { headers }),
          client.get(`/company/branches/${branchId}/modules`, { headers }),
          managerId ? client.get(`/company/branches/${branchId}/managers/${managerId}/modules`, { headers }).catch(() => ({ data: { modules: [] } })) : { data: { modules: [] } }
        ]);

        // Find the current branch
        const currentBranch = (branchRes.data.branches || []).find(b => b.id === branchId);
        if (!currentBranch) {
          setError('Branch not found');
          setLoading(false);
          return;
        }

        setBranch(currentBranch);
        setModules(modulesRes.data.modules || []);
        setManagerModules(managerModulesRes.data.modules || []);

        // Fetch manager info
        if (managerId) {
          try {
            const managerRes = await client.get(`/company/branches/${branchId}/managers`, { headers });
            const currentManager = (managerRes.data.managers || []).find(m => m.id === managerId);
            setManagerInfo(currentManager);
          } catch (err) {
            console.error('Error fetching manager info:', err);
          }
        }

        // Fetch statistics
        await fetchStats(token, managerModulesRes.data.modules || [], branchId);
      } catch (err) {
        setError(err.message || 'Failed to load branch dashboard');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBranchDashboard();
  }, [navigate]);

  const fetchStats = async (token, modules, branchId) => {
    try {
      const newStats = { employees: 0, leaves: 0, inventory: 0, payslips: 0 };

      const hasModuleAccess = (moduleName) => {
        return modules.some(m => m.module_name === moduleName && m.can_view);
      };

      const headers = { Authorization: `Bearer ${token}` };
      const promises = [];

      if (hasModuleAccess('employees')) {
        promises.push(
          client.get(`/company/branches/${branchId}/employees`, { headers })
            .then(res => {
              newStats.employees = (res.data.employees || []).length;
            })
            .catch(() => {})
        );
      }

      if (hasModuleAccess('leave_plan') || hasModuleAccess('leave_approvals')) {
        promises.push(
          client.get('/leave/all', { headers })
            .then(res => {
              newStats.leaves = (res.data.leaves || []).filter(l => l.status === 'pending').length;
            })
            .catch(() => {})
        );
      }

      if (hasModuleAccess('inventory')) {
        promises.push(
          client.get('/inventory', { headers })
            .then(res => {
              newStats.inventory = (res.data.items || []).length;
            })
            .catch(() => {})
        );
      }

      if (hasModuleAccess('payroll')) {
        promises.push(
          client.get('/payroll/payslips/all', { headers })
            .then(res => {
              newStats.payslips = (res.data.payslips || []).length;
            })
            .catch(() => {})
        );
      }

      await Promise.all(promises);
      setStats(newStats);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading branch dashboard...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#d32f2f' }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button
          onClick={() => navigate('/company-login')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Back to Login
        </button>
      </div>
    );
  }

  if (!branch) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>No branch found</div>;
  }

  const utilisation = branch.employee_limit > 0
    ? Math.round((branch.employee_count / branch.employee_limit) * 100)
    : 0;

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ margin: '0 0 5px 0', color: '#333' }}>🏢 {branch.name} Dashboard</h1>
          <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>Branch Overview & Allocated Modules</p>
        </div>

        {/* Branch Info Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '15px',
          marginBottom: '30px'
        }}>
          <div style={{
            padding: '20px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>📍 Location</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1976d2' }}>
              {branch.location || 'Not specified'}
            </div>
          </div>

          <div style={{
            padding: '20px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>👥 Employees</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#333' }}>
              {branch.employee_count || 0} / {branch.employee_limit}
            </div>
          </div>

          <div style={{
            padding: '20px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>📊 Utilisation</div>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: utilisation >= 80 ? '#d32f2f' : utilisation >= 60 ? '#f57c00' : '#2e7d32'
            }}>
              {utilisation}%
            </div>
          </div>

          <div style={{
            padding: '20px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>Status</div>
            <div style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: branch.is_active ? '#2e7d32' : '#c62828'
            }}>
              {branch.is_active ? '✅ Active' : '❌ Inactive'}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          marginBottom: '30px'
        }}>
          <div style={{
            padding: '20px',
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '2px solid #e3f2fd',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>👥 Total Employees</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1976d2' }}>{stats.employees}</div>
          </div>

          <div style={{
            padding: '20px',
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '2px solid #f3e5f5',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>📋 Pending Leaves</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#7b1fa2' }}>{stats.leaves}</div>
          </div>

          <div style={{
            padding: '20px',
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '2px solid #fff3e0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>📦 Inventory Items</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f57c00' }}>{stats.inventory}</div>
          </div>

          <div style={{
            padding: '20px',
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '2px solid #e8f5e9',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>💰 Payslips</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2e7d32' }}>{stats.payslips}</div>
          </div>
        </div>

        {/* Allocated Modules Section - Tabbed View */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '25px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          {/* Tab Navigation */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #e0e0e0', paddingBottom: '15px' }}>
            <button
              onClick={() => setActiveTab('modules')}
              style={{
                padding: '12px 24px',
                backgroundColor: activeTab === 'modules' ? '#2196F3' : '#f0f0f0',
                color: activeTab === 'modules' ? 'white' : '#333',
                border: 'none',
                borderRadius: '6px 6px 0 0',
                cursor: 'pointer',
                fontWeight: activeTab === 'modules' ? 600 : 500,
                fontSize: '16px',
                transition: 'all 0.3s'
              }}
            >
              📦 Allocated Modules
            </button>
          </div>

          {/* Tab Content - Allocated Modules */}
          {activeTab === 'modules' && (
            <>
              {modules.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', backgroundColor: '#f5f5f5', borderRadius: '8px', color: '#999' }}>
                  No modules allocated to this branch
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '15px'
                }}>
                  {modules.map(module => {
                    const permissions = [];
                    if (module.can_view) permissions.push('👁️ View');
                    if (module.can_edit) permissions.push('✏️ Edit');
                    if (module.can_delete) permissions.push('🗑️ Delete');

                    return (
                      <div key={module.module_name} style={{
                        padding: '15px',
                        border: `2px solid ${module.is_enabled ? '#4CAF50' : '#ccc'}`,
                        borderRadius: '8px',
                        backgroundColor: module.is_enabled ? '#e8f5e9' : '#f5f5f5',
                        transition: 'all 0.3s'
                      }}>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
                          {module.module_name}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                          {permissions.length > 0 ? (
                            permissions.map((perm, idx) => (
                              <span key={idx} style={{
                                backgroundColor: 'rgba(76, 175, 80, 0.2)',
                                color: '#2e7d32',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 500
                              }}>
                                {perm}
                              </span>
                            ))
                          ) : (
                            <span style={{ color: '#999', fontSize: '12px' }}>No permissions</span>
                          )}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: module.is_enabled ? '#2e7d32' : '#c62828',
                          fontWeight: 600
                        }}>
                          {module.is_enabled ? '✅ Enabled' : '❌ Disabled'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BranchDashboard;
