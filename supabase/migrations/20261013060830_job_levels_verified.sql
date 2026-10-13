SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION private.current_workspace_role()
  RETURNS text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select role from private.employee_access
  where user_id = auth.uid() and is_active
    and private.is_current_session_active();
$function$;

CREATE OR REPLACE FUNCTION private.save_employee (
  p_employee_id   uuid,
  p_full_name     text,
  p_work_email    text,
  p_job_title     text,
  p_department_id uuid,
  p_manager_id    uuid,
  p_start_date    date,
  p_job_level     text DEFAULT NULL::text
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

