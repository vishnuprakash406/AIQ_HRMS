import { useState, useEffect } from 'react';
import api from '../api/client.js';

export default function AdminEmployees() {
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    fullName: '',
    designation: '',
    branchId: '',
    password: '',
    role: 'employee'
  });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success', 'error'

  useEffect(() => {
    fetchEmployees();
    fetchBranches();
  }, []);

  // Auto-dismiss success messages
  useEffect(() => {
    if (message && messageType === 'success') {
      const timer = setTimeout(() => setMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [message, messageType]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      // Use company admin endpoints
      const { data } = await api.get('/company/employees');
      const normalizedEmployees = (data.employees || []).map((employee) => {
        // Ensure fullName is set from any possible field name
        const fullName = employee.fullName || employee.full_name || employee.fullname || '';
        return {
          ...employee,
          fullName: fullName.trim() ? fullName : `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unnamed'
        };
      });
      setEmployees(normalizedEmployees);
    } catch (err) {
      setMessage('Error fetching employees');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const { data } = await api.get('/company/branches');
      setBranches(data.branches || []);
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      setMessage('Full name is required');
      setMessageType('error');
      return;
    }
    if (!formData.email && !formData.phone) {
      setMessage('Email or phone is required');
      setMessageType('error');
      return;
    }
    if (!formData.branchId) {
      setMessage('Please select a branch');
      setMessageType('error');
      return;
    }
    try {
      if (editingEmployee) {
        const payload = {
          email: formData.email,
          phone: formData.phone,
          fullName: formData.fullName,
          designation: formData.designation,
          branchId: formData.branchId,
          role: formData.role
        };
        await api.put(`/company/employees/${editingEmployee.id}`, payload);
        setMessage('✅ Employee updated successfully');
        setMessageType('success');
      } else {
        await api.post('/company/employees', formData);
        setMessage('✅ Employee created successfully');
        setMessageType('success');
      }
      setFormData({
        email: '',
        phone: '',
        fullName: '',
        designation: '',
        branchId: '',
        password: '',
        role: 'employee'
      });
      setEditingEmployee(null);
      setShowForm(false);
      fetchEmployees();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error saving employee');
      setMessageType('error');
      console.error(err);
    }
  };

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      email: employee.email || '',
      phone: employee.phone || '',
      fullName: employee.fullName || employee.full_name || '',
      designation: employee.designation || '',
      branchId: employee.branch_id || '',
      password: '',
      role: employee.role || 'employee'
    });
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setEditingEmployee(null);
    setFormData({
      email: '',
      phone: '',
      fullName: '',
      designation: '',
      branchId: '',
      password: '',
      role: 'employee'
    });
    setShowForm(false);
  };

  const handleDeleteEmployee = async (employeeId, employeeName) => {
    if (!window.confirm(`Are you sure you want to delete employee "${employeeName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/company/employees/${employeeId}`);
      setMessage(`✅ Employee ${employeeName} deleted successfully`);
      setMessageType('success');
      setShowSidebar(false);
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error deleting employee');
      setMessageType('error');
      console.error(err);
    }
  };

  const openSidebar = (employee) => {
    setSelectedEmployee(employee);
    setShowSidebar(true);
  };

  const closeSidebar = () => {
    setSelectedEmployee(null);
    setShowSidebar(false);
    setPasswordForm({ newPassword: '', confirmPassword: '' });
    setShowPasswordModal(false);
  };

  const handleResetPassword = async () => {
    if (!passwordForm.newPassword.trim()) {
      setMessage('Please enter a new password');
      setMessageType('error');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage('Passwords do not match');
      setMessageType('error');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage('Password must be at least 6 characters');
      setMessageType('error');
      return;
    }

  if (!window.confirm(`Reset password for ${selectedEmployee.fullName || selectedEmployee.full_name || 'this employee'}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('companyToken');
      const endpoint = `http://localhost:3000/api/v1/company/employees/${selectedEmployee.id}/reset-password`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newPassword: passwordForm.newPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }

  setMessage(`✅ Password reset for ${selectedEmployee.fullName || selectedEmployee.full_name || 'employee'} successfully`);
      setMessageType('success');
      setShowPasswordModal(false);
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    } catch (err) {
      setMessage(err.message || 'Error resetting password');
      setMessageType('error');
      console.error(err);
    }
  };

  const handleAttendanceModeToggle = async (employeeId, currentMode) => {
    try {
      const newMode = currentMode === 'geofencing' ? 'location_tracking' : 'geofencing';
      
      await api.put(`/company/employees/${employeeId}/attendance-mode`, {
        attendanceMode: newMode
      });
      
      // Update local state
      setEmployees(prev => prev.map(emp => 
        emp.id === employeeId ? { ...emp, attendance_mode: newMode } : emp
      ));
      
      setMessage(`Attendance mode updated to ${newMode === 'geofencing' ? 'Geofencing' : 'Location Tracking'}`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error updating attendance mode');
      console.error(err);
    }
  };

  if (loading && employees.length === 0) {
    return <div style={{ padding: '20px' }}>Loading employees...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Manage Employees</h1>
        <button 
          onClick={() => (showForm ? handleCancelEdit() : setShowForm(true))}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {showForm ? 'Cancel' : 'Add Employee'}
        </button>
      </div>

      {message && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '20px',
          backgroundColor: messageType === 'error' ? '#ffebee' : '#e8f5e9',
          color: messageType === 'error' ? '#c62828' : '#2e7d32',
          borderRadius: '4px',
          border: `1px solid ${messageType === 'error' ? '#ef5350' : '#66bb6a'}`
        }}>
          {message}
        </div>
      )}

      {showForm && (
        <div style={{
          padding: '20px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          marginBottom: '20px',
          maxWidth: '500px'
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Full Name *</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Designation</label>
              <input
                type="text"
                name="designation"
                value={formData.designation}
                onChange={handleInputChange}
                placeholder="e.g., Software Engineer, Manager"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Branch *</label>
              <select
                name="branchId"
                value={formData.branchId}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">Select Branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                disabled={Boolean(editingEmployee)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              />
              {editingEmployee && (
                <div style={{ marginTop: '6px', fontSize: '12px', color: '#666' }}>
                  Password cannot be edited here.
                </div>
              )}
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Role</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {editingEmployee ? 'Update Employee' : 'Create Employee'}
            </button>
          </form>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>Employee Code</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Full Name</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Designation</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Email</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Phone</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Branch</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Role</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Attendance Mode</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Created</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px' }}>
                  <strong style={{ color: '#007bff', fontSize: '13px' }}>{emp.employee_code || 'N/A'}</strong>
                </td>
                <td style={{ padding: '12px' }}>{emp.fullName || 'N/A'}</td>
                <td style={{ padding: '12px' }}>{emp.designation || '-'}</td>
                <td style={{ padding: '12px' }}>{emp.email || 'N/A'}</td>
                <td style={{ padding: '12px' }}>{emp.phone || 'N/A'}</td>
                  <td style={{ padding: '12px' }}>{emp.branch_name || 'No Branch'}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    padding: '4px 8px',
                    backgroundColor: emp.role === 'admin' ? '#ffcdd2' : '#c8e6c9',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    {emp.role}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <div
                        onClick={() => handleAttendanceModeToggle(emp.id, emp.attendance_mode)}
                        style={{
                          width: '50px',
                          height: '24px',
                          backgroundColor: emp.attendance_mode === 'geofencing' ? '#4CAF50' : '#2196F3',
                          borderRadius: '12px',
                          position: 'relative',
                          cursor: 'pointer',
                          transition: 'background-color 0.3s'
                        }}
                      >
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '2px',
                            left: emp.attendance_mode === 'geofencing' ? '28px' : '2px',
                            transition: 'left 0.3s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '500' }}>
                        {emp.attendance_mode === 'geofencing' ? '🗺️ Geofencing' : '📍 Location Tracking'}
                      </span>
                    </label>
                  </div>
                </td>
                <td style={{ padding: '12px' }}>{new Date(emp.created_at).toLocaleDateString()}</td>
                <td style={{ padding: '12px' }}>
                  <button
                    onClick={() => openSidebar(emp)}
                    style={{
                      padding: '6px 16px',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    ⚙️ Actions
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {employees.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          No employees found. Create one to get started!
        </div>
      )}

      {/* Sidebar for Employee Actions */}
      {showSidebar && selectedEmployee && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: '350px',
          backgroundColor: 'white',
          boxShadow: '-2px 0 10px rgba(0,0,0,0.1)',
          zIndex: 1000,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Sidebar Header */}
          <div style={{
            padding: '20px',
            borderBottom: '2px solid #f0f0f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f9f9f9'
          }}>
            <h3 style={{ margin: 0 }}>Actions</h3>
            <button
              onClick={closeSidebar}
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

          {/* Employee Info */}
          <div style={{
            padding: '20px',
            backgroundColor: '#f5f5f5',
            borderBottom: '1px solid #ddd'
          }}>
            <div style={{ marginBottom: '10px' }}>
              <strong style={{ color: '#666' }}>Employee</strong>
              <p style={{ margin: '5px 0 0 0', fontSize: '16px', fontWeight: 'bold' }}>
                 {selectedEmployee.fullName || selectedEmployee.full_name || 'Unknown'}
              </p>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong style={{ color: '#666' }}>Employee Code</strong>
              <p style={{ margin: '5px 0 0 0', fontSize: '16px', color: '#007bff', fontWeight: 'bold' }}>
                {selectedEmployee.employee_code || 'N/A'}
              </p>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong style={{ color: '#666' }}>Email</strong>
              <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>
                 {selectedEmployee.email || '-'}
              </p>
            </div>
            <div>
              <strong style={{ color: '#666' }}>Branch</strong>
              <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>
                 {selectedEmployee.branch_name || '-'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            padding: '20px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <button
              onClick={() => {
                handleEditEmployee(selectedEmployee);
                closeSidebar();
              }}
              style={{
                padding: '12px 16px',
                backgroundColor: '#ffb300',
                color: '#1f1f1f',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                justifyContent: 'center'
              }}
            >
              ✏️ Modify Employee
            </button>

            <button
              onClick={() => setShowPasswordModal(true)}
              style={{
                padding: '12px 16px',
                backgroundColor: '#8e44ad',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                justifyContent: 'center'
              }}
            >
              🔐 Reset Password
            </button>

            <button
               onClick={() => handleDeleteEmployee(selectedEmployee.id, selectedEmployee.fullName || selectedEmployee.full_name || 'this employee')}
              style={{
                padding: '12px 16px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                justifyContent: 'center'
              }}
            >
              🗑️ Delete Employee
            </button>
          </div>
        </div>
      )}

      {/* Overlay for Sidebar */}
      {showSidebar && (
        <div
          onClick={closeSidebar}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            zIndex: 999
          }}
        />
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && selectedEmployee && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          zIndex: 1001,
          maxWidth: '400px',
          width: '90%'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px' }}>
             🔐 Reset Password for {selectedEmployee.fullName || selectedEmployee.full_name || 'Employee'}
          </h3>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              New Password *
            </label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box',
                fontSize: '14px'
              }}
              placeholder="Enter new password"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Confirm Password *
            </label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box',
                fontSize: '14px'
              }}
              placeholder="Confirm password"
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowPasswordModal(false)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#ddd',
                color: '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleResetPassword}
              style={{
                padding: '10px 20px',
                backgroundColor: '#8e44ad',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Reset Password
            </button>
          </div>
        </div>
      )}

      {/* Modal Overlay for Password Reset */}
      {showPasswordModal && (
        <div
          onClick={() => setShowPasswordModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            zIndex: 1000
          }}
        />
      )}
    </div>
  );
}
