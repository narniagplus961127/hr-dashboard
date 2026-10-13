# Leave approval contracts

Ticket 06 adds `/approvals`, visible to Managers and HR Administrators. Existing owner-only `leave_requests` and `leave_history` views stay unchanged. Privileged approval details are returned by separate scoped RPCs, never by granting company-wide reads to Employees.

`get_approval_requests()` returns an array of request fields plus `full_name` and `can_decide`. Managers receive current eligible direct reports; HR can oversee company requests, including their own, but oversight does not grant an override for an Employee assigned an eligible Manager. `can_decide` is true only for pending requests the current actor may decide.

`get_approval_history(p_request_id uuid default null)` returns attributed history for those same visible requests. Omitting the ID returns all permitted history; an explicitly requested inaccessible history is denied. Records include the current `actor_name` and persisted actor Employee ID, action, reason, and timestamp.

`decide_leave_request(p_request_id uuid, p_decision text, p_reason text default '')` returns the decided request UUID. Decisions are exactly `approved` and `rejected`. Rejection requires a trimmed nonempty reason, limited to 1000 characters. Invalid, unauthorized, and repeated transitions return an error without writing any partial state. Caller-supplied actor identity, owner, charged days, and status edits are not accepted.

## Current routing

- An Employee assigned a current active Manager with a login account is decided by that Manager.
- Employees without an eligible assigned Manager, including an inactive assigned Manager, are routed to HR.
- Managers' requests are routed to HR regardless of their own reporting Manager.
- HR Administrators' requests require another HR Administrator.
- Nobody can approve or reject their own request, including HR. Employees cannot gain authority by editing account metadata. Job seniority is unrelated to access roles.

The narrow private `can_decide_leave(owner_employee_id uuid)` derives the actor from `auth.uid()`, checks trusted active access and session validity, and evaluates the owner's current role and Manager relationship. It is not directly executable by browser roles. HR oversight reads include inactive Employees' historical requests; an inactive owner has no eligible pending decision.

## Atomic transition and shared locks

Private authorized transition functions have an empty search path and explicit execution grants, and public SECURITY INVOKER wrappers call them. Approval reads and writes derive permissions from current database records, not stale client routing or editable JWT metadata.

A decision first finds the immutable owner identity, locks that owner's `private.employee_access` row, then locks and re-reads the request. It rechecks current eligibility after those locks. The matching Employee/year/type entitlement row is then locked using `private.lock_leave_entitlement`. This preserves the access → request → entitlement order used by submission and expected by cancellation/deactivation.

The request must still be pending and its ledger must contain exactly its recorded charged days as a reservation with zero approved usage. Approval moves those days to usage; available balance does not decrease again. Rejection sets both amounts to zero and releases the reservation. Status, accounting, actor-attributed history, and all locks belong to one transaction. A competing decision or replay cannot add another transition or change the balance twice. Charge is the persisted submission count; changing holidays does not recalculate it.

Later cancellation/deactivation should use the same owner/access locks and request-state guards, preserve history, and transition the matching ledger in the same transaction. `save_employee` already holds the owner access row when changing a Manager, so decisions cannot approve against a reassignment that committed while they were waiting. Multi-request operations use stable request and entitlement ordering; they must not acquire Employee access after request/entitlement locks.
