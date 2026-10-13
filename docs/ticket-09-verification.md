# Ticket 09 verification

GitHub issue #10: Manager changes and Employee deactivation.

Implemented atomic HR-only deactivation and a confirmation in Employee directory details. Manager reassignment uses the existing trusted employee editing and dynamic approval contracts. [employee-lifecycle.md](employee-lifecycle.md) records permissions, lock ordering, history, and the owner-confirmed partly elapsed leave policy.

Verified using the isolated `hr-dashboard-lifecycle-test` backend:

- Public API red → green: the missing deactivation RPC failed before implementation; HR then deactivated an Employee while Employee, Manager, and anonymous callers were denied.
- Browser red → green: corrected existing UI labels and verified the unchanged Employee details component failed at the missing deactivation control. The completed workflow passed at desktop and mobile sizes.
- Concurrent deactivation produced one successful transition. Pending and future approved requests became cancelled, balances released once, and cancellation history named the actual HR actor. Historical and partly elapsed approved leave retained status and used days unchanged.
- A copied existing Employee JWT could no longer read protected profiles, directory, requests, history, or holidays; submit leave or call protected balance, approvals, calendar, overview, and deactivation RPCs.
- Submission racing deactivation either failed for inactive access or committed first and was cancelled, with no remaining reservation.
- Public employee editing transferred pending approvals to a new Manager; the previous Manager lost queue visibility and direct decision authority. Missing-Manager responsibility transferred to HR. Desktop/mobile browser workflows edited the Manager, verified the old queue emptied, and approved as the new Manager.
- Focus regression red → green: the first guard discarded an active Employee's unsaved reason after focus. Background profile checking now keeps the valid page mounted; the draft survives focus, and deactivation then clears the protected form on focus. Navigation and reload also discover inactive access.
- A fresh reset replayed all integration migrations. All **32 lifecycle, login, and routing checks passed** across desktop/mobile after the final guard adjustment. An earlier run had one login failure because editing the hook during the running dev server triggered React HMR hook-order replacement; the clean fresh run resolved it.
- Fresh shadow comparison reported no schema changes and synchronized migrations. Security advisors reported no issues. Typecheck, production build, Prettier, and whitespace checks passed. Component controls, readable CSS spacing, and browser screenshots were inspected.

Screenshots are preserved in the primary workspace's ignored `test-results/spec-run/lifecycle-desktop.png` and `lifecycle-mobile.png`. Local development data and hosted services were unchanged; disposable test accounts were cleaned up. Runtime ports/project configuration and credentials are excluded from commits. No push, deployment, or issue closure was performed.
