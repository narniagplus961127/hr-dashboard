# Ticket 05: Submit and track Leave requests

Source: [GitHub issue #6](https://github.com/narniagplus961127/hr-dashboard/issues/6).

My leave now combines annual balances, a full-day request form, pending request cards, charged days, and attributed history. Annual and Sick requests use the company-local Kuala Lumpur date. Backend validation enforces date ordering, supported year, same-year requests, nonzero working days, overlap prevention, and available allowance. Request creation, history, and reservation are one transaction. Cancellation and approval are separate tickets.

The agreed test seams remain complete browser workflows against an isolated real Supabase backend and direct API checks. The browser tracer failed against the pre-submission My leave page at its missing request form, then passed with a persisted five-working-day Annual request, Pending status, submission attributed to Maya, and available balance reduced from 14 to 9. The API validation slice initially failed with a generic table constraint error; explicit actionable validation made it pass.

Direct API tests cover a Monday–Sunday request containing a maintained Tuesday holiday (four charged days), reversed/past/cross-year dates, weekends and holiday-only ranges, invalid types/reasons, overlap across types, insufficient balance, owner-only reads, forbidden direct mutations, anonymous and signed-out sessions, Kuala Lumpur today/yesterday, concurrent overspend, and concurrent Annual/Sick overlaps. Two simultaneous requests against one available day permit exactly one success. Two simultaneous different-type requests for the same date also permit exactly one success. Approved overlaps remain forbidden.

Updated entitlement fixtures create real request records before ledger allocations, maintaining the request foreign key. Shared trusted provisioning lives in `tests/helpers.ts`; behavioral assertions remain at public interfaces.

The complete isolated worktree suite passed 68 tests across desktop and mobile after a fresh database reset installed the migrations. Typecheck, production build, and Prettier checks passed. Local security advisors found no issues.

See [Leave request contracts](leave-requests.md) for schema, API, privacy, and lock ordering required by approval, cancellation, and deactivation implementations. Runtime ports and configuration remain local to the disposable test backend and do not enter the feature commit.
