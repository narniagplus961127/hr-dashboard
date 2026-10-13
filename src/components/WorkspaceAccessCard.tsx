import type { EmployeeProfile } from '../supabase';
import { getRoleName } from '../profile-presentation';

import './WorkspaceAccessCard.css';

export default function WorkspaceAccessCard({
  profile,
}: {
  profile: EmployeeProfile;
}) {
  const roleName = getRoleName(profile.role);
  return (
    <section
      className="access-card"
      id="access"
      aria-labelledby="access-heading"
    >
      <span className="access-icon" aria-hidden="true">
        ◇
      </span>
      <div>
        <h3 id="access-heading">Your workspace access</h3>
        <p>
          {profile.role === 'employee'
            ? 'Your account gives you access to your own employment information.'
            : profile.role === 'manager'
              ? 'You’re assigned as a Manager. Your account and employment information are maintained by HR.'
              : 'You’re assigned as an HR Administrator. Your account access is managed by the company.'}{' '}
          Contact HR if your details need updating.
        </p>
      </div>

      <span className="access-badge">{roleName}</span>
    </section>
  );
}
