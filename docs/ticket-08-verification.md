# Ticket 08 verification

Implemented issue #9 on `codex/hr-calendar-absences`, based on integration commit `501aad0`. Testing uses a separate disposable `hr-dashboard-calendar-test` backend; the primary development database is untouched.

The approved testing boundaries remain complete browser workflows and direct public API permission checks against a real isolated database. The initial API test failed for the missing RPC, then passed with the narrow projection. The browser tracer failed for missing Away events before rendering was added.

- Desktop and mobile: Employee submits leave, Manager approves, Employee sees Away across Friday, weekend and maintained Monday holiday, reload preserves it, HR cancels, absence disappears, and owner history remains.
- Public API: exact response keys contain only Employee identity and dates. Pending, rejected and both cancellation paths are absent. Private reasons/types are absent from JSON; other users still cannot read owner-only request details.
- Anonymous, inactive and revoked-session callers are denied. Supplied Employee scope arguments cannot broaden the API.
- Calendar/holiday acceptance and regression suite: 8 passed. Calendar, approval and cancellation suite: 20 passed, across desktop/mobile.
- TypeScript, production build and Prettier checks pass. Security advisors report no issues. CLI shadow replay applies every migration from scratch and finds no schema difference.

Inspected desktop and mobile screenshots. No horizontal document overflow at mobile width. Representative desktop proof is saved in the primary ignored `test-results/spec-run/calendar-desktop.png`.

No hosted deployment or Git push was performed.
