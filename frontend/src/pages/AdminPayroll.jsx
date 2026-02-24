import { useState, useEffect } from 'react';
import api from '../api/client.js';

export default function AdminPayroll() {
  const [payslips, setPayslips] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    period: '',
    file_url: ''
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [payRes, empRes] = await Promise.all([
        api.get('/payroll/payslips/all').catch(() => ({ data: { payslips: [] } })),
        api.get('/auth/employees').catch(() => ({ data: { employees: [] } }))
      ]);
      setPayslips(payRes.data.payslips || []);
      setEmployees(empRes.data.employees || []);
    } catch (err) {
      setMessage('Error fetching data');
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
      const { data } = await api.post('/payroll/payslips', formData);
      setMessage('Payslip uploaded successfully');
      setFormData({
        user_id: '',
        period: '',
        file_url: ''
      });
      setShowForm(false);
      fetchData();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error uploading payslip');
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this payslip?')) {
      try {
        await api.delete(`/payroll/payslips/${id}`);
        setMessage('Payslip deleted successfully');
        fetchData();
      } catch (err) {
        setMessage(err.response?.data?.message || 'Error deleting payslip');
      }
    }
  };

  if (loading && payslips.length === 0) {
    return <div style={{ padding: '20px' }}>Loading payroll data...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Payroll Management</h1>
        <button 
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {showForm ? 'Cancel' : 'Upload Payslip'}
        </button>
      </div>

      {message && (
        <div style={{
          padding: '10px',
          marginBottom: '20px',
          backgroundColor: message.includes('Error') ? '#ffebee' : '#e8f5e9',
          color: message.includes('Error') ? '#c62828' : '#2e7d32',
          borderRadius: '4px'
        }}>
          {message}
        </div>
      )}

      {showForm && (
        <div style={{
          padding: '20px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          marginBottom: '20px',
          maxWidth: '500px'
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Select Employee *</label>
              <select
                name="user_id"
                value={formData.user_id}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">-- Select Employee --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.email || emp.phone})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Period *</label>
              <input
                type="text"
                name="period"
                value={formData.period}
                onChange={handleInputChange}
                placeholder="e.g., January 2024"
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>File URL/Path *</label>
              <input
                type="text"
                name="file_url"
                value={formData.file_url}
                onChange={handleInputChange}
                placeholder="e.g., /uploads/payslips/2024-01.pdf"
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Upload Payslip
            </button>
          </form>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>Employee</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Period</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>File</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Uploaded</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {payslips.map((slip) => (
              <tr key={slip.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px' }}>
                  {employees.find(e => e.id === slip.user_id)?.full_name || slip.user_id}
                </td>
                <td style={{ padding: '12px' }}>{slip.period}</td>
                <td style={{ padding: '12px' }}>
                  <a href={slip.file_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2196F3' }}>
                    Download
                  </a>
                </td>
                <td style={{ padding: '12px' }}>{new Date(slip.created_at).toLocaleDateString()}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <button
                    onClick={() => handleDelete(slip.id)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {payslips.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          No payslips uploaded yet. Upload one to get started!
        </div>
      )}
    </div>
  );
}
