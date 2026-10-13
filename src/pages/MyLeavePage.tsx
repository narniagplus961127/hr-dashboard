import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { companyToday, displayCompanyDate } from '../calendar';
import { cancelLeaveRequest, getMyLeave, submitLeaveRequest } from '../leave';
import LeaveCancellationForm from '../components/LeaveCancellationForm';
import type {
  LeaveBalancesPageProps,
  LeaveHistory,
  LeaveRequest,
  LeaveType,
} from '../types/leave';
import LeaveBalancesPage from './LeaveBalancesPage';
import './MyLeavePage.css';

export default function MyLeavePage({ viewer }: LeaveBalancesPageProps) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [history, setHistory] = useState<LeaveHistory[]>([]);
  const [type, setType] = useState<LeaveType>('Annual');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void getMyLeave()
      .then((data) => {
        if (alive) {
          setRequests(data.requests);
          setHistory(data.history);
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      await submitLeaveRequest(type, start, end, reason);
      setStart('');
      setEnd('');
      setReason('');
      setNotice('Leave request submitted.');
      setRevision((value) => value + 1);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Could not submit leave.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function cancel(id: string, reason: string) {
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      await cancelLeaveRequest(id, reason);
      setNotice('Leave request cancelled. Its days have been released.');
      setRevision((value) => value + 1);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Could not cancel leave.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <LeaveBalancesPage viewer={viewer} revision={revision} embedded />
      <div className="my-leave-content">
        <section className="my-leave-panel" aria-labelledby="request-title">
          <h2 id="request-title">Request leave</h2>
          <p>
            Full working days only. Monday–Friday excluding company Public
            holidays, using Kuala Lumpur dates. Submit each calendar year
            separately.
          </p>
          <form
            onSubmit={(event) => void submit(event)}
            className="request-leave-form"
          >
            <label htmlFor="request-type">Request leave type</label>
            <select
              id="request-type"
              value={type}
              onChange={(event) =>
                setType(event.target.value === 'Sick' ? 'Sick' : 'Annual')
              }
              disabled={submitting}
            >
              <option>Annual</option>
              <option>Sick</option>
            </select>
            <label htmlFor="request-start">Leave start date</label>
            <input
              id="request-start"
              type="date"
              min={companyToday()}
              max="2100-12-31"
              required
              value={start}
              onChange={(event) => setStart(event.target.value)}
              disabled={submitting}
            />
            <label htmlFor="request-end">Leave end date</label>
            <input
              id="request-end"
              type="date"
              min={companyToday()}
              max="2100-12-31"
              required
              value={end}
              onChange={(event) => setEnd(event.target.value)}
              disabled={submitting}
            />
            <label htmlFor="request-reason">Reason (optional)</label>
            <textarea
              id="request-reason"
              maxLength={1000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={submitting}
            />
            <button className="primary-button" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit leave request'}
            </button>
          </form>
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
                Reload requests
              </button>
            </p>
          )}
          {notice && (
            <p role="status" className="success-message">
              {notice}
            </p>
          )}
        </section>
        <section className="my-leave-panel" aria-labelledby="requests-title">
          <h2 id="requests-title">Your Leave requests</h2>
          {loading ? (
            <p>Loading Leave requests…</p>
          ) : requests.length === 0 ? (
            <p>No Leave requests yet.</p>
          ) : (
            requests.map((request) => (
              <article
                className="leave-request-card"
                key={request.id}
                aria-label={`${request.leave_type} leave ${request.start_date} to ${request.end_date}`}
              >
                <div className="leave-request-heading">
                  <h3>{request.leave_type} leave</h3>
                  <span className={`leave-status ${request.status}`}>
                    {request.status[0].toUpperCase() + request.status.slice(1)}
                  </span>
                </div>
                <p>
                  {displayCompanyDate(request.start_date)} →{' '}
                  {displayCompanyDate(request.end_date)}
                </p>
                <p>
                  <strong>{request.charged_days} working days</strong>
                </p>
                {request.reason && (
                  <p className="leave-request-reason">{request.reason}</p>
                )}
                {(request.status === 'pending' ||
                  (request.status === 'approved' &&
                    viewer.role === 'hr_administrator')) && (
                  <LeaveCancellationForm
                    requestId={request.id}
                    approved={request.status === 'approved'}
                    submitting={submitting || loading}
                    onCancel={cancel}
                  />
                )}
                <h4>Leave history</h4>
                <ul className="leave-history">
                  {history
                    .filter((entry) => entry.request_id === request.id)
                    .map((entry) => (
                      <li key={entry.id}>
                        {entry.action[0].toUpperCase() + entry.action.slice(1)}{' '}
                        by {entry.actor_name}
                        <time dateTime={entry.created_at}>
                          {new Intl.DateTimeFormat('en-MY', {
                            timeZone: 'Asia/Kuala_Lumpur',
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          }).format(new Date(entry.created_at))}
                        </time>
                        {entry.reason && <p>{entry.reason}</p>}
                      </li>
                    ))}
                </ul>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
