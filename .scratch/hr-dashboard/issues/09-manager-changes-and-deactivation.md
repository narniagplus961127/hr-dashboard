# 09: Manager changes and Employee deactivation

**What to build:** HR changes approval responsibility when a Manager is reassigned and deactivates Employees while preserving history, blocking access, and releasing affected leave allocations.

**Blocked by:** 07: Cancel leave and release days.

**Status:** ready-for-agent

- [ ] Manager reassignment transfers pending approval responsibility to the new eligible Manager, with HR handling agreed exceptions.
- [ ] The previous Manager can no longer act on transferred requests through UI or API.
- [ ] HR can deactivate an Employee without deleting the record or Leave history.
- [ ] Deactivation blocks protected access and new requests, including attempts using an existing session.
- [ ] Cancel pending and future approved leave on deactivation, release corresponding allocations exactly once, and retain attributed history. Preserve historical leave.
- [ ] Prevent other roles from bypassing lifecycle restrictions through direct API calls.
- [ ] Verify reassignment using old/new Manager accounts and deactivation using an existing Employee session; verify balances and preserved history.
- [ ] Clarify any ambiguous partly elapsed leave scenario against the confirmed policy before changing its treatment.
- [ ] Deliver and verify the complete browser-to-database behavior against an isolated real test backend, with direct API checks for permissions.
- [ ] Support desktop and mobile using the agreed light theme and teal accents.
- [ ] Preserve CRLF line endings and use Prettier for supported source files; run the repository's formatting check when available.
- [ ] Inspect the existing repository, its instructions, formatting configuration, and tests before implementation; reuse working code rather than assuming an empty application.


**Published issue:** https://github.com/narniagplus961127/hr-dashboard/issues/10
