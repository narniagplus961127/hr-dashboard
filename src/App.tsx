import { Navigate, Route, Routes, useLocation } from 'react-router';
import { useEmployeeSession } from './hooks/useEmployeeSession';
import LoadingScreen from './components/LoadingScreen';
import WorkspaceLayout from './components/WorkspaceLayout';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import DirectoryPage from './pages/DirectoryPage';
import DepartmentsPage from './pages/DepartmentsPage';
import ReportingPage from './pages/ReportingPage';
import LeaveBalancesPage from './pages/LeaveBalancesPage';
import MyLeavePage from './pages/MyLeavePage';
import ApprovalsPage from './pages/ApprovalsPage';
import CalendarPage from './pages/CalendarPage';
import HolidaysPage from './pages/HolidaysPage';

export default function App() {
  const location = useLocation();
  const {
    profile,
    loading,
    error,
    submitting,
    connected,
    signIn,
    signOut,
    refreshProfile,
  } = useEmployeeSession();

  if (loading) return <LoadingScreen />;

  if (!profile)
    return (
      <Routes>
        <Route
          path="/login"
          element={
            <LoginPage
              error={error}
              connected={connected}
              submitting={submitting}
              onSignIn={signIn}
            />
          }
        />
        <Route
          path="*"
          element={
            <Navigate to="/login" replace state={{ from: location.pathname }} />
          }
        />
      </Routes>
    );

  const from = location.state?.from;
  const destination =
    typeof from === 'string' &&
    from.startsWith('/') &&
    !from.startsWith('//') &&
    from !== '/login'
      ? from
      : '/profile';

  return (
    <WorkspaceLayout
      profile={profile}
      submitting={submitting}
      onSignOut={signOut}
    >
      <Routes>
        <Route
          path="/approvals"
          element={
            profile.role !== 'employee' ? (
              <ApprovalsPage />
            ) : (
              <Navigate to="/my-leave" replace />
            )
          }
        />
        <Route path="/my-leave" element={<MyLeavePage viewer={profile} />} />
        <Route
          path="/entitlements"
          element={
            profile.role === 'hr_administrator' ? (
              <LeaveBalancesPage viewer={profile} manage />
            ) : (
              <Navigate to="/my-leave" replace />
            )
          }
        />
        <Route path="/reporting" element={<ReportingPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route
          path="/holidays"
          element={
            profile.role === 'hr_administrator' ? (
              <HolidaysPage />
            ) : (
              <Navigate to="/calendar" replace />
            )
          }
        />
        <Route
          path="/profile"
          element={<ProfilePage profile={profile} error={error} />}
        />
        <Route
          path="/directory"
          element={
            <DirectoryPage viewer={profile} onRecordSaved={refreshProfile} />
          }
        />
        <Route
          path="/directory/:employeeId"
          element={
            <DirectoryPage viewer={profile} onRecordSaved={refreshProfile} />
          }
        />
        <Route
          path="/departments"
          element={
            profile.role === 'hr_administrator' ? (
              <DepartmentsPage />
            ) : (
              <Navigate to="/directory" replace />
            )
          }
        />
        <Route path="/login" element={<Navigate to={destination} replace />} />
        <Route path="*" element={<Navigate to="/profile" replace />} />
      </Routes>
    </WorkspaceLayout>
  );
}
