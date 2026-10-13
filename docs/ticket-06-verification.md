# Ticket 06 verification

GitHub issue #7: Approve or reject leave.

Implemented eligible Manager/HR approvals at `/approvals`, scoped private request/history RPCs, and atomic approve/reject transitions. Owners see the updated status, attributed decision history, and correct balances through the existing My leave page. Owner-only public views remain unchanged. HR oversight includes company requests but does not override a standard assigned Manager. Routing and transactional interfaces are recorded in [leave-approvals.md](leave-approvals.md).

Verified on the separate `hr-dashboard-approvals-test` backend:

- Red → green API cycle: the missing decision RPC failed before implementation; the assigned Manager then approved exactly once, with usage and attributed history visible to the owner.
- Red → green browser cycle: the missing approval navigation failed before implementation; Employee submission then reached the Manager, approval updated owner history/balance, and rejection released the next reservation with its required reason.
- Direct API checks cover unrelated Manager denial; HR oversight without override; missing/inactive Manager fallback; Manager requests routed to HR; HR requests decided by another HR; self-approval/self-rejection denial; required reasons; unsupported decisions; editable metadata forgery; anonymous and revoked sessions; and competing decisions with one history transition and no repeated allocation change.
- All 76 desktop/mobile tests passed, including the existing login, directory, holiday, entitlement, and submission coverage.
- Clean isolated database reset applied all migrations including `20261013070314_leave_approval_decisions.sql`; fixture setup and the full suite passed afterward.
- Typecheck, production build, Prettier, and whitespace checks passed. Supabase security advisors reported no issues.

Temporary project/port settings and ignored environment files are excluded from commits. Root and hosted databases were not changed. No push, deployment, or issue closure was performed.
