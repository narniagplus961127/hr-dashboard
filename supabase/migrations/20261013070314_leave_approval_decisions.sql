create function private.can_decide_leave(p_owner uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select coalesce((select
    a.employee_id <> p_owner and o.is_active and (
      (a.role='manager' and o.role='employee' and e.manager_id=a.employee_id)
      or (a.role='hr_administrator' and (
        o.role in ('manager','hr_administrator') or e.manager_id is null
        or not exists(select 1 from private.employee_access m where m.employee_id=e.manager_id and m.role='manager' and m.is_active and m.user_id is not null)
      ))
    )
    from private.employee_access a
    join private.employee_access o on o.employee_id=p_owner
    join public.employee_records e on e.employee_id=o.employee_id
    where a.user_id=auth.uid() and a.is_active and private.is_current_session_active()
  ),false);
$$;
revoke all on function private.can_decide_leave(uuid) from public,anon,authenticated;

create function private.decide_leave_request(p_request_id uuid,p_decision text,p_reason text default '')
returns uuid language plpgsql security definer set search_path='' as $$
declare owner_id uuid; actor_id uuid; request private.leave_requests%rowtype;
begin
  if auth.uid() is null or private.current_workspace_role() not in ('manager','hr_administrator')
    or private.current_workspace_role() is null then
    raise exception 'Only an eligible Manager or HR Administrator can decide leave.' using errcode='42501';
  end if;
  select employee_id into owner_id from private.leave_requests where id=p_request_id;
  if owner_id is null then raise exception 'This Leave request is not available for your decision.' using errcode='42501'; end if;
  -- Shared lifecycle order: owner access, request, entitlement.
  perform 1 from private.employee_access where employee_id=owner_id for update;
  select * into request from private.leave_requests where id=p_request_id for update;
  if not found or not private.can_decide_leave(owner_id) then
    raise exception 'This Leave request is not available for your decision.' using errcode='42501';
  end if;
  if request.status <> 'pending' then
    raise exception 'Only pending Leave requests can be decided.' using errcode='22023';
  end if;
  if p_decision is null or p_decision not in ('approved','rejected') or length(coalesce(p_reason,'')) > 1000
    or (p_decision='rejected' and length(trim(coalesce(p_reason,'')))=0) then
    raise exception 'Choose approve or reject; rejection requires a reason of at most 1000 characters.' using errcode='22023';
  end if;
  perform private.lock_leave_entitlement(owner_id,extract(year from request.start_date)::integer,request.leave_type);
  update private.leave_allocations set reserved_days=0,
    used_days=case when p_decision='approved' then request.charged_days else 0 end
  where request_id=request.id and employee_id=owner_id and leave_year=extract(year from request.start_date)::integer
    and leave_type=request.leave_type and reserved_days=request.charged_days and used_days=0;
  if not found then raise exception 'The Leave allocation no longer matches its pending request.' using errcode='22023'; end if;
  select employee_id into actor_id from private.employee_access where user_id=auth.uid();
  update private.leave_requests set status=p_decision where id=request.id;
  insert into private.leave_history(request_id,actor_employee_id,action,reason)
  values(request.id,actor_id,p_decision,trim(coalesce(p_reason,'')));
  return request.id;
end;
$$;
revoke all on function private.decide_leave_request(uuid,text,text) from public,anon;
grant execute on function private.decide_leave_request(uuid,text,text) to authenticated;

create function public.decide_leave_request(p_request_id uuid,p_decision text,p_reason text default '')
returns uuid language sql security invoker set search_path='' as $$
  select private.decide_leave_request(p_request_id,p_decision,p_reason);
$$;
revoke all on function public.decide_leave_request(uuid,text,text) from public,anon;
grant execute on function public.decide_leave_request(uuid,text,text) to authenticated;

create function private.get_approval_requests()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare role text:=private.current_workspace_role(); result jsonb;
begin
  if auth.uid() is null or role is null or role not in ('manager','hr_administrator') then
    raise exception 'Only Managers and HR Administrators can view approvals.' using errcode='42501';
  end if;
  select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('full_name',e.full_name,
    'can_decide',r.status='pending' and private.can_decide_leave(r.employee_id)) order by r.created_at desc,r.id),'[]'::jsonb)
  into result from private.leave_requests r join public.employee_records e on e.employee_id=r.employee_id
  where role='hr_administrator' or private.can_decide_leave(r.employee_id);
  return result;
end;
$$;
revoke all on function private.get_approval_requests() from public,anon;
grant execute on function private.get_approval_requests() to authenticated;
create function public.get_approval_requests()
returns jsonb language sql security invoker set search_path='' as $$ select private.get_approval_requests(); $$;
revoke all on function public.get_approval_requests() from public,anon;
grant execute on function public.get_approval_requests() to authenticated;

create function private.get_approval_history(p_request_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare role text:=private.current_workspace_role(); result jsonb;
begin
  if auth.uid() is null or role is null or role not in ('manager','hr_administrator') then
    raise exception 'Only Managers and HR Administrators can view approval history.' using errcode='42501';
  end if;
  if p_request_id is not null and not exists(select 1 from private.leave_requests r where r.id=p_request_id
    and (role='hr_administrator' or private.can_decide_leave(r.employee_id))) then
    raise exception 'This Leave history is not available to you.' using errcode='42501';
  end if;
  select coalesce(jsonb_agg(to_jsonb(h)||jsonb_build_object('actor_name',e.full_name) order by h.created_at,h.id),'[]'::jsonb)
  into result from private.leave_history h join private.leave_requests r on r.id=h.request_id
  join public.employee_records e on e.employee_id=h.actor_employee_id
  where (p_request_id is null or r.id=p_request_id) and (role='hr_administrator' or private.can_decide_leave(r.employee_id));
  return result;
end;
$$;
revoke all on function private.get_approval_history(uuid) from public,anon;
grant execute on function private.get_approval_history(uuid) to authenticated;
create function public.get_approval_history(p_request_id uuid default null)
returns jsonb language sql security invoker set search_path='' as $$ select private.get_approval_history(p_request_id); $$;
revoke all on function public.get_approval_history(uuid) from public,anon;
grant execute on function public.get_approval_history(uuid) to authenticated;

notify pgrst,'reload schema';
