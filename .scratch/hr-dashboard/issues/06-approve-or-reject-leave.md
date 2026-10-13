# 06: Approve or reject leave

**What to build:** Eligible Managers and HR Administrators approve or reject pending requests in one step, and Employees see the decision, correct balance, and history.

**Blocked by:** 02: Employee directory and HR record management; 05: Submit and track Leave requests.

**Status:** ready-for-agent

- [ ] Managers see and act on eligible direct-report requests; backend checks deny other Managers.
- [ ] Route Employees without an assigned Manager and Managers' own requests to HR. HR Administrators' requests require another HR Administrator.
- [ ] Nobody can approve or reject their own request, including users with overlapping responsibilities.
- [ ] Approval converts reserved days to approved usage without reducing the balance twice; rejection requires a reason and releases the reservation.
- [ ] State transition, accounting, and attributed history are atomic. Repeated or competing decisions cannot apply twice.
- [ ] Owners see updated status and history. HR can oversee company leave while access remains restricted for other users.
- [ ] Verify standard approval, required rejection reasons, exceptional routing, self-approval denial, unauthorized direct API calls, and race/replay behavior.
- [ ] Deliver and verify the complete browser-to-database behavior against an isolated real test backend, with direct API checks for permissions.
- [ ] Support desktop and mobile using the agreed light theme and teal accents.
- [ ] Preserve CRLF line endings and use Prettier for supported source files; run the repository's formatting check when available.
- [ ] Inspect the existing repository, its instructions, formatting configuration, and tests before implementation; reuse working code rather than assuming an empty application.


**Published issue:** https://github.com/narniagplus961127/hr-dashboard/issues/7
