import { useEffect, useState } from 'react';
import { companyToday, getCalendarAbsences, getHolidays } from '../calendar';
import type { CalendarAbsence, CompanyHoliday } from '../types/calendar';
import './CalendarPage.css';

export default function CalendarPage() {
  const [month, setMonth] = useState(companyToday().slice(0, 7));
  const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
  const [absences, setAbsences] = useState<CalendarAbsence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    void Promise.all([getHolidays(), getCalendarAbsences()])
      .then(([holidayData, absenceData]) => {
        if (alive) {
          setHolidays(holidayData);
          setAbsences(absenceData);
        }
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

  const [year, monthNumber] = month.split('-').map(Number);
  const days =
    Number.isFinite(year) && Number.isFinite(monthNumber)
      ? new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
      : 0;
  const offset = days
    ? (new Date(`${month}-01T12:00:00Z`).getUTCDay() + 6) % 7
    : 0;

  return (
    <main className="calendar-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">COMPANY WORKSPACE</p>
          <h1>Shared calendar</h1>
          <p>Kuala Lumpur, Malaysia · Asia/Kuala_Lumpur</p>
        </div>
      </div>
      <div className="calendar-toolbar">
        <label htmlFor="calendar-month">Calendar month</label>
        <input
          id="calendar-month"
          type="month"
          min="1900-01"
          max="2100-12"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        />
        <span className="calendar-legend">
          Public holiday · company non-working day · Away · approved absence
        </span>
        <button
          className="secondary-button"
          disabled={loading}
          onClick={() => setRevision((value) => value + 1)}
        >
          Refresh calendar
        </button>
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
      {loading ? (
        <p role="status">Loading calendar…</p>
      ) : !error ? (
        <section
          className="calendar-grid"
          aria-label="Monthly company calendar"
        >
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div className="calendar-weekday" key={day}>
              {day}
            </div>
          ))}
          {Array.from({ length: offset }, (_, index) => (
            <div
              key={`blank-${index}`}
              className="calendar-blank"
              aria-hidden="true"
            />
          ))}
          {Array.from({ length: days }, (_, index) => {
            const date = `${month}-${String(index + 1).padStart(2, '0')}`;
            const holiday = holidays.find(
              (entry) => entry.holiday_date === date,
            );
            const away = absences.filter(
              (entry) => entry.start_date <= date && entry.end_date >= date,
            );
            return (
              <article
                key={date}
                aria-label={date}
                className={`calendar-day ${holiday ? 'has-holiday' : ''}`}
              >
                <time dateTime={date}>{index + 1}</time>
                {holiday && (
                  <div className="calendar-holiday">
                    <span>Public holiday</span>
                    <strong>{holiday.name}</strong>
                  </div>
                )}
                {away.map((absence, absenceIndex) => (
                  <div
                    className="calendar-away"
                    key={`${absence.employee_id}-${absence.start_date}-${absenceIndex}`}
                  >
                    <span>Away</span>
                    <strong>{absence.full_name}</strong>
                  </div>
                ))}
              </article>
            );
          })}
        </section>
      ) : null}
      {!loading &&
        !error &&
        !holidays.some((holiday) => holiday.holiday_date.startsWith(month)) && (
          <p>No Public holidays maintained for this month.</p>
        )}
    </main>
  );
}
