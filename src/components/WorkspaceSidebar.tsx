import type { WorkspaceSidebarProps } from '../types/components';
import { getRoleName, getInitials } from '../profile-presentation';
import Brand from './Brand';

import './WorkspaceSidebar.css';

export default function WorkspaceSidebar({
  profile,
  currentPage,
}: WorkspaceSidebarProps) {
  const roleName = getRoleName(profile.role);
  const initials = getInitials(profile.full_name);
  const accessLink = profile.role === 'manager' ? 'Team access' : 'HR access';

  return (
    <aside className="sidebar">
      <Brand />

      <div className="company-label">
        <span className="company-icon" aria-hidden="true">
          H
        </span>
        <div>
          Harmony Studio<small>Kuala Lumpur, Malaysia</small>
        </div>
      </div>

      <nav aria-label="Workspace">
        <span className="nav-caption">WORKSPACE</span>
        <a
          className={`nav-item ${currentPage === 'profile' ? 'selected' : ''}`}
          href="#profile"
          aria-current={currentPage === 'profile' ? 'page' : undefined}
        >
          <span aria-hidden="true">◉</span>My profile
        </a>
        <a
          className={`nav-item ${currentPage === 'directory' ? 'selected' : ''}`}
          href="#directory"
          aria-current={currentPage === 'directory' ? 'page' : undefined}
        >
          <span aria-hidden="true">▦</span>Employee directory
        </a>
        {profile.role !== 'employee' && (
          <a className="nav-item" href="#access">
            <span aria-hidden="true">◇</span>
            {accessLink}
          </a>
        )}
        {profile.role === 'hr_administrator' && (
          <a
            className={`nav-item ${currentPage === 'departments' ? 'selected' : ''}`}
            href="#departments"
            aria-current={currentPage === 'departments' ? 'page' : undefined}
          >
            <span aria-hidden="true">◇</span>Departments
          </a>
        )}
      </nav>
      <div className="sidebar-footer">
        <span className="avatar mini">{initials}</span>
        <div>
          {profile.full_name}
          <small>{roleName}</small>
        </div>
      </div>
    </aside>
  );
}
