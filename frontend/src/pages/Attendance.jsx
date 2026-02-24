import { useState, useEffect } from 'react';
import api from '../api/client.js';

export default function Attendance() {
  const [location, setLocation] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [geofenceStatus, setGeofenceStatus] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [geofenceZones, setGeofenceZones] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);

  useEffect(() => {
    // Get GPS location with high accuracy
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setLocation({ latitude, longitude, accuracy });
        },
        (error) => {
          console.error('Geolocation error:', error);
          setMessage('⚠️ Unable to access your location. Please enable GPS and grant location permission.');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setMessage('❌ Geolocation is not supported by your browser');
    }

    const userEmail = localStorage.getItem('userEmail') || 'user';
    fetchTodayAttendance(userEmail);
    fetchGeofenceZones();
    fetchAttendanceHistory(userEmail);
  }, []);

  const fetchTodayAttendance = async (userId) => {
    try {
      const { data } = await api.get(`/attendance/status/${userId}`);
      setTodayAttendance(data.today);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setLoading(false);
    }
  };

  const fetchGeofenceZones = async () => {
    try {
      const { data } = await api.get('/attendance/geofence/zones');
      setGeofenceZones(data.zones || []);
    } catch (err) {
      console.error('Error fetching geofence zones:', err);
    }
  };

  const fetchAttendanceHistory = async (userId) => {
    try {
      const { data } = await api.get(`/attendance/history/${userId}?days=7`);
      setAttendanceHistory(data.attendance || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const handleCheckIn = async () => {
    if (!location) {
      setMessage('⏳ Waiting for GPS location...');
      return;
    }

    setCheckingIn(true);
    try {
      const { data } = await api.post('/attendance/checkin', {
        latitude: location.latitude,
        longitude: location.longitude
      });

      setTodayAttendance(data.attendance);
      setGeofenceStatus(data.geofence);
      
      if (data.geofence.status === 'inside') {
        setMessage(`✅ Checked in successfully! You are inside the geofence zone.`);
      } else {
        setMessage(`⚠️ Checked in, but you are OUTSIDE the geofence zone!`);
      }
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Error checking in');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (!location) {
      setMessage('⏳ Waiting for GPS location...');
      return;
    }

    setCheckingIn(true);
    try {
      const { data } = await api.post('/attendance/checkout', {
        latitude: location.latitude,
        longitude: location.longitude
      });

      setTodayAttendance(data.attendance);
      setGeofenceStatus(data.geofence);
      
      if (data.geofence.status === 'inside') {
        setMessage(`✅ Checked out successfully! Duration: ${data.duration.hours} hours.`);
      } else {
        setMessage(`⚠️ Checked out, but you are OUTSIDE the geofence zone!`);
      }
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Error checking out');
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading) {
    return <div style={styles.container}><p>Loading attendance...</p></div>;
  }

  const isCheckedIn = todayAttendance && !todayAttendance.check_out;
  const checkInTime = todayAttendance ? new Date(todayAttendance.check_in).toLocaleTimeString() : null;
  const checkOutTime = todayAttendance?.check_out ? new Date(todayAttendance.check_out).toLocaleTimeString() : null;

  return (
    <div style={styles.container}>
      <h1>Attendance Management</h1>

      {/* Location Display */}
      {location ? (
        <div style={styles.locationBox}>
          <h3>📍 Current Location</h3>
          <p><strong>Latitude:</strong> {location.latitude.toFixed(6)}</p>
          <p><strong>Longitude:</strong> {location.longitude.toFixed(6)}</p>
          <p><strong>Accuracy:</strong> ±{location.accuracy?.toFixed(0) || 'N/A'} meters</p>
        </div>
      ) : (
        <div style={{ ...styles.locationBox, background: '#f8d7da' }}>
          <p>⏳ Acquiring GPS location...</p>
        </div>
      )}

      {/* Geofence Zones Info */}
      {geofenceZones.length > 0 && (
        <div style={styles.zoneBox}>
          <h3>🏢 Office Geofence Zones</h3>
          {geofenceZones.map(zone => (
            <div key={zone.id} style={styles.zoneCard}>
              <p style={{ margin: '8px 0' }}><strong>{zone.name}</strong></p>
              <p style={{ margin: '4px 0', fontSize: '12px' }}>📍 Lat: {parseFloat(zone.latitude).toFixed(4)}, Lng: {parseFloat(zone.longitude).toFixed(4)}</p>
              <p style={{ margin: '4px 0', fontSize: '12px' }}>📏 Radius: {zone.radius_meters}m</p>
              {zone.description && <p style={{ margin: '4px 0', fontSize: '12px' }}>{zone.description}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Geofence Status */}
      {geofenceStatus && (
        <div
          style={{
            ...styles.statusBox,
            background: geofenceStatus.status === 'inside' ? '#d4edda' : '#f8d7da',
            borderColor: geofenceStatus.status === 'inside' ? '#c3e6cb' : '#f5c6cb'
          }}
        >
          <h3>Geofence Status: <span style={{ color: geofenceStatus.status === 'inside' ? '#155724' : '#721c24', fontWeight: 'bold' }}>
            {geofenceStatus.status === 'inside' ? '✅ INSIDE' : '⚠️ OUTSIDE'}
          </span></h3>
          {geofenceStatus.zone_name && <p>Zone: {geofenceStatus.zone_name}</p>}
          {geofenceStatus.distance !== null && <p>Distance: {geofenceStatus.distance.toFixed(2)}m</p>}
        </div>
      )}

      {/* Attendance Status */}
      {todayAttendance && (
        <div style={styles.statusBox}>
          <h3>📊 Today's Attendance</h3>
          <p><strong>Check-in:</strong> {checkInTime}</p>
          <p><strong>Status:</strong> <span style={{ fontWeight: 'bold', color: todayAttendance.check_in_geofence_status === 'inside' ? 'green' : 'orange' }}>
            {todayAttendance.check_in_geofence_status === 'inside' ? '✅ Inside' : '⚠️ Outside'}
          </span></p>
          {checkOutTime && (
            <>
              <p><strong>Check-out:</strong> {checkOutTime}</p>
              <p><strong>Status:</strong> <span style={{ fontWeight: 'bold', color: todayAttendance.check_out_geofence_status === 'inside' ? 'green' : 'orange' }}>
                {todayAttendance.check_out_geofence_status === 'inside' ? '✅ Inside' : '⚠️ Outside'}
              </span></p>
            </>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div style={styles.buttonGroup}>
        {!isCheckedIn ? (
          <button
            onClick={handleCheckIn}
            disabled={!location || checkingIn}
            style={{ ...styles.button, background: location ? '#28a745' : '#ccc', cursor: location ? 'pointer' : 'not-allowed' }}
          >
            {checkingIn ? '⏳ Checking In...' : '✅ Check In'}
          </button>
        ) : (
          <button
            onClick={handleCheckOut}
            disabled={!location || checkingIn}
            style={{ ...styles.button, background: location ? '#dc3545' : '#ccc', cursor: location ? 'pointer' : 'not-allowed' }}
          >
            {checkingIn ? '⏳ Checking Out...' : '❌ Check Out'}
          </button>
        )}
      </div>

      {/* Attendance History */}
      {attendanceHistory.length > 0 && (
        <div style={styles.historyBox}>
          <h3>📅 Last 7 Days History</h3>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {attendanceHistory.map(record => (
                <tr key={record.id}>
                  <td>{new Date(record.check_in).toLocaleDateString()}</td>
                  <td>{new Date(record.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{record.check_out ? new Date(record.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                  <td>{record.check_in_geofence_status === 'inside' ? '✅' : '⚠️'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Message */}
      {message && <div style={styles.message}>{message}</div>}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '700px',
    margin: '0 auto',
    fontFamily: 'Arial, sans-serif'
  },
  locationBox: {
    background: '#e3f2fd',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #90caf9'
  },
  zoneBox: {
    background: '#f5f5f5',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  zoneCard: {
    background: 'white',
    padding: '12px',
    marginBottom: '10px',
    borderRadius: '4px',
    border: '1px solid #ddd'
  },
  statusBox: {
    background: '#fff3cd',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #ffc107'
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px'
  },
  button: {
    flex: 1,
    padding: '12px',
    fontSize: '16px',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontWeight: 'bold',
    transition: 'opacity 0.2s'
  },
  message: {
    padding: '12px',
    backgroundColor: '#d1ecf1',
    color: '#0c5460',
    borderRadius: '4px',
    border: '1px solid #bee5eb',
    marginBottom: '20px'
  },
  historyBox: {
    background: '#f9f9f9',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '10px'
  }
};
