import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles.css';

export default function CompanyDashboard() {
  const [companyInfo, setCompanyInfo] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('companyToken');
  const companyName = localStorage.getItem('company_name');

  // Module metadata with icons and descriptions
  const moduleMetadata = {
    inventory: { icon: '📦', description: 'Manage inventory and stock' },
    employee_management: { icon: '👥', description: 'Manage employees and profiles' },
    payroll: { icon: '💰', description: 'Manage payroll and salaries' },
    attendance: { icon: '📍', description: 'Track attendance and check-in' },
    leave: { icon: '✈️', description: 'Manage leave requests' },
    geofencing: { icon: '🗺️', description: 'Geolocation tracking' },
    onboarding: { icon: '🎯', description: 'Employee onboarding process' },
    support: { icon: '💬', description: 'Support and help desk' },
    documents: { icon: '📄', description: 'Document management' }
  };

  const moduleRoutes = {
    'inventory': '/admin/inventory',
    'employee_management': '/admin/employees',
    'payroll': '/admin/payroll',
    'attendance': '/admin/attendance',
    'leave': '/admin/leave',
    'geofencing': '/admin/geofencing',
    'onboarding': '/admin/onboarding',
    'support': '/admin/leave', // Temporary route - support module
    'documents': '/admin/inventory' // Temporary route - documents module
  };

  useEffect(() => {
    if (!token) {
      navigate('/company-login');
      return;
    }
    fetchCompanyInfo();
  }, [token, navigate]);

  const fetchCompanyInfo = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/v1/company/info', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch company info');
      }

      const data = await response.json();
      setCompanyInfo(data.data);
      setModules(data.data.modules || []);
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToModule = (moduleName) => {
    const route = moduleRoutes[moduleName];
    if (route) {
      navigate(route);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('companyToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('company_id');
    localStorage.removeItem('company_name');
    localStorage.removeItem('modules');
    navigate('/company-login');
  };

  if (loading) {
    return <div className="loading">Loading company dashboard...</div>;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1>🏢 Company Dashboard</h1>
          <p style={{ color: 'rgba(255,255,255,0.9)', margin: '5px 0 0 0' }}>
            {companyName}
          </p>
        </div>
        <button onClick={handleLogout} className="logout-btn">🚪 Logout</button>
      </header>

      <main className="dashboard-content">
        {error && <div className="error-message">⚠️ {error}</div>}

        {companyInfo && (
          <div className="company-info-card">
            <h2>📊 Company Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">📌 Company Code:</span>
                <span className="value">{companyInfo.company_code}</span>
              </div>
              <div className="info-item">
                <span className="label">👥 Employees:</span>
                <span className="value">
                  {companyInfo.employee_count} / {companyInfo.employee_limit}
                </span>
              </div>
              <div className="info-item">
                <span className="label">✓ Status:</span>
                <span className={`status ${companyInfo.is_active ? 'active' : 'inactive'}`}>
                  {companyInfo.is_active ? '🟢 Active' : '🔴 Inactive'}
                </span>
              </div>
            </div>
          </div>
        )}

        <section className="modules-section">
          <h2>📋 Available Modules</h2>
          {modules.length === 0 ? (
            <div className="empty-state">
              <p>😐 No modules available.</p>
            </div>
          ) : (
            <div className="modules-grid">
              {modules.map((mod) => {
                const metadata = moduleMetadata[mod.module_name] || { icon: '📋', description: '' };
                return (
                  <div
                    key={mod.module_name}
                    className="module-access-card"
                    onClick={() => handleNavigateToModule(mod.module_name)}
                  >
                    <div className="module-icon">{metadata.icon}</div>
                    <h3>{mod.module_name.replace(/_/g, ' ').toUpperCase()}</h3>
                    <p className="module-description">{metadata.description}</p>
                    <button
                      className="btn btn-primary btn-block"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigateToModule(mod.module_name);
                      }}
                    >
                      🚀 Access
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
