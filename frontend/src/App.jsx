import { Routes, Route, Navigate, Link } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Attendance from './pages/Attendance.jsx';
import Leave from './pages/Leave.jsx';
import Inventory from './pages/Inventory.jsx';
import Payroll from './pages/Payroll.jsx';
import Profile from './pages/Profile.jsx';
import AttendanceCorrections from './pages/AttendanceCorrections.jsx';
import EmployeeOnboarding from './pages/EmployeeOnboarding.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminEmployees from './pages/AdminEmployees.jsx';
import AdminPasswordManagement from './pages/AdminPasswordManagement.jsx';
import AdminPayroll from './pages/AdminPayroll.jsx';
import AdminLeave from './pages/AdminLeave.jsx';
import AdminInventory from './pages/AdminInventory.jsx';
import AdminOnboarding from './pages/AdminOnboarding.jsx';
import AdminLeavePlan from './pages/AdminLeavePlan.jsx';
import AdminGeofencing from './pages/AdminGeofencing.jsx';
import AdminAttendance from './pages/AdminAttendance.jsx';
import MasterLogin from './pages/MasterLogin.jsx';
import MasterDashboard from './pages/MasterDashboard.jsx';
import MasterCompanyDetails from './pages/MasterCompanyDetails.jsx';
import CompanyLogin from './pages/CompanyLogin.jsx';
import CompanyDashboard from './pages/CompanyDashboard.jsx';

function Layout({ children, isAdmin = false }) {
  const handleLogout = () => {
    const userRole = localStorage.getItem('userRole');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('masterToken');
    localStorage.removeItem('companyToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('company_id');
    localStorage.removeItem('company_name');
    localStorage.removeItem('modules');
    localStorage.removeItem('username');
    
    if (userRole === 'master') {
      window.location.href = '/master-login';
    } else if (userRole === 'company_admin') {
      window.location.href = '/company-login';
    } else {
      window.location.href = '/login';
    }
  };

  return (
    <div className="shell">
      <header className="topbar">
        <div>AIQ HRMS</div>
        <nav>
          {isAdmin ? (
            <>
              <Link to="/admin/dashboard">Admin Dashboard</Link>
              <button onClick={handleLogout} style={{background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'underline'}}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <button onClick={handleLogout} style={{background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'underline'}}>Logout</button>
            </>
          )}
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Master Routes */}
      <Route path="/master-login" element={<MasterLogin />} />
      <Route path="/master-dashboard" element={<MasterDashboard />} />
      <Route path="/master/companies/:id" element={<MasterCompanyDetails />} />

      {/* Company Routes */}
      <Route path="/company-login" element={<CompanyLogin />} />
      <Route path="/company-dashboard" element={<CompanyDashboard />} />

      {/* Employee Login */}
      <Route path="/login" element={<Login />} />
      
      {/* Employee Routes */}
      <Route
        path="/dashboard"
        element={
          <Layout>
            <Dashboard />
          </Layout>
        }
      />
      <Route
        path="/onboarding"
        element={
          <Layout>
            <EmployeeOnboarding />
          </Layout>
        }
      />
      <Route
        path="/attendance"
        element={
          <Layout>
            <Attendance />
          </Layout>
        }
      />
      <Route
        path="/leave"
        element={
          <Layout>
            <Leave />
          </Layout>
        }
      />
      <Route
        path="/inventory"
        element={
          <Layout>
            <Inventory />
          </Layout>
        }
      />
      <Route
        path="/payroll"
        element={
          <Layout>
            <Payroll />
          </Layout>
        }
      />
      <Route
        path="/profile"
        element={
          <Layout>
            <Profile />
          </Layout>
        }
      />
      <Route
        path="/attendance-corrections"
        element={
          <Layout>
            <AttendanceCorrections />
          </Layout>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <Layout isAdmin={true}>
            <AdminDashboard />
          </Layout>
        }
      />
      <Route
        path="/admin/employees"
        element={
          <Layout isAdmin={true}>
            <AdminEmployees />
          </Layout>
        }
      />
      <Route
        path="/admin/password-management"
        element={
          <Layout isAdmin={true}>
            <AdminPasswordManagement />
          </Layout>
        }
      />
      <Route
        path="/admin/leave-plan"
        element={
          <Layout isAdmin={true}>
            <AdminLeavePlan />
          </Layout>
        }
      />
      <Route
        path="/admin/payroll"
        element={
          <Layout isAdmin={true}>
            <AdminPayroll />
          </Layout>
        }
      />
      <Route
        path="/admin/leave"
        element={
          <Layout isAdmin={true}>
            <AdminLeave />
          </Layout>
        }
      />
      <Route
        path="/admin/inventory"
        element={
          <Layout isAdmin={true}>
            <AdminInventory />
          </Layout>
        }
      />
      <Route
        path="/admin/onboarding"
        element={
          <Layout isAdmin={true}>
            <AdminOnboarding />
          </Layout>
        }
      />
      <Route
        path="/admin/geofencing"
        element={
          <Layout isAdmin={true}>
            <AdminGeofencing />
          </Layout>
        }
      />
      <Route
        path="/admin/attendance"
        element={
          <Layout isAdmin={true}>
            <AdminAttendance />
          </Layout>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
