import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { getLeaveBalances, saveLeaveEntitlement } from '../leave';
import type {
  LeaveBalance,
  LeaveType,
  LeaveBalancesPageProps,
} from '../types/leave';

import './LeaveBalancesPage.css';

export default function LeaveBalancesPage({
  viewer,
  manage = false,
  revision: externalRevision = 0,
  embedded = false,
}: LeaveBalancesPageProps) {
  const [year, setYear] = useState(
    new Intl.DateTimeFormat('en', {
      year: 'numeric',
      timeZone: 'Asia/Kuala_Lumpur',
    }).format(new Date()),
  );
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [employeeId, setEmployeeId] = useState(viewer.employee_id);
  const [type, setType] = useState<LeaveType>('Annual');
  const [allowance, setAllowance] = useState('14');
  const [submitting, setSubmitting] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    setBalances([]);

    if (!/^\d{4}$/.test(year) || Number(year) < 2000 || Number(year) > 2100) {
      setError('Choose a year between 2000 and 2100.');
      setLoading(false);
      return;
    }

    void getLeaveBalances(Number(year), manage ? undefined : viewer.employee_id)
      .then((data) => {
        if (alive) setBalances(data);
      })
      .catch((failure: unknown) => {
        if (alive)
          setError(
            failure instanceof Error
              ? failure.message
              : 'Could not load leave balances.',
          );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [year, manage, viewer.employee_id, revision, externalRevision]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);

    try {
      await saveLeaveEntitlement(
        employeeId,
        Number(year),
        type,
        Number(allowance),
      );
      setNotice('Leave entitlement saved.');
      setRevision((value) => value + 1);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Could not save entitlement.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  const employees = [
    ...new Map(
      balances.map((balance) => [balance.employee_id, balance.full_name]),
    ).entries(),
  ];
  const Container = embedded ? 'section' : 'main';

  return (
    <Container className="leave-balances-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">
            {manage ? 'HR WORKSPACE' : 'YOUR TIME AWAY'}
          </p>
          <h1>{manage ? 'Leave entitlements' : 'My leave'}</h1>
          <p>
            Annual allowances minus approved usage and pending reservations.
          </p>
        </div>
      </header>

      <section className="leave-balance-panel">
        <label htmlFor="leave-year">Year</label>
        <input
          id="leave-year"
          type="number"
          min="2000"
          max="2100"
          value={year}
          onChange={(event) => {
            setYear(event.target.value);
            setNotice('');
          }}
        />
        <p className="leave-policy">
          Demo defaults: 14 Annual days and 14 Sick days each year. No accrual,
          prorating, or carry-over.
        </p>

        {error && (
          <p className="error-message" role="alert">
            {error}{' '}
            <button
              className="secondary-button"
              onClick={() => setRevision((value) => value + 1)}
            >
              Try again
            </button>
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        {loading ? (
          <p>Loading leave balances…</p>
        ) : (
          balances.length > 0 && (
            <div className="leave-balance-table-wrap">
              <table className="leave-balance-table">
                <caption>Leave balances for {year}</caption>
                <thead>
                  <tr>
                    {manage && <th scope="col">Employee</th>}
                    <th scope="col">Leave type</th>
                    <th scope="col">Entitlement</th>
                    <th scope="col">Used</th>
                    <th scope="col">Reserved</th>
                    <th scope="col">Available</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((balance) => (
                    <tr key={`${balance.employee_id}-${balance.leave_type}`}>
                      {manage && <th scope="row">{balance.full_name}</th>}
                      <td>{balance.leave_type}</td>
                      <td>{balance.allowance}</td>
                      <td>{balance.used_days}</td>
                      <td>{balance.reserved_days}</td>
                      <td>
                        <strong>{balance.available_days}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </section>

      {manage && (
        <section className="leave-balance-panel">
          <h2>Edit entitlement</h2>
          <form onSubmit={(event) => void submit(event)}>
            <label htmlFor="entitlement-employee">Employee</label>
            <select
              id="entitlement-employee"
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              required
            >
              {employees.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
            <label htmlFor="entitlement-type">Leave type</label>
            <select
              id="entitlement-type"
              value={type}
              onChange={(event) =>
                setType(event.target.value === 'Sick' ? 'Sick' : 'Annual')
              }
            >
              <option>Annual</option>
              <option>Sick</option>
            </select>
            <label htmlFor="entitlement-allowance">Allowance in days</label>
            <input
              id="entitlement-allowance"
              type="number"
              min="0"
              max="366"
              step="1"
              required
              value={allowance}
              onChange={(event) => setAllowance(event.target.value)}
            />
            <button
              className="primary-button"
              disabled={submitting || loading || balances.length === 0}
            >
              {submitting ? 'Saving…' : 'Save entitlement'}
            </button>
          </form>
        </section>
      )}
    </Container>
  );
}
