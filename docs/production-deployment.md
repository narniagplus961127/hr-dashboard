# Production deployment

Verified on 14 October 2026 (Asia/Kuala_Lumpur).

## Hosting

- Live app: https://hr-dashboard-demo.pages.dev
- Cloudflare deployment: 877ba3a2-f16c-452d-aa49-ceb015291ef9 (production branch main).
- Source: main commit 0a71f94, including the merged UI and public demo-login changes.
- Supabase: HR Dashboard, project reozvfhbgupxnwokjgtn, QW Org Free plan, Tokyo.
- Backend URL: https://reozvfhbgupxnwokjgtn.supabase.co
- Supabase Authentication Site URL: https://hr-dashboard-demo.pages.dev
- No paid services, payment details, custom domain, or new account were introduced.

Cloudflare is an existing **Direct Upload** Pages project with no Git connection. Pushing to GitHub does not publish changes. Publish a new production upload after each verified build. The prior deployment remains available in Cloudflare's deployment history.

## Database

The two existing baseline migration statements were compared with the tracked files and matched. Supabase's supported CLI migration repair aligned their timestamps with the repository. The 13 missing migrations were then applied using `db push --linked`, without seed or reset options. All 15 tracked migrations now match hosted history; a subsequent dry run reported no pending migrations.

All four existing auth identities and employment records were preserved. With the owner's specific approval, Maya Tan was assigned to Daniel Lee for the demo approval flow. No local fixture records were copied to hosted Supabase.

A pre-migration snapshot of the baseline migration statements and four fictional employee profiles is retained in gitignored `.local/production/before-migrations.json`. This snapshot is not a complete database backup.

## Frontend settings

Gitignored `.env.production.local` contains the hosted URL, modern publishable key, matching demo backend URL, and the existing hosted demo password. The production bundle was checked for those settings and for exclusion of the local demo password and local API URL. Development settings remain separate.

Only four compiled assets from `dist` were uploaded: index.html, favicon.svg, the stylesheet, and JavaScript. No environment files, setup scripts, database backups, privileged keys, or test artifacts were uploaded. The gitignored deployment archive is `.local/production/hr-dashboard-production.zip`.

The demo popup intentionally publishes the fictional demo emails and password. It is not suitable for private employee records. Real admin/service keys are not used in the frontend.

## Verification

- Formatting, TypeScript, five test-runner safety tests, and the production build passed.
- All 122 desktop/mobile browser and API tests passed against a disposable local backend; cleanup completed.
- Hosted sign-in, trusted role/profile, leave balances, overview, directory, calendar, and applicable approvals APIs passed for Maya, Daniel, Aisha, and Grace.
- Public signup remains disabled, and anonymous callers cannot read employee profiles.
- The live demo popup displayed the hosted credentials; browser login succeeded.
- The live browser workflow submitted Maya's labelled fictional request for 4 January 2027, reserved one day, routed it to Daniel, approved it, and displayed Maya as Away on the January calendar without a private reason or leave type.
- HR cancelled that verification request. Database checks confirmed zero reserved/used days and three retained audit entries; the live calendar no longer showed the absence.
- Refreshing a workspace URL worked through Cloudflare's SPA fallback.

The cancelled request remains in history with the reason **Production setup verification — fictional demo request**. No approved verification absence or allocation remains.

## Security advisor notes

The advisor returned two informational notices for private leave-allocation and entitlement tables having RLS without policies. These tables deliberately have no direct anon/authenticated grants; access is through validated application functions. [RLS advisor notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

The remaining warning is leaked-password protection, which Supabase makes available on Pro and above. It was not enabled because the owner requires a Free plan without a card. Public signup is disabled and the only published credentials are the fictional demo accounts. [Supabase password-security documentation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Future updates

1. Update main and run `npm run check` and `npm test` locally; GitHub Actions only runs the Supabase keep-alive, not application tests.
2. Preview pending hosted migrations with `npm run supabase -- db push --linked --dry-run`, then apply any reviewed new migrations with `npm run supabase -- db push --linked`.
3. Confirm the four hosted `VITE_` settings in `.env.production.local` and run `npm run build`.
4. Upload only the contents of dist through Cloudflare's Create deployment → Production flow.
5. Verify the live demo popup, login, refresh, and affected workflows. Do not reset hosted data or upload environment files.

If Supabase's Free project pauses from inactivity, restore it in the dashboard before retrying the live app. The frontend remains hosted independently. Use the existing free subdomain and do not upgrade if a free quota is reached.

## Inactivity checks

On 21 October 2026, migration `20261021073004_keep_alive.sql` added a constant `SELECT 1` health function. All 16 hosted migrations match the repository. The external GitHub Actions schedule runs at 08:00 and 20:00 Asia/Kuala_Lumpur. The initial [workflow run](https://github.com/narniagplus961127/hr-dashboard/actions/runs/39562557435) passed, and the live HTTP endpoint returned `200` with `1`. An anonymous, read-only `EXPLAIN ANALYZE` measured 0.143 ms execution with no table access. Security advisor findings remain the existing notices described above. No frontend deployment is needed.

See [Supabase keep-alive](supabase-keep-alive.md) for operation, failure checks, and the 60-day GitHub repository inactivity limit. This does not guarantee that Supabase Free will never pause.
