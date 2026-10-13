import type { EmployeeProfile } from '../supabase';
import { getRoleName, getInitials } from '../profile-presentation';
import Brand from './Brand';

import './WorkspaceSidebar.css';

export default function WorkspaceSidebar({
  profile,
}: {
  profile: EmployeeProfile;
}) {
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
        <a className="nav-item selected" href="#profile">
          <span aria-hidden="true">◉</span>My profile
        </a>
        {profile.role !== 'employee' && (
          <a className="nav-item" href="#access">
            <span aria-hidden="true">◇</span>
            {accessLink}
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
