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

The hosted first-screen acceptance remains open until account seeding, deployment, and hosted browser checks are complete.

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

## Outstanding hosted acceptance

- Hosted demo accounts are not yet seeded. Automatic approval review rejected local storage of the hosted setup key and generated password without explicit authorization; the user's credential-storage decision remains pending.
- Cloudflare Pages upload setup is prepared, but the frontend has not yet been published or verified against hosted demo accounts.
- Source was committed locally; no Git push or issue closure has been performed.
