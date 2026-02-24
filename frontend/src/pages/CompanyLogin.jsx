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
        // Store token and company info in localStorage
        localStorage.setItem('companyToken', data.token);
        localStorage.setItem('userRole', 'company_admin');
        localStorage.setItem('company_id', data.company_id);
        localStorage.setItem('company_name', data.company_name);
        localStorage.setItem('modules', JSON.stringify(data.modules));

        // Redirect to company dashboard
        navigate('/company-dashboard');
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
            <label htmlFor="username">👤 Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter your username"
              required
            />
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
