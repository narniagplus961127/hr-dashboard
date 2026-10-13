# 01: Demo login and first hosted screen

**What to build:** A learner can open the free-hosted app, sign in as an Employee, Manager, or HR Administrator, see their own employment profile, and sign out.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Verify frontend and backend setup stays RM0 without a credit card before adopting the hosted backend. If the candidate requires a payment method, report that finding and revisit the provider; do not add a card or paid plan.
- [ ] Use React, TypeScript, and Vite on Cloudflare Pages with the provided hosting address, and Supabase Free for login and PostgreSQL subject to no-card verification.
- [ ] Seed fictional employee records linked to login accounts for all three roles, including two HR Administrators. Provide privileged scripts for account creation and password resets without relying on email delivery.
- [ ] Show only the signed-in user's own profile and appropriate navigation. Protect access through backend permissions; anonymous users cannot retrieve profiles, and users cannot elevate their own role.
- [ ] Sign-out ends usable app access. Login errors are actionable without exposing private account data.
- [ ] Establish an isolated real test database and browser workflow tests, with direct unauthorized API attempts.
- [ ] Document free-tier quotas, inactivity restoration, local setup, and handling incompatible provider changes. Privileged setup keys never enter browser artifacts.
- [ ] Deliver and verify the complete browser-to-database behavior against an isolated real test backend, with direct API checks for permissions.
- [ ] Support desktop and mobile using the agreed light theme and teal accents.
- [ ] Preserve CRLF line endings and use Prettier for supported source files; run the repository's formatting check when available.
- [ ] Inspect the existing repository, its instructions, formatting configuration, and tests before implementation; reuse working code rather than assuming an empty application.

**Published issue:** https://github.com/narniagplus961127/hr-dashboard/issues/2
