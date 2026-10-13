import { useState } from 'react';
import type { FormEvent } from 'react';
import type { LeaveCancellationFormProps } from '../types/leave';
import './LeaveCancellationForm.css';

export default function LeaveCancellationForm({
  requestId,
  approved = false,
  submitting,
  onCancel,
}: LeaveCancellationFormProps) {
  const [reason, setReason] = useState('');

  function cancel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onCancel(requestId, reason);
  }

  return (
    <form className="leave-cancellation-form" onSubmit={cancel}>
      <p>
        {approved
          ? 'HR cancellation releases the approved days and retains history.'
          : 'To change this request, cancel it and submit a new request.'}
      </p>
      <label htmlFor={`cancellation-${requestId}`}>
        Cancellation reason (optional)
      </label>
      <input
        id={`cancellation-${requestId}`}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        maxLength={1000}
        disabled={submitting}
      />
      <button className="secondary-button" disabled={submitting}>
        {approved ? 'Cancel approved leave' : 'Cancel pending leave'}
      </button>
    </form>
  );
}
