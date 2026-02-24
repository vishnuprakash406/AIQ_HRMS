import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import '../styles.css';

export default function MasterCompanyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modules, setModules] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contact_number: '',
    employee_limit: 0,
    is_active: true
  });

  // License State
  const [license, setLicense] = useState(null);
  const [editingLicense, setEditingLicense] = useState(false);
  const [licenseForm, setLicenseForm] = useState({
    duration_value: 1,
    duration_type: 'years'
  });

  // Users State
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  
  // Company Password Reset State
  const [showCompanyPasswordModal, setShowCompanyPasswordModal] = useState(false);
  const [companyNewPassword, setCompanyNewPassword] = useState('');

  const token = localStorage.getItem('masterToken');

  useEffect(() => {
    if (!token) {
      navigate('/master-login');
      return;
    }
    fetchCompanyDetails();
    fetchLicense();
    fetchUsers();
  }, [id, token, navigate]);

  const fetchCompanyDetails = async () => {
    try {
      const response = await client.get(`/master/companies/${id}`);
      if (response.data.status === 'success') {
        setCompany(response.data.data);
        setModules(response.data.data.modules || []);
        setFormData({
          name: response.data.data.name,
          email: response.data.data.email || '',
          contact_number: response.data.data.contact_number || '',
          employee_limit: response.data.data.employee_limit,
          is_active: response.data.data.is_active
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch company details');
    } finally {
      setLoading(false);
    }
  };

  const fetchLicense = async () => {
    try {
      const response = await client.get(`/master/licenses/company/${id}`);
      if (response.data.status === 'success') {
        setLicense(response.data.license);
        setLicenseForm({
          duration_value: response.data.license.license_duration_value,
          duration_type: response.data.license.license_duration_type
        });
      }
    } catch (err) {
      console.error('Failed to fetch license:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await client.get(`/master/companies/${id}/users`);
      if (response.data.status === 'success') {
        setUsers(response.data.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name === 'employee_limit' ? parseInt(value, 10) : value
    }));
  };

  const handleUpdateCompany = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await client.put(`/master/companies/${id}`, formData);
      if (response.data.status === 'success') {
        setSuccess('✅ Company updated successfully!');
        setIsEditing(false);
        await fetchCompanyDetails();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update company');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleModule = async (moduleName) => {
    try {
      const currentModule = modules.find(m => m.module_name === moduleName);
      const newStatus = !currentModule.is_enabled;
      const response = await client.put(`/master/companies/${id}/modules/${moduleName}`, { is_enabled: newStatus });
      if (response.data.status === 'success') {
        await fetchCompanyDetails();
      }
    } catch (err) {
      setError('Failed to toggle module');
    }
  };

  const handleUpdateLicense = async () => {
    try {
      const response = await client.put(`/master/licenses/${license.id}`, licenseForm);
      if (response.data.status === 'success') {
        setSuccess('✅ License updated successfully!');
        setEditingLicense(false);
        await fetchLicense();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update license');
    }
  };

  const handleRenewLicense = async () => {
    try {
      const response = await client.post(`/master/licenses/${license.id}/renew`, licenseForm);
      if (response.data.status === 'success') {
        setSuccess('✅ License renewed successfully!');
        setEditingLicense(false);
        await fetchLicense();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to renew license');
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      const response = await client.post(`/master/users/${selectedUser.id}/reset-password`, { newPassword });
      if (response.data.status === 'success') {
        setSuccess(`✅ Password reset for ${selectedUser.full_name}`);
        setShowPasswordModal(false);
        setSelectedUser(null);
        setNewPassword('');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    }
  };

  const handleResetCompanyPassword = async () => {
    if (!companyNewPassword || companyNewPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      const response = await client.post(`/master/companies/${id}/reset-password`, { newPassword: companyNewPassword });
      if (response.data.status === 'success') {
        setSuccess(`✅ Company admin password reset successfully!`);
        setShowCompanyPasswordModal(false);
        setCompanyNewPassword('');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset company password');
    }
  };

  const getStatusColor = (remainingDays, isActive) => {
    if (!isActive) return '#e74c3c';
    if (remainingDays <= 0) return '#e74c3c';
    if (remainingDays <= 30) return '#f39c12';
    if (remainingDays <= 90) return '#3498db';
    return '#27ae60';
  };

  const getStatusText = (remainingDays, isActive) => {
    if (!isActive) return '🔴 Inactive';
    if (remainingDays <= 0) return '🔴 Expired';
    if (remainingDays <= 30) return '🟠 Expiring Soon';
    if (remainingDays <= 90) return '🔵 Active';
    return '🟢 Active';
  };

  if (loading && !company) {
    return <div style={{ padding: '40px', textAlign: 'center', fontSize: '18px' }}>⏳ Loading...</div>;
  }

  if (!company) {
    return (
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1>Company Details</h1>
          <button onClick={() => navigate('/master-dashboard')} className="logout-btn">← Back</button>
        </header>
        <div style={{ padding: '20px' }}><p>Company not found</p></div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1>🏢 {company.name}</h1>
          <p style={{ color: 'rgba(255,255,255,0.9)', margin: '5px 0 0 0' }}>Code: {company.company_code}</p>
        </div>
        <button onClick={() => navigate('/master-dashboard')} className="logout-btn">← Back</button>
      </header>

      <main className="dashboard-content">
        {error && <div className="error-message" style={{ marginBottom: '20px' }}>⚠️ {error}</div>}
        {success && <div style={{
          padding: '12px 16px',
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '4px',
          color: '#155724',
          marginBottom: '20px'
        }}>{success}</div>}

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(activeTab === 'details' ? styles.activeTab : {}) }}
            onClick={() => setActiveTab('details')}
          >
            📋 Details & Modules
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'license' ? styles.activeTab : {}) }}
            onClick={() => setActiveTab('license')}
          >
            📅 License Management
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'users' ? styles.activeTab : {}) }}
            onClick={() => setActiveTab('users')}
          >
            👥 User Management ({users.length})
          </button>
        </div>

        {/* Details Tab */}
        {activeTab === 'details' && (
          <>
            <section style={{ marginBottom: '30px' }}>
              <div className="section-header">
                <h2>📋 Company Information</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => setShowCompanyPasswordModal(true)} 
                    className="btn"
                    style={{ backgroundColor: '#e74c3c', color: 'white' }}
                  >
                    🔐 Reset Company Password
                  </button>
                  <button onClick={() => setIsEditing(!isEditing)} className="btn btn-primary">
                    {isEditing ? '✕ Cancel' : '✎ Edit'}
                  </button>
                </div>
              </div>

              {!isEditing ? (
                <div className="company-info-card">
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="label">📌 Company Code:</span>
                      <span className="value">{company.company_code}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">🏢 Company Name:</span>
                      <span className="value">{company.name}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">📧 Email:</span>
                      <span className="value">{company.email || 'N/A'}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">📞 Contact Number:</span>
                      <span className="value">{company.contact_number || 'N/A'}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">👥 Employee Limit:</span>
                      <span className="value">{company.employee_limit}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">✨ Status:</span>
                      <span className="value">{company.is_active ? '✅ Active' : '❌ Inactive'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleUpdateCompany} className="create-company-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="name">🏢 Company Name</label>
                      <input type="text" id="name" name="name" value={formData.name} onChange={handleInputChange} required />
                    </div>
                    <div className="form-group">
                      <label htmlFor="email">📧 Email</label>
                      <input type="email" id="email" name="email" value={formData.email} onChange={handleInputChange} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="contact_number">📞 Contact Number</label>
                      <input type="text" id="contact_number" name="contact_number" value={formData.contact_number} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                      <label htmlFor="employee_limit">👥 Employee Limit</label>
                      <input type="number" id="employee_limit" name="employee_limit" value={formData.employee_limit} onChange={handleInputChange} required />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: '15px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleInputChange} />
                      <span>✨ Company Active</span>
                    </label>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? '⏳ Saving...' : '💾 Save Changes'}
                  </button>
                </form>
              )}
            </section>

            <section>
              <div className="section-header">
                <h2>🔧 Modules</h2>
              </div>
              <div className="modules-grid">
                {modules.map((module) => (
                  <div key={module.module_name} className={`module-card ${module.is_enabled ? 'enabled' : 'disabled'}`}>
                    <div className="module-info">
                      <h3>{module.module_name.replace(/_/g, ' ')}</h3>
                      <span className="module-status">{module.is_enabled ? '✅ Enabled' : '❌ Disabled'}</span>
                    </div>
                    <button onClick={() => handleToggleModule(module.module_name)} className="btn btn-secondary">
                      {module.is_enabled ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* License Tab */}
        {activeTab === 'license' && license && (
          <section>
            <div className="section-header">
              <h2>📅 License Details</h2>
              <button onClick={() => setEditingLicense(!editingLicense)} className="btn btn-primary">
                {editingLicense ? '✕ Cancel' : '✎ Edit License'}
              </button>
            </div>

            <div style={styles.licenseCard}>
              <div style={styles.licenseHeader}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '20px' }}>{company.name}</h3>
                  <p style={{ margin: '5px 0 0 0', color: '#7f8c8d', fontSize: '14px' }}>Code: {company.company_code}</p>
                </div>
                <div style={{
                  padding: '8px 16px',
                  backgroundColor: getStatusColor(license.remaining_days, license.is_active) + '20',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  color: getStatusColor(license.remaining_days, license.is_active)
                }}>
                  {getStatusText(license.remaining_days, license.is_active)}
                </div>
              </div>

              <div style={styles.licenseGrid}>
                <div style={styles.licenseBox}>
                  <div style={styles.licenseLabel}>📅 Start Date</div>
                  <div style={styles.licenseValue}>{new Date(license.license_start_date).toLocaleDateString()}</div>
                </div>
                <div style={styles.licenseBox}>
                  <div style={styles.licenseLabel}>⏰ End Date</div>
                  <div style={styles.licenseValue}>{new Date(license.license_end_date).toLocaleDateString()}</div>
                </div>
                <div style={styles.licenseBox}>
                  <div style={styles.licenseLabel}>📊 Duration</div>
                  <div style={styles.licenseValue}>{license.license_duration_value} {license.license_duration_type}</div>
                </div>
                <div style={styles.licenseBox}>
                  <div style={styles.licenseLabel}>⏳ Remaining Days</div>
                  <div style={{ ...styles.licenseValue, color: getStatusColor(license.remaining_days, license.is_active), fontWeight: 'bold' }}>
                    {license.remaining_days} days
                  </div>
                </div>
              </div>

              {editingLicense && (
                <div style={styles.editForm}>
                  <h4>⚙️ Update License</h4>
                  <div style={styles.formRow}>
                    <div style={styles.formGroup}>
                      <label>Duration Value</label>
                      <input
                        type="number"
                        value={licenseForm.duration_value}
                        onChange={(e) => setLicenseForm({ ...licenseForm, duration_value: parseInt(e.target.value) })}
                        min="1"
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label>Duration Type</label>
                      <select
                        value={licenseForm.duration_type}
                        onChange={(e) => setLicenseForm({ ...licenseForm, duration_type: e.target.value })}
                        style={styles.select}
                      >
                        <option value="months">Months</option>
                        <option value="years">Years</option>
                      </select>
                    </div>
                  </div>
                  <div style={styles.buttonRow}>
                    <button onClick={handleUpdateLicense} style={styles.btnPrimary}>💾 Update License</button>
                    <button onClick={handleRenewLicense} style={styles.btnSuccess}>🔄 Renew License</button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <section>
            <div className="section-header">
              <h2>👥 User Management ({users.length} users)</h2>
            </div>

            {users.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'white', borderRadius: '8px' }}>
                <p style={{ color: '#7f8c8d' }}>No users found for this company</p>
              </div>
            ) : (
              <div style={styles.userTable}>
                <div style={styles.userTableHeader}>
                  <div>Full Name</div>
                  <div>Email</div>
                  <div>Phone</div>
                  <div>Role</div>
                  <div>Created</div>
                  <div>Actions</div>
                </div>
                {users.map((user) => (
                  <div key={user.id} style={styles.userTableRow}>
                    <div>{user.full_name}</div>
                    <div>{user.email}</div>
                    <div>{user.phone || 'N/A'}</div>
                    <div>
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: user.role === 'admin' ? '#3498db' : '#95a5a6',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {user.role}
                      </span>
                    </div>
                    <div>{new Date(user.created_at).toLocaleDateString()}</div>
                    <div>
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowPasswordModal(true);
                          setNewPassword('');
                        }}
                        style={styles.resetBtn}
                      >
                        🔐 Reset Password
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Password Reset Modal */}
        {showPasswordModal && selectedUser && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <h3>🔐 Reset Password</h3>
              <p style={{ marginBottom: '15px', color: '#7f8c8d' }}>
                Reset password for: <strong>{selectedUser.full_name}</strong>
              </p>
              <div style={styles.formGroup}>
                <label>New Password (min 6 characters)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  style={styles.input}
                />
              </div>
              <div style={styles.buttonRow}>
                <button onClick={handleResetPassword} style={styles.btnPrimary}>✅ Reset Password</button>
                <button onClick={() => { setShowPasswordModal(false); setSelectedUser(null); setNewPassword(''); }} style={styles.btnSecondary}>
                  ❌ Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Company Password Reset Modal */}
        {showCompanyPasswordModal && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <h3>🔐 Reset Company Admin Password</h3>
              <p style={{ marginBottom: '15px', color: '#7f8c8d' }}>
                Reset admin login password for: <strong>{company?.name}</strong> ({company?.company_code})
              </p>
              <div style={styles.formGroup}>
                <label>New Password (min 6 characters)</label>
                <input
                  type="password"
                  value={companyNewPassword}
                  onChange={(e) => setCompanyNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  style={styles.input}
                />
              </div>
              <div style={styles.buttonRow}>
                <button onClick={handleResetCompanyPassword} style={styles.btnPrimary}>✅ Reset Password</button>
                <button onClick={() => { setShowCompanyPasswordModal(false); setCompanyNewPassword(''); }} style={styles.btnSecondary}>
                  ❌ Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  tabs: {
    display: 'flex',
    gap: '10px',
    marginBottom: '30px',
    borderBottom: '2px solid #ecf0f1'
  },
  tab: {
    padding: '12px 24px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#7f8c8d',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    borderBottom: '3px solid transparent',
    transition: 'all 0.3s'
  },
  activeTab: {
    color: '#3498db',
    borderBottomColor: '#3498db'
  },
  licenseCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  licenseHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '2px solid #ecf0f1'
  },
  licenseGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '15px',
    marginBottom: '20px'
  },
  licenseBox: {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderRadius: '6px'
  },
  licenseLabel: {
    fontSize: '13px',
    color: '#7f8c8d',
    marginBottom: '8px',
    fontWeight: '600'
  },
  licenseValue: {
    fontSize: '16px',
    color: '#2c3e50',
    fontWeight: '600'
  },
  editForm: {
    backgroundColor: '#ecf8ff',
    padding: '20px',
    borderRadius: '6px',
    marginTop: '15px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    marginBottom: '15px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  input: {
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #bdc3c7',
    fontSize: '14px'
  },
  select: {
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #bdc3c7',
    fontSize: '14px'
  },
  buttonRow: {
    display: 'flex',
    gap: '10px'
  },
  btnPrimary: {
    padding: '10px 20px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  btnSuccess: {
    padding: '10px 20px',
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  btnSecondary: {
    padding: '10px 20px',
    backgroundColor: '#95a5a6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  userTable: {
    backgroundColor: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  userTableHeader: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 1.5fr 1fr 0.8fr 1fr 1fr',
    gap: '15px',
    padding: '15px 20px',
    backgroundColor: '#3498db',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '14px'
  },
  userTableRow: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 1.5fr 1fr 0.8fr 1fr 1fr',
    gap: '15px',
    padding: '15px 20px',
    borderBottom: '1px solid #ecf0f1',
    alignItems: 'center',
    fontSize: '14px'
  },
  resetBtn: {
    padding: '6px 12px',
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    minWidth: '400px'
  }
};
