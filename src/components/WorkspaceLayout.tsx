import type { EmployeeProfile } from '../supabase';
import type { ReactNode } from 'react';
import WorkspaceSidebar from './WorkspaceSidebar';

import './WorkspaceLayout.css';

interface WorkspaceLayoutProps {
  profile: EmployeeProfile;
  submitting: boolean;
  onSignOut: () => Promise<void>;
  children: ReactNode;
}

export default function WorkspaceLayout({
  profile,
  submitting,
  onSignOut,
  children,
}: WorkspaceLayoutProps) {
  return (
    <div className="workspace-shell">
      <a className="skip-link" href="#profile">
        Skip to my profile
      </a>
      <WorkspaceSidebar profile={profile} />

      <div className="workspace-body">
        <header className="topbar">
          <span>
            Workspace <span className="breadcrumb-divider">/</span>{' '}
            <strong>My profile</strong>
          </span>
          <button
            className="secondary-button"
            disabled={submitting}
            onClick={onSignOut}
          >
            {submitting ? 'Signing out…' : 'Sign out'}
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
