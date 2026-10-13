import { useState } from 'react';
import type { FormEvent } from 'react';
import type { ApprovalRequestCardProps } from '../types/approvals';

import './ApprovalRequestCard.css';

export default function ApprovalRequestCard({
  request,
  submitting,
  onDecision,
}: ApprovalRequestCardProps) {
  const [reason, setReason] = useState('');

  function reject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onDecision(request.id, 'rejected', reason);
  }

  return request.can_decide ? (
    <div className="approval-actions">
      <button
        className="primary-button"
        disabled={submitting}
        onClick={() => void onDecision(request.id, 'approved', '')}
      >
        Approve
      </button>
      <form onSubmit={reject}>
        <label htmlFor={`rejection-${request.id}`}>Rejection reason</label>
        <input
          id={`rejection-${request.id}`}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          required
          maxLength={1000}
          disabled={submitting}
        />
        <button className="secondary-button" disabled={submitting}>
          Reject
        </button>
      </form>
    </div>
  ) : request.status === 'pending' ? (
    <p className="approval-routing">
      Awaiting the eligible Manager or another HR Administrator.
    </p>
  ) : null;
}
