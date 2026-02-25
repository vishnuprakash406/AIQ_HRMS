import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles.css';

export default function AdminEmployeeModuleAccess() {
  const [employees, setEmployees] = useState([]);
  const [companyModules, setCompanyModules] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [moduleAccess, setModuleAccess] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const token = localStorage.getItem('companyToken');
  const companyName = localStorage.getItem('company_name');

  const moduleMetadata = {
    inventory: { icon: '📦', label: 'Inventory' },
    employee_management: { icon: '👥', label: 'Employee Management' },
    payroll: { icon: '💰', label: 'Payroll' },
    attendance: { icon: '📍', label: 'Attendance' },
    leave: { icon: '✈️', label: 'Leave' },
    geofencing: { icon: '🗺️', label: 'Geofencing' },
    onboarding: { icon: '🎯', label: 'Onboarding' },
    support: { icon: '💬', label: 'Support' },
    documents: { icon: '📄', label: 'Documents' }
  };

  useEffect(() => {
    if (!token) {
      navigate('/company-login');
      return;
    }
    fetchEmployees();
    fetchCompanyModules();
  }, [token, navigate]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/v1/company/employees', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyModules = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/v1/company/info', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const enabled = data.data.modules.filter(m => m.is_enabled).map(m => m.module_name);
        setCompanyModules(enabled);
      }
    } catch (err) {
      console.error('Error fetching company modules:', err);
    }
  };

  const openModuleModal = (employee) => {
    setSelectedEmployee(employee);
    
    // Initialize module access from employee's current access
    const access = {};
    (employee.module_access || []).forEach(ma => {
      access[ma.module_name] = ma.access_level;
    });
    setModuleAccess(access);
    setShowModuleModal(true);
  };

  const closeModuleModal = () => {
    setShowModuleModal(false);
    setSelectedEmployee(null);
    setModuleAccess({});
  };

  const handleModuleAccessChange = (moduleName, accessLevel) => {
    setModuleAccess(prev => ({
      ...prev,
      [moduleName]: prev[moduleName] === accessLevel ? null : accessLevel
    }));
  };

  const handleSaveModuleAccess = async () => {
    if (!selectedEmployee) return;

    setSaving(true);
    try {
      // Convert moduleAccess object to array format
      const modules = [];
      Object.keys(moduleAccess).forEach(moduleName => {
        if (moduleAccess[moduleName]) {
          modules.push({
            module_name: moduleName,
            access_level: moduleAccess[moduleName]
          });
        }
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/company/employees/${selectedEmployee.id}/modules`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ modules })
        }
      );

      if (response.ok) {
        alert('Module access updated successfully');
        closeModuleModal();
        await fetchEmployees();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update module access');
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const getAccessSummary = (employee) => {
    const access = employee.module_access || [];
    if (access.length === 0) return 'No access';
    
    const modify = access.filter(a => a.access_level === 'modify').length;
    const view = access.filter(a => a.access_level === 'view').length;
    
    return `${modify} Modify, ${view} View`;
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1>👥 Employee Module Access</h1>
          <p>Manage module permissions for employees - {companyName}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/company-dashboard')}>
          ← Back to Dashboard
        </button>
      </header>

      <main className="dashboard-main">
        {loading ? (
          <div className="loading">Loading employees...</div>
        ) : (
          <section className="card">
            <h2>Employees</h2>
            {employees.length === 0 ? (
              <p>No employees found.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Branch</th>
                    <th>Module Access</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(employee => (
                    <tr key={employee.id}>
                      <td>{employee.fullName || employee.fullname || 'N/A'}</td>
                      <td>{employee.email}</td>
                      <td>
                        <span className="badge">{employee.role}</span>
                      </td>
                      <td>{employee.branch_name || 'No branch'}</td>
                      <td>{getAccessSummary(employee)}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => openModuleModal(employee)}
                        >
                          🔑 Manage Access
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}
      </main>

      {/* Module Access Modal */}
      {showModuleModal && selectedEmployee && (
        <div className="modal-overlay" onClick={closeModuleModal}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔑 Module Access - {selectedEmployee.fullName || selectedEmployee.fullname || 'Employee'}</h3>
              <button className="modal-close" onClick={closeModuleModal}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '20px', color: '#666' }}>
                Set module access permissions for each module. Choose "View" for read-only access or "Modify" for full access.
              </p>
              
              <div className="module-access-grid">
                {companyModules.map(moduleName => {
                  const meta = moduleMetadata[moduleName] || { icon: '📌', label: moduleName };
                  const currentAccess = moduleAccess[moduleName];
                  
                  return (
                    <div key={moduleName} className="module-access-item">
                      <div className="module-info">
                        <span className="module-icon">{meta.icon}</span>
                        <span className="module-name">{meta.label}</span>
                      </div>
                      <div className="access-buttons">
                        <button
                          className={`btn btn-sm ${currentAccess === 'view' ? 'btn-info' : 'btn-outline'}`}
                          onClick={() => handleModuleAccessChange(moduleName, 'view')}
                        >
                          👁️ View
                        </button>
                        <button
                          className={`btn btn-sm ${currentAccess === 'modify' ? 'btn-success' : 'btn-outline'}`}
                          onClick={() => handleModuleAccessChange(moduleName, 'modify')}
                        >
                          ✏️ Modify
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={closeModuleModal}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveModuleAccess}
                disabled={saving}
              >
                {saving ? '💾 Saving...' : '💾 Save Access'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .module-access-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 15px;
        }

        .module-access-item {
          padding: 15px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          background: #f9f9f9;
        }

        .module-info {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
        }

        .module-icon {
          font-size: 24px;
          margin-right: 10px;
        }

        .module-name {
          font-weight: 600;
          font-size: 14px;
        }

        .access-buttons {
          display: flex;
          gap: 8px;
        }

        .access-buttons .btn {
          flex: 1;
        }

        .btn-outline {
          background: white;
          border: 1px solid #ddd;
          color: #666;
        }

        .btn-outline:hover {
          background: #f5f5f5;
        }

        .btn-info {
          background: #2196F3;
          color: white;
          border: none;
        }

        .btn-success {
          background: #4CAF50;
          color: white;
          border: none;
        }

        .large-modal {
          max-width: 800px;
          max-height: 80vh;
          overflow-y: auto;
        }

        .badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          background: #e0e0e0;
          color: #333;
        }
      `}</style>
    </div>
  );
}
