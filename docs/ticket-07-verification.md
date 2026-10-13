# Ticket 07 verification

GitHub issue #8: Cancel leave and release days.

Implemented owner pending cancellation and HR approved cancellation, with shared controls on My leave and HR company oversight. Cancellation preserves request/history, records the authenticated actor and timestamp, and releases the fixed reservation or approved allocation once in the same transaction. No request-edit API was added; replacements use existing submission validation. Contracts and the restricted internal seam for subsequent deactivation are in [leave-cancellation.md](leave-cancellation.md).

Verified on the separate `hr-dashboard-cancellation-test` backend:

- Public API red → green: the absent cancellation RPC failed, then owner cancellation retained history, released balance, rejected a replay, and allowed a replacement.
- Browser red → green: missing owner and HR cancellation controls failed before their implementation. Desktop and mobile workflows then cancelled pending/approved leave, reloaded attributed history, resubmitted changed dates, and observed released balance.
- Direct API checks cover unauthorized Employee/Manager/HR pending cancellation, denied Employee approved cancellation, direct-edit denial, reason length, anonymous/revoked sessions, HR own approved cancellation, competing HR and owner cancellations, and approval racing owner cancellation.
- All 10 cancellation checks passed on desktop/mobile; after a clean disposable database reset, all 28 submission/approval/cancellation regression checks passed.
- Fresh migration replay and shadow comparison succeeded; CLI reported no schema difference and migration history was synchronized. Security advisors reported no issues.
- Typecheck, production build, Prettier, and whitespace checks passed. Desktop/mobile screenshots were visually inspected.

The main local development database and hosted services were unchanged. Temporary test project/port settings and credentials are excluded from commits. No push, deployment, or issue closure was performed.
