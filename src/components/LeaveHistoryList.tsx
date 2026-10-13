import type { LeaveHistoryListProps } from '../types/leave';

import './LeaveHistoryList.css';

const companyTime = new Intl.DateTimeFormat('en-MY', {
  timeZone: 'Asia/Kuala_Lumpur',
  dateStyle: 'medium',
  timeStyle: 'short',
});

export default function LeaveHistoryList({
  history,
  requestId,
}: LeaveHistoryListProps) {
  return (
    <ul className="leave-history">
      {history
        .filter((entry) => entry.request_id === requestId)
        .map((entry) => (
          <li key={entry.id}>
            {entry.action[0].toUpperCase() + entry.action.slice(1)} by{' '}
            {entry.actor_name}
            <time dateTime={entry.created_at}>
              {companyTime.format(new Date(entry.created_at))}
            </time>
            {entry.reason && <p>{entry.reason}</p>}
          </li>
        ))}
    </ul>
  );
}
