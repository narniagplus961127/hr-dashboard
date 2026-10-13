# HR Dashboard

A single-company HR learning app with fictional employees. Ticket 01 implements sign-in, own profiles, role navigation, and sign-out. Ticket 02 adds the Employee directory, private employment details, and HR management of employee records, Departments, and Manager assignments. Leave, approvals, calendar, and deactivation belong to later tickets.

React, TypeScript, and Vite provide the frontend. Supabase provides authentication and PostgreSQL. Cloudflare Pages hosts the static build.

Ticket 01 is deployed at [HR Dashboard](https://hr-dashboard-demo.pages.dev). All four accounts listed below can sign in; the owner-approved local `.env.demo.local` contains their shared hosted demo password and remains gitignored. The temporary setup-key file was deleted after provisioning.

## Requirements

- Node.js 24 or newer and npm.
- Docker Desktop running Linux containers for the isolated local Supabase test backend.
- Free Supabase and Cloudflare accounts for deployment. Do not enter payment details or enable paid services.

## Local development and tests

```powershell
npm ci
npm run backend:start
npm run test:setup
```

`test:setup` uses the local Supabase CLI to obtain loopback settings, creates four fictional accounts, and writes `.env.test.local`. It refuses a hosted backend. The file is gitignored and contains the randomly generated local test password; the server-side key is not written to it or printed. Re-running setup retains that password and does not reset existing accounts.

Copy the local API URL and publishable key from `.env.test.local` into `.env.local` using the variable names in `.env.example`, then run:

```powershell
npm run dev
npm run typecheck
npm test
npm run format:check
npm run build
```

The frontend uses port 5173. Tests start their own frontend on 5174 and use the local real backend; they never use the hosted project. Desktop and mobile browser workflows cover login, directory search and details, HR record creation/editing, Department maintenance, useful validation, and sign-out. Direct API checks verify private-field isolation, denied non-HR writes, trusted access assignments, atomic validation, and session revocation.

The test suite uses the installed Google Chrome browser. It does not download another browser. If Chrome is unavailable, install Chrome or adjust the Playwright browser configuration for an available installation.

To apply new local migrations or stop only this project's containers without deleting their data:

```powershell
npm run supabase -- migration up --local
npm run supabase -- stop --project-id hr-dashboard-test
```

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

HR-created records do not create login accounts. Their login identity stays unlinked until trusted provisioning links it; changing a work email in the HR form does not change the sign-in email. HR can edit employment information, but role assignment, login provisioning, and password changes remain privileged setup tasks. Employment status is visible to the owner and HR; the deactivation action is deferred to Ticket 09.

| Employee     | Work email             | Workspace role   |
| ------------ | ---------------------- | ---------------- |
| Maya Tan     | maya@hr.example.test   | Employee         |
| Daniel Lee   | daniel@hr.example.test | Manager          |
| Aisha Rahman | aisha@hr.example.test  | HR Administrator |
| Grace Lim    | grace@hr.example.test  | HR Administrator |

Treat these as demonstration accounts, not real employment records. Keep hosted credentials private; do not embed a demo password in the published website. If a local demo-password file is retained for the owner, it must remain gitignored.

## Cloudflare Pages

Build with the hosted project's public settings and publish **only `dist`** to a Free Cloudflare Pages project. The deployment contains no admin scripts, environment files, test settings, or privileged keys. Use the supplied `pages.dev` address without buying a custom domain.

The owner can connect GitHub for automatic deployments, with build command `npm run build`, output directory `dist`, and the two public `VITE_` settings configured in Pages. Direct Upload is also supported for a prebuilt `dist` folder; it is a different Pages project mode and cannot later be switched to Git integration in place. See [Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/) and [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).

## Budget and restoration

Hosting must remain RM0 without a card. Free limits checked during planning include 500 Cloudflare Pages builds/month, a 500 MB Supabase database, and 50,000 monthly active users. Supabase may pause a Free project after one week of inactivity; restore it from the project dashboard before retrying login. If a quota is reached, reduce usage or wait for reset instead of upgrading. If terms cease to meet the no-card/zero-budget rule, migrate or operate locally.

Check current terms when deploying: [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/), [Supabase pricing](https://supabase.com/pricing), and [Supabase billing FAQ](https://supabase.com/docs/guides/platform/billing-faq). Automatic backups are not included in Supabase Free; retain migrations and demo setup scripts so fictional data can be recreated.

## Formatting and access

Use Prettier and CRLF line endings. `.gitattributes` sets text files to CRLF; `.prettierrc.json` configures supported source formatting. Package versions are pinned, and the npm lockfile is tracked.

Directory-visible fields live in `employee_records`, with maintained Departments and Manager references. Private start dates, status, and access assignments live in the unexposed `private.employee_access` table. Security-invoker views expose directory fields to active signed-in users and full employment records only to the owner or HR. A validated HR operation saves public and private fields in one transaction; browser callers cannot modify login links, roles, or activation status. Session validation denies access after sign-out, and editable user metadata never determines the workspace role.

React pages and components keep their CSS alongside them. Shared base styles live in `src/styles`, and interfaces/types live in `src/types`. Preserve readable blank lines between logical sections.

Ticket 02 is implemented and verified locally. The hosted deployment remains Ticket 01 until the new migration and frontend build are deployed together. See [Ticket 02 verification](docs/ticket-02-verification.md).

The [specification](https://github.com/narniagplus961127/hr-dashboard/issues/1) and [ticket 01](https://github.com/narniagplus961127/hr-dashboard/issues/2) define scope and acceptance criteria.
