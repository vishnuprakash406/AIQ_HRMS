import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ModulePermissionManager from '../components/ModulePermissionManager';

const AdminBranchDetails = () => {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const [branch, setBranch] = useState(null);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedManager, setSelectedManager] = useState(null);
  const [showPermissionManager, setShowPermissionManager] = useState(false);

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
      const [branchRes, managersRes] = await Promise.all([
        fetch(`http://localhost:3000/api/v1/company/branches`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }).then(r => r.json()),
        fetch(`http://localhost:3000/api/v1/company/branches/${branchId}/managers`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }).then(r => r.json())
      ]);

      // Find selected branch
      const selectedBranch = (branchRes.branches || []).find(b => b.id === branchId);
      if (!selectedBranch) {
        setError('Branch not found');
        return;
      }

      setBranch(selectedBranch);
      setManagers(managersRes.managers || []);
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '20px'
        }}>
          <div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Branch Name</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{branch?.name}</div>
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

        {/* Module Access Management */}
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ marginTop: 0, marginBottom: '20px' }}>📋 Manager Module Access</h2>
          
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
