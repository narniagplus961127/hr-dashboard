-- Aggregates expose counts only; their scope comes from persisted access and reporting records.
create function private.get_workspace_overview()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  role text := private.current_workspace_role();
  owner_id uuid;
  summaries jsonb;
begin
  if auth.uid() is null or role is null then
    raise exception 'An active Employee session is required for the overview.' using errcode='42501';
  end if;
  select employee_id into owner_id from private.employee_access where user_id=auth.uid() and is_active;
  with scopes as (
    select 'own'::text scope, 1 position
    union all select 'direct_reports', 2 where role='manager'
    union all select 'company', 2 where role='hr_administrator'
  ), counts as (
    select s.scope,s.position,count(r.id) total_requests,
      count(r.id) filter (where r.status='pending') pending,
      count(r.id) filter (where r.status='approved') approved,
      count(r.id) filter (where r.status='rejected') rejected,
      count(r.id) filter (where r.status='cancelled') cancelled
    from scopes s left join private.leave_requests r on
      (s.scope='own' and r.employee_id=owner_id)
      or (s.scope='direct_reports' and private.can_decide_leave(r.employee_id))
      or s.scope='company'
    group by s.scope,s.position
  )
  select jsonb_agg(jsonb_build_object('scope',scope,'total_requests',total_requests,
    'pending',pending,'approved',approved,'rejected',rejected,'cancelled',cancelled) order by position)
  into summaries from counts;
  return jsonb_build_object('active_headcount',(select count(*) from private.employee_access where is_active),
    'summaries',summaries);
end;
$$;
revoke all on function private.get_workspace_overview() from public,anon,authenticated;
grant execute on function private.get_workspace_overview() to authenticated;

create function public.get_workspace_overview()
returns jsonb language sql stable security invoker set search_path='' as $$
  select private.get_workspace_overview();
$$;
revoke all on function public.get_workspace_overview() from public,anon;
grant execute on function public.get_workspace_overview() to authenticated;
notify pgrst, 'reload schema';
