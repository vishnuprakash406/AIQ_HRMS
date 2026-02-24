import { useState, useEffect } from 'react';
import api from '../api/client.js';

export default function AdminGeofencing() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    latitude: '',
    longitude: '',
    radius_meters: '',
    description: ''
  });

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/attendance/geofence/zones');
      setZones(data.zones || []);
    } catch (err) {
      setMessage('Error fetching geofence zones');
      console.error(err);
    } finally {
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
      if (!formData.name || !formData.latitude || !formData.longitude || !formData.radius_meters) {
        setMessage('Please fill in all required fields');
        return;
      }

      if (editingId) {
        // Update existing zone
        const { data } = await api.put(`/attendance/geofence/zones/${editingId}`, formData);
        setMessage('Zone updated successfully');
        setZones(zones.map(z => z.id === editingId ? data.zone : z));
        setEditingId(null);
      } else {
        // Create new zone
        const { data } = await api.post('/attendance/geofence/zones', formData);
        setMessage('Zone created successfully');
        setZones([...zones, data.zone]);
      }

      setFormData({ name: '', latitude: '', longitude: '', radius_meters: '', description: '' });
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Error saving zone');
      console.error(err);
    }
  };

  const handleEdit = (zone) => {
    setEditingId(zone.id);
    setFormData({
      name: zone.name,
      latitude: zone.latitude,
      longitude: zone.longitude,
      radius_meters: zone.radius_meters,
      description: zone.description || ''
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this zone?')) return;

    try {
      await api.delete(`/attendance/geofence/zones/${id}`);
      setMessage('Zone deleted successfully');
      setZones(zones.filter(z => z.id !== id));
    } catch (err) {
      setMessage('Error deleting zone');
      console.error(err);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ name: '', latitude: '', longitude: '', radius_meters: '', description: '' });
  };

  return (
    <div style={styles.container}>
      <h1>Geofence Zone Management</h1>

      {message && <div style={styles.message}>{message}</div>}

      {/* Form */}
      <div style={styles.formBox}>
        <h2>{editingId ? 'Edit Zone' : 'Create New Zone'}</h2>
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label>Zone Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Main Office"
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label>Latitude *</label>
            <input
              type="number"
              name="latitude"
              step="0.000001"
              value={formData.latitude}
              onChange={handleInputChange}
              placeholder="e.g., 40.7128"
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label>Longitude *</label>
            <input
              type="number"
              name="longitude"
              step="0.000001"
              value={formData.longitude}
              onChange={handleInputChange}
              placeholder="e.g., -74.0060"
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label>Radius (meters) *</label>
            <input
              type="number"
              name="radius_meters"
              value={formData.radius_meters}
              onChange={handleInputChange}
              placeholder="e.g., 100"
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Optional description"
              style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
            />
          </div>

          <div style={styles.buttonGroup}>
            <button type="submit" style={{ ...styles.button, background: '#007bff' }}>
              {editingId ? 'Update Zone' : 'Create Zone'}
            </button>
            {editingId && (
              <button type="button" onClick={handleCancel} style={{ ...styles.button, background: '#6c757d' }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Zones List */}
      {loading ? (
        <p>Loading zones...</p>
      ) : (
        <div style={styles.zonesBox}>
          <h2>Active Geofence Zones ({zones.length})</h2>
          {zones.length === 0 ? (
            <p>No geofence zones configured yet.</p>
          ) : (
            <div style={styles.zonesList}>
              {zones.map(zone => (
                <div key={zone.id} style={styles.zoneItem}>
                  <div style={styles.zoneInfo}>
                    <h3>{zone.name}</h3>
                    <p><strong>Location:</strong> {parseFloat(zone.latitude).toFixed(6)}, {parseFloat(zone.longitude).toFixed(6)}</p>
                    <p><strong>Radius:</strong> {zone.radius_meters}m</p>
                    {zone.description && <p><strong>Description:</strong> {zone.description}</p>}
                    <p style={{ fontSize: '12px', color: '#666' }}>Created: {new Date(zone.created_at).toLocaleDateString()}</p>
                  </div>
                  <div style={styles.zoneActions}>
                    <button
                      onClick={() => handleEdit(zone)}
                      style={{ ...styles.actionBtn, background: '#007bff' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(zone.id)}
                      style={{ ...styles.actionBtn, background: '#dc3545' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Map Info */}
      <div style={styles.mapInfo}>
        <h3>Map Coordinates Helper</h3>
        <p>To find coordinates for your office location:</p>
        <ol>
          <li>Visit <strong>Google Maps</strong> and search for your office address</li>
          <li>Right-click on the location and select <strong>"What's here?"</strong></li>
          <li>The coordinates (latitude, longitude) will appear at the bottom</li>
          <li>Set the radius based on your office size (typically 50-200 meters)</li>
        </ol>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '900px',
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
  formBox: {
    background: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '30px',
    border: '1px solid #dee2e6'
  },
  formGroup: {
    marginBottom: '15px'
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px'
  },
  button: {
    flex: 1,
    padding: '10px',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  zonesBox: {
    marginBottom: '30px'
  },
  zonesList: {
    display: 'grid',
    gap: '15px'
  },
  zoneItem: {
    background: 'white',
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  zoneInfo: {
    flex: 1
  },
  zoneActions: {
    display: 'flex',
    gap: '10px',
    marginLeft: '15px'
  },
  actionBtn: {
    padding: '8px 16px',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap'
  },
  mapInfo: {
    background: '#e7f3ff',
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid #b3d9ff'
  }
};
