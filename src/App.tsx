import { useEmployeeSession } from './hooks/useEmployeeSession';
import LoadingScreen from './components/LoadingScreen';
import WorkspaceLayout from './components/WorkspaceLayout';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  const { profile, loading, error, submitting, connected, signIn, signOut } =
    useEmployeeSession();

  if (loading) return <LoadingScreen />;

  if (profile)
    return (
      <WorkspaceLayout
        profile={profile}
        submitting={submitting}
        onSignOut={signOut}
      >
        <ProfilePage profile={profile} error={error} />
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
