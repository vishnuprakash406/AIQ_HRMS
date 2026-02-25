import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminPasswordManagement() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [resetPasswords, setResetPasswords] = useState({});
  const navigate = useNavigate();
  
  const token = localStorage.getItem('companyToken');

  useEffect(() => {
    if (!token) {
      navigate('/company-login');
      return;
    }
    fetchEmployees();
  }, [token, navigate]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/api/v1/company/employees', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }
      
      const result = await response.json();
      setEmployees(result.employees || []);
    } catch (err) {
      setMessage('Error fetching employees');
      setMessageType('error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (employeeId, employeeName) => {
    try {
      const pwd = resetPasswords[employeeId];
      if (!pwd || pwd.trim() === '') {
        setMessage('Please enter a password');
        setMessageType('error');
        return;
      }

      if (pwd.length < 6) {
        setMessage('Password must be at least 6 characters');
        setMessageType('error');
        return;
      }

      const response = await fetch(`http://localhost:3000/api/v1/company/employees/${employeeId}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newPassword: pwd })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reset password');
      }
      
      setMessage(`Password reset for ${employeeName} successfully`);
      setMessageType('success');
      setResetPasswords(prev => ({
        ...prev,
        [employeeId]: ''
      }));
      
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.message || 'Error resetting password');
      setMessageType('error');
      console.error(err);
    }
  };

  const handlePasswordChange = (employeeId, value) => {
    setResetPasswords(prev => ({
      ...prev,
      [employeeId]: value
    }));
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>🔐 Employee Password Management</h1>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>← Back</button>
      </div>
      
      {message && (
        <div style={{
          ...styles.message,
          backgroundColor: messageType === 'success' ? '#d4edda' : '#f8d7da',
          color: messageType === 'success' ? '#155724' : '#721c24',
          border: messageType === 'success' ? '1px solid #c3e6cb' : '1px solid #f5c6cb'
        }}>
          {message}
        </div>
      )}

      {loading ? (
        <p>Loading employees...</p>
      ) : employees.length === 0 ? (
        <p style={styles.emptyState}>No employees found</p>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Employee Code</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Phone</th>
                <th style={styles.th}>Branch</th>
                <th style={styles.th}>Designation</th>
                <th style={styles.th}>New Password</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id} style={styles.tr}>
                  <td style={styles.td}>
                    <strong style={{ color: '#007bff' }}>{emp.employee_code || 'N/A'}</strong>
                  </td>
                  <td style={styles.td}>{emp.full_name}</td>
                  <td style={styles.td}>{emp.email}</td>
                  <td style={styles.td}>{emp.phone}</td>
                  <td style={styles.td}>{emp.branch_name || 'N/A'}</td>
                  <td style={styles.td}>{emp.designation || 'N/A'}</td>
                  <td style={styles.td}>
                    <input
                      type="password"
                      placeholder="Enter new password"
                      value={resetPasswords[emp.id] || ''}
                      onChange={(e) => handlePasswordChange(emp.id, e.target.value)}
                      style={styles.input}
                      minLength={6}
                    />
                  </td>
                  <td style={styles.td}>
                    <button
                      onClick={() => handleResetPassword(emp.id, emp.full_name)}
                      style={styles.resetBtn}
                    >
                      Reset Password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  backBtn: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  message: {
    padding: '12px 16px',
    marginBottom: '20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    color: '#666'
  },
  tableWrapper: {
    overflowX: 'auto',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    padding: '20px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    padding: '12px',
    textAlign: 'left',
    borderBottom: '2px solid #dee2e6',
    backgroundColor: '#f8f9fa',
    fontWeight: '600',
    color: '#495057',
    fontSize: '14px'
  },
  tr: {
    borderBottom: '1px solid #dee2e6'
  },
  td: {
    padding: '12px',
    fontSize: '14px',
    color: '#212529'
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '14px',
    width: '180px',
    outline: 'none'
  },
  resetBtn: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'background-color 0.2s'
  }
};
