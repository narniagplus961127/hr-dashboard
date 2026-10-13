-- Employment records can exist independently of a provisioned login account.
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 100)
);
create unique index departments_name_unique on public.departments (lower(trim(name)));

insert into public.departments (name)
select distinct department from public.employee_profiles;

create table public.employee_records (
  employee_id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) between 1 and 150),
  work_email text not null check (length(work_email) <= 254 and work_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  job_title text not null check (length(trim(job_title)) between 1 and 150),
  department_id uuid not null references public.departments(id),
  manager_id uuid references public.employee_records(employee_id),
  check (manager_id is distinct from employee_id)
);
create unique index employee_records_email_unique on public.employee_records (lower(work_email));
create index employee_records_department_idx on public.employee_records (department_id);
create index employee_records_manager_idx on public.employee_records (manager_id);

insert into public.employee_records (employee_id, full_name, work_email, job_title, department_id)
select p.user_id, p.full_name, lower(p.work_email), p.job_title, d.id
from public.employee_profiles p join public.departments d on d.name = p.department;

alter table public.employee_profiles set schema private;
alter table private.employee_profiles rename to employee_access;
alter table private.employee_access add column employee_id uuid;
update private.employee_access set employee_id = user_id;
alter table private.employee_access drop constraint employee_profiles_pkey;
alter table private.employee_access alter column user_id drop not null;
alter table private.employee_access add primary key (employee_id);
alter table private.employee_access add unique (user_id);
alter table private.employee_access add foreign key (employee_id) references public.employee_records(employee_id);
alter table private.employee_access
  drop column full_name, drop column work_email, drop column job_title, drop column department;

-- Only this narrow lookup bypasses RLS; it never returns another user's data.
create function private.current_workspace_role()
returns text language sql stable security definer set search_path = ''
as $$
  select role from private.employee_access
  where user_id = auth.uid() and is_active
    and private.is_current_session_active();
$$;
revoke all on function private.current_workspace_role() from public, anon;
grant execute on function private.current_workspace_role() to authenticated;

drop policy "Active employees read their own profile" on private.employee_access;
create policy "Owners and HR read private employment details"
on private.employee_access for select to authenticated
using (
  (select private.current_workspace_role()) is not null
  and (user_id = (select auth.uid()) or (select private.current_workspace_role()) = 'hr_administrator')
);

alter table public.departments enable row level security;
alter table public.employee_records enable row level security;
revoke all on public.departments, public.employee_records from public, anon, authenticated;
grant select on public.departments, public.employee_records to authenticated;
grant all on public.departments, public.employee_records to service_role;
grant usage on schema private to service_role;
grant all on private.employee_access to service_role;

create policy "Active users read departments" on public.departments
for select to authenticated using ((select private.current_workspace_role()) is not null);
create policy "Active users read directory fields" on public.employee_records
for select to authenticated using ((select private.current_workspace_role()) is not null);

create view public.employee_directory with (security_invoker = true) as
select e.employee_id, e.full_name, e.work_email, e.job_title,
  e.department_id, d.name as department, e.manager_id, m.full_name as manager_name
from public.employee_records e
join public.departments d on d.id = e.department_id
left join public.employee_records m on m.employee_id = e.manager_id;

-- Preserve the existing own-profile interface, now backed by separate records.
create view public.employee_profiles with (security_invoker = true) as
select a.user_id, e.employee_id, e.full_name, e.work_email, e.job_title,
  d.name as department, e.department_id, e.manager_id, m.full_name as manager_name,
  a.start_date, a.is_active, a.role
from private.employee_access a
join public.employee_records e on e.employee_id = a.employee_id
join public.departments d on d.id = e.department_id
left join public.employee_records m on m.employee_id = e.manager_id;

revoke all on public.employee_directory, public.employee_profiles from public, anon, authenticated;
grant select on public.employee_directory, public.employee_profiles to authenticated, service_role;

comment on table private.employee_access is
  'Private employment fields and trusted access assignments; user_id is optional until login provisioning.';
comment on view public.employee_directory is
  'Directory projection deliberately excludes start date, employment status, role, and login identity.';

notify pgrst, 'reload schema';

-- Trusted demo provisioning is callable only with a server-side service key.
create function public.provision_demo_employee(
  p_user_id uuid, p_full_name text, p_work_email text, p_job_title text,
  p_department text, p_start_date date, p_role text
)
returns uuid language plpgsql security invoker set search_path = ''
as $$
declare
  employee uuid;
  department uuid;
