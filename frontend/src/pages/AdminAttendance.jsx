import { useState, useEffect } from 'react';
import api from '../api/client.js';

export default function AdminAttendance() {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // Default to 'all' to show all records
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    fetchAllAttendance();
  }, [filter]);

  const fetchAllAttendance = async () => {
    try {
      setLoading(true);
      // Get all users first
      const { data } = await api.get('/auth/employees');
      const users = data.employees || [];
      
      // Fetch attendance for each user
      const allRecords = [];
      for (const user of users) {
        try {
          const days = filter === 'today' ? 1 : filter === 'week' ? 7 : filter === 'month' ? 30 : 365;
          const { data } = await api.get(`/attendance/history/${user.email}?days=${days}`);
          
          data.records.forEach(record => {
            allRecords.push({
              ...record,
              employee_name: user.full_name,
              employee_email: user.email,
              employee_phone: user.phone
            });
          });
        } catch (err) {
          console.log(`No attendance for ${user.email}`);
        }
      }
      
      // Sort by most recent first
      allRecords.sort((a, b) => new Date(b.check_in) - new Date(a.check_in));
      setAttendanceRecords(allRecords);
    } catch (err) {
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const openGoogleMaps = (lat, lng) => {
    if (lat && lng) {
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    }
  };

  const openRouteMap = (checkInLat, checkInLng, checkOutLat, checkOutLng) => {
    if (checkInLat && checkInLng && checkOutLat && checkOutLng) {
      // Open Google Maps with directions showing the route from check-in to check-out
      const url = `https://www.google.com/maps/dir/?api=1&origin=${checkInLat},${checkInLng}&destination=${checkOutLat},${checkOutLng}&travelmode=driving`;
      window.open(url, '_blank');
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 'N/A';
    const diff = new Date(checkOut) - new Date(checkIn);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const filteredRecords = attendanceRecords.filter(record => {
    if (searchEmail && !record.employee_email.toLowerCase().includes(searchEmail.toLowerCase())) {
      return false;
    }
    return true;
  });

  const exportToCSV = () => {
    const headers = ['Employee Name', 'Email', 'Phone', 'Check-in Date', 'Check-in Time', 'Check-in Lat', 'Check-in Lng', 'Check-out Time', 'Check-out Lat', 'Check-out Lng', 'Duration', 'Geofence Status'];
    const rows = filteredRecords.map(record => [
      record.employee_name,
      record.employee_email,
      record.employee_phone || 'N/A',
      new Date(record.check_in).toLocaleDateString(),
      new Date(record.check_in).toLocaleTimeString(),
      record.check_in_lat || 'N/A',
      record.check_in_lng || 'N/A',
      record.check_out ? new Date(record.check_out).toLocaleTimeString() : 'N/A',
      record.check_out_lat || 'N/A',
      record.check_out_lng || 'N/A',
      formatDuration(record.check_in, record.check_out),
      record.check_in_geofence_status || 'N/A'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${filter}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>📍 Employee Attendance Tracking</h1>
        <p>View all employee check-ins/check-outs with GPS locations</p>
      </div>

      <div style={styles.controls}>
        <div style={styles.filterGroup}>
          <label>Time Period:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={styles.select}>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label>Search Employee:</label>
          <input
            type="text"
            placeholder="Enter email..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            style={styles.input}
          />
        </div>

        <button onClick={exportToCSV} style={styles.exportBtn} disabled={filteredRecords.length === 0}>
          📥 Export to CSV
        </button>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading attendance records...</div>
      ) : filteredRecords.length === 0 ? (
        <div style={styles.noData}>No attendance records found</div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Check-in Time</th>
                <th>Check-in Location</th>
                <th>Check-out Time</th>
                <th>Check-out Location</th>
                <th>Duration</th>
                <th>Visit Route</th>
                <th>Geofence Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.id} style={styles.tableRow}>
                  <td>
                    <div style={styles.employeeCell}>
                      <strong>{record.employee_name}</strong>
                      <small style={styles.email}>{record.employee_email}</small>
                      {record.employee_phone && (
                        <small style={styles.phone}>📞 {record.employee_phone}</small>
                      )}
                    </div>
                  </td>
                  <td>{formatDateTime(record.check_in)}</td>
                  <td>
                    {record.check_in_lat && record.check_in_lng ? (
                      <button
                        onClick={() => openGoogleMaps(record.check_in_lat, record.check_in_lng)}
                        style={styles.mapBtn}
                        title={`${record.check_in_lat}, ${record.check_in_lng}`}
                      >
                        📍 View on Map
                      </button>
                    ) : (
                      <span style={styles.noLocation}>No GPS</span>
                    )}
                  </td>
                  <td>{formatDateTime(record.check_out)}</td>
                  <td>
                    {record.check_out_lat && record.check_out_lng ? (
                      <button
                        onClick={() => openGoogleMaps(record.check_out_lat, record.check_out_lng)}
                        style={styles.mapBtn}
                        title={`${record.check_out_lat}, ${record.check_out_lng}`}
                      >
                        📍 View on Map
                      </button>
                    ) : (
                      <span style={styles.noLocation}>-</span>
                    )}
                  </td>
                  <td>{formatDuration(record.check_in, record.check_out)}</td>
                  <td>
                    {record.check_in_lat && record.check_in_lng && record.check_out_lat && record.check_out_lng ? (
                      <button
                        onClick={() => openRouteMap(record.check_in_lat, record.check_in_lng, record.check_out_lat, record.check_out_lng)}
                        style={styles.routeBtn}
                        title="View travel route from check-in to check-out"
                      >
                        🗺️ Visit Route
                      </button>
                    ) : (
                      <span style={styles.noLocation}>No complete route</span>
                    )}
                  </td>
                  <td>
                    <span
                      style={{
                        ...styles.statusBadge,
                        background: record.check_in_geofence_status === 'inside' ? '#28a745' : '#ffc107'
                      }}
                    >
                      {record.check_in_geofence_status === 'inside' ? '✅ Inside' : 
                       record.check_in_geofence_status === 'outside' ? '⚠️ Outside' : '❓ Unknown'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={styles.summary}>
        <p><strong>Total Records:</strong> {filteredRecords.length}</p>
        <p><strong>Complete Check-ins/outs:</strong> {filteredRecords.filter(r => r.check_out).length}</p>
        <p><strong>Pending Check-outs:</strong> {filteredRecords.filter(r => !r.check_out).length}</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  header: {
    marginBottom: '30px'
  },
  controls: {
    display: 'flex',
    gap: '20px',
    marginBottom: '20px',
    flexWrap: 'wrap',
    alignItems: 'flex-end'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    minWidth: '150px'
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    minWidth: '250px'
  },
  exportBtn: {
    padding: '8px 16px',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#666'
  },
  noData: {
    padding: '40px',
    textAlign: 'center',
    color: '#999',
    background: '#f8f9fa',
    borderRadius: '8px'
  },
  tableContainer: {
    overflowX: 'auto',
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  tableRow: {
    borderBottom: '1px solid #e0e0e0'
  },
  employeeCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '10px'
  },
  email: {
    color: '#666',
    fontSize: '12px'
  },
  phone: {
    color: '#666',
    fontSize: '11px',
    fontStyle: 'italic'
  },
  mapBtn: {
    padding: '6px 12px',
    background: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    whiteSpace: 'nowrap'
  },
  routeBtn: {
    padding: '6px 12px',
    background: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap'
  },
  noLocation: {
    color: '#999',
    fontSize: '12px'
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '12px',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'inline-block'
  },
  summary: {
    marginTop: '20px',
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '8px',
    display: 'flex',
    gap: '30px',
    fontSize: '14px'
  }
};
