import type { WorkspaceLayoutProps } from '../types/components';
import WorkspaceSidebar from './WorkspaceSidebar';

import './WorkspaceLayout.css';

export default function WorkspaceLayout({
  profile,
  submitting,
  onSignOut,
  children,
  currentPage,
}: WorkspaceLayoutProps) {
  return (
    <div className="workspace-shell">
      <a className="skip-link" href="#profile">
        Skip to my profile
      </a>
      <WorkspaceSidebar profile={profile} currentPage={currentPage} />

      <div className="workspace-body">
        <header className="topbar">
          <span>
            Workspace <span className="breadcrumb-divider">/</span>{' '}
            <strong>
              {currentPage === 'directory'
                ? 'Employee directory'
                : currentPage === 'departments'
                  ? 'Departments'
                  : 'My profile'}
            </strong>
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
