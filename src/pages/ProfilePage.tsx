import type { ProfilePageProps } from '../types/components';
import EmployeeProfileCard from '../components/EmployeeProfileCard';
import WorkspaceAccessCard from '../components/WorkspaceAccessCard';

import './ProfilePage.css';

export default function ProfilePage({ profile, error }: ProfilePageProps) {
  return (
    <main className="profile-page" id="profile">
      <div className="page-heading">
        <div>
          <p className="eyebrow">A LITTLE ABOUT YOU</p>
          <h1>My profile</h1>
          <p>Your place in the team, all in one view.</p>
        </div>

        <span className="status-pill">
          <span aria-hidden="true" />
          Active employee
        </span>
      </div>

      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}

      <EmployeeProfileCard profile={profile} />

      <WorkspaceAccessCard profile={profile} />

      <footer className="page-footer">
        <span>Harmony Studio · HR Dashboard</span>
        <span>Your people, together.</span>
      </footer>
    </main>
  );
}
