# Full specification implementation

Integration branch: `codex/hr-dashboard-spec`.

Starting point and user-confirmed final review base: `a77e18b`.

Tickets 01–10 are implemented and verified. The approved blocking graph is in `docs/tickets.md`; the full specification is issue #1. Final verification and interruption recovery are recorded in `docs/spec-verification.md`.

Keep the existing browser-to-real-isolated-backend and direct API testing boundaries. Preserve CRLF, Prettier, readable spacing, component CSS placement, and `src/types`. Preserve React Router and the confirmed job-level order. Keep HR access linked to the profile access section as the owner requested; add new functional menu items for new pages.

Owner-confirmed deactivation policy: keep approved leave that has already started unchanged, even if its end date is in the future. Cancel pending requests and approved requests whose start date is today or later, using the company-local Kuala Lumpur date. Preserve history and release cancelled allocations once.

Implementers work in separate Git worktrees and branches based on the integration tip, and merge the latest integration tip before reporting completion. Use separate local Supabase project IDs and ports to avoid conflicting databases. `HR_TEST_FRONTEND_PORT` selects each worktree's browser-test frontend port. Worktree-specific runtime config and environment files must not enter feature commits.

All services stay local/free with no payment method. Hosted deployments and Git pushes are not performed automatically; implementation issues are resolved when integration verification confirms acceptance.
