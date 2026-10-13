# 03: Public holidays and calendar

**What to build:** HR maintains the company's Kuala Lumpur Public holidays and signed-in users view them on the Shared calendar.

**Blocked by:** 01: Demo login and first hosted screen.

**Status:** ready-for-agent

- [ ] Provide a persisted manually maintained holiday list for the single company, using Kuala Lumpur, Malaysia as the sample location.
- [ ] HR can maintain holiday dates through HR settings; non-HR users cannot mutate them through UI or API.
- [ ] Calendar displays maintained holiday dates correctly on desktop and mobile.
- [ ] Treat holiday entries as company non-working dates suitable for subsequent leave-day calculations, distinct from Employee absences.
- [ ] Use consistent company-local dates and validate holiday inputs.
- [ ] Verify an HR holiday change is persisted and reflected in the calendar; verify non-HR write attempts fail.
- [ ] Deliver and verify the complete browser-to-database behavior against an isolated real test backend, with direct API checks for permissions.
- [ ] Support desktop and mobile using the agreed light theme and teal accents.
- [ ] Preserve CRLF line endings and use Prettier for supported source files; run the repository's formatting check when available.
- [ ] Inspect the existing repository, its instructions, formatting configuration, and tests before implementation; reuse working code rather than assuming an empty application.


**Published issue:** https://github.com/narniagplus961127/hr-dashboard/issues/4
