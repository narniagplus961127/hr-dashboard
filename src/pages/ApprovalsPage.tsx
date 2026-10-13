import { useEffect, useState } from 'react';
import { decideLeave, getApprovals } from '../approvals';
import { displayCompanyDate } from '../calendar';
import ApprovalRequestCard from '../components/ApprovalRequestCard';
import LeaveCancellationForm from '../components/LeaveCancellationForm';
import { cancelLeaveRequest } from '../leave';
import type { ApprovalRequest } from '../types/approvals';
import type { LeaveHistory } from '../types/leave';

import './ApprovalsPage.css';

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [history, setHistory] = useState<LeaveHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void getApprovals()
      .then((data) => {
        if (alive) {
          setRequests(data.requests);
          setHistory(data.history);
        }
      })
      .catch((failure: unknown) => {
        if (alive)
          setError(
            failure instanceof Error
              ? failure.message
              : 'Could not load approvals.',
          );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [revision]);

  async function decide(
    id: string,
    decision: 'approved' | 'rejected',
    reason: string,
  ) {
    setSubmitting(true);
    setError('');
    setNotice('');

    try {
      await decideLeave(id, decision, reason);
      setNotice(`Leave request ${decision}.`);
      setRevision((value) => value + 1);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Could not save the decision.',
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
      setNotice(
        'Leave request cancelled. Its approved days have been released.',
      );
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
    <main className="approvals-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">TIME AWAY</p>
          <h1>Leave approvals</h1>
          <p>
            Decide eligible requests and review their history. HR can oversee
            company leave.
          </p>
        </div>
      </header>
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
            Reload approvals
          </button>
        </p>
      )}
      {notice && (
        <p role="status" className="success-message">
          {notice}
        </p>
      )}
      {loading ? (
        <p>Loading leave approvals…</p>
      ) : requests.length === 0 ? (
        <section className="approval-panel">
          <p>No requests available for your review.</p>
        </section>
      ) : (
        requests.map((request) => (
          <article
            className="approval-panel"
            key={request.id}
            aria-label={`${request.full_name} ${request.leave_type} leave ${request.start_date} to ${request.end_date}`}
          >
            <div className="approval-heading">
              <h2>{request.full_name}</h2>
              <span className={`leave-status ${request.status}`}>
                {request.status[0].toUpperCase() + request.status.slice(1)}
              </span>
            </div>
            <p>
              {request.leave_type} leave ·{' '}
              {displayCompanyDate(request.start_date)} →{' '}
              {displayCompanyDate(request.end_date)}
            </p>
            <p>
              <strong>{request.charged_days} working days</strong>
            </p>
            {request.reason && (
              <p className="approval-reason">{request.reason}</p>
            )}
            <ApprovalRequestCard
              request={request}
              submitting={submitting || loading}
              onDecision={decide}
            />
            {request.can_cancel && (
              <LeaveCancellationForm
                requestId={request.id}
                approved
                submitting={submitting || loading}
                onCancel={cancel}
              />
            )}
            <h3>Leave history</h3>
            <ul className="approval-history">
              {history
                .filter((entry) => entry.request_id === request.id)
                .map((entry) => (
                  <li key={entry.id}>
                    {entry.action[0].toUpperCase() + entry.action.slice(1)} by{' '}
                    {entry.actor_name}
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
    </main>
  );
}
