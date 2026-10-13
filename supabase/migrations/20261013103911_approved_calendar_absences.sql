-- Calendar consumers receive a separate, deliberately narrow projection.
-- Request/history views remain owner-only; do not broaden their RLS policies.
create function private.get_calendar_absences()
returns table(employee_id uuid, full_name text, start_date date, end_date date)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null or private.current_workspace_role() is null then
    raise exception 'An active workspace session is required.' using errcode = '42501';
  end if;

  return query
    select e.employee_id, e.full_name, r.start_date, r.end_date
    from private.leave_requests r
    join public.employee_records e on e.employee_id = r.employee_id
    where r.status = 'approved'
    order by r.start_date, e.full_name, r.id;
end;
$$;

revoke all on function private.get_calendar_absences() from public, anon, authenticated;
grant execute on function private.get_calendar_absences() to authenticated;

create function public.get_calendar_absences()
returns table(employee_id uuid, full_name text, start_date date, end_date date)
language sql stable security invoker set search_path = ''
as $$ select * from private.get_calendar_absences(); $$;

revoke all on function public.get_calendar_absences() from public, anon, authenticated;
grant execute on function public.get_calendar_absences() to authenticated;

notify pgrst, 'reload schema';
