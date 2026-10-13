import { useEffect, useState } from 'react';
import { deactivateEmployee, getEmployeeRecord } from '../employees';
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
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const canReadPrivate =
    viewer.role === 'hr_administrator' ||
    viewer.employee_id === employee.employee_id;

  useEffect(() => {
    let alive = true;
    setRecord(null);
    setError('');
    setConfirming(false);
    setNotice('');

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
          <dt>Job level</dt>
          <dd>{employee.job_level}</dd>
        </div>
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

      {notice && (
        <p className="success-message" role="status">
          {notice}
        </p>
      )}

      {viewer.role === 'hr_administrator' && currentRecord?.is_active && (
        <div className="employee-deactivation">
          {confirming ? (
            <section aria-label="Confirm employee deactivation">
              <h3>Deactivate {employee.full_name}?</h3>
              <p>
                Pending and future approved leave will be cancelled.
                Already-started approved leave and history will be kept.
              </p>
              <p>The Employee will lose access, including existing sessions.</p>
              <div className="employee-deactivation-actions">
                <button
                  className="primary-button"
                  disabled={submitting}
                  onClick={async () => {
                    setSubmitting(true);
                    setError('');
                    try {
                      await deactivateEmployee(employee.employee_id);
                      setRecord((current) =>
                        current ? { ...current, is_active: false } : current,
                      );
                      setConfirming(false);
                      setNotice(
                        'Employee deactivated. Leave history has been kept.',
                      );
                    } catch (cause) {
                      setError(
                        cause instanceof Error
                          ? cause.message
                          : 'Could not deactivate the Employee.',
                      );
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                >
                  Confirm deactivation
                </button>
                <button
                  className="secondary-button"
                  disabled={submitting}
                  onClick={() => setConfirming(false)}
                >
                  Keep active
                </button>
              </div>
            </section>
          ) : (
            <button
              className="secondary-button"
              onClick={() => setConfirming(true)}
            >
              Deactivate employee
            </button>
          )}
        </div>
      )}
    </section>
  );
}
