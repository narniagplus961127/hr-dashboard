# Leave cancellation contracts

Ticket 07 adds `cancel_leave_request(p_request_id uuid, p_reason text default '')`. Every active owner, including a Manager or HR Administrator, may cancel their own pending request. Only HR may cancel approved requests, including their own approved leave. HR oversight does not permit manual cancellation of another person's pending request. Reasons are optional, trimmed, and limited to 1000 characters.

The public SECURITY INVOKER RPC delegates to an authorized private SECURITY DEFINER implementation with an empty search path and explicit grants. Identity and current access are derived from the session and trusted Employee access record. Unknown/inaccessible requests and unauthorized actions are denied. Rejected/cancelled requests cannot transition again. Direct editing of pending request dates is still denied; cancel and submit a replacement through the established validation flow.

The transaction follows the shared owner access → request → entitlement lock order. It rechecks access/state after locks, releases the recorded reservation or approved usage, updates status, and appends one actor-attributed cancellation history event atomically. It preserves request dates, charged days, original reason, prior history, and a zeroed ledger row. Holidays are not recalculated during release. Replays and concurrent actions cannot release days twice or append duplicate history.

## Internal seam for deactivation

`private.cancel_leave_allocation(p_request_id uuid, p_actor_id uuid, p_reason text)` is SECURITY INVOKER and has all browser-role execution revoked. It is callable only from a trusted authorized private function. Its caller must first lock the request owner's access row and establish its own permission/policy. The helper locks/rechecks the request, locks the matching entitlement, validates the exact stored allocation, and writes cancellation/history. It intentionally supports pending or approved requests for the later atomic deactivation workflow; it does not grant that capability to browser callers.

Batch deactivation must lock target access first, then all affected requests in stable ID order, then entitlement keys in ascending Employee/year/type order before invoking the helper. Retain all locks and access-flag changes in one transaction. The helper's later locks are reentrant within that transaction. Pass the authenticated HR actor ID; never impersonate the deactivated owner.

`get_approval_requests()` now includes a `can_cancel` capability for approved requests visible to HR. It is false for Managers and non-approved requests. The backend mutation independently checks authority; this response only selects the appropriate UI control. My leave offers pending cancellation to all owners and approved cancellation to HR owners; company approvals offers approved cancellation to HR.

## Verification

Real browser tests cover pending cancellation, persisted history after reload, valid changed resubmission, HR oversight cancellation, and released balances on desktop and mobile. Direct API tests cover unauthorized and revoked sessions, direct-edit denial, reason bounds, HR's own approved leave, repeated/concurrent cancellations, and approval racing owner cancellation. All behavior is asserted through public APIs; SQL is used only for disposable fixture provisioning/cleanup.
