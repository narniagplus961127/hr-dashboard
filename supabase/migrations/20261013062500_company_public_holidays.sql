-- Dates are company-local civil dates, never timestamps or UTC conversions.
create table public.company_holidays (
  id uuid primary key default gen_random_uuid(),
  holiday_date date not null unique check (holiday_date between date '1900-01-01' and date '2100-12-31'),
  name text not null check (length(trim(name)) between 1 and 150)
);

alter table public.company_holidays enable row level security;
revoke all on public.company_holidays from public, anon, authenticated;
grant select, insert, update, delete on public.company_holidays to authenticated;
grant all on public.company_holidays to service_role;

create policy "Active users read company holidays" on public.company_holidays
for select to authenticated using ((select private.current_workspace_role()) is not null);

create policy "HR creates company holidays" on public.company_holidays
for insert to authenticated with check ((select private.current_workspace_role()) = 'hr_administrator');

create policy "HR edits company holidays" on public.company_holidays
for update to authenticated
using ((select private.current_workspace_role()) = 'hr_administrator')
with check ((select private.current_workspace_role()) = 'hr_administrator');

create policy "HR deletes company holidays" on public.company_holidays
for delete to authenticated using ((select private.current_workspace_role()) = 'hr_administrator');
