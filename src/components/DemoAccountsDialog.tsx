import { useRef } from 'react';
import './DemoAccountsDialog.css';

const demoAccounts = [
  {
    name: 'Aisha Rahman',
    email: 'aisha@hr.example.test',
    role: 'HR Administrator',
  },
  {
    name: 'Grace Lim',
    email: 'grace@hr.example.test',
    role: 'HR Administrator',
  },
  { name: 'Daniel Lee', email: 'daniel@hr.example.test', role: 'Manager' },
  { name: 'Maya Tan', email: 'maya@hr.example.test', role: 'Employee' },
];

export default function DemoAccountsDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  const password = import.meta.env.VITE_DEMO_PASSWORD;
  const demoBackend = import.meta.env.VITE_DEMO_BACKEND_URL;
  const backend = import.meta.env.VITE_SUPABASE_URL;
  if (
    !password ||
    !demoBackend ||
    demoBackend.replace(/\/$/, '') !== backend?.replace(/\/$/, '')
  )
    return null;

  return (
    <div className="demo-accounts">
      <button
        type="button"
        className="secondary-button"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        View demo accounts
      </button>
      <dialog
        ref={dialog}
        className="demo-dialog"
        aria-labelledby="demo-accounts-title"
        aria-describedby="demo-accounts-description"
      >
        <h2 id="demo-accounts-title">Try the HR Dashboard</h2>
        <p id="demo-accounts-description">
          Choose a role to explore this fictional company. These accounts share
          demo data, so changes are visible to other visitors.
        </p>
        <ul className="demo-account-list">
          {demoAccounts.map((account) => (
            <li key={account.email}>
              <div>
                <strong>{account.name}</strong>
                <span>{account.role}</span>
              </div>
              <code>{account.email}</code>
            </li>
          ))}
        </ul>
        <div className="demo-password">
          <span>Password for all four accounts</span>
          <code>{password}</code>
        </div>
        <form method="dialog">
          <button className="primary-button" autoFocus>
            Close demo accounts
          </button>
        </form>
      </dialog>
    </div>
  );
}
