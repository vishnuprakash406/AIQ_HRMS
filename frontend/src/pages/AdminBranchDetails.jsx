import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ModulePermissionManager from '../components/ModulePermissionManager';
import client from '../api/client';

const AdminBranchDetails = () => {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const [branch, setBranch] = useState(null);
  const [managers, setManagers] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedManager, setSelectedManager] = useState(null);
  const [showPermissionManager, setShowPermissionManager] = useState(false);
  const [activeTab, setActiveTab] = useState('modules'); // 'modules' or 'managers'

  const token = localStorage.getItem('companyToken');

  useEffect(() => {
    if (!token) {
      navigate('/company-login');
      return;
    }
    fetchBranchDetails();
  }, [branchId, token, navigate]);

  const fetchBranchDetails = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch branches, managers, and modules in parallel
      const [branchRes, managersRes, modulesRes] = await Promise.all([
        client.get('/company/branches', { headers }),
        client.get(`/company/branches/${branchId}/managers`, { headers }),
        client.get(`/company/branches/${branchId}/modules`, { headers })
      ]);

      // Find selected branch
      const selectedBranch = (branchRes.data.branches || []).find(b => b.id === branchId);
      if (!selectedBranch) {
        setError('Branch not found');
        return;
      }

      setBranch(selectedBranch);
      setManagers(managersRes.data.managers || []);
      setModules(modulesRes.data.modules || []);
    } catch (err) {
      setError(err.message || 'Failed to load branch details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPermissionManager = (manager) => {
    setSelectedManager(manager);
    setShowPermissionManager(true);
  };

  const handleClosePermissionManager = () => {
    setShowPermissionManager(false);
    setSelectedManager(null);
  };

  const handlePermissionsUpdated = () => {
    fetchBranchDetails();
  };

  if (loading) {
    return <div className="loading">Loading branch details...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: '#d32f2f', textAlign: 'center' }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/company-dashboard')} style={{
          padding: '10px 20px',
          backgroundColor: '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer'
        }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', backgroundColor: 'white', borderRadius: '8px', padding: '25px' }}>
        {/* Header */}
        <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
          <button 
            onClick={() => navigate('/company-dashboard')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              marginBottom: '15px',
              fontSize: '14px'
            }}
          >
            ← Back to Dashboard
          </button>
          <h1 style={{ margin: '0 0 5px 0' }}>🌿 {branch?.name}</h1>
          <p style={{ color: '#666', margin: 0 }}>Branch Management & Module Access Control</p>
        </div>

        {/* Branch Info */}
        <div style={{
          padding: '20px',
          backgroundColor: '#f9f9f9',
          borderRadius: '8px',
          marginBottom: '30px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '20px'
        }}>
          <div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Branch Name</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{branch?.name}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>📍 Location</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1976d2' }}>
              {branch?.location || 'Not specified'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Employee Limit</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{branch?.employee_limit || '-'}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Current Employees</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{branch?.employee_count || 0}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Status</div>
            <div style={{ 
              fontSize: '18px', 
              fontWeight: 'bold',
              color: branch?.is_active ? '#2e7d32' : '#c62828'
            }}>
              {branch?.is_active ? '✅ Active' : '❌ Inactive'}
            </div>
          </div>
        </div>

        {/* Allocated Modules Section */}
        <div style={{ marginBottom: '30px' }}>
          {/* Tab Navigation */}
          <div style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '20px',
            borderBottom: '2px solid #eee',
            paddingBottom: '10px'
          }}>
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
                fontSize: '14px',
                transition: 'all 0.3s'
              }}
            >
              📦 Allocated Modules
            </button>
            <button
              onClick={() => setActiveTab('managers')}
              style={{
                padding: '12px 24px',
                backgroundColor: activeTab === 'managers' ? '#2196F3' : '#f0f0f0',
                color: activeTab === 'managers' ? 'white' : '#333',
                border: 'none',
                borderRadius: '6px 6px 0 0',
                cursor: 'pointer',
                fontWeight: activeTab === 'managers' ? 600 : 500,
                fontSize: '14px',
                transition: 'all 0.3s'
              }}
            >
              👥 Manager Access
            </button>
          </div>

          {/* Tab Content - Allocated Modules */}
          {activeTab === 'modules' && (
            <div>
              <h2 style={{ marginTop: 0, marginBottom: '15px' }}>📦 Allocated Modules to Branch</h2>
              
              {modules.length === 0 ? (
                <div style={{
                  padding: '30px',
                  textAlign: 'center',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '8px',
                  color: '#999'
                }}>
                  <p style={{ margin: 0 }}>No modules allocated to this branch</p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '15px',
                  marginBottom: '30px'
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
                        <div style={{
                          fontSize: '16px',
                          fontWeight: 'bold',
                          marginBottom: '8px',
                          color: '#333'
                        }}>
                          {module.module_name}
                        </div>
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '8px',
                          marginBottom: '8px'
                        }}>
                          {permissions.length > 0 ? (
                            permissions.map((perm, idx) => (
                              <span key={idx} style={{
                                backgroundColor: 'rgba(76, 175, 80, 0.2)',
                                color: '#2e7d32',
                                padding: '4px 8px',
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
            </div>
          )}

          {/* Tab Content - Manager Module Access */}
          {activeTab === 'managers' && (
            <div>
              <h2 style={{ marginTop: 0, marginBottom: '20px' }}>👥 Manager Module Access</h2>
              
              {managers.length === 0 ? (
                <div style={{
                  padding: '30px',
                  textAlign: 'center',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '8px',
                  color: '#999'
                }}>
                  <p style={{ margin: 0 }}>No managers assigned to this branch yet</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '15px' }}>
                  {managers.map(manager => (
                    <div key={manager.id} style={{
                      padding: '20px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      backgroundColor: '#fafafa',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start'
                    }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600 }}>
                          👤 {manager.fullName || manager.full_name}
                        </h3>
                        <div style={{ color: '#666', fontSize: '14px', marginBottom: '12px' }}>
                          <div>📧 {manager.email || 'No email'}</div>
                          <div>📱 {manager.phone || 'No phone'}</div>
                        </div>

                        {/* Module Badges */}
                        {manager.modules && manager.modules.length > 0 ? (
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '8px' }}>
                              Assigned Modules:
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {manager.modules.map(module => (
                                <div key={module.module_name} style={{
                                  backgroundColor: '#fff3e0',
                                  color: '#e65100',
                                  padding: '6px 12px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  border: '1px solid #ffe0b2',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}>
                                  <span>{module.module_name}</span>
                                  <span style={{ fontSize: '13px', marginLeft: '4px' }}>
                                    {[
                                      module.can_view && '👁️',
                                      module.can_modify && '✏️',
                                      module.can_update && '🔄'
                                    ].filter(Boolean).join(' ')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div style={{ color: '#999', fontSize: '14px', fontStyle: 'italic' }}>
                            No modules assigned
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleOpenPermissionManager(manager)}
                        style={{
                          backgroundColor: '#2196F3',
                          color: 'white',
                          border: 'none',
                          padding: '10px 20px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          marginLeft: '15px'
                        }}
                      >
                        ⚙️ Manage Permissions
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Permission Manager Modal */}
      {showPermissionManager && selectedManager && (
        <ModulePermissionManager
          branchId={branchId}
          managerId={selectedManager.id}
          onClose={handleClosePermissionManager}
          onUpdate={handlePermissionsUpdated}
        />
      )}
    </div>
  );
};

export default AdminBranchDetails;
