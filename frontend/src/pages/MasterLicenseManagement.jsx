import React, { useState, useEffect } from 'react';
import client from '../api/client';
import '../styles.css';

const MasterLicenseManagement = () => {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingLicense, setEditingLicense] = useState(null);
  const [formData, setFormData] = useState({
    duration_value: 1,
    duration_type: 'years'
  });
  const [expandedLicense, setExpandedLicense] = useState(null);

  useEffect(() => {
    fetchLicenses();
    // Refresh licenses every 5 minutes
    const interval = setInterval(fetchLicenses, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchLicenses = async () => {
    try {
      setLoading(true);
      const response = await client.get('/master/licenses');
      if (response.data.status === 'success') {
        setLicenses(response.data.licenses);
        setError(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch licenses');
      console.error('Fetch licenses error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (license) => {
    setEditingLicense(license.id);
    setFormData({
      duration_value: license.license_duration_value,
      duration_type: license.license_duration_type
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration_value' ? parseInt(value) : value
    }));
  };

  const handleUpdateLicense = async (licenseId) => {
    try {
      const response = await client.put(`/master/licenses/${licenseId}`, formData);
      if (response.data.status === 'success') {
        alert('✅ License updated successfully!');
        setEditingLicense(null);
        fetchLicenses();
      }
    } catch (err) {
      alert('❌ ' + (err.response?.data?.message || 'Failed to update license'));
      console.error('Update license error:', err);
    }
  };

  const handleRenewLicense = async (licenseId) => {
    try {
      const response = await client.post(`/master/licenses/${licenseId}/renew`, formData);
      if (response.data.status === 'success') {
        alert('✅ License renewed successfully!');
        setEditingLicense(null);
        fetchLicenses();
      }
    } catch (err) {
      alert('❌ ' + (err.response?.data?.message || 'Failed to renew license'));
      console.error('Renew license error:', err);
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

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#7f8c8d' }}>⏳ Loading licenses...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.mainTitle}>📋 License Management</h1>
      <p style={styles.subtitle}>Manage company licenses and monitor expiration dates</p>

      {error && (
        <div style={styles.alert.error}>
          <strong>⚠️ Error:</strong> {error}
        </div>
      )}

      {licenses.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={{ fontSize: '16px', color: '#7f8c8d' }}>No licenses found</p>
        </div>
      ) : (
        <div style={styles.licenseGrid}>
          {licenses.map(license => (
            <div
              key={license.id}
              style={{
                ...styles.licenseCard,
                borderLeftColor: getStatusColor(license.remaining_days, license.is_active)
              }}
            >
              {/* Header */}
              <div style={styles.cardHeader}>
                <div style={styles.headerLeft}>
                  <h2 style={styles.companyName}>{license.company_name || 'N/A'}</h2>
                  <p style={styles.companyCode}>Code: {license.company_code}</p>
                </div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: getStatusColor(license.remaining_days, license.is_active),
                  padding: '6px 12px',
                  backgroundColor: getStatusColor(license.remaining_days, license.is_active) + '20',
                  borderRadius: '4px'
                }}>
                  {getStatusText(license.remaining_days, license.is_active)}
                </div>
              </div>

              {/* License Info Grid */}
              <div style={styles.infoGrid}>
                <div style={styles.infoBox}>
                  <label>📅 Start Date</label>
                  <p>{new Date(license.license_start_date).toLocaleDateString()}</p>
                </div>
                <div style={styles.infoBox}>
                  <label>⏰ End Date</label>
                  <p>{new Date(license.license_end_date).toLocaleDateString()}</p>
                </div>
                <div style={styles.infoBox}>
                  <label>📊 Duration</label>
                  <p>{license.license_duration_value} {license.license_duration_type}</p>
                </div>
                <div style={styles.infoBox}>
                  <label>⏳ Remaining Days</label>
                  <p style={{ color: getStatusColor(license.remaining_days, license.is_active), fontWeight: 'bold' }}>
                    {license.remaining_days} days
                  </p>
                </div>
              </div>

              {/* Company & Employee Details */}
              <div style={styles.detailsGrid}>
                <div>
                  <strong>👥 Employee Count:</strong> {license.employee_count}
                </div>
                <div>
                  <strong>📧 Company Email:</strong> {license.email || 'N/A'}
                </div>
                <div>
                  <strong>📞 Contact:</strong> {license.contact_number || 'N/A'}
                </div>
                {license.latest_employee_created && (
                  <div>
                    <strong>🆕 Latest Employee:</strong> {new Date(license.latest_employee_created).toLocaleDateString()}
                  </div>
                )}
              </div>

              {/* Expandable Employee List */}
              <button
                onClick={() => setExpandedLicense(expandedLicense === license.id ? null : license.id)}
                style={{
                  ...styles.expandButton,
                  marginTop: '10px'
                }}
              >
                {expandedLicense === license.id ? '▼ Hide Employees' : '▶ Show Employees'}
              </button>

              {expandedLicense === license.id && license.employees && license.employees.length > 0 && (
                <div style={styles.employeeList}>
                  <h4>📝 Employees ({license.employees.length})</h4>
                  <div style={styles.employeeTable}>
                    <div style={styles.employeeTableHeader}>
                      <div>Name</div>
                      <div>Email</div>
                      <div>Role</div>
                      <div>Created</div>
                    </div>
                    {license.employees.map(emp => (
                      <div key={emp.id} style={styles.employeeTableRow}>
                        <div>{emp.full_name}</div>
                        <div>{emp.email}</div>
                        <div>{emp.role}</div>
                        <div>{new Date(emp.created_at).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Edit Section */}
              {editingLicense === license.id ? (
                <div style={styles.editForm}>
                  <h4 style={{ marginTop: '15px', marginBottom: '10px' }}>⚙️ Update License</h4>
                  <div style={styles.formGroup}>
                    <label>Duration Value</label>
                    <input
                      type="number"
                      name="duration_value"
                      value={formData.duration_value}
                      onChange={handleInputChange}
                      min="1"
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label>Duration Type</label>
                    <select
                      name="duration_type"
                      value={formData.duration_type}
                      onChange={handleInputChange}
                      style={styles.select}
                    >
                      <option value="months">Months</option>
                      <option value="years">Years</option>
                    </select>
                  </div>
                  <div style={styles.buttonGroup}>
                    <button
                      onClick={() => handleUpdateLicense(license.id)}
                      style={{ ...styles.button, ...styles.buttonPrimary }}
                    >
                      💾 Update License
                    </button>
                    <button
                      onClick={() => handleRenewLicense(license.id)}
                      style={{ ...styles.button, ...styles.buttonSuccess }}
                    >
                      🔄 Renew License
                    </button>
                    <button
                      onClick={() => setEditingLicense(null)}
                      style={{ ...styles.button, ...styles.buttonSecondary }}
                    >
                      ❌ Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => handleEditClick(license)}
                  style={styles.editButton}
                >
                  ✏️ Edit License
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f5f6fa',
    minHeight: '100vh'
  },
  mainTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: '5px'
  },
  subtitle: {
    fontSize: '14px',
    color: '#7f8c8d',
    marginBottom: '20px'
  },
  alert: {
    error: {
      padding: '12px 16px',
      backgroundColor: '#fadbd8',
      border: '1px solid #f5b7b1',
      borderRadius: '4px',
      color: '#c0392b',
      marginBottom: '20px'
    }
  },
  licenseGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))',
    gap: '20px'
  },
  licenseCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    borderLeft: '4px solid #3498db',
    padding: '16px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
    }
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px'
  },
  headerLeft: {
    flex: 1
  },
  companyName: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#2c3e50',
    margin: '0 0 4px 0'
  },
  companyCode: {
    fontSize: '12px',
    color: '#7f8c8d',
    margin: 0
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
    marginBottom: '12px'
  },
  infoBox: {
    backgroundColor: '#f8f9fa',
    padding: '10px',
    borderRadius: '4px'
  },
  detailsGrid: {
    backgroundColor: '#f8f9fa',
    padding: '10px',
    borderRadius: '4px',
    fontSize: '13px',
    color: '#2c3e50',
    lineHeight: '1.6',
    marginBottom: '10px'
  },
  expandButton: {
    padding: '6px 12px',
    backgroundColor: '#ecf0f1',
    border: '1px solid #bdc3c7',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#2c3e50',
    width: '100%',
    transition: 'background-color 0.2s'
  },
  employeeList: {
    marginTop: '12px',
    padding: '10px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px'
  },
  employeeTable: {
    fontSize: '12px'
  },
  employeeTableHeader: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 0.8fr 0.8fr',
    gap: '8px',
    fontWeight: 'bold',
    paddingBottom: '8px',
    borderBottom: '1px solid #e0e0e0',
    marginBottom: '8px',
    color: '#2c3e50'
  },
  employeeTableRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 0.8fr 0.8fr',
    gap: '8px',
    padding: '6px 0',
    borderBottom: '1px solid #ecf0f1',
    color: '#555'
  },
  editForm: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#ecf8ff',
    borderRadius: '4px'
  },
  formGroup: {
    marginBottom: '10px'
  },
  input: {
    width: '100%',
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #bdc3c7',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  select: {
    width: '100%',
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #bdc3c7',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  buttonGroup: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    marginTop: '10px'
  },
  button: {
    padding: '8px 12px',
    borderRadius: '4px',
    border: 'none',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'opacity 0.2s'
  },
  buttonPrimary: {
    backgroundColor: '#3498db',
    color: 'white'
  },
  buttonSuccess: {
    backgroundColor: '#27ae60',
    color: 'white'
  },
  buttonSecondary: {
    backgroundColor: '#95a5a6',
    color: 'white'
  },
  editButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'background-color 0.2s'
  },
  emptyState: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '8px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  }
};

export default MasterLicenseManagement;
