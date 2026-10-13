# 04: Leave entitlements and balances

**What to build:** Employees view their annual Leave entitlements and Available leave balances; HR maintains annual allowances by Employee and leave type.

**Blocked by:** 01: Demo login and first hosted screen.

**Status:** ready-for-agent

- [ ] Support Annual leave and Sick leave, with editable demo defaults of 14 days of each per calendar year.
- [ ] Display entitlements and available balances by year and leave type to the owning Employee and HR; deny unauthorized reads and edits.
- [ ] HR can edit entitlements through settings. Reject invalid allowances and reductions below days already used or reserved.
- [ ] Define balance accounting to deduct approved usage and pending reservations without assuming they exist before later tickets.
- [ ] Keep demo policy free of accrual, prorating, and carry-over.
- [ ] Verify changes persist and appear to the record owner, including year/type separation and unauthorized API denial. Exercise used/reserved floors with isolated test fixtures.
- [ ] Deliver and verify the complete browser-to-database behavior against an isolated real test backend, with direct API checks for permissions.
- [ ] Support desktop and mobile using the agreed light theme and teal accents.
- [ ] Preserve CRLF line endings and use Prettier for supported source files; run the repository's formatting check when available.
- [ ] Inspect the existing repository, its instructions, formatting configuration, and tests before implementation; reuse working code rather than assuming an empty application.


**Published issue:** https://github.com/narniagplus961127/hr-dashboard/issues/5
