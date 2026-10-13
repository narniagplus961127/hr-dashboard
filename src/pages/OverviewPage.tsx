import { useEffect, useState } from 'react';
import { getOverview } from '../overview';
import type { WorkspaceOverview } from '../types/overview';
import './OverviewPage.css';

const scopeLabels = {
  own: 'My leave requests',
  direct_reports: 'Direct reports',
  company: 'Company leave requests',
};

export default function OverviewPage() {
  const [overview, setOverview] = useState<WorkspaceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    setOverview(null);
    void getOverview()
      .then((data) => {
        if (alive) setOverview(data);
      })
      .catch((failure: unknown) => {
        if (alive)
          setError(
            failure instanceof Error
              ? failure.message
              : 'Could not load the overview.',
          );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [revision]);

  return (
    <main className="overview-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">WORKSPACE</p>
          <h1>Overview</h1>
          <p>
            Active company headcount and leave request totals across all years.
          </p>
        </div>
        <button
          className="secondary-button"
          disabled={loading}
          onClick={() => setRevision((value) => value + 1)}
        >
          Refresh overview
        </button>
      </header>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      {loading && <p role="status">Loading overview…</p>}
      {overview && (
        <>
          <section className="headcount-card" aria-labelledby="headcount-title">
            <h2 id="headcount-title">Active headcount</h2>
            <p className="headcount-number">{overview.active_headcount}</p>
            <p>
              Active Employees across the company, including Managers and HR.
            </p>
          </section>
          <div className="overview-summaries">
            {overview.summaries.map((summary) => (
              <section
                className="summary-card"
                key={summary.scope}
                aria-labelledby={`summary-${summary.scope}`}
              >
                <h2 id={`summary-${summary.scope}`}>
                  {scopeLabels[summary.scope]}
                </h2>
                <p>
                  {summary.scope === 'direct_reports'
                    ? 'Eligible Employee requests from your current active direct reports.'
                    : summary.scope === 'company'
                      ? 'All company requests, including retained employee history.'
                      : 'Your own requests, separate from any team or company totals.'}
                </p>
                {summary.total_requests === 0 && (
                  <p className="empty-summary">No leave requests yet.</p>
                )}
                <dl>
                  <div>
                    <dt>Total requests</dt>
                    <dd>{summary.total_requests}</dd>
                  </div>
                  <div>
                    <dt>Pending</dt>
                    <dd>{summary.pending}</dd>
                  </div>
                  <div>
                    <dt>Approved</dt>
                    <dd>{summary.approved}</dd>
                  </div>
                  <div>
                    <dt>Rejected</dt>
                    <dd>{summary.rejected}</dd>
                  </div>
                  <div>
                    <dt>Cancelled</dt>
                    <dd>{summary.cancelled}</dd>
                  </div>
                </dl>
              </section>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
