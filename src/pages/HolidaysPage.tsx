import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  deleteHoliday,
  displayCompanyDate,
  getHolidays,
  saveHoliday,
} from '../calendar';
import type { CompanyHoliday } from '../types/calendar';
import './HolidaysPage.css';

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void getHolidays()
      .then((data) => {
        if (alive) setHolidays(data);
      })
      .catch((failure: Error) => {
        if (alive) setError(failure.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [revision]);

  function resetForm() {
    setEditingId(null);
    setName('');
    setDate('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      await saveHoliday(editingId, name, date);
      resetForm();
      setNotice('Public holiday saved.');
      setRevision((value) => value + 1);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Could not save the Public holiday.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(holiday: CompanyHoliday) {
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      await deleteHoliday(holiday.id);
      if (editingId === holiday.id) resetForm();
      setNotice('Public holiday deleted.');
      setRevision((value) => value + 1);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Could not delete the Public holiday.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="holidays-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">HR SETTINGS</p>
          <h1>Public holidays</h1>
          <p>Maintain company non-working dates for Kuala Lumpur, Malaysia.</p>
        </div>
      </div>
      <p>
        Dates use the company calendar in Asia/Kuala_Lumpur. Holidays are
        maintained manually and do not repeat automatically each year.
      </p>
      {error && (
        <p role="alert" className="error-message">
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
        <p role="status" className="success-message">
          {notice}
        </p>
      )}
      <section className="holiday-panel" aria-labelledby="holiday-form-title">
        <h2 id="holiday-form-title">
          {editingId ? 'Edit Public holiday' : 'Add Public holiday'}
        </h2>
        <form onSubmit={submit} className="holiday-form">
          <label htmlFor="holiday-name">Holiday name</label>
          <input
            id="holiday-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={150}
            disabled={submitting}
          />
          <label htmlFor="holiday-date">Holiday date</label>
          <input
            id="holiday-date"
            type="date"
            min="1900-01-01"
            max="2100-12-31"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
            disabled={submitting}
          />
          <div className="holiday-actions">
            <button className="primary-button" disabled={submitting}>
              {submitting
                ? 'Saving…'
                : editingId
                  ? 'Save holiday'
                  : 'Add holiday'}
            </button>
            {editingId && (
              <button
                className="secondary-button"
                type="button"
                disabled={submitting}
                onClick={resetForm}
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </section>
      {loading ? (
        <p role="status">Loading Public holidays…</p>
      ) : (
        <section
          className="holiday-panel"
          aria-label="Maintained Public holidays"
        >
          <h2>Company holiday list</h2>
          {holidays.length === 0 ? (
            <p>No Public holidays maintained yet. Add a date above.</p>
          ) : (
            <ul className="holiday-list">
              {holidays.map((holiday) => (
                <li key={holiday.id}>
                  <div>
                    <strong>{holiday.name}</strong>
                    <time dateTime={holiday.holiday_date}>
                      {displayCompanyDate(holiday.holiday_date)}
                    </time>
                  </div>
                  <div className="holiday-actions">
                    <button
                      className="secondary-button"
                      aria-label={`Edit ${holiday.name}`}
                      disabled={submitting}
                      onClick={() => {
                        setEditingId(holiday.id);
                        setName(holiday.name);
                        setDate(holiday.holiday_date);
                        setError('');
                        setNotice('');
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="secondary-button"
                      aria-label={`Delete ${holiday.name}`}
                      disabled={submitting}
                      onClick={() => void remove(holiday)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
