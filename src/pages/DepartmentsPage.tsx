import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { getDepartments, saveDepartment } from '../employees';
import type { Department } from '../types/employee';

import './DepartmentsPage.css';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void getDepartments()
      .then((data) => {
        if (alive) setDepartments(data);
      })
      .catch(() => {
        if (alive) setError('Could not load Departments. Please try again.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [revision]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);

    try {
      await saveDepartment(editingId, name);
      setName('');
      setEditingId(null);
      setNotice('Department saved.');
      setRevision((value) => value + 1);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Could not save the Department.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="departments-page" id="departments">
      <div className="page-heading">
        <div>
          <p className="eyebrow">HR WORKSPACE</p>
          <h1>Departments</h1>
          <p>Keep your company’s teams organized.</p>
        </div>
      </div>

      {error && (
        <p className="error-message" role="alert">
          {error}{' '}
          <button
            className="secondary-button"
            onClick={() => {
              setError('');
              setRevision((value) => value + 1);
            }}
          >
            Try again
          </button>
        </p>
      )}
      {notice && (
        <p className="success-message" role="status">
          {notice}
        </p>
      )}

      <section
        className="department-panel"
        aria-labelledby="department-form-title"
      >
        <h2 id="department-form-title">
          {editingId ? 'Rename Department' : 'Add Department'}
        </h2>
        <form className="department-form" onSubmit={submit}>
          <label htmlFor="department-name">Department name</label>
          <input
            id="department-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={100}
            required
            disabled={submitting}
          />
          <div className="department-actions">
            <button
              className="primary-button"
              disabled={submitting}
              type="submit"
            >
              {submitting
                ? 'Saving…'
                : editingId
                  ? 'Save department'
                  : 'Add department'}
            </button>
            {editingId && (
              <button
                type="button"
                className="secondary-button"
                disabled={submitting}
                onClick={() => {
                  setEditingId(null);
                  setName('');
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      {loading ? (
        <p role="status">Loading Departments…</p>
      ) : (
        <section className="department-panel" aria-label="Company Departments">
          {departments.length === 0 ? (
            <p>No Departments yet. Add your first Department above.</p>
          ) : (
            <ul>
              {departments.map((department) => (
                <li key={department.id}>
                  <span>{department.name}</span>
                  <button
                    className="secondary-button"
                    aria-label={`Rename ${department.name}`}
                    disabled={submitting}
                    onClick={() => {
                      setEditingId(department.id);
                      setName(department.name);
                      setError('');
                      setNotice('');
                    }}
                  >
                    Rename
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
