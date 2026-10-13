# Full specification review fixes

User-confirmed review base: `a77e18b`. The first review covered integration commit `b17dfc5` and reported two Standards findings and four Spec findings. All six were handled together on `codex/hr-spec-review-fixes`.

## Standards

- Moved approval action/routing styles into `src/components/ApprovalRequestCard.css`, imported by the owning component.
- Extracted the duplicated attributed history rendering into `LeaveHistoryList`, with adjacent CSS and props in `src/types/leave.ts`. Filtering, action labels, actor names, Kuala Lumpur timestamps, and reasons now share one implementation. Page-specific heading levels remain unchanged.

## Spec

- HR navigation stays on one horizontally scrollable row on mobile. All 11 links remain available, keyboard focusable, and readable. Browser verification checks compact height, no page overflow, and navigation to every new route.
- Added deterministic public API coverage immediately before and after Kuala Lumpur midnight (`2027-01-04T15:59:59Z` and `2027-01-04T16:00:00Z`). January 4 leave is accepted before midnight and rejected afterward. Deactivation cancels an approval starting January 4 before midnight, but preserves its entire three-day allocation after it has started. Balances and attributed history are asserted through public APIs.
- Breadcrumbs now identify the shared calendar, own leave, approvals, holidays, and entitlements, alongside existing routes.
- README describes the full local workflows, access scopes, test setup, deactivation policy, and the existing Ticket 01 hosted deployment. Git push and deployment remain manual.

## Internal company-date seam

Migration `20261013111020_company_calendar_clock.sql` adds `private.company_today()` and updates the existing submission and deactivation functions to use it. Production behavior remains the transaction's actual time converted to `Asia/Kuala_Lumpur`. The helper is security invoker with an empty search path, in the unexposed private schema, and execution revoked from PUBLIC, anonymous and authenticated users. There is no public clock argument, endpoint, configuration table, or authorization override.

The trusted isolated fixture temporarily replaces only that helper's implementation with a fixed instant, then restores the real implementation in `finally`. Authentication and session validation continue using real time. Every test uses a separate disposable Employee, and all assertions use the real public API. The new test first failed on request validation; after that was connected to the seam, it failed on deactivation. Both passed after the two operations used the shared company date. Previously applied migrations remain unchanged. The CLI-generated follow-up migration normalizes the helper definition and preserves its privileges.

## Verification

- 22 targeted desktop/mobile cases passed: midnight boundaries, lifecycle API permissions and races, request submission, approval/history, shared calendar cancellation, and overview updates.
- Two additional desktop/mobile navigation cases passed, covering accurate breadcrumbs, all HR links, compact mobile navigation, and screenshots.
- Typecheck, production build, Prettier checks and `git diff --check` passed. No new dependency was added.
- Supabase security advisors reported no issues. A fresh shadow database successfully applied every migration including the company-date seam; schema pull generated only the helper normalization. Local migration history includes both new migrations.
- Reviewed the edited React components for hook usage, types, accessibility, and unnecessary abstraction. The history component is a pure renderer; headings remain at the callers, links keep their native semantics, and no data-fetching or authorization behavior changed.

Supabase documentation checked: [database functions](https://supabase.com/docs/guides/database/functions) and [changelog](https://supabase.com/changelog). Current function guidance favors security invoker, an explicit search path for privileged functions, and explicit execution privileges; the internal date helper follows it. The relevant PostgreSQL and Data API changelog entries do not change these date expressions or the repository's existing explicit grants.

Final integration-wide suite and independent re-review results are appended by the integration agent after merging.
