import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client.js';

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [showLocationPrompt, setShowLocationPrompt] = useState(true);
  const [message, setMessage] = useState('');
  const [checking, setChecking] = useState(false);
  const [geofenceStatus, setGeofenceStatus] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [checkType, setCheckType] = useState(null); // 'in' or 'out'
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const hasRequestedLocation = useRef(false);
  const navigate = useNavigate();

  const requestLocationPermission = () => {
    if (navigator.geolocation && !hasRequestedLocation.current) {
      hasRequestedLocation.current = true;
      setShowLocationPrompt(false);
      navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ latitude, longitude });
          setLocationError(null); // Clear any previous errors
        },
        (error) => {
          if (error.code === 1) {
            setLocationError('GPS permission denied. Please enable location access in your browser settings to use attendance features.');
          } else if (error.code === 2) {
            setLocationError('GPS position unavailable. Please check your device settings.');
          } else if (error.code === 3) {
            setLocationError('GPS request timed out. Retrying...');
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else if (!navigator.geolocation) {
      setLocationError('Your browser does not support geolocation.');
      setShowLocationPrompt(false);
    }
  };

  useEffect(() => {
    // Check if location permission was previously granted
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          setShowLocationPrompt(false);
          requestLocationPermission();
        } else if (result.state === 'denied') {
          setShowLocationPrompt(false);
          setLocationError('GPS permission denied. Please enable location access in your browser settings.');
        }
        // If 'prompt', we'll show the custom prompt
      });
    }
    fetchTodayAttendance();
  }, []);

  const fetchTodayAttendance = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userEmail = user.sub || user.email;
      if (userEmail) {
        const { data } = await api.get(`/attendance/status/${userEmail}`);
        setTodayAttendance(data.today);
      }
    } catch (err) {
      if (err?.response?.status === 404) {
        console.log('No attendance record found yet - this is normal for first-time users');
      } else {
        console.error('Error fetching attendance:', err);
      }
    }
  };

  const startCamera = (type) => {
    setCheckType(type);
    setShowCamera(true);
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(err => {
        console.error('Camera access error:', err);
        setMessage('Unable to access camera');
      });
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      const photoDataUrl = canvasRef.current.toDataURL('image/jpeg');
      
      // Stop the video stream
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
      setShowCamera(false);
      
      // Perform check-in or check-out
      await performAttendance(checkType, photoDataUrl);
    }
  };

  const performAttendance = async (type, photoDataUrl) => {
    if (!location) {
      setMessage('❌ GPS location not available. Please enable location access in your browser and refresh the page.');
      setTimeout(() => setMessage(''), 5000);
      return;
    }

    setChecking(true);
    try {
      const endpoint = type === 'in' ? '/attendance/checkin' : '/attendance/checkout';
      const { data } = await api.post(endpoint, {
        latitude: location.latitude,
        longitude: location.longitude,
        photoDataUrl
      });

      setTodayAttendance(data.attendance);
      setGeofenceStatus(data.geofence);
      
      if (type === 'in') {
        if (data.geofence.status === 'inside') {
          setMessage(`✅ Checked in! You are inside the geofence.`);
        } else {
          setMessage(`⚠️ Checked in, but you are OUTSIDE the geofence!`);
        }
      } else {
        if (data.geofence.status === 'inside') {
          setMessage(`✅ Checked out! Duration: ${data.duration.hours} hours.`);
        } else {
          setMessage(`⚠️ Checked out OUTSIDE geofence!`);
        }
      }
    } catch (err) {
      setMessage(err?.response?.data?.message || `Error during check-${type === 'in' ? 'in' : 'out'}`);
    } finally {
      setChecking(false);
    }
  };

  const isCheckedIn = todayAttendance && !todayAttendance.check_out;
  const checkInTime = todayAttendance ? new Date(todayAttendance.check_in).toLocaleTimeString() : null;
  const checkOutTime = todayAttendance?.check_out ? new Date(todayAttendance.check_out).toLocaleTimeString() : null;

  const navItems = [
    { label: 'Dashboard', icon: '📊', path: '/dashboard' },
    { label: 'Attendance', icon: '📍', path: '/attendance' },
    { label: 'My Profile', icon: '👤', path: '/profile' },
    { label: 'Onboarding', icon: '🚀', path: '/onboarding' },
    { label: 'Leave Requests', icon: '📋', path: '/leave' },
    { label: 'Attendance Corrections', icon: '✏️', path: '/attendance-corrections' },
    { label: 'Inventory', icon: '📦', path: '/inventory' },
    { label: 'Payroll', icon: '💰', path: '/payroll' }
  ];

  return (
    <div style={styles.pageContainer}>
      {/* Location Permission Prompt */}
      {showLocationPrompt && (
        <div style={styles.promptOverlay}>
          <div style={styles.promptDialog}>
            <div style={styles.promptIcon}>📍</div>
            <h2 style={styles.promptTitle}>Enable Location Access</h2>
            <p style={styles.promptText}>
              AIQ HRMS needs your location to verify you're at an authorized office location when checking in/out.
            </p>
            <ul style={styles.promptList}>
              <li>✓ Validates geofence compliance</li>
              <li>✓ Prevents attendance fraud</li>
              <li>✓ Only captured during check-in/out</li>
            </ul>
            <div style={styles.promptButtons}>
              <button 
                onClick={requestLocationPermission}
                style={styles.promptAllowBtn}
              >
                📍 Enable Location
              </button>
              <button 
                onClick={() => setShowLocationPrompt(false)}
                style={styles.promptLaterBtn}
              >
                Maybe Later
              </button>
            </div>
            <p style={styles.promptNote}>
              <small>You can enable location anytime from your browser settings</small>
            </p>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div style={{ ...styles.sidebar, transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)' }}>
        <button onClick={() => setSidebarOpen(false)} style={styles.closeBtn}>✕</button>
        <h3 style={styles.sidebarTitle}>Employee Portal</h3>
        <nav style={styles.navList}>
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              style={styles.navItem}
              onClick={() => setSidebarOpen(false)}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <button
          onClick={() => {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('userRole');
            navigate('/login');
          }}
          style={styles.logoutBtn}
        >
          🚪 Logout
        </button>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Header */}
        <div style={styles.header}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={styles.hamburger}
            title="Menu"
          >
            ☰
          </button>
          <h1 style={styles.headerTitle}>Employee Dashboard</h1>
          <div style={styles.headerRight}>
            <span style={{
              ...styles.locationStatus,
              color: location ? '#28a745' : (locationError ? '#dc3545' : '#ffc107')
            }}>
              📍 {location ? 'Location Ready' : (locationError ? 'Location Disabled' : 'Getting Location...')}
            </span>
          </div>
        </div>

        {/* Location Error Warning */}
        {locationError && (
          <div style={styles.locationWarning}>
            <strong>⚠️ GPS Required:</strong> {locationError}
            <button 
              onClick={() => window.location.reload()} 
              style={styles.retryBtn}
            >
              🔄 Retry
            </button>
          </div>
        )}

        {/* Message */}
        {message && <div style={styles.message}>{message}</div>}

        {/* Quick Attendance Section */}
        <div style={styles.attendanceCard}>
          <h2>Quick Attendance</h2>
          
          {/* Today's Status */}
          {todayAttendance && (
            <div style={styles.statusBox}>
              <p><strong>Check-in:</strong> {checkInTime || 'Not checked in'}</p>
              {checkOutTime && <p><strong>Check-out:</strong> {checkOutTime}</p>}
              <p>
                <strong>Status:</strong>{' '}
                <span style={{
                  color: todayAttendance.check_in_geofence_status === 'inside' ? 'green' : 'orange',
                  fontWeight: 'bold'
                }}>
                  {todayAttendance.check_in_geofence_status === 'inside' ? '✅ Inside Geofence' : '⚠️ Outside Geofence'}
                </span>
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div style={styles.actionButtonsContainer}>
            {!isCheckedIn ? (
              <button
                onClick={() => startCamera('in')}
                disabled={!location || checking}
                style={{
                  ...styles.actionButton,
                  background: location ? '#28a745' : '#ccc'
                }}
              >
                📷 Check In with Photo
              </button>
            ) : (
              <button
                onClick={() => startCamera('out')}
                disabled={!location || checking}
                style={{
                  ...styles.actionButton,
                  background: location ? '#dc3545' : '#ccc'
                }}
              >
                📷 Check Out with Photo
              </button>
            )}
          </div>

          {/* Geofence Status */}
          {geofenceStatus && (
            <div style={{
              ...styles.geofenceBox,
              background: geofenceStatus.status === 'inside' ? '#d4edda' : '#f8d7da'
            }}>
              <strong>Geofence Status:</strong> {geofenceStatus.status === 'inside' ? '✅ Inside' : '⚠️ Outside'}
              {geofenceStatus.distance && <p>Distance: {geofenceStatus.distance.toFixed(2)}m</p>}
            </div>
          )}
        </div>

        {/* Camera Modal */}
        {showCamera && (
          <div style={styles.cameraModal}>
            <div style={styles.cameraContainer}>
              <h3>Capture Photo for {checkType === 'in' ? 'Check-In' : 'Check-Out'}</h3>
              <video
                ref={videoRef}
                autoPlay
                style={styles.videoFeed}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} width={320} height={240} />
              <div style={styles.cameraControls}>
                <button
                  onClick={capturePhoto}
                  disabled={checking}
                  style={styles.captureBtn}
                >
                  {checking ? '⏳ Processing...' : '📸 Capture'}
                </button>
                <button
                  onClick={() => {
                    const stream = videoRef.current?.srcObject;
                    if (stream) stream.getTracks().forEach(track => track.stop());
                    setShowCamera(false);
                  }}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div style={styles.quickLinksContainer}>
          <h3>Quick Links</h3>
          <div style={styles.quickLinks}>
            <Link to="/attendance" style={styles.quickLink}>
              <span style={styles.qlIcon}>📍</span>
              <span>Full Attendance</span>
            </Link>
            <Link to="/leave" style={styles.quickLink}>
              <span style={styles.qlIcon}>📋</span>
              <span>Apply Leave</span>
            </Link>
            <Link to="/onboarding" style={styles.quickLink}>
              <span style={styles.qlIcon}>🚀</span>
              <span>Onboarding</span>
            </Link>
            <Link to="/payroll" style={styles.quickLink}>
              <span style={styles.qlIcon}>💰</span>
              <span>Payslips</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          style={styles.overlay}
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

const styles = {
  pageContainer: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
    background: '#f5f5f5'
  },
  sidebar: {
    position: 'fixed',
    left: 0,
    top: 0,
    width: '250px',
    height: '100vh',
    background: '#2c3e50',
    color: 'white',
    padding: '20px',
    overflowY: 'auto',
    transform: 'translateX(-100%)',
    transition: 'transform 0.3s ease',
    zIndex: 1000
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '24px',
    cursor: 'pointer',
    marginBottom: '20px'
  },
  sidebarTitle: {
    margin: '0 0 20px 0',
    fontSize: '18px',
    fontWeight: 'bold'
  },
  navList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '30px'
  },
  navItem: {
    color: 'white',
    textDecoration: 'none',
    padding: '12px 15px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'background 0.2s',
    cursor: 'pointer'
  },
  navIcon: {
    fontSize: '18px'
  },
  logoutBtn: {
    width: '100%',
    padding: '10px',
    background: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto'
  },
  header: {
    background: 'white',
    padding: '15px 20px',
    borderBottom: '1px solid #ddd',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  hamburger: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '5px'
  },
  headerTitle: {
    margin: 0,
    flex: 1,
    fontSize: '20px'
  },
  headerRight: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },
  locationStatus: {
    fontSize: '12px',
    padding: '5px 10px',
    background: '#e3f2fd',
    borderRadius: '4px'
  },
  message: {
    margin: '15px',
    padding: '12px',
    backgroundColor: '#d1ecf1',
    color: '#0c5460',
    borderRadius: '4px',
    border: '1px solid #bee5eb'
  },
  locationWarning: {
    margin: '15px',
    padding: '15px',
    backgroundColor: '#fff3cd',
    color: '#856404',
    borderRadius: '4px',
    border: '1px solid #ffc107',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    flexWrap: 'wrap'
  },
  retryBtn: {
    padding: '8px 16px',
    background: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap'
  },
  attendanceCard: {
    margin: '20px',
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  statusBox: {
    background: '#f0f0f0',
    padding: '15px',
    borderRadius: '4px',
    marginBottom: '20px'
  },
  actionButtonsContainer: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  actionButton: {
    flex: 1,
    minWidth: '200px',
    padding: '15px',
    fontSize: '16px',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'opacity 0.2s'
  },
  geofenceBox: {
    padding: '12px',
    borderRadius: '4px',
    marginTop: '15px',
    border: '1px solid #ccc'
  },
  cameraModal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000
  },
  cameraContainer: {
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    maxWidth: '500px',
    width: '90%'
  },
  videoFeed: {
    width: '100%',
    marginBottom: '15px',
    borderRadius: '4px',
    maxHeight: '400px'
  },
  cameraControls: {
    display: 'flex',
    gap: '10px'
  },
  captureBtn: {
    flex: 1,
    padding: '12px',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
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
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px'
  },
  quickLinksContainer: {
    margin: '20px',
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  quickLinks: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px',
    marginTop: '15px'
  },
  quickLink: {
    padding: '20px',
    background: '#f8f9fa',
    borderRadius: '8px',
    textDecoration: 'none',
    color: '#333',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    alignItems: 'center',
    transition: 'all 0.2s',
    cursor: 'pointer',
    border: '1px solid #ddd'
  },
  qlIcon: {
    fontSize: '32px'
  },
  promptOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3000,
    padding: '20px'
  },
  promptDialog: {
    background: 'white',
    borderRadius: '12px',
    padding: '30px',
    maxWidth: '450px',
    width: '100%',
    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
    textAlign: 'center'
  },
  promptIcon: {
    fontSize: '64px',
    marginBottom: '15px'
  },
  promptTitle: {
    margin: '0 0 15px 0',
    fontSize: '24px',
    color: '#333'
  },
  promptText: {
    margin: '0 0 20px 0',
    color: '#666',
    fontSize: '15px',
    lineHeight: '1.5'
  },
  promptList: {
    textAlign: 'left',
    margin: '0 0 25px 0',
    padding: '0 0 0 20px',
    color: '#666',
    fontSize: '14px',
    lineHeight: '1.8'
  },
  promptButtons: {
    display: 'flex',
    gap: '10px',
    marginBottom: '15px'
  },
  promptAllowBtn: {
    flex: 2,
    padding: '14px 20px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '15px',
    transition: 'transform 0.2s'
  },
  promptLaterBtn: {
    flex: 1,
    padding: '14px 20px',
    background: '#e0e0e0',
    color: '#666',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  promptNote: {
    margin: '10px 0 0 0',
    color: '#999',
    fontSize: '12px'
  }
};
