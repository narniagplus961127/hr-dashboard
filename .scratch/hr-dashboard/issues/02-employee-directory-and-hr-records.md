# 02: Employee directory and HR record management

**What to build:** Users browse the Employee directory and permitted details; HR Administrators create and edit employee records, departments, and Manager assignments.

**Blocked by:** 01: Demo login and first hosted screen.

**Status:** ready-for-agent

- [ ] Directory entries expose name, work email, job title, department, and Manager to signed-in active users.
- [ ] Start date and employment status are accessible only to the record owner and HR, including in API responses.
- [ ] HR can create and edit the agreed employee fields and maintain departments and Manager assignments; non-HR mutation attempts are denied.
- [ ] Keep employee records separate from login-account provisioning: HR manages employment records while privileged setup scripts manage login accounts.
- [ ] Show useful validation and empty states; seeded records appear correctly in directory and details screens.
- [ ] Defer the deactivation action to ticket 09, where cancellation and access-blocking behavior can be delivered together.
- [ ] Demonstrate an HR record change appearing in the directory, and verify unauthorized users cannot retrieve private fields or edit records.
- [ ] Deliver and verify the complete browser-to-database behavior against an isolated real test backend, with direct API checks for permissions.
- [ ] Support desktop and mobile using the agreed light theme and teal accents.
- [ ] Preserve CRLF line endings and use Prettier for supported source files; run the repository's formatting check when available.
- [ ] Inspect the existing repository, its instructions, formatting configuration, and tests before implementation; reuse working code rather than assuming an empty application.


**Published issue:** https://github.com/narniagplus961127/hr-dashboard/issues/3
