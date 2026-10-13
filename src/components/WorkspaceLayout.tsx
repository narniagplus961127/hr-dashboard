import type { WorkspaceLayoutProps } from '../types/components';
import WorkspaceSidebar from './WorkspaceSidebar';
import { useLocation } from 'react-router';

import './WorkspaceLayout.css';

export default function WorkspaceLayout({
  profile,
  submitting,
  onSignOut,
  children,
}: WorkspaceLayoutProps) {
  const { pathname } = useLocation();
  const title =
    pathname === '/reporting'
      ? 'Reporting structure'
      : pathname.startsWith('/directory')
        ? 'Employee directory'
        : pathname === '/departments'
          ? 'Departments'
          : 'My profile';
  return (
    <div className="workspace-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <WorkspaceSidebar profile={profile} />

      <div className="workspace-body">
        <header className="topbar">
          <span>
            Workspace <span className="breadcrumb-divider">/</span>{' '}
            <strong>{title}</strong>
          </span>
          <button
            className="secondary-button"
            disabled={submitting}
            onClick={onSignOut}
          >
            {submitting ? 'Signing out…' : 'Sign out'}
          </button>
        </header>
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
      </div>
    </div>
  );
}
