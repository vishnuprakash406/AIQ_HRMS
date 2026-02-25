import React, { useState, useEffect } from 'react';
import client from '../api/client';

const ModulePermissionManager = ({ branchId, managerId, onClose, onUpdate }) => {
  const [modules, setModules] = useState([]);
  const [availableModules, setAvailableModules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [permissions, setPermissions] = useState({
    can_view: true,
    can_modify: false,
    can_update: false
  });

  // Fetch manager's current module permissions
  useEffect(() => {
    const fetchManagerModules = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await client.get(
          `/company/branches/${branchId}/managers/${managerId}/modules`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setModules(response.data.modules || []);
      } catch (error) {
        setMessage('Failed to load manager modules');
        setMessageType('error');
        console.error('Error fetching manager modules:', error);
      } finally {
        setLoading(false);
      }
    };

    // Fetch available modules (from company)
    const fetchAvailableModules = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await client.get('/company/modules', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAvailableModules(response.data.modules || []);
      } catch (error) {
        console.error('Error fetching available modules:', error);
      }
    };

    if (branchId && managerId) {
      fetchManagerModules();
      fetchAvailableModules();
    }
  }, [branchId, managerId]);

  const handleAssignModule = async () => {
    if (!selectedModule) {
      setMessage('Please select a module');
      setMessageType('error');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      await client.post(
        `/company/branches/${branchId}/managers/${managerId}/modules`,
        {
          module_name: selectedModule,
          can_view: permissions.can_view,
          can_modify: permissions.can_modify,
          can_update: permissions.can_update
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage('Module assigned successfully!');
      setMessageType('success');
      setSelectedModule('');
      setPermissions({ can_view: true, can_modify: false, can_update: false });

      // Refresh modules
      const response = await client.get(
        `/company/branches/${branchId}/managers/${managerId}/modules`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setModules(response.data.modules || []);
      
      if (onUpdate) onUpdate();

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to assign module');
      setMessageType('error');
      console.error('Error assigning module:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePermissions = async (moduleName, newPermissions) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      await client.put(
        `/company/branches/${branchId}/managers/${managerId}/modules/${moduleName}`,
        newPermissions,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage('Permissions updated successfully!');
      setMessageType('success');

      // Refresh modules
      const response = await client.get(
        `/company/branches/${branchId}/managers/${managerId}/modules`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setModules(response.data.modules || []);
      
      if (onUpdate) onUpdate();

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to update permissions');
      setMessageType('error');
      console.error('Error updating permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveModule = async (moduleName) => {
    if (!window.confirm(`Remove ${moduleName} module?`)) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      await client.delete(
        `/company/branches/${branchId}/managers/${managerId}/modules/${moduleName}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage('Module removed successfully!');
      setMessageType('success');

      // Refresh modules
      const response = await client.get(
        `/company/branches/${branchId}/managers/${managerId}/modules`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setModules(response.data.modules || []);
      
      if (onUpdate) onUpdate();

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to remove module');
      setMessageType('error');
      console.error('Error removing module:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignedModuleNames = new Set(modules.map(m => m.module_name));
  const unassignedModules = availableModules.filter(m => !assignedModuleNames.has(m.module_name) && m.is_enabled);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '30px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>📋 Module Permissions</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ✕
          </button>
        </div>

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

        {/* Assign New Module */}
        <div style={{ marginBottom: '25px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '6px' }}>
          <h3 style={{ marginTop: 0 }}>Assign New Module</h3>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Module</label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontFamily: 'inherit'
              }}
            >
              <option value="">Select a module...</option>
              {unassignedModules.map(module => (
                <option key={module.module_name} value={module.module_name}>
                  {module.module_name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Permissions</label>
            <div style={{ display: 'flex', gap: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={permissions.can_view}
                  onChange={(e) => setPermissions({ ...permissions, can_view: e.target.checked })}
                />
                👁️ View
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={permissions.can_modify}
                  onChange={(e) => setPermissions({ ...permissions, can_modify: e.target.checked })}
                />
                ✏️ Modify
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={permissions.can_update}
                  onChange={(e) => setPermissions({ ...permissions, can_update: e.target.checked })}
                />
                🔄 Update
              </label>
            </div>
          </div>

          <button
            onClick={handleAssignModule}
            disabled={!selectedModule || loading}
            style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Assigning...' : 'Assign Module'}
          </button>
        </div>

        {/* Assigned Modules */}
        <div>
          <h3>Currently Assigned Modules ({modules.length})</h3>
          
          {modules.length === 0 ? (
            <p style={{ color: '#999', fontStyle: 'italic' }}>No modules assigned yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {modules.map(module => (
                <div key={module.module_name} style={{
                  padding: '12px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  backgroundColor: '#fafafa',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>{module.module_name}</h4>
                    <div style={{ display: 'flex', gap: '15px', fontSize: '14px', color: '#666' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <input
                          type="checkbox"
                          checked={module.can_view || false}
                          onChange={(e) => handleUpdatePermissions(module.module_name, {
                            can_view: e.target.checked,
                            can_modify: module.can_modify,
                            can_update: module.can_update
                          })}
                        />
                        👁️ View
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <input
                          type="checkbox"
                          checked={module.can_modify || false}
                          onChange={(e) => handleUpdatePermissions(module.module_name, {
                            can_view: module.can_view,
                            can_modify: e.target.checked,
                            can_update: module.can_update
                          })}
                        />
                        ✏️ Modify
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <input
                          type="checkbox"
                          checked={module.can_update || false}
                          onChange={(e) => handleUpdatePermissions(module.module_name, {
                            can_view: module.can_view,
                            can_modify: module.can_modify,
                            can_update: e.target.checked
                          })}
                        />
                        🔄 Update
                      </label>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveModule(module.module_name)}
                    style={{
                      backgroundColor: '#f44336',
                      color: 'white',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    🗑️ Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModulePermissionManager;
