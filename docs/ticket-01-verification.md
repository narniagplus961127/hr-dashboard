# Ticket 01 verification

## Scope and review

- Ticket: [01: Demo login and first hosted screen](https://github.com/narniagplus961127/hr-dashboard/issues/2).
- User-approved review base: `38326c5` (update tickets).
- Implementation commit reviewed: `49ed022`.
- Confirmed testing boundaries: complete browser workflows against a real isolated backend, plus direct API permission checks.

## Standards

No actionable findings. The review found no documented-standard violations or substantive code smells at this scope. Source follows the agreed React/TypeScript/Vite and managed Supabase architecture, trusted setup tooling, own-profile access, glossary vocabulary, pinned dependencies, and zero-budget instructions.

## Spec

No actionable source findings. Profile access is enforced through RLS and explicit grants; protected role data does not come from editable auth metadata. Session validation denies access from a copied token after sign-out. The implementation stays within ticket 01 and does not implement the later directory, leave, approval, or calendar tickets.

The hosted first-screen acceptance is complete: all four demo accounts are provisioned, the frontend is deployed, and hosted browser checks passed.

## Verification performed on 2026-10-13

- Red/green browser cycles for Employee login/own profile, sign-out across reload, and Manager navigation.
- Full suite: 20 passing cases across desktop/mobile browser workflows and direct API access checks.
- TypeScript typecheck, production build, and Prettier check passed.
- Password-reset script manually verified through local public auth APIs: changed-password login succeeds, old password fails, and prior-session access is revoked. The fixture password was restored.
- Local Supabase uses project ID `hr-dashboard-test`; test setup refuses a non-loopback URL and does not use the hosted database.
- Hosted profile and automatic-RLS-helper security migrations applied to the owner-selected HR Dashboard project. Security advisor returned no lints afterward.
- Hosted public signup disabled while email/password sign-in remains enabled.
- Pages deployment package built with only the hosted project URL and publishable key. Package contains only static build assets; no privileged key was found in the build.
- Local preview inspected visually and restored to the isolated local backend.

## Hosted acceptance completed

- All four fictional demo accounts were seeded after the owner explicitly authorized temporary setup-key storage and retained local demo-password storage. The temporary `.env.admin.local` was deleted immediately afterward; `.env.demo.local` remains gitignored for the owner's test logins.
- Hosted API checks verified password login, exactly one own profile with the expected role, and denial of copied access tokens after sign-out for all four accounts.
- Cloudflare Pages Direct Upload deployed only the three compiled static assets to [HR Dashboard](https://hr-dashboard-demo.pages.dev), without payment details or a paid service.
- Hosted browser checks verified Employee profile loading, sign-out across reload, Manager navigation, and both HR Administrator accounts' navigation and sign-out.
- Hosted profile screenshot: local, ignored `test-results/hosted-profile.png`.
- Source was committed locally; no Git push or issue closure has been performed.
