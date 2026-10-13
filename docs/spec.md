# HR Dashboard: single-company employee and leave management

## Problem Statement

The learner wants to build a working HR app inspired by BrioHR to practise frontend development, managed authentication, database design, and permissions. The app must support employee management, leave approval, and a shared calendar for one company, using fictional data. Both frontend and backend hosting must remain RM0 without a credit card, including after the learning phase.

## Solution

Build HR Dashboard with Employee, Manager, and HR Administrator access. Employees browse an Employee directory and request leave; Managers approve requests from their direct reports; HR Administrators manage employee records, company holidays, leave entitlements, and exceptional approvals. A Shared calendar displays approved absences and company Public holidays without exposing private leave details.

Provide a responsive light interface with teal accents, a desktop sidebar, and compact mobile navigation. Use React, TypeScript, and Vite on Cloudflare Pages, with Supabase Free for PostgreSQL and authentication, subject to verifying that signup and project creation require no payment method. Preserve the zero-budget constraint through accepting quotas and pauses, migration, or local operation instead of paid upgrades.

## User Stories

1. As a learner, I want frontend and backend hosting to cost RM0 without a credit card, so that I can maintain the project within my budget.
2. As a learner, I want a managed database and authentication service, so that I can focus on building a complete app.
3. As a learner, I want fictional demo employees and accounts, so that I can practise without real employee information.
4. As a learner, I want seeded Employee, Manager, and HR Administrator accounts, so that I can exercise each role.
5. As a learner, I want two HR Administrator accounts, so that HR leave can be approved without self-approval.
6. As a learner, I want scripted account creation and password resets, so that the demo does not depend on email delivery.
7. As a user, I want to sign in using email and password, so that I can access my permitted features.
8. As a user, I want to sign out, so that I can end my session on a shared device.
9. As a user, I want navigation appropriate to my permissions, so that I can find my available tasks.
10. As a user, I want the app to work on desktop and mobile, so that I can use it on either screen size.
11. As a user, I want an overview with headcount and permitted leave summaries, so that I can understand relevant HR activity.
12. As an Employee, I want to browse the Employee directory, so that I can find colleagues and their departments.
13. As an Employee, I want to see colleagues' names, work emails, job titles, departments, and Managers, so that I can understand how to contact them and where they work.
14. As an Employee, I want to view my start date and employment status, so that I can review my own employment record.
15. As an Employee, I want my start date and employment status hidden from other Employees and Managers, so that my personal record follows the agreed visibility rules.
16. As an HR Administrator, I want to create and edit employee records, so that the company's directory is maintained.
17. As an HR Administrator, I want to manage names, work emails, job titles, departments, Managers, start dates, and employment status, so that records contain the agreed information.
18. As an HR Administrator, I want to assign an Employee's Manager, so that leave requests reach the right approver.
19. As an HR Administrator, I want pending requests to move when a Manager is reassigned, so that approval responsibility stays current.
20. As an HR Administrator, I want to deactivate Employees without deleting their history, so that past leave remains traceable.
21. As an HR Administrator, I want deactivation to block access and new requests, so that inactive Employees cannot continue using the app.
22. As an HR Administrator, I want deactivation to cancel pending and future approved leave, so that affected days are released while history is preserved.
23. As an Employee, I want Annual leave and Sick leave, so that I can request either supported type of absence.
24. As an Employee, I want to see my Leave entitlement and Available leave balance by type and year, so that I can plan a valid request.
25. As an Employee, I want to request full working days starting today or later, so that I can book upcoming leave.
26. As an Employee, I want weekends and Public holidays excluded from charged days, so that leave reflects the company's working calendar.
27. As an Employee, I want overlapping requests prevented, so that the same absence is not booked twice.
28. As an Employee, I want requests exceeding my Available leave balance rejected, so that I cannot overspend my entitlement.
29. As an Employee, I want clear validation for past dates and requests crossing calendar years, so that I can correct invalid requests.
30. As an Employee, I want pending requests to reserve days, so that multiple submissions do not overcommit my entitlement.
31. As an Employee, I want to see my request status and Leave history, so that I know what happened to my request.
32. As an Employee, I want to cancel a pending request and release its days, so that I can change my plans.
33. As an Employee, I want to cancel and resubmit to change pending leave, so that revisions have a clear approval history.
34. As a Manager, I want an approval screen for eligible direct-report requests, so that I can handle my team's leave.
35. As a Manager, I want to approve a request in one step, so that an approved absence can appear in the Shared calendar.
36. As a Manager, I want to reject a request with a required reason, so that the Employee understands the decision.
37. As a Manager, I want my own requests routed to HR, so that I cannot approve my own leave.
38. As an HR Administrator, I want to handle requests with no assigned Manager, so that Employees still have an approval route.
39. As an HR Administrator, I want to handle Managers' requests, so that managerial leave has independent approval.
40. As an HR Administrator, I want another HR Administrator to approve my requests, so that self-approval remains forbidden.
41. As an HR Administrator, I want to oversee company leave and cancel approved requests, so that approved absences can be corrected with history retained.
42. As an Employee, I want rejection and cancellation to release charged or reserved days, so that my balance remains accurate.
43. As an HR Administrator, I want editable annual entitlements with demo defaults of 14 Annual leave days and 14 Sick leave days, so that I can practise managing allowances.
44. As an HR Administrator, I want reductions below already used or reserved days prevented, so that entitlement changes do not create an invalid balance.
45. As a user, I want a Shared calendar showing approved absences as "Away", so that I know who is unavailable without seeing leave types or reasons.
46. As a user, I want Public holidays on the Shared calendar and pending requests excluded, so that it reflects agreed non-working days and confirmed absences.
47. As an HR Administrator, I want to maintain the company's holiday dates manually, so that leave calculations follow the selected location.
48. As a learner, I want sample holiday configuration for Kuala Lumpur, Malaysia, so that the demo has a concrete company location.
49. As a user, I want role and field restrictions enforced beyond the interface, so that direct API calls cannot expose or change unauthorized information.
50. As a learner, I want setup and hosting instructions covering quotas, inactivity restoration, and no-card checks, so that operating the demo stays within the budget.

