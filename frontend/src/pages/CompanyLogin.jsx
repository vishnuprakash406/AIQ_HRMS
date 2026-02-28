import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles.css';

export default function CompanyLogin() {
  const [formData, setFormData] = useState({
    company_code: '',
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // Helper function to decode JWT token and extract user_id
  const decodeToken = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (err) {
      console.error('Error decoding token:', err);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3000/api/v1/company/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        const role = data.role || 'company_admin';
        // Store token and company info in localStorage
        localStorage.setItem('companyToken', data.token);
        localStorage.setItem('userRole', role);
        localStorage.setItem('company_id', data.company_id);
        localStorage.setItem('company_name', data.company_name);
        localStorage.setItem('modules', JSON.stringify(data.modules));
        localStorage.setItem('branch_id', data.branch_id || '');
        localStorage.setItem('branch_name', data.branch_name || '');

        // Decode token and extract user_id for branch managers
        if (role === 'branch_manager' || role === 'manager') {
          const decodedToken = decodeToken(data.token);
          if (decodedToken && decodedToken.user_id) {
            localStorage.setItem('manager_id', decodedToken.user_id);
          }
          // Redirect to branch selection for managers
          navigate('/manager-branch-selection');
        } else {
          // Redirect to company dashboard for company admin
          navigate('/company-dashboard');
        }
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>🏢 Company Login</h1>
        <p style={{ textAlign: 'center', color: 'var(--gray-500)', marginBottom: '20px' }}>
          Access your company administration dashboard
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="company_code">🆔 Company Code</label>
            <input
              type="text"
              id="company_code"
              name="company_code"
              value={formData.company_code}
              onChange={handleChange}
              placeholder="e.g., ACME-001"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="username">👤 Username / Employee Code</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Email, Phone, or Employee Code"
              required
            />
            <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '4px' }}>
              Manager/Employee can login with Employee Code (e.g., ABCD0001)
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="password">🔑 Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </div>

          {error && <div className="error-message">⚠️ {error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? '⏳ Logging in...' : '✓ Login as Company'}
          </button>
        </form>

        <div className="login-footer">
          <p>🔐 Master account? <a href="/master-login">Master Login</a></p>
          <p>👥 Regular user? <a href="/login">Employee Login</a></p>
        </div>
      </div>
    </div>
  );
}
