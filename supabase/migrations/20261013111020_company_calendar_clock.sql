-- Company date is internal; callers cannot supply or override its clock.
create or replace function private.company_today()
returns date language sql stable security invoker set search_path='' as $$
  select (now() at time zone 'Asia/Kuala_Lumpur')::date;
$$;
revoke all on function private.company_today() from public,anon,authenticated;

create or replace function private.submit_leave_request(p_type text,p_start_date date,p_end_date date,p_reason text default '')
returns uuid language plpgsql security definer set search_path='' as $$
declare owner_id uuid; request_id uuid:=gen_random_uuid(); charged integer; year integer; allowance integer; allocated bigint;
begin
  if auth.uid() is null or private.current_workspace_role() is null then
    raise exception 'Sign in to request leave.' using errcode='42501';
  end if;
  -- All lifecycle operations lock access first, then existing request, then entitlement.
  select employee_id into owner_id from private.employee_access where user_id=auth.uid() and is_active for update;
  if owner_id is null then raise exception 'Your Employee account is inactive.' using errcode='42501'; end if;

  if p_type is null or p_type not in ('Annual','Sick') or p_start_date is null or p_end_date is null
    or length(coalesce(p_reason,'')) > 1000 then
    raise exception 'Choose Annual or Sick leave, valid dates, and a reason of at most 1000 characters.' using errcode='22023';
  end if;
  if p_start_date < private.company_today() then
    raise exception 'Leave must start today or later in Kuala Lumpur.' using errcode='22023';
  end if;
  if p_end_date < p_start_date then raise exception 'End date must be on or after start date.' using errcode='22023'; end if;
  if extract(year from p_start_date) <> extract(year from p_end_date) then
    raise exception 'Submit a separate Leave request for each calendar year.' using errcode='22023';
  end if;
  if extract(year from p_start_date) not between 2000 and 2100 then
    raise exception 'Choose dates in a supported year up to 2100.' using errcode='22023';
  end if;

  year:=extract(year from p_start_date)::integer;
  select count(*)::integer into charged from generate_series(p_start_date::timestamp,p_end_date::timestamp,interval '1 day') d
  where extract(isodow from d) <= 5 and not exists(select 1 from public.company_holidays h where h.holiday_date=d::date);
  if charged=0 then raise exception 'Choose at least one working day; weekends and Public holidays are not charged.' using errcode='22023'; end if;
  if exists(select 1 from private.leave_requests r where r.employee_id=owner_id and r.status in ('pending','approved')
    and r.start_date <= p_end_date and r.end_date >= p_start_date) then
    raise exception 'These dates overlap a pending or approved Leave request.' using errcode='22023';
  end if;
  allowance:=private.lock_leave_entitlement(owner_id,year,p_type);
  select coalesce(sum(l.reserved_days+l.used_days),0) into allocated from private.leave_allocations l
  where l.employee_id=owner_id and l.leave_year=year and l.leave_type=p_type;
  if charged > allowance-allocated then
    raise exception 'Insufficient Available leave balance for these working days.' using errcode='22023';
  end if;
  insert into private.leave_requests(id,employee_id,leave_type,start_date,end_date,charged_days,reason)
  values(request_id,owner_id,p_type,p_start_date,p_end_date,charged,trim(coalesce(p_reason,'')));
  insert into private.leave_allocations(request_id,employee_id,leave_year,leave_type,reserved_days)
  values(request_id,owner_id,year,p_type,charged);
  insert into private.leave_history(request_id,actor_employee_id,action)
  values(request_id,owner_id,'submitted');
  return request_id;
end;
$$;
revoke all on function private.submit_leave_request(text,date,date,text) from public,anon;
grant execute on function private.submit_leave_request(text,date,date,text) to authenticated;


create or replace function private.deactivate_employee(p_employee_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor_id uuid; target_active boolean; request_id uuid; entitlement record;
begin
  if auth.uid() is null or private.current_workspace_role() is distinct from 'hr_administrator' then
    raise exception 'Only an active HR Administrator can deactivate Employees.' using errcode='42501';
  end if;
  select employee_id into actor_id from private.employee_access where user_id=auth.uid();
  -- Reporting edits take this lock first too. Lock actor/target in stable order.
  perform pg_catalog.pg_advisory_xact_lock(20261013,2);
  perform 1 from private.employee_access where employee_id in (actor_id,p_employee_id) order by employee_id for update;
  if private.current_workspace_role() is distinct from 'hr_administrator' then
    raise exception 'An active HR Administrator session is required.' using errcode='42501';
  end if;
  select is_active into target_active from private.employee_access where employee_id=p_employee_id;
  if target_active is distinct from true then
    raise exception 'The Employee is missing or already inactive.' using errcode='22023';
  end if;
  perform 1 from private.leave_requests where employee_id=p_employee_id and
    (status='pending' or (status='approved' and start_date >= private.company_today()))
    order by id for update;
  for entitlement in select distinct extract(year from start_date)::integer as leave_year,leave_type
    from private.leave_requests where employee_id=p_employee_id and
    (status='pending' or (status='approved' and start_date >= private.company_today()))
    order by leave_year,leave_type
  loop
    perform private.lock_leave_entitlement(p_employee_id,entitlement.leave_year,entitlement.leave_type);
  end loop;
  for request_id in select id from private.leave_requests where employee_id=p_employee_id and
    (status='pending' or (status='approved' and start_date >= private.company_today()))
    order by id
  loop
    perform private.cancel_leave_allocation(request_id,actor_id,'Employee deactivated by HR.');
  end loop;
  update private.employee_access set is_active=false where employee_id=p_employee_id;
  return p_employee_id;
end;
$$;
revoke all on function private.deactivate_employee(uuid) from public,anon;
grant execute on function private.deactivate_employee(uuid) to authenticated;

notify pgrst,'reload schema';
