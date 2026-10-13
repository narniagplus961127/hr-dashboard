# Ticket 03: Public holidays and Shared calendar

Source: [GitHub issue #4](https://github.com/narniagplus961127/hr-dashboard/issues/4).

HR maintains company Public holidays through `/holidays`; every active signed-in user views them through `/calendar`. The manually maintained list belongs to the single company in Kuala Lumpur, Malaysia. Each date is a company non-working day, distinct from Employee absence events. Entries do not automatically recur in subsequent years.

`company_holidays` exposes `id`, `holiday_date`, and `name`. `holiday_date` is a unique PostgreSQL `date`, bounded from 1900 through 2100. Names cannot be blank or longer than 150 characters. Active-session and current-role checks enforce authenticated reads and HR-only creation, editing, and deletion. Anonymous callers cannot access the table. Leave calculations can exclude maintained `holiday_date` values without timestamp conversions.

The calendar starts in the company-local current month using `Asia/Kuala_Lumpur`. Date-only values are retained as strings; display and month-grid calculations use UTC methods explicitly to preserve their civil dates regardless of browser timezone. HR access retains its original profile-section link; the new pages have separate navigation entries.

The agreed test seams are complete browser workflows against an isolated real Supabase backend and direct public API permission checks. The first browser test failed at missing Public holidays navigation before implementation. It then passed for HR creation, editing, persistence after reload, calendar rendering, Employee visibility, and HR deletion. The API test checks HR CRUD, Employee and Manager mutation denial, anonymous denial, duplicate dates, blank names, invalid dates, and supported date bounds. Both tests run on desktop and mobile.

Verification uses a separate disposable local backend, not the main development database. A fresh database reset verifies migration installation. Security advisors report no issues. The complete worktree suite passed 50 tests on desktop and mobile; typecheck, production build, and Prettier checks passed. The integration coordinator verifies the combined result after merging remaining tickets.

Future approved absence events should be composed into calendar cells by company-local date, with only the public Employee identity and the label "Away" exposed. Holiday labels remain separate, and leave type, reason, and pending requests must stay out of this shared view.
