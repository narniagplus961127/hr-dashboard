import type { EmployeeProfileProps } from '../types/components';
import { getRoleName, getInitials } from '../profile-presentation';

import './EmployeeProfileCard.css';

export default function EmployeeProfileCard({ profile }: EmployeeProfileProps) {
  const roleName = getRoleName(profile.role);
  const initials = getInitials(profile.full_name);

  return (
    <section className="profile-card" aria-labelledby="employee-name">
      <div className="profile-cover">
        <span className="cover-orbit orbit-one" />
        <span className="cover-orbit orbit-two" />
        <span className="cover-caption">Good people. Shared purpose.</span>
      </div>

      <div className="profile-identity">
        <span className="avatar large">{initials}</span>
        <div>
          <h2 id="employee-name">{profile.full_name}</h2>
          <p>{profile.job_title}</p>
        </div>

        <span className="role-pill">{roleName}</span>
      </div>

      <div className="profile-details">
        <h3>Employment details</h3>
        <dl>
          <div>
            <dt>Work email</dt>
            <dd>
              <a href={`mailto:${profile.work_email}`}>{profile.work_email}</a>
            </dd>
          </div>

          <div>
            <dt>Department</dt>
            <dd>{profile.department}</dd>
          </div>

          <div>
            <dt>Job title</dt>
            <dd>{profile.job_title}</dd>
          </div>

          <div>
            <dt>Start date</dt>
            <dd>
              {new Intl.DateTimeFormat('en-MY', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'UTC',
              }).format(new Date(`${profile.start_date}T00:00:00Z`))}
            </dd>
          </div>

          <div>
            <dt>Employment status</dt>
            <dd>Active</dd>
          </div>

          <div>
            <dt>Workspace role</dt>
            <dd>{roleName}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
