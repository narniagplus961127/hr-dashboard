# Published HR Dashboard Tickets

Published on 2026-10-13 using the approved breakdown. All issues carry `ready-for-agent`. Native GitHub blocking relationships were verified against the approved edges. Code must use CRLF and Prettier.

[Implementation specification: #1](https://github.com/narniagplus961127/hr-dashboard/issues/1)

| Ticket                                          | GitHub issue                                                       | Blocked by | Status   |
| ----------------------------------------------- | ------------------------------------------------------------------ | ---------- | -------- |
| 01: Demo login and first hosted screen          | [#2](https://github.com/narniagplus961127/hr-dashboard/issues/2)   | None       | Complete |
| 02: Employee directory and HR record management | [#3](https://github.com/narniagplus961127/hr-dashboard/issues/3)   | #2         | Complete |
| 03: Public holidays and calendar                | [#4](https://github.com/narniagplus961127/hr-dashboard/issues/4)   | #2         | Complete |
| 04: Leave entitlements and balances             | [#5](https://github.com/narniagplus961127/hr-dashboard/issues/5)   | #2         | Complete |
| 05: Submit and track Leave requests             | [#6](https://github.com/narniagplus961127/hr-dashboard/issues/6)   | #4, #5     | Complete |
| 06: Approve or reject leave                     | [#7](https://github.com/narniagplus961127/hr-dashboard/issues/7)   | #3, #6     | Complete |
| 07: Cancel leave and release days               | [#8](https://github.com/narniagplus961127/hr-dashboard/issues/8)   | #7         | Complete |
| 08: Approved absences on the Shared calendar    | [#9](https://github.com/narniagplus961127/hr-dashboard/issues/9)   | #8         | Complete |
| 09: Manager changes and Employee deactivation   | [#10](https://github.com/narniagplus961127/hr-dashboard/issues/10) | #8         | Complete |
| 10: HR overview and leave summaries             | [#11](https://github.com/narniagplus961127/hr-dashboard/issues/11) | #7         | Complete |

All tickets and specification issue #1 are closed as completed. Tickets 03–10 were implemented on `codex/hr-dashboard-spec`, verified with 120 passing desktop/mobile tests, and re-reviewed with no Standards or Spec findings. See [full verification](spec-verification.md). The implementation is committed locally; Git push and hosted deployment remain owner actions.
