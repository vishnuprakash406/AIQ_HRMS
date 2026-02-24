import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles.css';

export default function MasterDashboard() {
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, inactive
  
  // Password Change State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    company_code: '',
    name: '',
    email: '',
    contact_number: '',
    username: '',
    password: '',
    employee_limit: 50,
    default_modules: []
  });
  const [selectedModules, setSelectedModules] = useState({
    inventory: false,
    employee_management: false,
    payroll: false,
    attendance: true,
    leave: false,
    geofencing: false,
    onboarding: false,
    support: false,
    documents: false
  });
  const navigate = useNavigate();

  const token = localStorage.getItem('masterToken');

  useEffect(() => {
    if (!token) {
      navigate('/master-login');
      return;
    }
    fetchCompanies();
  }, [token, navigate]);

  useEffect(() => {
    let filtered = companies;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(company =>
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.company_code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(company =>
        filterStatus === 'active' ? company.is_active : !company.is_active
      );
    }

    setFilteredCompanies(filtered);
    setCurrentPage(1); // Reset to first page on filter change
  }, [searchTerm, filterStatus, companies]);

  const fetchCompanies = async () => {
    try {
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
      setFilteredCompanies(data.data || []);
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleModuleChange = (module) => {
    setSelectedModules((prev) => ({
      ...prev,
      [module]: !prev[module]
    }));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'employee_limit' ? parseInt(value, 10) : value
    }));
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const default_modules = Object.entries(selectedModules)
        .filter(([, isSelected]) => isSelected)
        .map(([module]) => module);

      const response = await fetch('http://localhost:3000/api/v1/master/companies', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          default_modules
        })
      });

      if (response.ok) {
        setShowCreateForm(false);
        setFormData({
          company_code: '',
          name: '',
          email: '',
          contact_number: '',
          username: '',
          password: '',
          employee_limit: 50,
          default_modules: []
        });
        setSelectedModules({
          inventory: false,
          employee_management: false,
          payroll: false,
          attendance: true,
          leave: false,
          geofencing: false,
          onboarding: false,
          support: false,
          documents: false
        });
        await fetchCompanies();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to create company');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('masterToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    navigate('/master-login');
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/v1/master/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('✅ Password changed successfully!');
        setShowPasswordModal(false);
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to change password');
      }
    } catch (err) {
      setError('Failed to change password');
      console.error(err);
    }
  };

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCompanies = filteredCompanies.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Previous button
    pages.push(
      <button
        key="prev"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={styles.paginationBtn}
      >
        ← Previous
      </button>
    );

    // First page
    if (startPage > 1) {
      pages.push(
        <button key={1} onClick={() => handlePageChange(1)} style={styles.paginationBtn}>
          1
        </button>
      );
      if (startPage > 2) {
        pages.push(<span key="ellipsis1" style={styles.ellipsis}>...</span>);
      }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          style={{
            ...styles.paginationBtn,
            ...(currentPage === i ? styles.activePage : {})
          }}
        >
          {i}
        </button>
      );
    }

    // Last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(<span key="ellipsis2" style={styles.ellipsis}>...</span>);
      }
      pages.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          style={styles.paginationBtn}
        >
          {totalPages}
        </button>
      );
    }

    // Next button
    pages.push(
      <button
        key="next"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={styles.paginationBtn}
      >
        Next →
      </button>
    );

    return <div style={styles.paginationContainer}>{pages}</div>;
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1>🔐 Master Dashboard</h1>
          <p style={{ color: 'rgba(255,255,255,0.9)', margin: '5px 0 0 0' }}>
            Manage all companies and system settings
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={() => setShowPasswordModal(true)} className="btn" style={{ backgroundColor: '#8e44ad', color: 'white' }}>
            🔑 Change Password
          </button>
          <button onClick={handleLogout} className="logout-btn">🚪 Logout</button>
        </div>
      </header>

      <main className="dashboard-content">
        {success && <div style={{
          padding: '12px 16px',
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '4px',
          color: '#155724',
          marginBottom: '20px'
        }}>{success}</div>}

        <section className="companies-section">
          <div className="section-header">
            <h2>🏢 Companies Management ({filteredCompanies.length})</h2>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="btn btn-primary"
            >
              {showCreateForm ? '✕ Cancel' : '➕ Create Company'}
            </button>
          </div>

          {error && <div className="error-message">⚠️ {error}</div>}

          {/* Search & Filter Controls */}
          {!showCreateForm && (
            <div style={styles.filterBar}>
              <div style={styles.searchBox}>
                <input
                  type="text"
                  placeholder="🔍 Search by name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={styles.searchInput}
                />
              </div>
              <div style={styles.filterBox}>
                <label style={{ marginRight: '10px', fontWeight: '600' }}>Status:</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="all">All Companies</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>
            </div>
          )}

          {showCreateForm && (
            <form onSubmit={handleCreateCompany} className="create-company-form">
              <h3>Create New Company</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="company_code">📌 Company Code</label>
                  <input
                    type="text"
                    id="company_code"
                    name="company_code"
                    value={formData.company_code}
                    onChange={handleFormChange}
                    placeholder="e.g., ACME-001"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="name">🏢 Company Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="e.g., ACME Corporation"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="email">📧 Company Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    placeholder="e.g., admin@acme.com"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="contact_number">📱 Contact Number</label>
                  <input
                    type="tel"
                    id="contact_number"
                    name="contact_number"
                    value={formData.contact_number}
                    onChange={handleFormChange}
                    placeholder="e.g., +1-555-0123"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="username">👤 Admin Username</label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleFormChange}
                    placeholder="Admin username"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password">🔑 Admin Password</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleFormChange}
                    placeholder="Admin password"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="employee_limit">👥 Employee Limit</label>
                <input
                  type="number"
                  id="employee_limit"
                  name="employee_limit"
                  value={formData.employee_limit}
                  onChange={handleFormChange}
                  min="1"
                  required
                />
              </div>

              <div className="form-group">
                <label>📋 Default Modules (select to enable)</label>
                <div className="checkbox-group">
                  {Object.entries(selectedModules).map(([module, isSelected]) => (
                    <label key={module} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleModuleChange(module)}
                      />
                      {module.replace(/_/g, ' ').toUpperCase()}
                    </label>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn btn-success" disabled={loading}>
                {loading ? '⏳ Creating...' : '✓ Create Company'}
              </button>
            </form>
          )}

          {loading && <div className="loading">Loading companies...</div>}

          {filteredCompanies.length === 0 && !loading && !showCreateForm && (
            <div className="empty-state">
              <p>
                {searchTerm || filterStatus !== 'all'
                  ? '😐 No companies match your search/filter criteria.'
                  : '😐 No companies yet. Create one to get started.'}
              </p>
            </div>
          )}

          {currentCompanies.length > 0 && !showCreateForm && (
            <>
              <div style={styles.resultInfo}>
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredCompanies.length)} of {filteredCompanies.length} companies
              </div>
              
              <table className="companies-table">
                <thead>
                  <tr>
                    <th>📌 Code</th>
                    <th>🏢 Name</th>
                    <th>👥 Employee Limit</th>
                    <th>✓ Status</th>
                    <th>📅 Created</th>
                    <th>⚙️ Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentCompanies.map((company) => (
                    <tr key={company.id}>
                      <td><strong>{company.company_code}</strong></td>
                      <td>{company.name}</td>
                      <td>{company.employee_limit}</td>
                      <td>
                        <span className={`status ${company.is_active ? 'active' : 'inactive'}`}>
                          {company.is_active ? '🟢 Active' : '🔴 Inactive'}
                        </span>
                      </td>
                      <td>{new Date(company.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-info"
                          onClick={() => navigate(`/master/companies/${company.id}`)}
                        >
                          📋 Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {renderPagination()}
            </>
          )}
        </section>

        {/* Password Change Modal */}
        {showPasswordModal && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <h3>🔑 Change Master Password</h3>
              <form onSubmit={handlePasswordChange}>
                <div style={styles.modalFormGroup}>
                  <label>Current Password</label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    required
                    style={styles.modalInput}
                  />
                </div>
                <div style={styles.modalFormGroup}>
                  <label>New Password (min 6 characters)</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    required
                    style={styles.modalInput}
                  />
                </div>
                <div style={styles.modalFormGroup}>
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    required
                    style={styles.modalInput}
                  />
                </div>
                <div style={styles.modalButtonRow}>
                  <button type="submit" style={styles.modalBtnPrimary}>✅ Change Password</button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      setError('');
                    }} 
                    style={styles.modalBtnSecondary}
                  >
                    ❌ Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  filterBar: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '15px',
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center'
  },
  searchInput: {
    width: '100%',
    padding: '10px 15px',
    fontSize: '14px',
    border: '2px solid #e0e0e0',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.3s'
  },
  filterBox: {
    display: 'flex',
    alignItems: 'center'
  },
  filterSelect: {
    flex: 1,
    padding: '10px',
    fontSize: '14px',
    border: '2px solid #e0e0e0',
    borderRadius: '6px',
    outline: 'none',
    cursor: 'pointer'
  },
  resultInfo: {
    padding: '10px 15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
    fontSize: '14px',
    color: '#555',
    marginBottom: '15px',
    fontWeight: '500'
  },
  paginationContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    marginTop: '30px',
    padding: '20px 0'
  },
  paginationBtn: {
    padding: '8px 14px',
    border: '1px solid #ddd',
    backgroundColor: 'white',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.3s',
    ':hover': {
      backgroundColor: '#f0f0f0'
    },
    ':disabled': {
      opacity: 0.5,
      cursor: 'not-allowed'
    }
  },
  activePage: {
    backgroundColor: '#3498db',
    color: 'white',
    borderColor: '#3498db',
    fontWeight: 'bold'
  },
  ellipsis: {
    padding: '0 8px',
    fontSize: '14px',
    color: '#999'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999
  },
  modalContent: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    minWidth: '400px',
    maxWidth: '500px'
  },
  modalFormGroup: {
    marginBottom: '15px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  modalInput: {
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #bdc3c7',
    fontSize: '14px'
  },
  modalButtonRow: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px'
  },
  modalBtnPrimary: {
    padding: '10px 20px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  modalBtnSecondary: {
    padding: '10px 20px',
    backgroundColor: '#95a5a6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer'
  }
};
