import { useEffect, useState } from 'react';
import { getEmployeeRecord } from '../employees';
import type { EmployeeRecord } from '../types/employee';
import type { EmployeeDetailsProps } from '../types/components';

import './EmployeeDetails.css';

export default function EmployeeDetails({
  employee,
  viewer,
  onBack,
  onEdit,
}: EmployeeDetailsProps) {
  const [record, setRecord] = useState<EmployeeRecord | null>(null);
  const [error, setError] = useState('');
  const canReadPrivate =
    viewer.role === 'hr_administrator' ||
    viewer.employee_id === employee.employee_id;

  useEffect(() => {
    let alive = true;
    setRecord(null);
    setError('');

    if (canReadPrivate) {
      void getEmployeeRecord(employee.employee_id)
        .then((data) => {
          if (alive) setRecord(data);
        })
        .catch(() => {
          if (alive)
            setError('Could not load employment details. Please try again.');
        });
    }

    return () => {
      alive = false;
    };
  }, [employee.employee_id, canReadPrivate]);

  const currentRecord =
    record?.employee_id === employee.employee_id ? record : null;

  return (
    <section
      className="employee-details"
      aria-labelledby="directory-employee-name"
    >
      <button className="secondary-button" onClick={onBack}>
        Back to directory
      </button>

      <header className="employee-details-heading">
        <div>
          <h2 id="directory-employee-name">{employee.full_name}</h2>
          <p>{employee.job_title}</p>
        </div>
        {viewer.role === 'hr_administrator' && (
          <button
            className="secondary-button"
            disabled={!currentRecord}
            onClick={() => {
              if (currentRecord) onEdit(currentRecord);
            }}
          >
            Edit employee
          </button>
        )}
      </header>

      <dl>
        <div>
          <dt>Work email</dt>
          <dd>
            <a href={`mailto:${employee.work_email}`}>{employee.work_email}</a>
          </dd>
        </div>
        <div>
          <dt>Department</dt>
          <dd>{employee.department}</dd>
        </div>
        <div>
          <dt>Manager</dt>
          <dd>{employee.manager_name ?? 'No Manager assigned'}</dd>
        </div>

        {currentRecord && (
          <>
            <div>
              <dt>Start date</dt>
              <dd>
                {new Intl.DateTimeFormat('en-MY', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  timeZone: 'UTC',
                }).format(new Date(`${currentRecord.start_date}T00:00:00Z`))}
              </dd>
            </div>
            <div>
              <dt>Employment status</dt>
              <dd>{currentRecord.is_active ? 'Active' : 'Inactive'}</dd>
            </div>
          </>
        )}
      </dl>

      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
