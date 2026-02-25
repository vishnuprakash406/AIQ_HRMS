import React, { useState, useEffect } from 'react';
import '../styles.css';
import api from '../api/client';

export default function Geofencing() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 37.7749, lng: -122.4194 }); // Default to San Francisco
  
  const [formData, setFormData] = useState({
    name: '',
    latitude: '',
    longitude: '',
    radius_meters: '',
    description: ''
  });

  const token = localStorage.getItem('companyToken') || localStorage.getItem('accessToken');

  useEffect(() => {
    if (!token) {
      window.location.href = '/company-login';
      return;
    }
    fetchZones();
  }, [token]);

  const fetchZones = async () => {
    try {
      setLoading(true);
      const response = await api.get('/attendance/geofence/zones');
      setZones(response.data.zones || []);
    } catch (err) {
      setError('Failed to fetch geofence zones');
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

  const handleMapClick = () => {
    setShowMap(true);
  };

  const handleMapSelect = (lat, lng) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6)
    }));
    setShowMap(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name || !formData.latitude || !formData.longitude || !formData.radius_meters) {
      setError('All fields except description are required');
      return;
    }

    try {
      if (editingZone) {
        await api.put(`/attendance/geofence/zones/${editingZone.id}`, formData);
        setSuccess('Geofence zone updated successfully!');
      } else {
        await api.post('/attendance/geofence/zones', formData);
        setSuccess('Geofence zone created successfully!');
      }
      
      setFormData({ name: '', latitude: '', longitude: '', radius_meters: '', description: '' });
      setEditingZone(null);
      setShowForm(false);
      await fetchZones();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save geofence zone');
    }
  };

  const handleEdit = (zone) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      latitude: zone.latitude,
      longitude: zone.longitude,
      radius_meters: zone.radius_meters,
      description: zone.description || ''
    });
    setShowForm(true);
    setMapCenter({ lat: parseFloat(zone.latitude), lng: parseFloat(zone.longitude) });
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this geofence zone?')) return;

    try {
      await api.delete(`/attendance/geofence/zones/${id}`);
      setSuccess('Geofence zone deleted successfully!');
      await fetchZones();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete geofence zone');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingZone(null);
    setFormData({ name: '', latitude: '', longitude: '', radius_meters: '', description: '' });
    setShowMap(false);
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>📍 Geofencing Management</h1>
        <button onClick={() => setShowForm(!showForm)} className="logout-btn">
          {showForm ? '✕ Cancel' : '➕ New Zone'}
        </button>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="form-container" style={{ display: 'block', marginBottom: '30px' }}>
          <form onSubmit={handleSubmit} className="create-company-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Zone Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Office Building A"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="radius_meters">Radius (meters) *</label>
                <input
                  type="number"
                  id="radius_meters"
                  name="radius_meters"
                  value={formData.radius_meters}
                  onChange={handleInputChange}
                  placeholder="e.g., 500"
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="latitude">Latitude *</label>
                <input
                  type="number"
                  id="latitude"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleInputChange}
                  placeholder="e.g., 37.7749"
                  step="0.000001"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="longitude">Longitude *</label>
                <input
                  type="number"
                  id="longitude"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleInputChange}
                  placeholder="e.g., -122.4194"
                  step="0.000001"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <button type="button" onClick={handleMapClick} className="btn btn-secondary" style={{ marginBottom: '15px' }}>
                🗺️ Select Location on Map
              </button>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Optional: Add notes about this zone"
                rows="3"
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-primary">
                {editingZone ? '💾 Update Zone' : '✅ Create Zone'}
              </button>
              <button type="button" onClick={handleCancel} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showMap && (
        <InteractiveMap
          onSelect={handleMapSelect}
          onClose={() => setShowMap(false)}
          center={mapCenter}
          zones={zones}
          currentZone={editingZone}
        />
      )}

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>⏳ Loading zones...</div>
      ) : zones.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p>No geofence zones created yet. Click "New Zone" to create one.</p>
        </div>
      ) : (
        <div className="zones-grid">
          {zones.map((zone) => (
            <div key={zone.id} className="zone-card">
              <div className="zone-header">
                <h3>{zone.name}</h3>
                <span className={`zone-status ${zone.is_active ? 'active' : 'inactive'}`}>
                  {zone.is_active ? '✅ Active' : '❌ Inactive'}
                </span>
              </div>

              <div className="zone-details">
                <div className="detail-row">
                  <span className="label">📍 Location:</span>
                  <span className="value">
                    {parseFloat(zone.latitude).toFixed(4)}, {parseFloat(zone.longitude).toFixed(4)}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">📏 Radius:</span>
                  <span className="value">{zone.radius_meters}m</span>
                </div>
                <div className="detail-row">
                  <span className="label">📝 Description:</span>
                  <span className="value">{zone.description || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">📅 Created:</span>
                  <span className="value">{new Date(zone.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="zone-actions">
                <button onClick={() => handleEdit(zone)} className="btn btn-primary btn-sm">
                  ✎ Edit
                </button>
                <button onClick={() => handleDelete(zone.id)} className="btn btn-danger btn-sm">
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Interactive Map Component (simplified version without external dependencies)
function InteractiveMap({ onSelect, onClose, center, zones, currentZone }) {
  const mapContainerRef = React.useRef(null);
  const mapRef = React.useRef(null);

  React.useEffect(() => {
    // Check if Leaflet is available, otherwise show fallback
    if (window.L) {
      initMap();
    }
  }, []);

  const initMap = () => {
    const L = window.L;
    if (!mapContainerRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current).setView([center.lat, center.lng], 13);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    mapRef.current = map;

    // Add click handler
    map.on('click', (e) => {
      onSelect(e.latlng.lat, e.latlng.lng);
    });

    // Add existing zones as circles
    zones.forEach(zone => {
      L.circle([zone.latitude, zone.longitude], {
        radius: zone.radius_meters,
        color: zone.id === currentZone?.id ? '#ff0000' : '#0066ff',
        fillColor: zone.id === currentZone?.id ? '#ff6666' : '#0099ff',
        fillOpacity: 0.2
      }).addTo(map).bindPopup(`<strong>${zone.name}</strong><br/>Radius: ${zone.radius_meters}m`);
    });

    // Add current location marker if editing
    if (currentZone) {
      L.circleMarker([center.lat, center.lng], {
        radius: 8,
        fillColor: '#ff0000',
        color: '#000',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(map).bindPopup('Current Zone Center');
    }
  };

  return (
    <div className="map-modal" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3>📍 Select Zone Location on Map</h3>
          <button onClick={onClose} className="btn btn-secondary" style={{ fontSize: '18px' }}>✕</button>
        </div>

        <div
          ref={mapContainerRef}
          style={{
            width: '100%',
            height: '500px',
            borderRadius: '4px',
            marginBottom: '15px',
            zIndex: 999
          }}
        />

        <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
          💡 Click on the map to select the center of your geofence zone.
        </p>

        <button onClick={onClose} className="btn btn-primary">
          Done
        </button>
      </div>
    </div>
  );
}

// Additional styling
const styles = `
  .zones-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    padding: 20px;
  }

  .zone-card {
    background: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    border-left: 4px solid #3498db;
  }

  .zone-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    border-bottom: 2px solid #ecf0f1;
    padding-bottom: 10px;
  }

  .zone-header h3 {
    margin: 0;
    color: #2c3e50;
    font-size: 18px;
  }

  .zone-status {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: bold;
  }

  .zone-status.active {
    background-color: #d4edda;
    color: #155724;
  }

  .zone-status.inactive {
    background-color: #f8d7da;
    color: #721c24;
  }

  .zone-details {
    margin-bottom: 15px;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 14px;
  }

  .detail-row .label {
    font-weight: bold;
    color: #555;
  }

  .detail-row .value {
    color: #666;
    text-align: right;
    flex: 1;
    margin-left: 10px;
  }

  .zone-actions {
    display: flex;
    gap: 10px;
  }

  .btn-sm {
    padding: 6px 12px;
    font-size: 12px;
  }

  .form-container {
    background: white;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
`;
