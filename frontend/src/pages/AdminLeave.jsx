import { useState, useEffect } from 'react';
import api from '../api/client.js';

export default function AdminLeave() {
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [leaveRes, empRes] = await Promise.all([
        api.get('/leave/all').catch(() => ({ data: { leaves: [] } })),
        api.get('/company/employees').catch(() => ({ data: { data: { employees: [] } } }))
      ]);
      setLeaves(leaveRes.data.leaves || []);
      setEmployees(empRes.data.data?.employees || empRes.data.employees || []);
    } catch (err) {
      setMessage('Error fetching data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (id, status) => {
    try {
      const { data } = await api.post(`/leave/${id}/decision`, { status });
      setMessage(`Leave ${status} successfully`);
      fetchData();
    } catch (err) {
      setMessage(err.response?.data?.message || `Error updating leave`);
      console.error(err);
    }
  };

  const filteredLeaves = filter === 'all' 
    ? leaves 
    : leaves.filter(l => l.status === filter);

  if (loading && leaves.length === 0) {
    return <div style={{ padding: '20px' }}>Loading leave requests...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Leave Management</h1>

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

      <div style={{ marginBottom: '20px' }}>
        <label style={{ marginRight: '15px' }}>
          <input
            type="radio"
            value="pending"
            checked={filter === 'pending'}
            onChange={(e) => setFilter(e.target.value)}
          />
          {' '}Pending ({leaves.filter(l => l.status === 'pending').length})
        </label>
        <label style={{ marginRight: '15px' }}>
          <input
            type="radio"
            value="approved"
            checked={filter === 'approved'}
            onChange={(e) => setFilter(e.target.value)}
          />
          {' '}Approved ({leaves.filter(l => l.status === 'approved').length})
        </label>
        <label style={{ marginRight: '15px' }}>
          <input
            type="radio"
            value="rejected"
            checked={filter === 'rejected'}
            onChange={(e) => setFilter(e.target.value)}
          />
          {' '}Rejected ({leaves.filter(l => l.status === 'rejected').length})
        </label>
        <label>
          <input
            type="radio"
            value="all"
            checked={filter === 'all'}
            onChange={(e) => setFilter(e.target.value)}
          />
          {' '}All ({leaves.length})
        </label>
      </div>

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
              <th style={{ padding: '12px', textAlign: 'left' }}>Start Date</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>End Date</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Reason</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeaves.map((leave) => (
              <tr key={leave.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px' }}>
                  {employees.find(e => e.id === leave.user_id)?.full_name || leave.user_id}
                </td>
                <td style={{ padding: '12px' }}>
                  {new Date(leave.start_date).toLocaleDateString()}
                </td>
                <td style={{ padding: '12px' }}>
                  {new Date(leave.end_date).toLocaleDateString()}
                </td>
                <td style={{ padding: '12px' }}>{leave.reason || 'N/A'}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    padding: '4px 8px',
                    backgroundColor: 
                      leave.status === 'approved' ? '#c8e6c9' :
                      leave.status === 'rejected' ? '#ffcdd2' :
                      '#fff9c4',
                    borderRadius: '4px',
                    fontSize: '12px',
                    textTransform: 'capitalize'
                  }}>
                    {leave.status}
                  </span>
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  {leave.status === 'pending' && (
                    <div>
                      <button
                        onClick={() => handleDecision(leave.id, 'approved')}
                        style={{
                          padding: '6px 10px',
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          marginRight: '5px'
                        }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleDecision(leave.id, 'rejected')}
                        style={{
                          padding: '6px 10px',
                          backgroundColor: '#f44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredLeaves.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          No {filter} leave requests found.
        </div>
      )}
    </div>
  );
}
