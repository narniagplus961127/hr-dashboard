# 05: Submit and track Leave requests

**What to build:** Employees submit valid full-day Leave requests, reserve the corresponding allowance, and track pending requests and their Leave history in My leave.

**Blocked by:** 03: Public holidays and calendar; 04: Leave entitlements and balances.

**Status:** ready-for-agent

- [ ] Submit Annual leave and Sick leave requests for today or future dates, interpreted using Kuala Lumpur's local date.
- [ ] Charge Monday-Friday days excluding maintained Public holidays. Reject reversed ranges, zero-working-day requests, past-date submissions, and cross-calendar-year requests.
- [ ] Prevent overlaps with the same Employee's pending or approved requests and reject insufficient Available leave balance.
- [ ] Create a pending request, its attributed submission history, and its reservation atomically. Concurrent competing submissions cannot overspend balances.
- [ ] My leave displays the owner's requests, statuses, charged days, and history; unauthorized users cannot read or create requests for other Employees.
- [ ] Verify valid submission and balance reservation through the browser, and exercise date boundaries, holidays, overlaps, insufficient balances, and concurrent submissions through the same backend behavior.
- [ ] Keep request changes out of this ticket; cancellation and resubmission are delivered in ticket 07.
- [ ] Deliver and verify the complete browser-to-database behavior against an isolated real test backend, with direct API checks for permissions.
- [ ] Support desktop and mobile using the agreed light theme and teal accents.
- [ ] Preserve CRLF line endings and use Prettier for supported source files; run the repository's formatting check when available.
- [ ] Inspect the existing repository, its instructions, formatting configuration, and tests before implementation; reuse working code rather than assuming an empty application.

**Published issue:** https://github.com/narniagplus961127/hr-dashboard/issues/6
