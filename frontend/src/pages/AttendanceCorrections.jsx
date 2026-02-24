import { useState, useEffect } from 'react';
import api from '../api/client.js';

export default function AttendanceCorrections() {
  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    reason: '',
    type: 'late_checkin' // late_checkin, early_checkout, missed_checkin
  });

  useEffect(() => {
    fetchCorrections();
  }, []);

  const fetchCorrections = async () => {
    try {
      // Mock data for now - in production, would call API
      setCorrections([
        {
          id: '1',
          date: '2026-02-20',
          reason: 'Late due to traffic',
          type: 'late_checkin',
          status: 'approved',
          created_at: '2026-02-20T10:00:00Z'
        }
      ]);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching corrections:', err);
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
      if (!formData.date || !formData.reason) {
        setMessage('Please fill in all fields');
        return;
      }

      // Mock submission - in production would call API
      const newCorrection = {
        id: Date.now().toString(),
        ...formData,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      setCorrections([...corrections, newCorrection]);
      setMessage('✅ Attendance correction request submitted');
      setFormData({ date: '', reason: '', type: 'late_checkin' });
      setShowForm(false);

      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error submitting correction');
      console.error(err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#28a745';
      case 'rejected': return '#dc3545';
      case 'pending': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const getTypeLabel = (type) => {
    const types = {
      late_checkin: 'Late Check-in',
      early_checkout: 'Early Check-out',
      missed_checkin: 'Missed Check-in'
    };
    return types[type] || type;
  };

  return (
    <div style={styles.container}>
      <h1>Attendance Corrections</h1>
      <p>Request corrections for attendance discrepancies</p>

      {message && <div style={styles.message}>{message}</div>}

      <button
        onClick={() => setShowForm(!showForm)}
        style={styles.submitBtn}
      >
        {showForm ? '✕ Close Form' : '+ New Correction Request'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label>Correction Date *</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label>Type of Correction *</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              style={styles.input}
            >
              <option value="late_checkin">Late Check-in</option>
              <option value="early_checkout">Early Check-out</option>
              <option value="missed_checkin">Missed Check-in</option>
            </select>
          </div>

          <div style={styles.formGroup}>
            <label>Reason *</label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              placeholder="Explain why you need this correction..."
              style={{ ...styles.input, minHeight: '100px', resize: 'vertical' }}
              required
            />
          </div>

          <button type="submit" style={styles.actionBtn}>
            Submit Request
          </button>
        </form>
      )}

      {loading ? (
        <p>Loading corrections...</p>
      ) : (
        <div style={styles.listContainer}>
          <h2>Your Correction Requests</h2>
          {corrections.length === 0 ? (
            <p>No correction requests yet.</p>
          ) : (
            <div style={styles.table}>
              {corrections.map(correction => (
                <div key={correction.id} style={styles.tableRow}>
                  <div style={styles.tableCell}>
                    <strong>{new Date(correction.date).toLocaleDateString()}</strong>
                    <p style={styles.typeLabel}>{getTypeLabel(correction.type)}</p>
                  </div>
                  <div style={styles.tableCell}>
                    <p>{correction.reason}</p>
                  </div>
                  <div style={styles.tableCell}>
                    <div
                      style={{
                        ...styles.statusBadge,
                        background: getStatusColor(correction.status)
                      }}
                    >
                      {correction.status.toUpperCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '800px',
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
  submitBtn: {
    padding: '10px 20px',
    background: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    marginBottom: '20px'
  },
  form: {
    background: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '30px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box',
    fontFamily: 'Arial, sans-serif'
  },
  actionBtn: {
    padding: '10px 20px',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px'
  },
  listContainer: {
    background: 'white',
    padding: '20px',
    borderRadius: '8px'
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginTop: '15px'
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr 1fr',
    gap: '15px',
    padding: '15px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    alignItems: 'center'
  },
  tableCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  typeLabel: {
    fontSize: '12px',
    color: '#666',
    margin: 0
  },
  statusBadge: {
    padding: '6px 12px',
    color: 'white',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    textAlign: 'center'
  }
};
