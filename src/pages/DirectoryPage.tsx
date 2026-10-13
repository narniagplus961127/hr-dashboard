import { Link, useNavigate, useParams } from 'react-router';
import type { DirectoryPageProps } from '../types/components';
import { useEffect, useState } from 'react';
import { getDirectory } from '../employees';
import type { DirectoryEmployee, EmployeeRecord } from '../types/employee';
import EmployeeDetails from '../components/EmployeeDetails';
import EmployeeForm from '../components/EmployeeForm';
import { getInitials } from '../profile-presentation';

import './DirectoryPage.css';

export default function DirectoryPage({
  viewer,
  onRecordSaved,
}: DirectoryPageProps) {
  const navigate = useNavigate();
  const { employeeId: selectedId } = useParams();

  const [employees, setEmployees] = useState<DirectoryEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EmployeeRecord | null>(
    null,
  );
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');

    void getDirectory()
      .then((data) => {
        if (alive) setEmployees(data);
      })
      .catch(() => {
        if (alive) setError('Could not load employees. Please try again.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [revision]);

  const selected = employees.find(
    (employee) => employee.employee_id === selectedId,
  );
  const query = search.trim().toLowerCase();
  const visible = employees.filter((employee) =>
    [
      employee.full_name,
      employee.work_email,
      employee.job_title,
      employee.job_level,
      employee.department,
      employee.manager_name ?? '',
    ].some((value) => value.toLowerCase().includes(query)),
  );

  return (
    <main className="directory-page" id="directory">
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR PEOPLE, TOGETHER</p>
          <h1>Employee directory</h1>
          <p>Find a colleague and their place in the team.</p>
          <Link to="/reporting" className="reporting-link">
            View reporting structure ↗
          </Link>
        </div>
        {viewer.role === 'hr_administrator' && !editing && (
          <button
            className="primary-button"
            onClick={() => {
              setEditingRecord(null);
              setEditing(true);
              setNotice('');
            }}
          >
            Add employee
          </button>
        )}
      </div>

      {error && (
        <div className="error-message" role="alert">
          {error}{' '}
          <button
            className="secondary-button"
            onClick={() => setRevision((value) => value + 1)}
          >
            Try again
          </button>
        </div>
      )}

      {notice && (
        <p className="success-message" role="status">
          {notice}
        </p>
      )}

      {editing && viewer.role === 'hr_administrator' ? (
        <EmployeeForm
          employee={editingRecord}
          onCancel={() => setEditing(false)}
          onSaved={(employeeId) => {
            setEditing(false);
            navigate(`/directory/${employeeId}`);
            setNotice('Employee saved.');
            setRevision((value) => value + 1);
            void onRecordSaved();
          }}
        />
      ) : loading ? (
        <p role="status">Loading employees…</p>
      ) : selected ? (
        <EmployeeDetails
          employee={selected}
          viewer={viewer}
          onBack={() => navigate('/directory')}
          onEdit={(record) => {
            setEditingRecord(record);
            setEditing(true);
            setNotice('');
          }}
        />
      ) : selectedId && !error ? (
        <div className="directory-empty">
          <p>Employee record not found.</p>
          <button
            className="secondary-button"
            onClick={() => navigate('/directory')}
          >
            Back to directory
          </button>
        </div>
      ) : (
        <>
          <div className="directory-toolbar">
            <label htmlFor="employee-search">Search employees</label>
            <input
              id="employee-search"
              type="search"
              placeholder="Name, email, department, or Manager"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <span>
              {visible.length} {visible.length === 1 ? 'employee' : 'employees'}
            </span>
          </div>

          {!error && visible.length === 0 && (
            <p className="directory-empty">
              {employees.length
                ? 'No employees match your search.'
                : 'No employee records yet.'}
            </p>
          )}

          <div className="directory-grid">
            {visible.map((employee) => (
              <article className="directory-card" key={employee.employee_id}>
                <span className="avatar mini" aria-hidden="true">
                  {getInitials(employee.full_name)}
                </span>
                <h2>{employee.full_name}</h2>
                <p>{employee.job_title}</p>
                <span className="directory-level">{employee.job_level}</span>
                <span className="directory-department">
                  {employee.department}
                </span>
                <a href={`mailto:${employee.work_email}`}>
                  {employee.work_email}
                </a>
                <p className="directory-manager">
                  Manager: {employee.manager_name ?? 'Not assigned'}
                </p>
                <button
                  className="secondary-button"
                  aria-label={`View ${employee.full_name}`}
                  onClick={() => navigate(`/directory/${employee.employee_id}`)}
                >
                  View details <span aria-hidden="true">↗</span>
                </button>
              </article>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