begin
  insert into public.departments (name) values (trim(p_department))
  on conflict (lower(trim(name))) do update set name = excluded.name
  returning id into department;

  select employee_id into employee from private.employee_access where user_id = p_user_id;
  if employee is null then
    insert into public.employee_records (full_name, work_email, job_title, department_id)
    values (trim(p_full_name), lower(trim(p_work_email)), trim(p_job_title), department)
    on conflict (lower(work_email)) do update set full_name = excluded.full_name,
      job_title = excluded.job_title, department_id = excluded.department_id
    returning employee_id into employee;
  else
    update public.employee_records set full_name = trim(p_full_name),
      work_email = lower(trim(p_work_email)), job_title = trim(p_job_title), department_id = department
    where employee_id = employee;
  end if;

  insert into private.employee_access (employee_id, user_id, start_date, role)
  values (employee, p_user_id, p_start_date, p_role)
  on conflict (employee_id) do update set user_id = excluded.user_id,
    start_date = excluded.start_date, role = excluded.role;

  return employee;
end;
$$;
revoke all on function public.provision_demo_employee(uuid, text, text, text, text, date, text) from public, anon, authenticated;
grant execute on function public.provision_demo_employee(uuid, text, text, text, text, date, text) to service_role;

-- HR operations keep login identity, role, and activation outside editable fields.
grant insert (name), update (name) on public.departments to authenticated;
create policy "HR creates departments" on public.departments
for insert to authenticated with check ((select private.current_workspace_role()) = 'hr_administrator');
create policy "HR renames departments" on public.departments
for update to authenticated
using ((select private.current_workspace_role()) = 'hr_administrator')
with check ((select private.current_workspace_role()) = 'hr_administrator');

create function private.save_employee(
  p_employee_id uuid, p_full_name text, p_work_email text, p_job_title text,
  p_department_id uuid, p_manager_id uuid, p_start_date date
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  saved_id uuid;
begin
  if auth.uid() is null or private.current_workspace_role() is distinct from 'hr_administrator' then
    raise exception 'Only an active HR Administrator can manage employee records.' using errcode = '42501';
  end if;

  if p_start_date is null then
    raise exception 'A valid start date is required.' using errcode = '22023';
  end if;

  -- Serialize the reporting graph so concurrent assignments cannot create cycles.
  perform pg_catalog.pg_advisory_xact_lock(20261013, 2);

  if p_manager_id is not null and not exists (
    select 1 from private.employee_access
    where employee_id = p_manager_id and role = 'manager' and is_active and user_id is not null
  ) then
    raise exception 'Choose an active Manager.' using errcode = '22023';
  end if;

  if p_employee_id is null then
    insert into public.employee_records (full_name, work_email, job_title, department_id, manager_id)
    values (trim(p_full_name), lower(trim(p_work_email)), trim(p_job_title), p_department_id, p_manager_id)
    returning employee_id into saved_id;

    insert into private.employee_access (employee_id, start_date, role)
    values (saved_id, p_start_date, 'employee');
  else
    -- Serialize edits to the same record; identity and access assignments stay intact.
    perform 1 from private.employee_access where employee_id = p_employee_id for update;
    if not found then
      raise exception 'The employee record no longer exists.' using errcode = '22023';
    end if;

    if p_manager_id = p_employee_id then
      raise exception 'An Employee cannot be their own Manager.' using errcode = '22023';
    end if;

    if exists (
      with recursive managers as (
        select employee_id, manager_id, array[employee_id] as visited
        from public.employee_records where employee_id = p_manager_id
        union all
        select e.employee_id, e.manager_id, m.visited || e.employee_id
        from public.employee_records e join managers m on e.employee_id = m.manager_id
        where not e.employee_id = any(m.visited)
      ) select 1 from managers where employee_id = p_employee_id
    ) then
      raise exception 'Manager assignments cannot form a reporting cycle.' using errcode = '22023';
    end if;

    update public.employee_records set full_name = trim(p_full_name),
      work_email = lower(trim(p_work_email)), job_title = trim(p_job_title),
      department_id = p_department_id, manager_id = p_manager_id
    where employee_id = p_employee_id;

    update private.employee_access set start_date = p_start_date where employee_id = p_employee_id;
    saved_id := p_employee_id;
  end if;

  return saved_id;
end;
$$;

revoke all on function private.save_employee(uuid, text, text, text, uuid, uuid, date) from public, anon;
grant execute on function private.save_employee(uuid, text, text, text, uuid, uuid, date) to authenticated;

create function public.save_employee(
  p_employee_id uuid, p_full_name text, p_work_email text, p_job_title text,
  p_department_id uuid, p_manager_id uuid, p_start_date date
)
returns uuid language sql security invoker set search_path = ''
as $$
  select private.save_employee(p_employee_id, p_full_name, p_work_email, p_job_title,
    p_department_id, p_manager_id, p_start_date);
$$;
revoke all on function public.save_employee(uuid, text, text, text, uuid, uuid, date) from public, anon;
grant execute on function public.save_employee(uuid, text, text, text, uuid, uuid, date) to authenticated;

notify pgrst, 'reload schema';
