# Supabase keep-alive

The GitHub Actions workflow `.github/workflows/supabase-keep-alive.yml` makes one
read-only database request every 12 hours: 08:00 and 20:00 Asia/Kuala_Lumpur
(00:00 and 12:00 UTC). GitHub may delay scheduled runs.

Each run calls `GET /rest/v1/rpc/keep_alive` and requires HTTP success with the
constant response `1`. The SQL function executes only `SELECT 1`: no employee
rows are fetched, no tables are scanned, and no data is written. It uses
`SECURITY INVOKER` and a public publishable API key, with no admin credentials,
user sign-ins, application build, or frontend deployment. The expected database
load of two constant queries per day is negligible. There are no automatic
retries; each request times out after 20 seconds and each job after one minute.

The workflow also runs manually from Actions and when its file changes on main,
so configuration changes are verified immediately. Check the Actions run history
for failures; GitHub notification settings determine whether failure emails arrive.

This is a best-effort inactivity workaround. Supabase does not publish an exact
activity threshold or guarantee that two queries per day prevent pausing. If the
project pauses, resume it in Supabase before rerunning the workflow.

GitHub automatically disables scheduled workflows in public repositories after
60 days without repository activity. Re-enable this workflow in Actions if that
happens. Scheduled runs are not a guarantee of indefinite availability.

To stop the check, disable **Supabase keep-alive** in GitHub Actions. To remove
the database endpoint later, apply a migration containing
`drop function public.keep_alive();`.

References:

- [Supabase project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
- [GitHub scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
