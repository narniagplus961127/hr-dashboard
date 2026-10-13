import type { WorkspaceSidebarProps } from '../types/components';
import { getRoleName, getInitials } from '../profile-presentation';
import Brand from './Brand';
import { NavLink, Link } from 'react-router';

import './WorkspaceSidebar.css';

export default function WorkspaceSidebar({ profile }: WorkspaceSidebarProps) {
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
        <NavLink
          className={({ isActive }) => `nav-item ${isActive ? 'selected' : ''}`}
          to="/my-leave"
        >
          <span aria-hidden="true">◷</span>My leave
        </NavLink>
        {profile.role === 'hr_administrator' && (
          <NavLink
            className={({ isActive }) =>
              `nav-item ${isActive ? 'selected' : ''}`
            }
            to="/entitlements"
          >
            <span aria-hidden="true">◇</span>Leave entitlements
          </NavLink>
        )}
        <NavLink
          className={({ isActive }) => `nav-item ${isActive ? 'selected' : ''}`}
          to="/profile"
        >
          <span aria-hidden="true">◉</span>My profile
        </NavLink>
        <NavLink
          className={({ isActive }) => `nav-item ${isActive ? 'selected' : ''}`}
          to="/directory"
        >
          <span aria-hidden="true">▦</span>Employee directory
        </NavLink>
        <NavLink
          className={({ isActive }) => `nav-item ${isActive ? 'selected' : ''}`}
          to="/reporting"
        >
          <span aria-hidden="true">↳</span>Reporting structure
        </NavLink>
        {profile.role !== 'employee' && (
          <Link className="nav-item" to="/profile#access">
            <span aria-hidden="true">◇</span>
            {accessLink}
          </Link>
        )}
        {profile.role === 'hr_administrator' && (
          <NavLink
            className={({ isActive }) =>
              `nav-item ${isActive ? 'selected' : ''}`
            }
            to="/departments"
          >
            <span aria-hidden="true">◇</span>Departments
          </NavLink>
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