## Implementation Decisions

- The workspace contains only the confirmed plan, glossary, and architecture decision. There are no existing application modules, test frameworks, or test boundaries to preserve. The local directory is not currently a Git checkout. Remote code could not be inspected because the GitHub connection lacks access to the supplied private repository.
- Use a single-company model with departments. Employee information and login identity are linked concepts, not interchangeable: HR edits employment records while privileged setup tooling maintains authentication accounts.
- Build modules for session/access control, employee records and directory, leave requests and approvals, entitlement accounting, Shared calendar and Public holidays, overview summaries, and privileged demo setup.
- Model Employees, departments, role assignments, Manager relationships, annual entitlements per Employee and leave type, dated Leave requests with lifecycle status, company holiday dates, and attributed Leave history.
- Use managed PostgreSQL and authentication rather than operate a separate persistent application server. Define database access policies and transactional operations for sensitive state changes. Never ship privileged account-management credentials to the browser.
- Directory access exposes names, work emails, job titles, departments, and Managers. Start date and employment status are restricted to the record owner and HR. Request owners see their own details; eligible Managers and HR see details needed for approval. Shared calendar responses omit leave type and reason, rather than merely hiding them in the interface.
- Leave request states are pending, approved, rejected, and cancelled. Submission reserves days; approval converts the reservation into approved usage without subtracting twice; rejection or cancellation releases the allocation. Record the actor, action, and time for each transition. Rejection requires a reason.
- Full-day calculations use Monday-Friday working days and exclude maintained company Public holidays. Reject invalid date ranges, requests with no working days, past-date submissions, cross-year requests, overlaps with pending/approved requests, and insufficient balances. Use the company's Kuala Lumpur local date consistently when interpreting "today"; split cross-year leave into separate requests.
- Calculate Available leave balance for each leave type and calendar year as entitlement minus approved days and pending reservations. Defaults are 14 Annual leave days and 14 Sick leave days per year. These are fictional demo policies, not a claim about legal entitlements. No accrual, prorating, or carry-over is included.
- Keep leave validation and allocation changes atomic so concurrent submissions, repeated approvals, or cancellations cannot overspend or release days twice. All mutation interfaces enforce role eligibility and legal state transitions independently of UI navigation.
- One Manager approval completes the standard flow. HR handles Employees without assigned Managers and Managers' requests. Another HR Administrator handles an HR Administrator's request. Self-approval is forbidden even when a user has multiple responsibilities.
- Employees can cancel pending requests, then resubmit changes. HR handles cancellations of approved requests. Retain rejected and cancelled requests in history. Deactivation preserves past history, blocks access, and cancels pending/future approved leave. Manager reassignment changes pending approval responsibility.
- Entitlement edits cannot reduce an allowance below days already used or reserved. Maintain attributed history for request lifecycle actions.
- Seed fictional Employees, Managers, and two HR Administrators. Authentication creation and password resets use privileged setup scripts, with no public registration, invitation, or general email-delivery dependency.
- Build login, overview, Employee directory, employee details, my leave, approvals, Shared calendar, and HR settings. Overview data respects the same permissions as the underlying records.
- Apply a light theme, teal accents, desktop sidebar, compact mobile navigation, and an original visual design. The working name is HR Dashboard.
- Host the static frontend on Cloudflare Pages using its provided address. Supabase Free is the chosen backend candidate, conditional on no-card signup verification. Remain on free plans and accept caps and pauses; do not add paid services or a custom domain.

