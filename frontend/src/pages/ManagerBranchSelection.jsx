import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles.css';

export default function ManagerBranchSelection() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('companyToken');
        const managerId = localStorage.getItem('manager_id');

        if (!token || !managerId) {
          setError('Session expired. Please login again.');
          setTimeout(() => navigate('/company-login'), 2000);
          return;
        }

        const response = await fetch(
          `http://localhost:3000/api/v1/company/managers/${managerId}/branches`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch branches: ${response.statusText}`);
        }

        const data = await response.json();
        setBranches(data.branches || []);

        if (!data.branches || data.branches.length === 0) {
          setError('No branches assigned to you');
        }
      } catch (err) {
        console.error('Error fetching branches:', err);
        setError(err.message || 'Failed to load branches');
      } finally {
        setLoading(false);
      }
    };

    fetchBranches();
  }, [navigate]);

  const handleBranchClick = (branch) => {
    // Store selected branch info
    localStorage.setItem('branch_id', branch.id);
    localStorage.setItem('branch_name', branch.name);
    
    // Navigate to branch dashboard
    navigate('/branch-dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('companyToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('manager_id');
    localStorage.removeItem('branch_id');
    localStorage.removeItem('branch_name');
    localStorage.removeItem('company_id');
    localStorage.removeItem('company_name');
    navigate('/company-login');
  };

  return (
    <div className="shell">
      <header className="topbar">
        <div>AIQ HRMS - Branch Selection</div>
        <nav>
          <button 
            onClick={handleLogout} 
            style={{
              background: 'none', 
              border: 'none', 
              color: 'inherit', 
              cursor: 'pointer', 
              textDecoration: 'underline'
            }}
          >
            Logout
          </button>
        </nav>
      </header>

      <main className="manager-branch-selection">
        <div className="selection-container">
          <h1>👥 Select Your Branch</h1>
          <p className="subtitle">
            You have access to the following branches. Click on one to manage it.
          </p>

          {loading && (
            <div className="loading-state">
              <p>⏳ Loading your branches...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <p className="error-message">⚠️ {error}</p>
              {!branches.length && (
                <button onClick={() => navigate('/company-login')} className="reload-btn">
                  Back to Login
                </button>
              )}
            </div>
          )}

          {!loading && branches.length > 0 && (
            <div className="branches-grid">
              {branches.map((branch) => (
                <div
                  key={branch.id}
                  className="branch-card"
                  onClick={() => handleBranchClick(branch)}
                >
                  <div className="branch-card-header">
                    <h3>🏢 {branch.name}</h3>
                    {branch.is_primary && (
                      <span className="primary-badge">Primary</span>
                    )}
                  </div>
                  <div className="branch-card-body">
                    <p className="branch-id">
                      ID: <code>{branch.id.substring(0, 8)}...</code>
                    </p>
                    <p className="branch-status">
                      Status: {branch.is_active ? '✅ Active' : '❌ Inactive'}
                    </p>
                  </div>
                  <div className="branch-card-footer">
                    <button className="select-btn">
                      Select Branch →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && branches.length === 0 && !error && (
            <div className="empty-state">
              <p>📋 No branches available</p>
              <button onClick={() => navigate('/company-login')} className="reload-btn">
                Back to Login
              </button>
            </div>
          )}
        </div>
      </main>

      <style>{`
        .manager-branch-selection {
          padding: 40px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: calc(100vh - 60px);
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }

        .selection-container {
          max-width: 1000px;
          width: 100%;
        }

        .selection-container h1 {
          color: white;
          text-align: center;
          margin-bottom: 10px;
          font-size: 2.5em;
        }

        .subtitle {
          color: rgba(255, 255, 255, 0.9);
          text-align: center;
          margin-bottom: 40px;
          font-size: 1.1em;
        }

        .loading-state,
        .empty-state,
        .error-state {
          background: white;
          border-radius: 12px;
          padding: 60px 40px;
          text-align: center;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }

        .loading-state p,
        .empty-state p {
          font-size: 1.3em;
          color: #666;
          margin: 0;
        }

        .error-message {
          color: #d32f2f;
          font-size: 1.1em;
          margin-bottom: 20px;
        }

        .reload-btn {
          background: #667eea;
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 6px;
          font-size: 1em;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 20px;
        }

        .reload-btn:hover {
          background: #764ba2;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .branches-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 25px;
          margin-top: 30px;
        }

        .branch-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
        }

        .branch-card:hover {
          transform: translateY(-10px);
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.2);
        }

        .branch-card-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .branch-card-header h3 {
          margin: 0;
          font-size: 1.3em;
        }

        .primary-badge {
          background: rgba(255, 255, 255, 0.3);
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.85em;
          font-weight: 600;
        }

        .branch-card-body {
          padding: 20px;
          flex: 1;
        }

        .branch-id,
        .branch-status {
          margin: 10px 0;
          color: #666;
          font-size: 0.95em;
        }

        .branch-id code {
          background: #f5f5f5;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: 'Monaco', 'Courier New', monospace;
          color: #333;
        }

        .branch-card-footer {
          padding: 15px 20px;
          border-top: 1px solid #eee;
          background: #f9f9f9;
        }

        .select-btn {
          width: 100%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 12px;
          border-radius: 6px;
          font-size: 1em;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .select-btn:hover {
          transform: scale(1.02);
          box-shadow: 0 6px 15px rgba(102, 126, 234, 0.4);
        }

        .select-btn:active {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  );
}
