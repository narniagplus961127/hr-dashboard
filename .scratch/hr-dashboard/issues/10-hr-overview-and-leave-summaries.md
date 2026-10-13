# 10: HR overview and leave summaries

**What to build:** Users open an overview showing headcount and role-appropriate leave summaries derived from actual employee and request records.

**Blocked by:** 06: Approve or reject leave.

**Status:** ready-for-agent

- [ ] Display headcount and relevant leave summaries using persisted company data, with clear labels and empty states.
- [ ] Employee leave summaries cover their own requests; Manager summaries respect direct-report scope; HR summaries support company oversight.
- [ ] Overview responses and aggregates follow the same private-field and request-access restrictions as their underlying records.
- [ ] An Employee submission and Manager approval or rejection update the relevant summaries after refresh without fabricated dashboard data.
- [ ] Do not require calendar or deactivation tickets to build the overview; when those features land, existing record/state changes must naturally be reflected.
- [ ] Verify populated and empty overview states across roles on desktop and mobile, including unauthorized aggregate/API access.
- [ ] Deliver and verify the complete browser-to-database behavior against an isolated real test backend, with direct API checks for permissions.
- [ ] Support desktop and mobile using the agreed light theme and teal accents.
- [ ] Preserve CRLF line endings and use Prettier for supported source files; run the repository's formatting check when available.
- [ ] Inspect the existing repository, its instructions, formatting configuration, and tests before implementation; reuse working code rather than assuming an empty application.


**Published issue:** https://github.com/narniagplus961127/hr-dashboard/issues/11
