# Workspace overview

`/overview` calls `get_workspace_overview()` without parameters. The database derives access from the active authenticated session, persisted role, and current reporting relationship. Caller-selected roles or scopes are not accepted.

The response contains active company headcount and leave request counts across all years. Headcount includes active Employee records, including Managers, HR Administrators, and records awaiting login provisioning. It does not count inactive records.

Each summary contains `scope`, `total_requests`, `pending`, `approved`, `rejected`, and `cancelled`. No employee identifiers, leave types, reasons, dates, or private employment fields appear in the response.

- `own`: the caller's requests, available to every active role.
- `direct_reports`: available to Managers; follows the same current active Employee/direct-report eligibility as approval access. Their own requests remain separately labelled.
- `company`: available to HR Administrators; includes retained requests from inactive Employees for company oversight. Their own requests also remain separately labelled.

Submission, approval, rejection, cancellation, reporting changes, and deactivation are reflected when the page is opened or refreshed because summaries read the persisted records and current statuses. There is no separate summary table or fabricated dashboard data. The page discards previous counts while refreshing and on API failure.
