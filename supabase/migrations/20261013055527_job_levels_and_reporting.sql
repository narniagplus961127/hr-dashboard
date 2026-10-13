alter table public.employee_records add column job_level text not null default 'Junior'
  check (job_level in ('Director', 'Head', 'Manager', 'Lead', 'Senior', 'Junior'));

update public.employee_records e set job_level = case a.role when 'manager' then 'Manager' when 'hr_administrator' then 'Head' else 'Junior' end
from private.employee_access a where a.employee_id = e.employee_id;


-- Existing fictional test records predate explicit job levels.
update public.employee_records set job_level = case
  when job_title ilike 'Lead %' then 'Lead'
  when job_title ilike 'Senior %' then 'Senior'
  else job_level end;

create or replace view public.employee_directory with (security_invoker = true) as
select e.employee_id, e.full_name, e.work_email, e.job_title,
  e.department_id, d.name as department, e.manager_id, m.full_name as manager_name, e.job_level
from public.employee_records e
join public.departments d on d.id = e.department_id
left join public.employee_records m on m.employee_id = e.manager_id;

-- Preserve the existing own-profile interface, now backed by separate records.
create or replace view public.employee_profiles with (security_invoker = true) as
select a.user_id, e.employee_id, e.full_name, e.work_email, e.job_title,
  d.name as department, e.department_id, e.manager_id, m.full_name as manager_name,
  a.start_date, a.is_active, a.role, e.job_level
from private.employee_access a
join public.employee_records e on e.employee_id = a.employee_id
join public.departments d on d.id = e.department_id
left join public.employee_records m on m.employee_id = e.manager_id;

drop function public.save_employee(uuid, text, text, text, uuid, uuid, date);
drop function private.save_employee(uuid, text, text, text, uuid, uuid, date);
drop function public.provision_demo_employee(uuid, text, text, text, text, date, text);

create function public.provision_demo_employee(
  p_user_id uuid, p_full_name text, p_work_email text, p_job_title text,
  p_department text, p_start_date date, p_role text, p_job_level text default null
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
    insert into public.employee_records (full_name, work_email, job_title, department_id, job_level)
    values (trim(p_full_name), lower(trim(p_work_email)), trim(p_job_title), department, coalesce(p_job_level, case p_role when 'manager' then 'Manager' when 'hr_administrator' then 'Head' else 'Junior' end))
    on conflict (lower(work_email)) do update set full_name = excluded.full_name,
      job_title = excluded.job_title, department_id = excluded.department_id, job_level = excluded.job_level
    returning employee_id into employee;
  else
    update public.employee_records set full_name = trim(p_full_name),
      work_email = lower(trim(p_work_email)), job_title = trim(p_job_title), department_id = department, job_level = coalesce(p_job_level, case p_role when 'manager' then 'Manager' when 'hr_administrator' then 'Head' else 'Junior' end)
    where employee_id = employee;
  end if;

  insert into private.employee_access (employee_id, user_id, start_date, role)
  values (employee, p_user_id, p_start_date, p_role)
  on conflict (employee_id) do update set user_id = excluded.user_id,
    start_date = excluded.start_date, role = excluded.role;

  return employee;
end;
$$;
revoke all on function public.provision_demo_employee(uuid, text, text, text, text, date, text, text) from public, anon, authenticated;
grant execute on function public.provision_demo_employee(uuid, text, text, text, text, date, text, text) to service_role;


create function private.save_employee(
  p_employee_id uuid, p_full_name text, p_work_email text, p_job_title text,
  p_department_id uuid, p_manager_id uuid, p_start_date date, p_job_level text default null
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  saved_id uuid;
  selected_level text;
begin
  if auth.uid() is null or private.current_workspace_role() is distinct from 'hr_administrator' then
    raise exception 'Only an active HR Administrator can manage employee records.' using errcode = '42501';
  end if;

  -- Serialize the reporting graph so concurrent assignments cannot create cycles.
  perform pg_catalog.pg_advisory_xact_lock(20261013, 2);

  if p_employee_id is null and p_job_level is null then
    raise exception 'Choose a job level.' using errcode = '22023';
  end if;

  select job_level into selected_level from public.employee_records where employee_id = p_employee_id;
  selected_level := coalesce(p_job_level, selected_level, 'Junior');
  if selected_level not in ('Director', 'Head', 'Manager', 'Lead', 'Senior', 'Junior') then
    raise exception 'Choose a valid job level.' using errcode = '22023';
  end if;

  if p_start_date is null then
    raise exception 'A valid start date is required.' using errcode = '22023';
  end if;

  if p_manager_id is not null and not exists (
    select 1 from private.employee_access
    where employee_id = p_manager_id and role = 'manager' and is_active and user_id is not null
  ) then
    raise exception 'Choose an active Manager.' using errcode = '22023';
  end if;

  if p_employee_id is null then
    insert into public.employee_records (full_name, work_email, job_title, department_id, manager_id, job_level)
    values (trim(p_full_name), lower(trim(p_work_email)), trim(p_job_title), p_department_id, p_manager_id, selected_level)
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
      department_id = p_department_id, manager_id = p_manager_id, job_level = selected_level
    where employee_id = p_employee_id;

    update private.employee_access set start_date = p_start_date where employee_id = p_employee_id;
    saved_id := p_employee_id;
  end if;

  return saved_id;
end;
$$;

revoke all on function private.save_employee(uuid, text, text, text, uuid, uuid, date, text) from public, anon;
grant execute on function private.save_employee(uuid, text, text, text, uuid, uuid, date, text) to authenticated;

create function public.save_employee(
  p_employee_id uuid, p_full_name text, p_work_email text, p_job_title text,
  p_department_id uuid, p_manager_id uuid, p_start_date date, p_job_level text default null
)
returns uuid language sql security invoker set search_path = ''
as $$
  select private.save_employee(p_employee_id, p_full_name, p_work_email, p_job_title,
    p_department_id, p_manager_id, p_start_date, p_job_level);
$$;
revoke all on function public.save_employee(uuid, text, text, text, uuid, uuid, date, text) from public, anon;
grant execute on function public.save_employee(uuid, text, text, text, uuid, uuid, date, text) to authenticated;

notify pgrst, 'reload schema';
