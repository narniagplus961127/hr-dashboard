import { Link } from 'react-router';
import type { ReportingBranchProps } from '../types/components';

export default function ReportingBranch({
  employee,
  employees,
  ancestors,
}: ReportingBranchProps) {
  const path = [...ancestors, employee.employee_id];
  const reports = employees.filter(
    (person) =>
      person.manager_id === employee.employee_id &&
      !path.includes(person.employee_id),
  );

  return (
    <li>
      <article className="reporting-person">
        <span>{employee.job_level}</span>
        <Link to={`/directory/${employee.employee_id}`}>
          {employee.full_name}
        </Link>
        <p>
          {employee.job_title} · {employee.department}
        </p>
      </article>

      {reports.length > 0 && (
        <ul aria-label={`Direct reports of ${employee.full_name}`}>
          {reports.map((report) => (
            <ReportingBranch
              key={report.employee_id}
              employee={report}
              employees={employees}
              ancestors={path}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
