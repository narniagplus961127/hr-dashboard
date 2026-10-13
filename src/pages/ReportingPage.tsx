import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getDirectory } from '../employees';
import { jobLevels } from '../job-levels';
import type { DirectoryEmployee } from '../types/employee';
import ReportingBranch from '../components/ReportingBranch';

import './ReportingPage.css';

export default function ReportingPage() {
  const [employees, setEmployees] = useState<DirectoryEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');

    void getDirectory()
      .then((data) => {
        if (alive) setEmployees(data);
      })
      .catch(() => {
        if (alive)
          setError('Could not load the reporting structure. Please try again.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [revision]);

  const ids = new Set(employees.map((employee) => employee.employee_id));
  const roots = employees.filter(
    (employee) => !employee.manager_id || !ids.has(employee.manager_id),
  );

  return (
    <main className="reporting-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">HOW YOUR TEAM CONNECTS</p>
          <h1>Reporting structure</h1>
          <p>Sorted by job level. Reporting lines follow assigned Managers.</p>
        </div>
      </div>
      <p className="reporting-levels">{jobLevels.join(' → ')}</p>
      <Link to="/directory" className="reporting-link">
        Back to directory
      </Link>

      {error && (
        <p className="error-message" role="alert">
          {error}{' '}
          <button
            className="secondary-button"
            onClick={() => setRevision((value) => value + 1)}
          >
            Try again
          </button>
        </p>
      )}
      {loading ? (
        <p role="status">Loading reporting structure…</p>
      ) : (
        !error &&
        (employees.length === 0 ? (
          <p className="directory-empty">No employee records yet.</p>
        ) : (
          <ul
            className="reporting-tree"
            aria-label="Company reporting structure"
          >
            {roots.map((employee) => (
              <ReportingBranch
                key={employee.employee_id}
                employee={employee}
                employees={employees}
                ancestors={[]}
              />
            ))}
          </ul>
        ))
      )}
    </main>
  );
}
