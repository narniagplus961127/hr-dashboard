import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { getDepartments, getManagerOptions, saveEmployee } from '../employees';
import type { Department, EmployeeRecord } from '../types/employee';
import type { EmployeeFormProps } from '../types/components';

import './EmployeeForm.css';

export default function EmployeeForm({
  employee,
  onSaved,
  onCancel,
}: EmployeeFormProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');

    void Promise.all([getDepartments(), getManagerOptions()])
      .then(([loadedDepartments, loadedManagers]) => {
        if (!alive) return;
        setDepartments(loadedDepartments);
        setManagers(
          loadedManagers.filter(
            (manager) => manager.employee_id !== employee?.employee_id,
          ),
        );
      })
      .catch(() => {
        if (alive)
          setError(
            'Could not load Departments and Managers. Please try again.',
          );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [employee?.employee_id, revision]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setSubmitting(true);
    setError('');

    try {
      const employeeId = await saveEmployee(employee?.employee_id ?? null, {
        full_name: String(fields.get('full_name')).trim(),
        work_email: String(fields.get('work_email')).trim(),
        job_title: String(fields.get('job_title')).trim(),
        department_id: String(fields.get('department_id')),
        manager_id: String(fields.get('manager_id')) || null,
        start_date: String(fields.get('start_date')),
      });
      onSaved(employeeId);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Could not save the Employee.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      className="employee-form-panel"
      aria-labelledby="employee-form-title"
    >
      <h2 id="employee-form-title">
        {employee ? 'Edit employee' : 'Add employee'}
      </h2>
      <p>
        Maintain employment information here. Login accounts are provisioned
        separately.
      </p>

      {loading ? (
        <p role="status">Loading form options…</p>
      ) : (
        <>
          {error && (
            <p className="error-message" role="alert">
              {error}{' '}
              {departments.length === 0 && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setRevision((value) => value + 1)}
                >
                  Try again
                </button>
              )}
            </p>
          )}
          {departments.length === 0 ? (
            <p>
              Add a Department from <a href="#departments">Departments</a>{' '}
              before creating an Employee.
            </p>
          ) : (
            <form className="employee-form" onSubmit={submit}>
              <fieldset disabled={submitting}>
                <div>
                  <label htmlFor="employee-full-name">Full name</label>
                  <input
                    id="employee-full-name"
                    name="full_name"
                    defaultValue={employee?.full_name ?? ''}
                    maxLength={150}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="employee-work-email">Work email</label>
                  <input
                    id="employee-work-email"
                    name="work_email"
                    type="email"
                    defaultValue={employee?.work_email ?? ''}
                    maxLength={254}
                    required
                  />
                  <small>
                    Changing this does not change the account's sign-in email.
                  </small>
                </div>
                <div>
                  <label htmlFor="employee-job-title">Job title</label>
                  <input
                    id="employee-job-title"
                    name="job_title"
                    defaultValue={employee?.job_title ?? ''}
                    maxLength={150}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="employee-department">Department</label>
                  <select
                    id="employee-department"
                    name="department_id"
                    defaultValue={employee?.department_id ?? ''}
                    required
                  >
                    <option value="" disabled>
                      Choose a Department
                    </option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="employee-manager">Manager</label>
                  <select
                    id="employee-manager"
                    name="manager_id"
                    defaultValue={employee?.manager_id ?? ''}
                  >
                    <option value="">No Manager assigned</option>
                    {managers.map((manager) => (
                      <option
                        key={manager.employee_id}
                        value={manager.employee_id}
                      >
                        {manager.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="employee-start-date">Start date</label>
                  <input
                    id="employee-start-date"
                    name="start_date"
                    type="date"
                    defaultValue={employee?.start_date ?? ''}
                    required
                  />
                </div>
              </fieldset>

              <p className="employee-form-note">
                {employee
                  ? `Employment status: ${employee.is_active ? 'Active' : 'Inactive'}.`
                  : 'New employment records are active.'}{' '}
                Deactivation is not available yet.
              </p>
              <div className="employee-form-actions">
                <button
                  className="primary-button"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? 'Saving…' : 'Save employee'}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={submitting}
                  onClick={onCancel}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </>
      )}
      {departments.length === 0 && (
        <button className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
      )}
    </section>
  );
}
