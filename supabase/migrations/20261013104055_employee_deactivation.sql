create function private.deactivate_employee(p_employee_id uuid)
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
    (status='pending' or (status='approved' and start_date >= (now() at time zone 'Asia/Kuala_Lumpur')::date))
    order by id for update;
  for entitlement in select distinct extract(year from start_date)::integer as leave_year,leave_type
    from private.leave_requests where employee_id=p_employee_id and
    (status='pending' or (status='approved' and start_date >= (now() at time zone 'Asia/Kuala_Lumpur')::date))
    order by leave_year,leave_type
  loop
    perform private.lock_leave_entitlement(p_employee_id,entitlement.leave_year,entitlement.leave_type);
  end loop;
  for request_id in select id from private.leave_requests where employee_id=p_employee_id and
    (status='pending' or (status='approved' and start_date >= (now() at time zone 'Asia/Kuala_Lumpur')::date))
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

create function public.deactivate_employee(p_employee_id uuid)
returns uuid language sql security invoker set search_path='' as $$
  select private.deactivate_employee(p_employee_id);
$$;
revoke all on function public.deactivate_employee(uuid) from public,anon;
grant execute on function public.deactivate_employee(uuid) to authenticated;
notify pgrst,'reload schema';
