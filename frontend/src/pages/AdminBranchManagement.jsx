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
  const [showBranchAssignmentModal, setShowBranchAssignmentModal] = useState(false);
  const [managerForBranchAssignment, setManagerForBranchAssignment] = useState(null);
  const [selectedBranchesForManager, setSelectedBranchesForManager] = useState(new Set());
  const [assigningSaving, setAssigningSaving] = useState(false);

  // Fetch branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('companyToken');
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
        const token = localStorage.getItem('companyToken');
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
          const token = localStorage.getItem('companyToken');
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

  const handleOpenBranchAssignmentModal = (manager) => {
    setManagerForBranchAssignment(manager);
    setSelectedBranchesForManager(new Set());
    setShowBranchAssignmentModal(true);
  };

  const handleCloseBranchAssignmentModal = () => {
    setShowBranchAssignmentModal(false);
    setManagerForBranchAssignment(null);
    setSelectedBranchesForManager(new Set());
  };

  const handleBranchToggle = (branchId) => {
    const newSet = new Set(selectedBranchesForManager);
    if (newSet.has(branchId)) {
      newSet.delete(branchId);
    } else {
      newSet.add(branchId);
    }
    setSelectedBranchesForManager(newSet);
  };

  const handleSaveBranchAssignments = async () => {
    if (!managerForBranchAssignment || selectedBranchesForManager.size === 0) {
      setMessage('Please select at least one branch');
      setMessageType('error');
      return;
    }

    setAssigningSaving(true);
    try {
      const token = localStorage.getItem('companyToken');
      const branchArray = Array.from(selectedBranchesForManager);

      // API call to assign branches to manager - using the manager_branches endpoint
      // Note: You'll need to create this endpoint if it doesn't exist
      await client.post(
        `/company/managers/${managerForBranchAssignment.id}/assign-branches`,
        { branchIds: branchArray },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage('Branches assigned successfully!');
      setMessageType('success');
      handleCloseBranchAssignmentModal();
      
      // Refresh managers list
      setTimeout(() => {
        handlePermissionsUpdated();
      }, 500);
    } catch (error) {
      console.error('Error assigning branches:', error);
      setMessage(error.response?.data?.message || 'Failed to assign branches');
      setMessageType('error');
    } finally {
      setAssigningSaving(false);
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

                    <button
                      onClick={() => handleOpenBranchAssignmentModal(manager)}
                      style={{
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        marginLeft: '10px'
                      }}
                    >
                      🏢 Assign Branches
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

      {/* Branch Assignment Modal */}
      {showBranchAssignmentModal && managerForBranchAssignment && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#333' }}>
              🏢 Assign Branches to {managerForBranchAssignment.name}
            </h3>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
              Select one or more branches to assign to this manager.
              {selectedBranchesForManager.size > 0 && (
                <span style={{ color: '#4CAF50', fontWeight: 600 }}>
                  {' '}({selectedBranchesForManager.size} selected)
                </span>
              )}
            </p>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              marginBottom: '20px',
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              {branches && branches.length > 0 ? (
                branches.map((branch) => (
                  <label key={branch.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px',
                    backgroundColor: selectedBranchesForManager.has(branch.id) ? '#e8f5e9' : '#f5f5f5',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    border: selectedBranchesForManager.has(branch.id) ? '2px solid #4CAF50' : '1px solid #ddd',
                    transition: 'all 0.2s'
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedBranchesForManager.has(branch.id)}
                      onChange={() => handleBranchToggle(branch.id)}
                      style={{
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer',
                        marginRight: '10px',
                        accentColor: '#4CAF50'
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, color: '#333' }}>
                        {branch.name} {branch.location && `📍 ${branch.location}`}
                      </div>
                      <div style={{ fontSize: '12px', color: '#999' }}>
                        ID: {branch.id.substring(0, 8)}...
                      </div>
                    </div>
                  </label>
                ))
              ) : (
                <p style={{ color: '#999', textAlign: 'center' }}>No branches available</p>
              )}
            </div>

            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end',
              borderTop: '1px solid #eee',
              paddingTop: '15px'
            }}>
              <button
                onClick={handleCloseBranchAssignmentModal}
                disabled={assigningSaving}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #ddd',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  color: '#333',
                  opacity: assigningSaving ? 0.6 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBranchAssignments}
                disabled={assigningSaving || selectedBranchesForManager.size === 0}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  borderRadius: '6px',
                  cursor: selectedBranchesForManager.size === 0 || assigningSaving ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  opacity: assigningSaving || selectedBranchesForManager.size === 0 ? 0.6 : 1
                }}
              >
                {assigningSaving ? '⏳ Saving...' : '✓ Assign Branches'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBranchManagement;
