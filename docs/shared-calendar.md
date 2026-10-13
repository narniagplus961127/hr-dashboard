# Shared calendar contract

`get_calendar_absences()` is a parameterless authenticated RPC returning exactly `employee_id`, `full_name`, `start_date`, and `end_date` for approved Leave requests. All active company users share this projection. It deliberately omits request IDs, leave types, reasons, accounting, status, history, and private employment fields. Caller-supplied scope arguments are not supported.

The public function is SECURITY INVOKER. Its narrow private SECURITY DEFINER implementation checks `auth.uid()` and `private.current_workspace_role()` against trusted current employment and a valid session before reading approved requests. Both functions revoke default execution; only authenticated callers have explicit grants. Existing owner-only request/history RLS and views stay unchanged.

The calendar fetches holidays and this projection concurrently. Each approved date range displays the Employee as Away on its inclusive date-only range, including intervening weekends and Public holidays. These are absence dates, not charged working days; persisted accounting excludes non-working days independently. No timezone conversion shifts the stored dates. The initial month uses the existing Asia/Kuala_Lumpur company date.

Navigating to the page, reloading, or choosing Refresh calendar fetches current persisted state. Cancellation immediately excludes the request from subsequent responses while retaining its history. A failed refresh hides the previous grid, with an explicit retry, instead of displaying stale events as current.
