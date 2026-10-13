# HR Dashboard

A single-company HR learning app with fictional employees. The full local specification includes sign-in and profiles, Employee and Department management, reporting structure, Public holidays, leave entitlements, requests, approvals, cancellation, a shared absence calendar, employee deactivation, and an overview.

React, TypeScript, and Vite provide the frontend. Supabase provides authentication and PostgreSQL. Cloudflare Pages hosts the static build.

React Router manages `/login`, `/profile`, `/overview`, `/directory`, `/directory/:employeeId`, `/departments`, `/reporting`, `/calendar`, `/holidays`, `/my-leave`, `/approvals`, and `/entitlements`, including direct links and browser history. All workspace routes require an active session. Department, holiday, and entitlement management require HR; approvals require Manager or HR access. Workspace access information appears on My profile. Cloudflare Pages serves the SPA entry point for these paths when the build has no top-level `404.html`; retain that default when deploying. See [Pages SPA routing](https://developers.cloudflare.com/pages/configuration/serving-pages/#single-page-application-spa-rendering).

Job levels use the owner-confirmed order **Director → Head → Manager → Lead → Senior → Junior**. HR chooses a level explicitly for new records. Directory ordering follows level, then name, while the reporting view follows actual Manager assignments. Job titles and levels are independent employment fields; levels never grant workspace permissions. Existing Lead/Senior fictional test records are backfilled to match their titles, and new test fixtures select matching levels explicitly.

Ticket 01 is deployed at [HR Dashboard](https://hr-dashboard-demo.pages.dev). All four accounts listed below can sign in; the owner-approved local `.env.demo.local` contains their shared hosted demo password and remains gitignored. The temporary setup-key file was deleted after provisioning.

## Requirements

- Node.js 24 or newer and npm.
- Docker Desktop running Linux containers for the isolated local Supabase test backend.
- Free Supabase and Cloudflare accounts for deployment. Do not enter payment details or enable paid services.

## Local development and tests

Install dependencies and start the development backend and frontend:

```powershell
npm ci
npm run backend:start
npm run dev
```

The frontend uses port 5173 and the public Supabase settings in gitignored `.env.local`. Development Supabase uses API port 54321 and retains its data between restarts. For initial account provisioning, use the trusted `demo:seed` setup described below with local backend credentials. Existing development accounts do not need to be recreated.

The owner's account reference is in gitignored `.local/demo-accounts.md`. It contains separate local and hosted credentials; never commit it. The existing `.env.test.local` is a legacy local credential reference and is no longer loaded by automated tests.

Before working, check the current branch and backend state:

```powershell
npm run preflight
npm run check
npm test
```

`npm test` creates a new disposable Supabase project for each run, applies tracked migrations, and creates fictional accounts with a fresh password kept in memory. It uses API port 56421, database port 56422, shadow port 56420, and frontend port 56414. After the run, it removes only its own containers, volumes, and runtime directory. It never resets the development project or uses hosted services. Docker Desktop must be running. Only one test run can own these ports at a time.

Run selected workflows with `npm test -- tests/entitlements.spec.ts`, or use `npm run test:ui`. Direct Playwright and `test:setup` invocations are rejected without the runner's ownership context. If a process is forcibly terminated, inspect its retained runtime and Docker project before removing a stale `.test-runtime/runner.lock`; do not delete development volumes.

Tests use installed Google Chrome locally. CI sets `HR_TEST_BROWSER=chromium` and installs Playwright's matching Chromium. Desktop and mobile workflows cover employee requests, Manager approval, balance/calendar updates, HR cancellation, directory, Departments, holidays, entitlements, reporting, deactivation, and overview. Direct API checks verify permissions and competing state transitions against the disposable real database.

Commits format staged files with Prettier and run type checking plus fast test-runner safety checks. GitHub Actions runs formatting, type checking, a production build, and the complete real-backend browser suite for pull requests and pushes to main. It uses no hosted credentials. See [repository checks](.github/workflows/checks.yml).

To apply local migrations or stop the development containers while retaining data:

```powershell
npm run supabase -- migration up --local
npm run supabase -- stop --project-id hr-dashboard-test
```

## Leave and employee workflows

Annual and Sick leave default to 14 days per Employee and calendar year. HR edits allowances through **Leave entitlements**; the allowance cannot fall below already used plus reserved days. **My leave** shows own balances, requests, and attributed history. Full working days exclude weekends and configured company holidays. Requests must start today or later in Kuala Lumpur, stay within one calendar year, avoid pending/approved overlaps, and fit the available allowance.

Pending leave reserves days. A Manager decides their current direct-report Employees' requests; HR handles Employees without a Manager, Managers' requests, and other HR Administrators' requests. Nobody approves or rejects their own request. Approval moves reserved days to used; rejection requires a reason and releases the reservation. Employees cancel their own pending requests, and HR cancels approved requests. Repeated or competing transitions cannot release or charge days twice. Edit a request by cancelling it and submitting another.

**Shared calendar** shows Public holidays and approved absences as **Away**, without exposing leave types or private reasons. Cancellation removes the absence. **Overview** shows headcount and request summaries scoped to the Employee, Manager's direct reports, or HR's company access. Reassigning an Employee changes responsibility for pending requests immediately; the previous Manager loses decision access.

## Sample Kuala Lumpur holiday configuration

Once the holiday migration is installed, sign in as an HR Administrator and open **Public holidays** (`/holidays`). For a fictional learning example, enter the name **Demo Kuala Lumpur company holiday** and the date **2027-01-15**, then choose **Add holiday**. Open **Shared calendar** (`/calendar`) and select **January 2027** to verify that the entry appears on the 15th. You can edit or delete the entry through Public holidays.

This example is an invented company non-working day, not an official Malaysian public-holiday calendar. Dates belong to the company's `Asia/Kuala_Lumpur` calendar, remain date-only values, and do not repeat automatically. Maintain the desired dates manually before submitting demo leave requests. The example is documented rather than inserted automatically, so setup does not change an existing company's holiday data.

## Hosted setup

Use the dedicated **HR Dashboard** Supabase project supplied by the owner. The project is on QW Org's Free plan and is in Tokyo; the demo company is in Kuala Lumpur. The owner confirmed project creation did not require a credit card. No other existing project is modified.

1. Apply the tracked Supabase migrations to the dedicated project, using a trusted connection or Supabase's SQL editor. They enforce directory/private-field separation and HR-only writes with Row Level Security and explicit grants. The security follow-up removes public execution rights from Supabase's automatic-RLS helper when that helper exists.
2. In Authentication settings, keep email/password sign-in enabled and disable public user signup. Anonymous sign-ins are not used. Demo accounts are created through the admin API, with email confirmation supplied by the setup script; no invitation, reset email, or SMTP dependency is needed.
3. Copy `.env.example` to `.env.local` and set the project URL and publishable key. Privileged keys must never use the `VITE_` prefix. The Vite configuration rejects modern secret keys and legacy privileged JWT keys in this field.
4. For privileged account setup, supply `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and a strong `DEMO_PASSWORD` of at least 12 characters through the terminal environment. Alternatively use `.env.admin.local` based on `.env.admin.example` only when local credential storage is authorized. This file is gitignored and never enters the frontend; remove it after setup if temporary storage was chosen.

```powershell
npm run demo:seed
npm run demo:reset-password -- maya@hr.example.test
```

`demo:seed` creates missing accounts and provisions their employment records through a service-only database operation without resetting existing passwords. Re-running it restores the four demo records' configured names, contact details, Departments, start dates, and roles, and assigns Maya to Daniel. It preserves existing activation status. `demo:reset-password` changes a known demo account's password and revokes its sessions. Neither command prints passwords or server-side keys.

HR-created records do not create login accounts. Their login identity stays unlinked until trusted provisioning links it; changing a work email in the HR form does not change the sign-in email. HR can edit employment information, but role assignment, login provisioning, and password changes remain privileged setup tasks. Employment status is visible to the owner and HR. HR can deactivate an Employee from their directory details. This denies existing-session access, cancels pending requests and approved leave starting today or later in Kuala Lumpur, and releases those allocations once. Approved leave that already started remains unchanged, including its remaining days, with history retained. Reactivation and access-role assignment remain trusted provisioning tasks.

| Employee     | Work email             | Workspace role   |
| ------------ | ---------------------- | ---------------- |
| Maya Tan     | maya@hr.example.test   | Employee         |
| Daniel Lee   | daniel@hr.example.test | Manager          |
| Aisha Rahman | aisha@hr.example.test  | HR Administrator |
| Grace Lim    | grace@hr.example.test  | HR Administrator |

Treat these as demonstration accounts, not real employment records. The owner has enabled public demo logins for this fictional learning app. The login page can display all four demo emails and their shared password. If a local demo-password file is retained for the owner, it must remain gitignored.

## Visitor demo access

The login page shows **View demo accounts** when `VITE_DEMO_PASSWORD` is configured and `VITE_DEMO_BACKEND_URL` matches `VITE_SUPABASE_URL`. The popup lists two HR Administrators, one Manager, and one Employee, with a shared password. It supports keyboard focus, Escape, and a Close button.

Use gitignored `.env.development.local` for the local backend's password and `.env.production.local` for the hosted backend's password. The development file is not loaded in production mode. For Cloudflare builds, configure `VITE_DEMO_BACKEND_URL` and `VITE_DEMO_PASSWORD` alongside the existing public backend settings. A build must use the hosted URL and publishable key to connect to the hosted demo. A mismatched demo backend hides the popup.

These demo values are deliberately public and included in the frontend build. Only use the fictional demo accounts; privileged Supabase keys remain excluded. Automated tests supply their own disposable password to the popup and never use local or hosted demo credentials.

## Cloudflare Pages

Build with the hosted project's public settings and publish **only `dist`** to a Free Cloudflare Pages project. The deployment contains no admin scripts, environment files, test settings, or privileged keys. Use the supplied `pages.dev` address without buying a custom domain.

The owner can connect GitHub for automatic deployments, with build command `npm run build`, output directory `dist`, and the two public `VITE_` settings configured in Pages. Direct Upload is also supported for a prebuilt `dist` folder; it is a different Pages project mode and cannot later be switched to Git integration in place. See [Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/) and [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).

## Budget and restoration

Hosting must remain RM0 without a card. Free limits checked during planning include 500 Cloudflare Pages builds/month, a 500 MB Supabase database, and 50,000 monthly active users. Supabase may pause a Free project after one week of inactivity; restore it from the project dashboard before retrying login. If a quota is reached, reduce usage or wait for reset instead of upgrading. If terms cease to meet the no-card/zero-budget rule, migrate or operate locally.

Check current terms when deploying: [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/), [Supabase pricing](https://supabase.com/pricing), and [Supabase billing FAQ](https://supabase.com/docs/guides/platform/billing-faq). Automatic backups are not included in Supabase Free; retain migrations and demo setup scripts so fictional data can be recreated.

## Formatting and access

Use Prettier and CRLF line endings. `.gitattributes` sets text files to CRLF; `.prettierrc.json` configures supported source formatting. Package versions are pinned, and the npm lockfile is tracked.

Directory-visible fields live in `employee_records`, with maintained Departments and Manager references. Private start dates, status, and access assignments live in the unexposed `private.employee_access` table. Security-invoker views expose directory fields to active signed-in users and full employment records only to the owner or HR. A validated HR operation saves public and private fields in one transaction; browser callers cannot directly modify login links, roles, or activation status. The dedicated HR-only deactivation operation validates the session and handles leave allocations atomically. Session validation denies access after sign-out, and editable user metadata never determines the workspace role.

React pages and components keep their CSS alongside them. Shared base styles live in `src/styles`, and interfaces/types live in `src/types`. Preserve readable blank lines between logical sections.

The full specification is implemented locally on `codex/hr-dashboard-spec`. The hosted deployment remains Ticket 01 until the owner deploys all new migrations and the matching frontend build together. This implementation does not push Git commits or update hosted services. Earlier baseline evidence is retained in [Ticket 02 verification](docs/ticket-02-verification.md); full integration evidence is recorded in the specification verification documents.

The [specification](https://github.com/narniagplus961127/hr-dashboard/issues/1) and [ticket 01](https://github.com/narniagplus961127/hr-dashboard/issues/2) define scope and acceptance criteria.
