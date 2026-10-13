# Leave balance accounting

Ticket 04 provides owner and HR balance reads and HR allowance edits. Annual and Sick each default to 14 whole days per calendar year, independently for each Employee. An absent entitlement row means the demo default; an explicit HR edit persists an override. Supported years are 2000–2100 and allowances are whole days from 0–366. There is no accrual, prorating, or carry-over.

`get_leave_balances(p_year integer, p_employee_id uuid default null)` returns Employee identity/name, year/type, allowance, approved usage (`used_days`), pending reservations (`reserved_days`), and `available_days = allowance - used_days - reserved_days`. Employees and Managers only read their own balances; HR can read all Employees or select one. Anonymous, inactive, and signed-out sessions are rejected. Manager reporting assignments do not grant entitlement access.

`save_leave_entitlement(p_employee_id uuid, p_year integer, p_type text, p_allowance integer)` is an HR-only public RPC. It locks the entitlement and rejects reductions below the sum of approved usage and pending reservations. Direct browser access to the private tables is denied.

## Internal transaction seam for subsequent leave tickets

`private.leave_entitlements` has primary key `(employee_id uuid, leave_year integer, leave_type text)` and integer `allowance`. `leave_type` is exactly `Annual` or `Sick`.

`private.lock_leave_entitlement(employee_id uuid, year integer, type text)` returns the allowance, inserts the default 14-day row if absent, then holds that row `FOR UPDATE` until the transaction ends. It is an internal SECURITY INVOKER helper with execution revoked from PUBLIC, anonymous, and authenticated roles. Authorized private SECURITY DEFINER request/decision functions can call it as their trusted owner.

Every reservation, approval, rejection, cancellation, and entitlement edit must use this lock before reading or changing allocation totals. Each request must start and end within one calendar year; cross-year requests are rejected. Operations touching multiple allocations, such as Employee deactivation, acquire keys in a consistent Employee/year/type order. This shared lock serializes allowance edits against request transitions and prevents concurrent overspending.

`private.leave_allocations` is the accounting ledger:

| Column                  | Meaning                                                  |
| ----------------------- | -------------------------------------------------------- |
| `request_id uuid`       | Leave request identity, supplied by the request workflow |
| `employee_id uuid`      | Owner of the request                                     |
| `leave_year integer`    | Calendar year charged                                    |
| `leave_type text`       | Annual or Sick                                           |
| `reserved_days integer` | Pending working days, initially zero                     |
| `used_days integer`     | Approved working days, initially zero                    |

The primary key is `(request_id, leave_year)`. Each row references its entitlement key; values must be nonnegative and at most one of reserved/used may be nonzero. Each supported request has one allocation row for its single calendar year. No request records or allocations are created by Ticket 04; usage and reservations correctly remain zero until later workflows write them.

Pending creation inserts reservations. Approval atomically moves reserved days into used days. Rejection or cancellation releases its allocation. Request status/history and allocation transitions must occur in the same transaction, with current-status checks preventing double release or duplicate approval. Later tickets should add a request foreign key when the request table exists. This ledger never grants users permission to mutate allocations directly.

## Verification

Browser tests exercise HR saving an allowance, reloading, and the owner observing the persisted balance, including year/type separation. Direct API tests verify owner-only reads, HR edits, invalid input rejection, revoked-session denial, and combined used/reserved floors. Trusted SQL provisioning creates isolated historical allocation fixtures; every behavioral assertion uses the public API. Fixture allocations are removed after each test.
