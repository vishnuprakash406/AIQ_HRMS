import { useState, useEffect } from 'react';
import api from '../api/client.js';

export default function EmployeeOnboarding() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [profile, setProfile] = useState({
    designation: '',
    date_of_birth: '',
    marital_status: '',
    spouse_name: '',
    father_name: '',
    mother_name: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    address: '',
    id_type: '',
    id_number: '',
    bank_name: '',
    bank_account_number: '',
    bank_ifsc: ''
  });
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    fetchTasks();
    fetchProfile();
    fetchDocuments();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/onboarding/tasks');
      setTasks(data.tasks || []);
    } catch (err) {
      setMessage('Error fetching onboarding tasks');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/onboarding/profile');
      if (data.profile) {
        setProfile(prev => ({ ...prev, ...data.profile }));
      }
    } catch (err) {
      console.error('Error fetching onboarding profile:', err);
    }
  };

  const fetchDocuments = async () => {
    try {
      const { data } = await api.get('/onboarding/documents');
      setDocuments(data.documents || []);
    } catch (err) {
      console.error('Error fetching onboarding documents:', err);
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      await api.put(`/onboarding/tasks/${taskId}/complete`);
      setMessage('Task marked as complete!');
      fetchTasks();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error completing task');
      console.error(err);
    }
  };

  if (loading && tasks.length === 0) {
    return <div style={{ padding: '20px' }}>Loading onboarding tasks...</div>;
  }

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const fileBase = api.defaults.baseURL.replace('/api/v1', '');

  return (
    <div style={{ padding: '20px' }}>
      <h1>Your Onboarding Checklist</h1>

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

      <div style={{
        padding: '20px',
        marginBottom: '20px',
        backgroundColor: '#f7f9fc',
        borderRadius: '8px',
        border: '1px solid #e0e0e0'
      }}>
        <h2 style={{ marginTop: 0 }}>Employee Details</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          <div><strong>Designation:</strong> {profile.designation || 'Not provided'}</div>
          <div><strong>Date of Birth:</strong> {profile.date_of_birth || 'Not provided'}</div>
          <div><strong>Marital Status:</strong> {profile.marital_status || 'Not provided'}</div>
          <div><strong>Spouse Name:</strong> {profile.spouse_name || 'Not provided'}</div>
          <div><strong>Father Name:</strong> {profile.father_name || 'Not provided'}</div>
          <div><strong>Mother Name:</strong> {profile.mother_name || 'Not provided'}</div>
          <div><strong>Emergency Contact Name:</strong> {profile.emergency_contact_name || 'Not provided'}</div>
          <div><strong>Emergency Contact Phone:</strong> {profile.emergency_contact_phone || 'Not provided'}</div>
          <div><strong>ID Type:</strong> {profile.id_type || 'Not provided'}</div>
          <div><strong>ID Number:</strong> {profile.id_number || 'Not provided'}</div>
          <div><strong>Bank Name:</strong> {profile.bank_name || 'Not provided'}</div>
          <div><strong>Bank Account Number:</strong> {profile.bank_account_number || 'Not provided'}</div>
          <div><strong>IFSC:</strong> {profile.bank_ifsc || 'Not provided'}</div>
        </div>
        <div style={{ marginTop: '12px' }}>
          <strong>Address:</strong> {profile.address || 'Not provided'}
        </div>
      </div>

      <div style={{
        padding: '20px',
        marginBottom: '20px',
        backgroundColor: '#fff7f0',
        borderRadius: '8px',
        border: '1px solid #f2d9c4'
      }}>
        <h2 style={{ marginTop: 0 }}>Upload Documents</h2>
        <p style={{ color: '#666' }}>Documents are uploaded by admin.</p>
        <div style={{ marginTop: '15px' }}>
          {documents.length === 0 ? (
            <p style={{ color: '#666' }}>No documents uploaded yet.</p>
          ) : (
            <ul style={{ paddingLeft: '18px', margin: 0 }}>
              {documents.map(doc => (
                <li key={doc.id} style={{ marginBottom: '6px' }}>
                  <a href={`${fileBase}${doc.file_url}`} target="_blank" rel="noreferrer">
                    {doc.title || 'Document'}
                  </a>
                  <span style={{ color: '#888', marginLeft: '8px', fontSize: '12px' }}>
                    {new Date(doc.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {totalCount > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ marginBottom: '5px' }}>
            <strong>Progress: {completedCount} of {totalCount} tasks completed</strong>
          </div>
          <div style={{
            width: '100%',
            height: '30px',
            backgroundColor: '#e0e0e0',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: '#4CAF50',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: '20px'
      }}>
        {tasks.map((task) => (
          <div
            key={task.id}
            style={{
              padding: '20px',
              border: `2px solid ${task.completed ? '#4CAF50' : '#ddd'}`,
              borderRadius: '8px',
              backgroundColor: task.completed ? '#f1f8f4' : 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              opacity: task.completed ? 0.7 : 1
            }}
          >
            <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: task.completed ? '#4CAF50' : '#ddd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                flexShrink: 0
              }}>
                {task.completed ? '✓' : ''}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ marginTop: 0, marginBottom: '8px' }}>
                  {task.title}
                  {task.completed && (
                    <span style={{ color: '#4CAF50', fontSize: '14px', marginLeft: '8px' }}>
                      ✓ Completed
                    </span>
                  )}
                </h3>
                <p style={{ marginTop: 0, marginBottom: '12px', color: '#666', fontSize: '14px' }}>
                  {task.description || 'No description'}
                </p>
                {task.completed && task.completed_at && (
                  <p style={{ fontSize: '12px', color: '#999', marginBottom: '12px' }}>
                    Completed on {new Date(task.completed_at).toLocaleDateString()}
                  </p>
                )}
                {!task.completed && (
                  <button
                    onClick={() => handleCompleteTask(task.id)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Mark as Complete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {tasks.length === 0 && !loading && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#666',
          backgroundColor: '#f9f9f9',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>🎓</div>
          <h3>No onboarding tasks yet</h3>
          <p>Your admin will assign onboarding tasks to help you get started!</p>
        </div>
      )}

      {tasks.length > 0 && completedCount === totalCount && (
        <div style={{
          marginTop: '30px',
          padding: '20px',
          backgroundColor: '#e8f5e9',
          borderRadius: '8px',
          textAlign: 'center',
          border: '2px solid #4CAF50'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>🎉</div>
          <h3 style={{ color: '#2e7d32' }}>Onboarding Complete!</h3>
          <p style={{ color: '#558b2f' }}>Great job! You've completed all onboarding tasks.</p>
        </div>
      )}
    </div>
  );
}
