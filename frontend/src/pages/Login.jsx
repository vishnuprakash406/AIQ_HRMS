import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';

export default function Login() {
  const [mode, setMode] = useState('password'); // password | otp | admin
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const navigate = useNavigate();

  const saveTokens = (data, msg) => {
    localStorage.setItem('accessToken', data.access);
    localStorage.setItem('refreshToken', data.refresh);
    if (data.user) {
      localStorage.setItem('userRole', data.user.role);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    setMessage(msg);
    setMessageType('success');
    // Redirect based on user role
    const role = data.user?.role;
    if (role === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  const loginPassword = async () => {
    try {
      const { data } = await api.post('/auth/login-password', { username, password });
      saveTokens(data, '✓ Logged in successfully!');
    } catch (err) {
      const code = err?.response?.data?.code;
      if (code === 'PASSWORD_EXPIRED') {
        setMessage('⚠️ Password expired. OTP sent for reset.');
        setMessageType('warning');
        setMode('reset');
      } else {
        setMessage('⚠️ ' + (err?.response?.data?.message || 'Login failed'));
        setMessageType('error');
      }
    }
  };

  const requestOtp = async () => {
    try {
      await api.post('/auth/request-otp', { username });
      setMessage('✓ OTP sent successfully!');
      setMessageType('success');
    } catch (err) {
      setMessage('⚠️ ' + (err?.response?.data?.message || 'Error sending OTP'));
      setMessageType('error');
    }
  };

  const verifyOtp = async () => {
    try {
      const { data } = await api.post('/auth/verify-otp', { username, otp });
      saveTokens(data, '✓ Logged in via OTP!');
    } catch (err) {
      setMessage('⚠️ ' + (err?.response?.data?.message || 'Invalid OTP'));
      setMessageType('error');
    }
  };

  const resetPassword = async () => {
    try {
      const { data } = await api.post('/auth/reset-password-otp', { username, otp, newPassword });
      saveTokens(data, '✓ Password reset and logged in!');
    } catch (err) {
      setMessage('⚠️ ' + (err?.response?.data?.message || 'Error resetting password'));
      setMessageType('error');
    }
  };

  const adminLogin = async () => {
    try {
      const { data } = await api.post('/auth/admin-login', { email: username, password });
      saveTokens(data, '✓ Admin logged in!');
    } catch (err) {
      setMessage('⚠️ ' + (err?.response?.data?.message || 'Invalid admin credentials'));
      setMessageType('error');
    }
  };

  const renderPassword = () => (
    <>
      <div className="form-group">
        <label htmlFor="username">📧 Email or Phone</label>
        <input
          id="username"
          placeholder="Enter your email or phone number"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="password">🔑 Password</label>
        <input
          id="password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <button className="login-btn" onClick={loginPassword} disabled={!username || !password}>
        ✓ Login
      </button>
      <div className="login-footer">
        <p>
          <button className="link-btn" onClick={() => { setMode('otp'); setMessage(''); }}>
            🔐 Login with OTP
          </button>
        </p>
      </div>
    </>
  );

  const renderOtp = () => (
    <>
      <div className="form-group">
        <label htmlFor="username">📧 Email or Phone</label>
        <input
          id="username"
          placeholder="Enter your email or phone number"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <div className="form-group">
        <button className="btn btn-primary" onClick={requestOtp} disabled={!username} style={{ width: '100%' }}>
          📤 Request OTP
        </button>
      </div>
      <div className="form-group">
        <label htmlFor="otp">🔐 OTP Code</label>
        <input
          id="otp"
          placeholder="Enter the OTP sent to you"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
        />
      </div>
      <button className="login-btn" onClick={verifyOtp} disabled={!otp}>
        ✓ Verify OTP
      </button>
      <div className="login-footer">
        <p>
          <button className="link-btn" onClick={() => { setMode('password'); setMessage(''); }}>
            ← Back to Password Login
          </button>
        </p>
      </div>
    </>
  );

  const renderReset = () => (
    <>
      <div className="form-group">
        <label htmlFor="username">📧 Email or Phone</label>
        <input
          id="username"
          placeholder="Enter your email or phone number"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <div className="form-group">
        <button className="btn btn-primary" onClick={requestOtp} disabled={!username} style={{ width: '100%' }}>
          📤 Resend OTP
        </button>
      </div>
      <div className="form-group">
        <label htmlFor="otp">🔐 OTP Code</label>
        <input
          id="otp"
          placeholder="Enter the OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="newPassword">🔑 New Password</label>
        <input
          id="newPassword"
          type="password"
          placeholder="Enter your new password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>
      <button className="login-btn" onClick={resetPassword} disabled={!otp || !newPassword}>
        ✓ Reset & Login
      </button>
      <div className="login-footer">
        <p>
          <button className="link-btn" onClick={() => { setMode('password'); setMessage(''); }}>
            ← Back to Password Login
          </button>
        </p>
      </div>
    </>
  );

  const renderAdmin = () => (
    <>
      <div className="form-group">
        <label htmlFor="adminEmail">📧 Admin Email</label>
        <input
          id="adminEmail"
          placeholder="Enter your admin email"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="adminPassword">🔑 Password</label>
        <input
          id="adminPassword"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <button className="login-btn" onClick={adminLogin} disabled={!username || !password}>
        ✓ Admin Login
      </button>
      <div className="login-footer">
        <p>
          <button className="link-btn" onClick={() => { setMode('password'); setMessage(''); }}>
            ← Back to Employee Login
          </button>
        </p>
      </div>
    </>
  );

  const getTitleEmoji = () => {
    switch(mode) {
      case 'admin': return '🔐';
      case 'otp': return '📱';
      case 'reset': return '🔄';
      default: return '👥';
    }
  };

  const getTitle = () => {
    switch(mode) {
      case 'admin': return 'Admin Login';
      case 'otp': return 'OTP Login';
      case 'reset': return 'Reset Password';
      default: return 'Employee Login';
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>{getTitleEmoji()} {getTitle()}</h1>
        <p style={{ textAlign: 'center', color: 'var(--gray-500)', marginBottom: '25px' }}>
          {mode === 'admin' ? 'Admin access only' : 'Access your employee account'}
        </p>

        {mode === 'password' && renderPassword()}
        {mode === 'otp' && renderOtp()}
        {mode === 'reset' && renderReset()}
        {mode === 'admin' && renderAdmin()}

        {message && (
          <div className={`alert alert-${messageType}`}>
            {message}
          </div>
        )}

        {mode !== 'admin' && (
          <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--gray-200)' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--gray-600)', marginBottom: '8px' }}>
              Admin access?
            </p>
            <button
              className="link-btn"
              onClick={() => { setMode('admin'); setMessage(''); }}
            >
              🔐 Switch to Admin Login
            </button>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
            Looking for company or master login?
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <a href="/company-login" style={{ fontSize: '0.9rem' }}>🏢 Company Login</a>
            <span style={{ color: 'var(--gray-300)' }}>•</span>
            <a href="/master-login" style={{ fontSize: '0.9rem' }}>🔐 Master Login</a>
          </div>
        </div>
      </div>
    </div>
  );
}
