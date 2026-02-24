import { useState, useEffect } from 'react';
import api from '../api/client.js';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    address: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      setUser(userData);
      setFormData({
        full_name: userData.full_name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        date_of_birth: userData.date_of_birth || '',
        address: userData.address || ''
      });
      setLoading(false);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Mock update - in production would call API
      setMessage('✅ Profile updated successfully');
      setUser({ ...user, ...formData });
      localStorage.setItem('user', JSON.stringify({ ...user, ...formData }));
      setIsEditing(false);

      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Error updating profile');
      console.error(err);
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: user.full_name || '',
      email: user.email || '',
      phone: user.phone || '',
      date_of_birth: user.date_of_birth || '',
      address: user.address || ''
    });
    setIsEditing(false);
  };

  if (loading) {
    return <div style={styles.container}><p>Loading profile...</p></div>;
  }

  return (
    <div style={styles.container}>
      <h1>My Profile</h1>
      <p>View and manage your personal information</p>

      {message && <div style={styles.message}>{message}</div>}

      <div style={styles.profileCard}>
        <div style={styles.avatarSection}>
          <div style={styles.avatar}>
            {(user?.full_name || 'U')[0].toUpperCase()}
          </div>
          <h2>{user?.full_name || 'User'}</h2>
          <p style={styles.role}>{user?.role || 'Employee'}</p>
        </div>

        {!isEditing ? (
          <div style={styles.infoSection}>
            <div style={styles.infoRow}>
              <span style={styles.label}>📧 Email</span>
              <span style={styles.value}>{user?.email || 'N/A'}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.label}>📱 Phone</span>
              <span style={styles.value}>{user?.phone || 'N/A'}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.label}>🎂 Date of Birth</span>
              <span style={styles.value}>
                {user?.date_of_birth 
                  ? new Date(user.date_of_birth).toLocaleDateString() 
                  : 'N/A'}
              </span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.label}>🏠 Address</span>
              <span style={styles.value}>{user?.address || 'N/A'}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.label}>📅 Joined</span>
              <span style={styles.value}>
                {user?.created_at 
                  ? new Date(user.created_at).toLocaleDateString() 
                  : 'N/A'}
              </span>
            </div>

            <button onClick={() => setIsEditing(true)} style={styles.editBtn}>
              ✏️ Edit Profile
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label>Full Name</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                style={styles.input}
                disabled
                title="Email cannot be changed"
              />
            </div>

            <div style={styles.formGroup}>
              <label>Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label>Date of Birth</label>
              <input
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleInputChange}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label>Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
              />
            </div>

            <div style={styles.btnGroup}>
              <button type="submit" style={styles.saveBtn}>
                💾 Save Changes
              </button>
              <button type="button" onClick={handleCancel} style={styles.cancelBtn}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '700px',
    margin: '0 auto'
  },
  message: {
    padding: '12px',
    marginBottom: '20px',
    backgroundColor: '#d4edda',
    color: '#155724',
    borderRadius: '4px',
    border: '1px solid #c3e6cb'
  },
  profileCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '30px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  avatarSection: {
    textAlign: 'center',
    paddingBottom: '30px',
    borderBottom: '1px solid #e0e0e0',
    marginBottom: '30px'
  },
  avatar: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontSize: '42px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    fontWeight: 'bold'
  },
  role: {
    color: '#666',
    fontSize: '14px',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  infoSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #f0f0f0'
  },
  label: {
    color: '#666',
    fontSize: '14px',
    fontWeight: '500'
  },
  value: {
    color: '#333',
    fontSize: '14px',
    fontWeight: '600'
  },
  editBtn: {
    marginTop: '20px',
    padding: '12px 24px',
    background: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    width: '100%'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  input: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'Arial, sans-serif'
  },
  btnGroup: {
    display: 'flex',
    gap: '10px',
    marginTop: '10px'
  },
  saveBtn: {
    flex: 1,
    padding: '12px',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px'
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    background: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px'
  }
};
