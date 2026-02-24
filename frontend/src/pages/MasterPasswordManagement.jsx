import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles.css';

export default function MasterPasswordManagement() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const token = localStorage.getItem('masterToken');

  useEffect(() => {
    if (!token) {
      navigate('/master-login');
      return;
    }
    fetchCompanies();
  }, [token, navigate]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/api/v1/master/companies', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch companies');
      }

      const data = await response.json();
      setCompanies(data.data || []);
    } catch (err) {
      setMessage(err.message);
      setMessageType('error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyChange = async (companyId) => {
    setSelectedCompany(companyId);
    setSelectedUser('');
    setUsers([]);

    if (!companyId) return;

    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3000/api/v1/master/companies/${companyId}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      setMessage(err.message);
      setMessageType('error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!selectedCompany || !selectedUser || !newPassword) {
      setMessage('Please select company, user, and enter new password');
      setMessageType('warning');
      return;
    }

    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters long');
      setMessageType('warning');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3000/api/v1/master/users/${selectedUser}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newPassword })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to reset password');
      }

      setMessage('Password reset successfully!');
      setMessageType('success');
      setNewPassword('');
      setSelectedUser('');

      setTimeout(() => {
        setMessage('');
      }, 3000);
    } catch (err) {
      setMessage(err.message);
      setMessageType('error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectedUserData = users.find(u => u.id === selectedUser);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1>🔐 Password Management</h1>
          <p style={{ color: 'rgba(255,255,255,0.9)', margin: '5px 0 0 0' }}>
            Reset passwords for users across all companies
          </p>
        </div>
        <button onClick={() => navigate('/master-dashboard')} className="logout-btn">← Back to Dashboard</button>
      </header>

      <main className="dashboard-content">
        {message && (
          <div className={`alert alert-${messageType}`}>
            {messageType === 'success' && '✓'} 
            {messageType === 'error' && '✕'} 
            {messageType === 'warning' && '⚠️'} 
            {' '}{message}
          </div>
        )}

        <section style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className="section-header">
            <h2>🔑 Reset User Password</h2>
          </div>

          <form onSubmit={handleResetPassword} className="edit-form">
            <div className="form-group">
              <label htmlFor="company">🏢 Select Company</label>
              <select
                id="company"
                value={selectedCompany}
                onChange={(e) => handleCompanyChange(e.target.value)}
                required
              >
                <option value="">-- Choose a company --</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name} ({company.company_code})
                  </option>
                ))}
              </select>
            </div>

            {selectedCompany && (
              <>
                <div className="form-group">
                  <label htmlFor="user">👤 Select User</label>
                  <select
                    id="user"
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    required
                  >
                    <option value="">-- Choose a user --</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email} ({user.role})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedUserData && (
                  <div className="company-info-card">
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="label">👤 Name:</span>
                        <span className="value">{selectedUserData.full_name || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <span className="label">📧 Email:</span>
                        <span className="value">{selectedUserData.email}</span>
                      </div>
                      <div className="info-item">
                        <span className="label">📱 Phone:</span>
                        <span className="value">{selectedUserData.phone || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <span className="label">👔 Role:</span>
                        <span className="value">{selectedUserData.role}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="newPassword">🔑 New Password</label>
                  <input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 characters)"
                    required
                  />
                </div>

                <button type="submit" className="btn btn-success" disabled={loading}>
                  {loading ? '⏳ Resetting...' : '✓ Reset Password'}
                </button>
              </>
            )}
          </form>
        </section>
      </main>
    </div>
  );
}
