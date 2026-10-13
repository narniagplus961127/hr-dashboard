# 08: Approved absences on the Shared calendar

**What to build:** Signed-in users see approved Employee absences as Away alongside Public holidays, and the calendar stays consistent when leave is cancelled.

**Blocked by:** 07: Cancel leave and release days.

**Status:** ready-for-agent

- [ ] Combine maintained Public holidays and approved Leave requests in the Shared calendar.
- [ ] Label approved absences as Away without exposing leave type or reason to calendar consumers.
- [ ] Exclude pending, rejected, and cancelled requests; cancellation removes the corresponding absence without deleting history.
- [ ] Calendar responses omit private details rather than only hiding them visually.
- [ ] Use consistent company-local dates, including requests spanning weekends and holidays.
- [ ] Verify request submission, approval, calendar appearance, cancellation, and disappearance through a complete browser workflow; inspect API responses for private-field absence.
- [ ] Deliver and verify the complete browser-to-database behavior against an isolated real test backend, with direct API checks for permissions.
- [ ] Support desktop and mobile using the agreed light theme and teal accents.
- [ ] Preserve CRLF line endings and use Prettier for supported source files; run the repository's formatting check when available.
- [ ] Inspect the existing repository, its instructions, formatting configuration, and tests before implementation; reuse working code rather than assuming an empty application.


**Published issue:** https://github.com/narniagplus961127/hr-dashboard/issues/9
