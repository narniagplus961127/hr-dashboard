-- Internal transition. Its trusted caller must lock owner access before calling.
-- Batch callers also lock entitlement keys in ascending year/type order first.
create function private.cancel_leave_allocation(p_request_id uuid, p_actor_id uuid, p_reason text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare request private.leave_requests%rowtype;
begin
  select * into request from private.leave_requests where id=p_request_id for update;
  if not found or request.status not in ('pending','approved') then
    raise exception 'Only pending or approved Leave requests can be cancelled.' using errcode='22023';
  end if;
  if p_actor_id is null or length(coalesce(p_reason,'')) > 1000 then
    raise exception 'Cancellation requires an actor and a reason of at most 1000 characters.' using errcode='22023';
  end if;
  perform private.lock_leave_entitlement(request.employee_id,extract(year from request.start_date)::integer,request.leave_type);
  update private.leave_allocations set reserved_days=0, used_days=0
  where request_id=request.id and employee_id=request.employee_id
    and leave_year=extract(year from request.start_date)::integer and leave_type=request.leave_type
    and reserved_days=case when request.status='pending' then request.charged_days else 0 end
    and used_days=case when request.status='approved' then request.charged_days else 0 end;
  if not found then
    raise exception 'The Leave allocation no longer matches its request.' using errcode='22023';
  end if;
  update private.leave_requests set status='cancelled' where id=request.id;
  insert into private.leave_history(request_id,actor_employee_id,action,reason)
    values(request.id,p_actor_id,'cancelled',trim(coalesce(p_reason,'')));
  return request.id;
end;
$$;
revoke all on function private.cancel_leave_allocation(uuid,uuid,text) from public,anon,authenticated;

create function private.cancel_leave_request(p_request_id uuid,p_reason text default '')
returns uuid language plpgsql security definer set search_path='' as $$
declare owner_id uuid; actor_id uuid; actor_role text; request private.leave_requests%rowtype;
begin
  actor_role:=private.current_workspace_role();
  if auth.uid() is null or actor_role is null then
    raise exception 'An active Employee session is required to cancel leave.' using errcode='42501';
  end if;
  select employee_id into actor_id from private.employee_access where user_id=auth.uid();
  select employee_id into owner_id from private.leave_requests where id=p_request_id;
  if owner_id is null or (owner_id<>actor_id and actor_role<>'hr_administrator') then
    raise exception 'This Leave request is not available for your cancellation.' using errcode='42501';
  end if;
  perform 1 from private.employee_access where employee_id=owner_id for update;
  select * into request from private.leave_requests where id=p_request_id for update;
  actor_role:=private.current_workspace_role();
  if not found or actor_role is null or (request.employee_id<>actor_id and actor_role<>'hr_administrator')
    or (request.status='pending' and request.employee_id<>actor_id)
    or (request.status='approved' and actor_role<>'hr_administrator') then
    raise exception 'Cancel your own pending leave; only HR can cancel approved leave.' using errcode='42501';
  end if;
  return private.cancel_leave_allocation(request.id,actor_id,p_reason);
end;
$$;
revoke all on function private.cancel_leave_request(uuid,text) from public,anon;
grant execute on function private.cancel_leave_request(uuid,text) to authenticated;

create function public.cancel_leave_request(p_request_id uuid,p_reason text default '')
returns uuid language sql security invoker set search_path='' as $$
  select private.cancel_leave_request(p_request_id,p_reason);
$$;
revoke all on function public.cancel_leave_request(uuid,text) from public,anon;
grant execute on function public.cancel_leave_request(uuid,text) to authenticated;

create or replace function private.get_approval_requests()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare role text:=private.current_workspace_role(); result jsonb;
begin
  if auth.uid() is null or role is null or role not in ('manager','hr_administrator') then
    raise exception 'Only Managers and HR Administrators can view approvals.' using errcode='42501';
  end if;
  select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('full_name',e.full_name,
    'can_decide',r.status='pending' and private.can_decide_leave(r.employee_id),
    'can_cancel',r.status='approved' and role='hr_administrator') order by r.created_at desc,r.id),'[]'::jsonb)
  into result from private.leave_requests r join public.employee_records e on e.employee_id=r.employee_id
  where role='hr_administrator' or private.can_decide_leave(r.employee_id);
  return result;
end;
$$;

notify pgrst,'reload schema';
