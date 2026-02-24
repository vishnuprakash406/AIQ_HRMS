import { useState, useEffect } from 'react';
import api from '../api/client.js';

export default function AdminPasswordManagement() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [resetPasswords, setResetPasswords] = useState({});

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/auth/employees');
      setEmployees(data.employees || []);
    } catch (err) {
      setMessage('Error fetching employees');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (employeeId) => {
    try {
      const pwd = resetPasswords[employeeId];
      if (!pwd || pwd.trim() === '') {
        setMessage('Please enter a password');
        return;
      }

      if (pwd.length < 6) {
        setMessage('Password must be at least 6 characters');
        return;
      }

      const { data } = await api.post('/auth/reset-employee-password', {
        userId: employeeId,
        newPassword: pwd
      });
      
      setMessage(`Password reset for ${data.employee.email} successfully`);
      setResetPasswords(prev => ({
        ...prev,
        [employeeId]: ''
      }));
      
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error resetting password');
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
      <h1>Employee Password Management</h1>
      
      {message && <div style={styles.message}>{message}</div>}

      {loading ? (
        <p>Loading employees...</p>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Phone</th>
                <th>New Password</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id}>
                  <td>{emp.email}</td>
                  <td>{emp.full_name}</td>
                  <td>{emp.phone}</td>
                  <td>
                    <input
                      type="password"
                      placeholder="Enter new password"
                      value={resetPasswords[emp.id] || ''}
                      onChange={(e) => handlePasswordChange(emp.id, e.target.value)}
                      style={styles.input}
                      minLength={6}
                    />
                  </td>
                  <td>
                    <button
                      onClick={() => handleResetPassword(emp.id)}
                      style={styles.resetBtn}
                    >
                      Reset
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
    maxWidth: '1200px',
    margin: '0 auto'
  },
  message: {
    padding: '10px',
    marginBottom: '20px',
    backgroundColor: '#d4edda',
    color: '#155724',
    borderRadius: '4px',
    border: '1px solid #c3e6cb'
  },
  tableWrapper: {
    overflowX: 'auto',
    marginTop: '20px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '10px'
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    width: '120px'
  },
  resetBtn: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  }
};
