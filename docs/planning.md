# HR Dashboard Planning

## Confirmed requirements

- This is a learning project inspired by BrioHR.
- Features include employee management, leave approval, and a calendar.
- "Team director" means an employee directory with departments and contact details.
- The app serves one company with departments.
- Employees request leave; managers approve their direct reports' requests; HR Administrators manage employee records and oversee leave.
- The shared calendar shows approved leave and public holidays. Pending requests remain in the approval screen.
- Sign-in uses pre-created email/password demo accounts for each role. Public registration and invitations are deferred.
- Use fictional employee data with name, work email, job title, department, manager, start date, and employment status.
- Employees can browse basic directory details. HR can edit records and see all fields.
- Initial leave types are annual leave and sick leave.
- Requests cover full working days, Monday through Friday, excluding public holidays. Overlapping requests are prevented.
- HR manually maintains the company holiday list.
- Sample holiday location: Kuala Lumpur, Malaysia. HR maintains the actual dates.
- Demo annual entitlements: 14 days annual leave and 14 days sick leave per calendar year, editable by HR. No accrual, prorating, or carry-over initially.
- Pending requests reserve days. Rejection or cancellation releases them.
- Approval requires one manager. HR handles requests with no assigned manager and managers' own requests. Self-approval is forbidden.
- Employees cancel pending requests. HR handles cancellation of approved requests. Rejections require a reason.
- Keep a history of who requested, approved, rejected, or cancelled leave.
- Learning focus: a complete app with a managed database/authentication backend, rather than maintaining a separate backend server.
- Frontend: React with TypeScript.
- Accept free-tier usage caps and manual restoration after inactivity pauses. Migrate or run locally if provider changes conflict with RM0/no-card constraints.
- Directory visibility: everyone sees names, work emails, job titles, departments, and managers. Start dates and employment status are visible only to the employee and HR.
- Shared calendar shows approved leave as "Away", without leave type or reason. Managers and HR see request details needed for approval.
- HR deactivates employees instead of deleting them, preserving history and blocking their access and new requests.
- Employees request only today or future dates. Changes to pending requests require cancellation and resubmission. Cross-year leave requires separate requests per calendar year.
- Screens: login, overview (headcount and leave summaries), directory, employee details, my leave, approvals, shared calendar, and HR settings.
- Support desktop and mobile layouts.
- Deferred: payroll, attendance tracking, recruitment, uploads, and email notifications.
- Frontend and backend hosting must stay at RM0 without a credit card; paid upgrades are outside the planned budget.

## Final interview decisions

- Stack: React, TypeScript, and Vite on Cloudflare Pages; Supabase Free for PostgreSQL and authentication, subject to no-card signup verification. Use the provided hosting address without a paid custom domain.
- Account creation and password resets use a setup script. HR manages employee records in the app. Seed employees, managers, and two HR Administrators; one HR Administrator approves the other's leave.
- Manager reassignment moves pending requests to the new manager.
- Employee deactivation cancels pending and future approved leave, releases corresponding days, and preserves history.
- HR cannot reduce an entitlement below days already used or reserved.
- Visual direction: light theme, teal accents, desktop left sidebar, and compact mobile navigation. Working name: HR Dashboard. Create an original design inspired by BrioHR's features.

## Setup verification

- Verify Supabase Free signup and project creation require no credit card before adopting the hosted backend. Current official pricing confirms $0, but does not explicitly confirm the signup card requirement.
- If setup requires a payment method, revisit the backend choice instead of entering card details.
- Confirm quotas and terms at deployment time; accept restrictions or pauses instead of paying to exceed limits.

## Implementation sequence

1. Establish frontend structure, database schema, role permissions, and scripted fictional demo accounts.
2. Build login, directory, employee details, and HR record management.
3. Build leave balances, request validation, approvals, cancellations, and history.
4. Build shared calendar, manual holiday management, and overview summaries.
5. Verify workflows across roles and desktop/mobile layouts, then prepare free-hosting configuration.

## Acceptance scenarios

- Valid requests reserve the correct number of working days; weekends and company holidays do not consume leave.
- Overlaps, insufficient balances, past dates, and cross-year requests are rejected.
- Managers approve eligible direct-report requests. HR handles missing-manager and manager requests; HR Administrators approve each other's requests. Nobody approves their own leave.
- Rejection requires a reason. Rejection and cancellation release days and preserve history.
- Pending requests follow manager reassignment. Deactivation blocks access and cancels pending/future approved leave without deleting history.
- Calendar absences display as "Away" without private details. Directory and request access match the agreed visibility rules.
- Desktop and mobile flows work. Hosting setup never requires card details or paid upgrades.

## Hosting references checked on 2026-10-13

- [Cloudflare free developer offering](https://www.cloudflare.com/plans/): advertises starting free without a credit card.
- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/): Free plan includes 500 builds/month.
- [Supabase pricing](https://supabase.com/pricing): Free includes a 500 MB database, 50,000 monthly active users, and pauses after one week of inactivity.
- [Supabase billing FAQ](https://supabase.com/docs/guides/platform/billing-faq): Free-plan overuse can lead to restrictions.
- [Supabase email service](https://supabase.com/docs/guides/auth/auth-smtp): default email delivery is restricted; scripted demo accounts avoid relying on general email delivery.

## Review status

The user confirmed the consolidated plan on 2026-10-13. The planning interview is complete. Supabase no-card signup remains a setup verification step. Application implementation and hosting provisioning have not begun.

## Source repository

- User-provided private GitHub repository: [narniagplus961127/hr-dashboard](https://github.com/narniagplus961127/hr-dashboard).
- Intended destination for a later push. No push has been requested for the current planning step.

Hosting providers can change their terms. The budget is a project constraint, not a guarantee about future provider pricing.
