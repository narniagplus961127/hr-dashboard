-- Lightweight external health check: no table reads, writes, or elevated privileges.
create function public.keep_alive()
returns integer
language sql stable security invoker
set search_path = ''
as $$ select 1; $$;

revoke all on function public.keep_alive() from public;
grant execute on function public.keep_alive() to anon, authenticated;

notify pgrst, 'reload schema';
