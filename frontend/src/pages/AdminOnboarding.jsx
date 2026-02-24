import { useState, useEffect } from 'react';
import api from '../api/client.js';

export default function AdminOnboarding() {
  const [templates, setTemplates] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [selectedProfileEmployee, setSelectedProfileEmployee] = useState('');
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
  const [uploadData, setUploadData] = useState({ title: '', file: null });
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedProfileEmployee) {
      fetchProfile(selectedProfileEmployee);
      fetchDocuments(selectedProfileEmployee);
    }
  }, [selectedProfileEmployee]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tempRes, empRes] = await Promise.all([
        api.get('/onboarding/templates').catch(() => ({ data: { templates: [] } })),
        api.get('/auth/employees').catch(() => ({ data: { employees: [] } }))
      ]);
      setTemplates(tempRes.data.templates || []);
      setEmployees(empRes.data.employees || []);
    } catch (err) {
      setMessage('Error fetching data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async (userId) => {
    try {
      const { data } = await api.get(`/onboarding/profile/${userId}`);
      if (data.profile) {
        setProfile(prev => ({ ...prev, ...data.profile }));
      } else {
        setProfile({
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
      }
    } catch (err) {
      setMessage('Error fetching employee profile');
      console.error(err);
    }
  };

  const fetchDocuments = async (userId) => {
    try {
      const { data } = await api.get(`/onboarding/documents/${userId}`);
      setDocuments(data.documents || []);
    } catch (err) {
      setMessage('Error fetching employee documents');
      console.error(err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!selectedProfileEmployee) {
      setMessage('Please select an employee');
      return;
    }
    try {
      await api.put(`/onboarding/profile/${selectedProfileEmployee}`, profile);
      setMessage('Employee details updated');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error updating employee details');
      console.error(err);
    }
  };

  const handleUploadChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'file') {
      setUploadData(prev => ({ ...prev, file: files?.[0] || null }));
      return;
    }
    setUploadData(prev => ({ ...prev, [name]: value }));
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProfileEmployee) {
      setMessage('Please select an employee');
      return;
    }
    if (!uploadData.file) {
      setMessage('Please select a file to upload');
      return;
    }
    try {
      const form = new FormData();
      form.append('title', uploadData.title || uploadData.file.name);
      form.append('file', uploadData.file);
      await api.post(`/onboarding/documents/${selectedProfileEmployee}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage('Document uploaded');
      setUploadData({ title: '', file: null });
      fetchDocuments(selectedProfileEmployee);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error uploading document');
      console.error(err);
    }
  };

  const handleTaskSelection = (taskId) => {
    setSelectedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/onboarding/templates', {
        title: formData.title,
        description: formData.description
      });
      setMessage('Template created successfully');
      setFormData({ title: '', description: '' });
      setShowTemplateForm(false);
      fetchData();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error creating template');
      console.error(err);
    }
  };

  const handleAssignTasks = async (e) => {
    e.preventDefault();
    if (!selectedEmployee || selectedTasks.length === 0) {
      setMessage('Please select an employee and at least one task');
      return;
    }

    try {
      await api.post(`/onboarding/assign/${selectedEmployee}`, {
        taskIds: selectedTasks
      });
      setMessage('Tasks assigned successfully');
      setSelectedEmployee('');
      setSelectedTasks([]);
      setShowAssignForm(false);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error assigning tasks');
      console.error(err);
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      try {
        await api.delete(`/onboarding/templates/${id}`);
        setMessage('Template deleted successfully');
        fetchData();
      } catch (err) {
        setMessage(err.response?.data?.message || 'Error deleting template');
      }
    }
  };

  const fileBase = api.defaults.baseURL.replace('/api/v1', '');

  if (loading && templates.length === 0) {
    return <div style={{ padding: '20px' }}>Loading onboarding templates...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Onboarding Management</h1>

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

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => setShowTemplateForm(!showTemplateForm)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {showTemplateForm ? 'Cancel' : 'Create Task Template'}
        </button>
        <button
          onClick={() => setShowAssignForm(!showAssignForm)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {showAssignForm ? 'Cancel' : 'Assign Tasks to Employee'}
        </button>
      </div>

      <div style={{
        padding: '20px',
        marginBottom: '20px',
        backgroundColor: '#f7f9fc',
        borderRadius: '8px',
        border: '1px solid #e0e0e0'
      }}>
        <h2 style={{ marginTop: 0 }}>Employee Details & Documents</h2>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Select Employee</label>
          <select
            value={selectedProfileEmployee}
            onChange={(e) => setSelectedProfileEmployee(e.target.value)}
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

        {selectedProfileEmployee && (
          <>
            <form onSubmit={handleProfileSave}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Designation</label>
                  <input
                    type="text"
                    name="designation"
                    value={profile.designation}
                    onChange={handleProfileChange}
                    placeholder="e.g., Software Engineer"
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Date of Birth</label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={profile.date_of_birth || ''}
                    onChange={handleProfileChange}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Marital Status</label>
                  <select
                    name="marital_status"
                    value={profile.marital_status || ''}
                    onChange={handleProfileChange}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }}
                  >
                    <option value="">Select</option>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Spouse Name</label>
                  <input
                    type="text"
                    name="spouse_name"
                    value={profile.spouse_name || ''}
                    onChange={handleProfileChange}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Father Name</label>
                  <input
                    type="text"
                    name="father_name"
                    value={profile.father_name || ''}
                    onChange={handleProfileChange}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Mother Name</label>
                  <input
                    type="text"
                    name="mother_name"
                    value={profile.mother_name || ''}
                    onChange={handleProfileChange}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Emergency Contact Name</label>
                  <input
                    type="text"
                    name="emergency_contact_name"
                    value={profile.emergency_contact_name || ''}
                    onChange={handleProfileChange}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Emergency Contact Phone</label>
                  <input
                    type="text"
                    name="emergency_contact_phone"
                    value={profile.emergency_contact_phone || ''}
                    onChange={handleProfileChange}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>ID Type</label>
                  <input
                    type="text"
                    name="id_type"
                    value={profile.id_type || ''}
                    onChange={handleProfileChange}
                    placeholder="e.g., Aadhaar / Passport"
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>ID Number</label>
                  <input
                    type="text"
                    name="id_number"
                    value={profile.id_number || ''}
                    onChange={handleProfileChange}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Bank Name</label>
                  <input
                    type="text"
                    name="bank_name"
                    value={profile.bank_name || ''}
                    onChange={handleProfileChange}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Bank Account Number</label>
                  <input
                    type="text"
                    name="bank_account_number"
                    value={profile.bank_account_number || ''}
                    onChange={handleProfileChange}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>IFSC</label>
                  <input
                    type="text"
                    name="bank_ifsc"
                    value={profile.bank_ifsc || ''}
                    onChange={handleProfileChange}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Address</label>
                <textarea
                  name="address"
                  value={profile.address || ''}
                  onChange={handleProfileChange}
                  rows="2"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>
              <button type="submit" style={{ marginTop: '12px', padding: '8px 16px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Save Details
              </button>
            </form>

            <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#fff7f0', borderRadius: '8px', border: '1px solid #f2d9c4' }}>
              <h3 style={{ marginTop: 0 }}>Upload Documents</h3>
              <form onSubmit={handleUploadSubmit}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    type="text"
                    name="title"
                    value={uploadData.title}
                    onChange={handleUploadChange}
                    placeholder="Document name (e.g., ID Proof)"
                    style={{ width: '240px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                  <input type="file" name="file" onChange={handleUploadChange} />
                  <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#ff9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Upload
                  </button>
                </div>
              </form>

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
          </>
        )}
      </div>

      {showTemplateForm && (
        <div style={{
          padding: '20px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          marginBottom: '20px',
          maxWidth: '500px'
        }}>
          <h3>Create Task Template</h3>
          <form onSubmit={handleCreateTemplate}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Task Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Complete Profile Setup"
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
              <label style={{ display: 'block', marginBottom: '5px' }}>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Details about this task"
                rows="3"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Create Template
            </button>
          </form>
        </div>
      )}

      {showAssignForm && (
        <div style={{
          padding: '20px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          marginBottom: '20px',
          maxWidth: '600px'
        }}>
          <h3>Assign Tasks to Employee</h3>
          <form onSubmit={handleAssignTasks}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Select Employee *</label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
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
              <label style={{ display: 'block', marginBottom: '5px' }}>Select Tasks *</label>
              <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '10px' }}>
                {templates.length === 0 ? (
                  <p style={{ color: '#999' }}>No templates available. Create some first.</p>
                ) : (
                  templates.map(template => (
                    <label key={template.id} style={{ display: 'block', marginBottom: '10px' }}>
                      <input
                        type="checkbox"
                        checked={selectedTasks.includes(template.id)}
                        onChange={() => handleTaskSelection(template.id)}
                      />
                      {' '}{template.title}
                    </label>
                  ))
                )}
              </div>
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
              Assign Tasks
            </button>
          </form>
        </div>
      )}

      <h2>Available Task Templates</h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        {templates.map((template) => (
          <div
            key={template.id}
            style={{
              padding: '20px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              backgroundColor: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '10px' }}>{template.title}</h3>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
              {template.description || 'No description'}
            </div>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '15px' }}>
              Created: {new Date(template.created_at).toLocaleDateString()}
            </div>
            <button
              onClick={() => handleDeleteTemplate(template.id)}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {templates.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          No task templates yet. Create one to get started!
        </div>
      )}
    </div>
  );
}