## Testing Decisions

- The user confirmed complete browser workflows against a real disposable test database as the main testing boundary, supplemented by direct API permission checks. Use an isolated local/disposable backend and fictional fixtures; do not require a second paid hosted environment.
- Good tests assert externally observable outcomes: visible records, request status, balances, calendar entries, history, and denied operations. Avoid tests tied to component internals, private helpers, SQL layout, or implementation-specific call sequences.
- Exercise session/access control, directory visibility, employee lifecycle, leave/entitlement operations, approvals, holidays, and calendar through the complete app. There is no existing test prior art in this workspace.
- Verify Employee submission followed by Manager approval updates status, balance, history, and calendar together. Verify rejection and cancellation release days exactly once.
- Cover weekends, holidays, zero-working-day ranges, past dates, year boundaries, overlaps, insufficient balances, and entitlement reductions below allocations. Include company-date boundary cases and concurrent submissions competing for the same remaining allowance.
- Use separate accounts to verify direct-report restrictions, missing-Manager routing, Managers' own leave, HR-to-HR approval, and no self-approval. Direct API calls must fail unauthorized reads and changes, including requests to elevate one's own role.
- Verify private start dates/status and leave type/reason are absent from unauthorized API responses as well as screens. Verify deactivated accounts cannot use existing sessions to access protected data.
- Verify Manager reassignment transfers pending requests, and Employee deactivation cancels the agreed requests while preserving history and releasing days.
- Check core workflows at desktop and mobile sizes, including actionable form errors and usable navigation. Verify anonymous users cannot access protected screens or APIs.
- Deployment acceptance includes successful no-card free-plan setup, functioning hosted login/data operations, documented quota/restoration behavior, and no privileged keys in frontend artifacts. Backend signup verification is an external setup check, not yet completed.

## Out of Scope

- Multiple companies, payroll, attendance tracking, recruitment, and full BrioHR feature parity.
- Uploads, attachments, employee photos, automated email notifications, public registration, email invitations, and self-service email password resets.
- Half-day leave, variable workweeks, accrual, prorating, carry-over, automated holiday feeds, and multi-stage approval chains.
- Editing pending requests in place, employee-submitted past leave, and a single request spanning calendar years.
- Paid hosting, payment methods, paid upgrades, purchased custom domains, and uptime guarantees beyond free-plan availability.
- Application implementation, provisioning, code commits, or a Git push as part of writing this specification.

## Further Notes

- The consolidated plan was confirmed on 2026-10-13. Testing boundaries were subsequently confirmed during specification preparation.
- Intended repository and issue tracker: https://github.com/narniagplus961127/hr-dashboard (private). Publish this specification as an implementation issue with the `ready-for-agent` label when repository access is available. No code push is requested at this stage.
- Publication is currently blocked: GitHub's connector returns a repository-not-found response and a search permission error. The GitHub CLI is not installed. This document is the complete local publication draft, not an already-created issue.
- Current official Supabase pricing confirms a $0 plan but does not explicitly establish its no-card signup requirement. Verify signup/project creation before depending on this hosted backend; if a card is required, revisit the provider instead of entering payment details.
- Free hosting terms may change. The enduring requirement is RM0/no card; migrations or local operation are acceptable responses to incompatible terms. Supabase inactivity pauses are accepted.
- Hosting facts were researched on 2026-10-13: [Cloudflare free offering](https://www.cloudflare.com/plans/), [Pages limits](https://developers.cloudflare.com/pages/platform/limits/), [Supabase pricing](https://supabase.com/pricing), [Supabase billing FAQ](https://supabase.com/docs/guides/platform/billing-faq), and [Supabase email limitations](https://supabase.com/docs/guides/auth/auth-smtp).
