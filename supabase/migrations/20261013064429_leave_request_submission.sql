create table private.leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employee_records(employee_id),
  leave_type text not null check (leave_type in ('Annual','Sick')),
  start_date date not null,
  end_date date not null,
  charged_days integer not null check (charged_days between 1 and 366),
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  reason text not null default '' check (length(reason) <= 1000),
  created_at timestamptz not null default now(),
  check (end_date >= start_date and extract(year from start_date) = extract(year from end_date)),
  unique (id,employee_id,leave_type)
);
create index leave_requests_owner_dates_idx on private.leave_requests(employee_id,start_date,end_date);

create table private.leave_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references private.leave_requests(id) on delete cascade,
  actor_employee_id uuid not null references public.employee_records(employee_id),
  action text not null check (action in ('submitted','approved','rejected','cancelled')),
  reason text not null default '' check (length(reason) <= 1000),
  created_at timestamptz not null default now()
);
create index leave_history_request_idx on private.leave_history(request_id,created_at);

alter table private.leave_allocations add constraint leave_allocations_request_fk
foreign key(request_id,employee_id,leave_type) references private.leave_requests(id,employee_id,leave_type) on delete cascade;

alter table private.leave_requests enable row level security;
alter table private.leave_history enable row level security;
revoke all on private.leave_requests,private.leave_history from public,anon,authenticated;
grant select on private.leave_requests,private.leave_history to authenticated;

create policy "Owners read their leave requests" on private.leave_requests
for select to authenticated using (
  (select private.current_workspace_role()) is not null and exists (
    select 1 from private.employee_access a where a.employee_id=leave_requests.employee_id and a.user_id=(select auth.uid())
  )
);
create policy "Owners read their leave history" on private.leave_history
for select to authenticated using (exists (select 1 from private.leave_requests r where r.id=leave_history.request_id));

create view public.leave_requests with (security_invoker=true) as select * from private.leave_requests;
create view public.leave_history with (security_invoker=true) as
select h.*,e.full_name actor_name from private.leave_history h
join public.employee_records e on e.employee_id=h.actor_employee_id;
revoke all on public.leave_requests,public.leave_history from public,anon,authenticated;
grant select on public.leave_requests,public.leave_history to authenticated;

create function private.submit_leave_request(p_type text,p_start_date date,p_end_date date,p_reason text default '')
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
  if p_start_date < (now() at time zone 'Asia/Kuala_Lumpur')::date then
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

create function public.submit_leave_request(p_type text,p_start_date date,p_end_date date,p_reason text default '')
returns uuid language sql security invoker set search_path='' as $$
  select private.submit_leave_request(p_type,p_start_date,p_end_date,p_reason);
$$;
revoke all on function public.submit_leave_request(text,date,date,text) from public,anon;
grant execute on function public.submit_leave_request(text,date,date,text) to authenticated;
notify pgrst,'reload schema';
