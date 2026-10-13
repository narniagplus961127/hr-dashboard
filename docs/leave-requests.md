# Leave request transaction contracts

Ticket 05 adds owner-derived submission and owner-only request/history reads. `submit_leave_request(p_type text, p_start_date date, p_end_date date, p_reason text default '')` returns the new request UUID. Types are `Annual` and `Sick`; the optional reason is limited to 1000 characters. An active session determines the owner; no Employee ID, status, approver, or charged-day argument is accepted from the browser.

The public RPC is SECURITY INVOKER and delegates to a narrowly authorized private SECURITY DEFINER function with an empty search path. Default execution grants are revoked. Public `leave_requests` and `leave_history` are security-invoker views over private RLS tables. Only the owner reads their private details through these views; later approval APIs can separately return the details an eligible decision maker needs. Direct creation, editing, and deletion are denied.

## Persisted request and history

`private.leave_requests` has UUID `id`, `employee_id`, `leave_type`, date-only `start_date`/`end_date`, integer `charged_days`, `status`, optional `reason`, and `created_at`. States are exactly `pending`, `approved`, `rejected`, and `cancelled`. Creation records `pending`. Its `(id, employee_id, leave_type)` unique key is referenced by the accounting ledger, so an allocation cannot belong to a different owner or type.

`private.leave_history` has UUID `id`, `request_id`, `actor_employee_id`, `action`, optional `reason`, and `created_at`. Actions are exactly `submitted`, `approved`, `rejected`, and `cancelled`. The public owner view adds the actor's current `actor_name`; actor identity remains its persisted Employee ID. Historical request deletion is not a browser capability. Cascading foreign keys support disposable test fixture cleanup only.

Submission records the request, a single reservation in `private.leave_allocations`, and one attributed `submitted` history event in the same transaction. Dates must be today or later according to `(now() at time zone 'Asia/Kuala_Lumpur')::date`, ordered, and within one supported calendar year (2000–2100). Charged days are Monday–Friday excluding maintained `company_holidays.holiday_date` entries. Zero-working-day requests, overlaps with pending or approved requests of either leave type, and insufficient available balances are rejected. Invalid submissions leave no partial request, history, or reservation.

Charged days are persisted at submission. Changing company holidays later does not recalculate an existing request's allocation. Subsequent lifecycle actions transfer or release its recorded allocation exactly once rather than rerunning working-day calculation.

## Lock order for every lifecycle operation

1. Lock the target owner's `private.employee_access` row `FOR UPDATE` first. For submission, derive it from `auth.uid()` and revalidate active status after acquiring it. For decision/cancellation/deactivation, look up the immutable request owner before locking, then revalidate eligibility and the current owner/status after locking.
2. For an existing request, lock its `private.leave_requests` row `FOR UPDATE`. A new submission has no request row yet.
3. Lock the matching entitlement key with `private.lock_leave_entitlement(employee_id, year, type)`. If an operation touches multiple keys, use ascending Employee/year/type order, and process existing requests in a deterministic order.
4. Read allocation totals and perform request status, allocation, and history changes in one transaction, retaining all locks until commit.

Every request lifecycle operation shares the owner lock, including deactivation and submissions of different leave types. This serializes overlap checks across Annual and Sick requests and avoids access-row/request-row deadlocks. Standalone HR allowance edits lock only the entitlement key and do not acquire request rows; they never reverse this order. Check current request state after locking to prevent repeated release or duplicate decisions.

## Test provisioning

`tests/helpers.ts` exports `provisionFixture(sql)` for trusted fixture setup/cleanup only. It requires an isolated HR test project name, executes local PostgreSQL provisioning, and never supplies browser credentials. All behavior is asserted through browser workflows or public APIs. Fixture allocations must first create a real request with matching owner/type to satisfy the composite foreign key.
