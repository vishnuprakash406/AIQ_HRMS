import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import ModulePermissionManager from '../components/ModulePermissionManager';

const AdminBranchManagement = () => {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showPermissionManager, setShowPermissionManager] = useState(false);
  const [selectedManager, setSelectedManager] = useState(null);

  // Fetch branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await client.get('/company/branches', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBranches(response.data.branches || []);
        if (response.data.branches?.length > 0) {
          setSelectedBranch(response.data.branches[0].id);
        }
      } catch (error) {
        setMessage('Failed to load branches');
        setMessageType('error');
        console.error('Error fetching branches:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBranches();
  }, []);

  // Fetch managers when branch changes
  useEffect(() => {
    const fetchManagers = async () => {
      if (!selectedBranch) return;

      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await client.get(`/company/branches/${selectedBranch}/managers`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setManagers(response.data.managers || []);
      } catch (error) {
        setMessage('Failed to load branch managers');
        setMessageType('error');
        console.error('Error fetching managers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchManagers();
  }, [selectedBranch]);

  const handleOpenPermissionManager = (manager) => {
    setSelectedManager(manager);
    setShowPermissionManager(true);
  };

  const handleClosePermissionManager = () => {
    setShowPermissionManager(false);
    setSelectedManager(null);
  };

  const handlePermissionsUpdated = () => {
    // Refresh managers to show updated permissions
    if (selectedBranch) {
      const fetchManagers = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await client.get(`/company/branches/${selectedBranch}/managers`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setManagers(response.data.managers || []);
        } catch (error) {
          console.error('Error refreshing managers:', error);
        }
      };
      fetchManagers();
    }
  };

  const selectedBranchName = branches.find(b => b.id === selectedBranch)?.name || 'Select Branch';

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', backgroundColor: 'white', borderRadius: '8px', padding: '25px' }}>
        <h1 style={{ marginTop: 0 }}>🏢 Branch Manager Permissions</h1>

        {message && (
          <div style={{
            padding: '12px',
            marginBottom: '20px',
            borderRadius: '6px',
            backgroundColor: messageType === 'error' ? '#fee' : '#efe',
            color: messageType === 'error' ? '#c33' : '#3c3',
            border: `1px solid ${messageType === 'error' ? '#fcc' : '#cfc'}`
          }}>
            {message}
          </div>
        )}

        {/* Branch Selection */}
        <div style={{ marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600 }}>
            Select Branch:
          </label>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            style={{
              padding: '10px',
              fontSize: '16px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              minWidth: '200px',
              fontFamily: 'inherit'
            }}
          >
            <option value="">Select a branch...</option>
            {branches.map(branch => (
              <option key={branch.id} value={branch.id}>
                {branch.name} ({branch.employee_count}/{branch.employee_limit} employees)
              </option>
            ))}
          </select>
        </div>

        {selectedBranch && (
          <div>
            <h2 style={{ marginTop: 0 }}>Managers in "{selectedBranchName}"</h2>

            {loading ? (
              <p style={{ color: '#666' }}>Loading managers...</p>
            ) : managers.length === 0 ? (
              <p style={{ color: '#999', fontStyle: 'italic' }}>No managers assigned to this branch yet</p>
            ) : (
              <div style={{ display: 'grid', gap: '15px' }}>
                {managers.map(manager => (
                  <div key={manager.id} style={{
                    padding: '15px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    backgroundColor: '#f9f9f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                  }}>
                    <div>
                      <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>
                        👤 {manager.fullName || manager.full_name}
                      </h3>
                      <div style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>
                        <div>📧 {manager.email || 'No email'}</div>
                        <div>📱 {manager.phone || 'No phone'}</div>
                      </div>
                      <div style={{ marginTop: '10px' }}>
                        <span style={{
                          display: 'inline-block',
                          backgroundColor: '#e3f2fd',
                          color: '#1976d2',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600
                        }}>
                          {manager.modules?.length || 0} module{(manager.modules?.length || 0) !== 1 ? 's' : ''} assigned
                        </span>
                      </div>

                      {/* Show assigned modules */}
                      {manager.modules && manager.modules.length > 0 && (
                        <div style={{ marginTop: '10px', fontSize: '13px' }}>
                          <div style={{ fontWeight: 600, marginBottom: '5px', color: '#555' }}>Assigned Modules:</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {manager.modules.map(module => (
                              <div key={module.module_name} style={{
                                backgroundColor: '#fff3e0',
                                color: '#e65100',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                border: '1px solid #ffe0b2'
                              }}>
                                {module.module_name}
                                <span style={{ marginLeft: '5px', color: '#666' }}>
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
                      ⚙️ Set Permissions
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Permission Manager Modal */}
      {showPermissionManager && selectedManager && (
        <ModulePermissionManager
          branchId={selectedBranch}
          managerId={selectedManager.id}
          onClose={handleClosePermissionManager}
          onUpdate={handlePermissionsUpdated}
        />
      )}
    </div>
  );
};

export default AdminBranchManagement;
