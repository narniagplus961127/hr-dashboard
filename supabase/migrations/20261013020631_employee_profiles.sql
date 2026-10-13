create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- Auth sessions are private. This narrow predicate verifies the current JWT's
-- own session, making sign-out effective even before its access token expires.
create function private.is_current_session_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from auth.sessions
    where id::text = (auth.jwt() ->> 'session_id')
      and user_id = auth.uid()
  );
$$;

revoke all on function private.is_current_session_active() from public, anon;
grant execute on function private.is_current_session_active() to authenticated;

create table public.employee_profiles (
  user_id uuid primary key references auth.users(id),
  full_name text not null check (length(trim(full_name)) > 0),
  work_email text not null unique,
  job_title text not null,
  department text not null,
  start_date date not null,
  is_active boolean not null default true,
  role text not null check (role in ('employee', 'manager', 'hr_administrator'))
);

alter table public.employee_profiles enable row level security;
revoke all on table public.employee_profiles from public, anon, authenticated;
grant select on table public.employee_profiles to authenticated;
grant all on table public.employee_profiles to service_role;

create policy "Active employees read their own profile"
on public.employee_profiles
for select to authenticated
using (
  user_id = (select auth.uid())
  and is_active
  and (select private.is_current_session_active())
);

comment on table public.employee_profiles is
  'Employment information provisioned by trusted setup tooling; client access is own-profile, read-only for ticket 01.';
