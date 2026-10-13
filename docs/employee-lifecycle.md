# Employee lifecycle contracts

Ticket 09 adds the HR-only `deactivate_employee(p_employee_id uuid)` transaction and a confirmation in Employee directory details. The record, login identity, and Leave history remain stored. No browser API deletes an Employee or reactivates one.

The public SECURITY INVOKER RPC delegates to a private SECURITY DEFINER function with an empty search path and explicit execution grants. It derives the HR actor from the current authenticated session and trusted active access record, rechecking after locks. It rejects missing or already inactive targets without adding another history event or releasing days again.

The transaction obtains the reporting graph advisory lock before Employee access locks, locks actor and target UUIDs in sorted order, then affected requests by UUID, and matching entitlement keys by year/type. It cancels every pending request and approved requests starting today or later, using the Kuala Lumpur company date. The internal cancellation helper releases the exact persisted allocation and records the HR actor with reason `Employee deactivated by HR.`. Access changes and every cancellation commit together. A racing submission either fails for inactive access or commits first and is included in cancellation.

Owner-confirmed policy: approved leave with a start date before today stays unchanged, including partly elapsed leave ending in the future. Historical usage and allocations are retained. Holidays are not recalculated during cancellation.

Manager changes continue through `save_employee`. Approval queues and mutation eligibility derive the current reporting relationship, with the same owner access lock preventing a waiting old Manager from acting after reassignment. Missing or inactive eligible Managers route Employee requests to HR. Job level is independent of access role.

Protected APIs use current active access rather than editable account metadata or stale JWT role claims. An existing token cannot read protected records or submit after deactivation. The frontend revalidates the profile on navigation, window focus, visibility restoration, auth events, and explicit record refresh. An unavailable profile clears cached protected content and local authentication, returning to login.

## Verification

Tests use the real isolated local backend with disposable Employee and Manager login fixtures, leaving the four permanent demo accounts active. Public API checks cover role/anonymous denial, replay and concurrent deactivation, released balances, preserved historical/partly elapsed approvals, actor-attributed history, existing JWT denial, reassignment and missing-Manager fallback, and submission racing deactivation. Desktop and mobile browser workflows verify HR deactivation, persisted inactive status, an existing Employee screen clearing on navigation, HR Manager editing, and old/new approval queues.
