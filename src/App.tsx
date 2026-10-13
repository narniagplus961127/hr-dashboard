import { useEffect, useState } from 'react';
import { useEmployeeSession } from './hooks/useEmployeeSession';
import LoadingScreen from './components/LoadingScreen';
import WorkspaceLayout from './components/WorkspaceLayout';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import DirectoryPage from './pages/DirectoryPage';
import DepartmentsPage from './pages/DepartmentsPage';
import type { WorkspacePage } from './types/components';

export default function App() {
  const [page, setPage] = useState<WorkspacePage>(() =>
    window.location.hash === '#directory'
      ? 'directory'
      : window.location.hash === '#departments'
        ? 'departments'
        : 'profile',
  );

  useEffect(() => {
    function updatePage() {
      setPage(
        window.location.hash === '#directory'
          ? 'directory'
          : window.location.hash === '#departments'
            ? 'departments'
            : 'profile',
      );
    }
    window.addEventListener('hashchange', updatePage);
    return () => window.removeEventListener('hashchange', updatePage);
  }, []);

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

  if (profile)
    return (
      <WorkspaceLayout
        profile={profile}
        submitting={submitting}
        onSignOut={signOut}
        currentPage={
          page === 'departments' && profile.role !== 'hr_administrator'
            ? 'directory'
            : page
        }
      >
        {page === 'departments' && profile.role === 'hr_administrator' ? (
          <DepartmentsPage />
        ) : page === 'directory' || page === 'departments' ? (
          <DirectoryPage viewer={profile} onRecordSaved={refreshProfile} />
        ) : (
          <ProfilePage profile={profile} error={error} />
        )}
      </WorkspaceLayout>
    );

  return (
    <LoginPage
      error={error}
      connected={connected}
      submitting={submitting}
      onSignIn={signIn}
    />
  );
}
