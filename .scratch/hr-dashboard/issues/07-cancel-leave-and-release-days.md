# 07: Cancel leave and release days

**What to build:** Employees cancel pending requests and resubmit changes, while HR cancels approved requests; released days and attributed history remain accurate.

**Blocked by:** 06: Approve or reject leave.

**Status:** ready-for-agent

- [ ] Employees can cancel their own pending requests; HR handles cancellation of approved requests.
- [ ] Do not permit in-place changes to pending requests: cancel then resubmit through the established submission flow.
- [ ] Cancellation records who acted and when, retains the request and prior history, and releases its reservation or approved allocation exactly once.
- [ ] Reject unauthorized cancellation and invalid state transitions through the backend, even when the interface is bypassed.
- [ ] Cancelled requests no longer block a valid replacement request; the replacement undergoes all existing validations.
- [ ] Verify pending cancellation, HR-approved cancellation, cancel/resubmit, denied Employee cancellation of approved leave, and repeated/concurrent cancellation.
- [ ] Deliver and verify the complete browser-to-database behavior against an isolated real test backend, with direct API checks for permissions.
- [ ] Support desktop and mobile using the agreed light theme and teal accents.
- [ ] Preserve CRLF line endings and use Prettier for supported source files; run the repository's formatting check when available.
- [ ] Inspect the existing repository, its instructions, formatting configuration, and tests before implementation; reuse working code rather than assuming an empty application.

**Published issue:** https://github.com/narniagplus961127/hr-dashboard/issues/8
