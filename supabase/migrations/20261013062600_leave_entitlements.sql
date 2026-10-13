create table private.leave_entitlements (
  employee_id uuid not null references public.employee_records(employee_id),
  leave_year integer not null check (leave_year between 2000 and 2100),
  leave_type text not null check (leave_type in ('Annual', 'Sick')),
  allowance integer not null default 14 check (allowance between 0 and 366),
  primary key (employee_id, leave_year, leave_type)
);

-- Later request transitions write this ledger in the same transaction as their
-- request status, while holding the corresponding entitlement row locks.
create table private.leave_allocations (
  request_id uuid not null,
  employee_id uuid not null,
  leave_year integer not null,
  leave_type text not null,
  reserved_days integer not null default 0 check (reserved_days >= 0),
  used_days integer not null default 0 check (used_days >= 0),
  primary key (request_id, leave_year),
  foreign key (employee_id, leave_year, leave_type)
    references private.leave_entitlements(employee_id, leave_year, leave_type),
  check (reserved_days = 0 or used_days = 0)
);
create index leave_allocations_balance_idx on private.leave_allocations(employee_id, leave_year, leave_type);

alter table private.leave_entitlements enable row level security;
alter table private.leave_allocations enable row level security;
revoke all on private.leave_entitlements, private.leave_allocations from public, anon, authenticated;

create function private.get_leave_balances(p_year integer, p_employee_id uuid default null)
returns table(employee_id uuid, full_name text, leave_year integer, leave_type text,
  allowance integer, used_days bigint, reserved_days bigint, available_days bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  viewer_role text := private.current_workspace_role();
begin
  if auth.uid() is null or viewer_role is null then
    raise exception 'Sign in to view leave balances.' using errcode = '42501';
  end if;
  if p_year is null or p_year not between 2000 and 2100 then
    raise exception 'Choose a year between 2000 and 2100.' using errcode = '22023';
  end if;
  if p_employee_id is not null and viewer_role <> 'hr_administrator' and not exists (
    select 1 from private.employee_access a where a.employee_id = p_employee_id and a.user_id = auth.uid()
  ) then
    raise exception 'You can only view your own leave balances.' using errcode = '42501';
  end if;

  return query
  select e.employee_id, e.full_name, p_year, t.kind, coalesce(b.allowance,14),
    coalesce(l.used,0), coalesce(l.reserved,0), coalesce(b.allowance,14) - coalesce(l.used,0) - coalesce(l.reserved,0)
  from public.employee_records e
  join private.employee_access a on a.employee_id = e.employee_id
  cross join (values ('Annual'::text), ('Sick'::text)) t(kind)
  left join private.leave_entitlements b on b.employee_id = e.employee_id and b.leave_year = p_year and b.leave_type = t.kind
  left join lateral (
    select sum(x.used_days) used, sum(x.reserved_days) reserved from private.leave_allocations x
    where x.employee_id = e.employee_id and x.leave_year = p_year and x.leave_type = t.kind
  ) l on true
  where (viewer_role = 'hr_administrator' or a.user_id = auth.uid())
    and (p_employee_id is null or e.employee_id = p_employee_id)
  order by e.full_name, t.kind;
end;
$$;
revoke all on function private.get_leave_balances(integer,uuid) from public,anon;
grant execute on function private.get_leave_balances(integer,uuid) to authenticated;

create function public.get_leave_balances(p_year integer, p_employee_id uuid default null)
returns table(employee_id uuid, full_name text, leave_year integer, leave_type text,
  allowance integer, used_days bigint, reserved_days bigint, available_days bigint)
language sql security invoker set search_path = '' as $$
  select * from private.get_leave_balances(p_year,p_employee_id);
$$;
revoke all on function public.get_leave_balances(integer,uuid) from public,anon;
grant execute on function public.get_leave_balances(integer,uuid) to authenticated;

-- Internal seam: lock keys in ascending year order for multi-year requests.
create function private.lock_leave_entitlement(p_employee_id uuid, p_year integer, p_type text)
returns integer language plpgsql security invoker set search_path = '' as $$
declare result integer;
begin
  insert into private.leave_entitlements(employee_id,leave_year,leave_type)
  values(p_employee_id,p_year,p_type) on conflict do nothing;
  select allowance into result from private.leave_entitlements
  where employee_id=p_employee_id and leave_year=p_year and leave_type=p_type for update;
  return result;
end;
$$;
revoke all on function private.lock_leave_entitlement(uuid,integer,text) from public,anon,authenticated;

create function private.save_leave_entitlement(p_employee_id uuid,p_year integer,p_type text,p_allowance integer)
returns void language plpgsql security definer set search_path = '' as $$
declare allocated bigint;
begin
  if auth.uid() is null or private.current_workspace_role() is distinct from 'hr_administrator' then
    raise exception 'Only an active HR Administrator can edit entitlements.' using errcode='42501';
  end if;
  if p_year is null or p_year not between 2000 and 2100 or p_type is null or p_type not in ('Annual','Sick')
    or p_allowance is null or p_allowance not between 0 and 366 then
    raise exception 'Choose a valid year, leave type, and whole-day allowance from 0 to 366.' using errcode='22023';
  end if;
  if p_employee_id is null or not exists(select 1 from private.employee_access where employee_id=p_employee_id) then
    raise exception 'Choose an Employee.' using errcode='22023';
  end if;

  perform private.lock_leave_entitlement(p_employee_id,p_year,p_type);
  select coalesce(sum(used_days+reserved_days),0) into allocated from private.leave_allocations
  where employee_id=p_employee_id and leave_year=p_year and leave_type=p_type;
  if p_allowance < allocated then
    raise exception 'Allowance cannot be less than used and reserved days (%).', allocated using errcode='22023';
  end if;
  update private.leave_entitlements set allowance=p_allowance
  where employee_id=p_employee_id and leave_year=p_year and leave_type=p_type;
end;
$$;
revoke all on function private.save_leave_entitlement(uuid,integer,text,integer) from public,anon;
grant execute on function private.save_leave_entitlement(uuid,integer,text,integer) to authenticated;

create function public.save_leave_entitlement(p_employee_id uuid,p_year integer,p_type text,p_allowance integer)
returns void language sql security invoker set search_path = '' as $$
  select private.save_leave_entitlement(p_employee_id,p_year,p_type,p_allowance);
$$;
revoke all on function public.save_leave_entitlement(uuid,integer,text,integer) from public,anon;
grant execute on function public.save_leave_entitlement(uuid,integer,text,integer) to authenticated;

notify pgrst, 'reload schema';
