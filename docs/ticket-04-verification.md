# Ticket 04 verification

GitHub issue: #5, Leave entitlements and balances.

Implemented `/my-leave` for each owner and `/entitlements` for HR. Annual and Sick default to 14 whole days per calendar year; HR can persist individual overrides. Balances display allowance, approved usage, pending reservations, and available days. There is no accrual, prorating, or carry-over.

Authorization uses the trusted Employee access record and active session. Managers receive only their own entitlements. Private ledger tables are inaccessible from the browser; public SECURITY INVOKER RPCs delegate to narrow authorized private functions. The shared transaction lock and accounting contract for later request tickets are documented in [leave-accounting.md](leave-accounting.md).

Verified against the isolated `hr-dashboard-entitlements-test` backend, with root/local and hosted backends untouched:

- Red → green API cycle: missing balance RPC failed, then owner received separate 14-day Annual and Sick balances.
- Red → green browser cycle: missing entitlement page failed, then HR saved an allowance, reloaded, and the owner saw the persistent change.
- Eight entitlement tests passed across desktop and mobile, including direct API denial, revoked sessions, year/type separation, invalid values, and a seven-day floor from four used plus three reserved days.
- All 27 existing and new desktop tests passed before integration merge.
- Entitlement tests passed again after merging the holiday/calendar feature.
- Clean local database reset successfully applied the new migration, followed by account provisioning and entitlement verification.
- Typecheck, production build, and Prettier passed. Supabase local security advisors reported no issues.

Temporary worktree-specific ports and project ID are excluded from commits. This implementation does not push to GitHub, modify hosted resources, or close issues.
