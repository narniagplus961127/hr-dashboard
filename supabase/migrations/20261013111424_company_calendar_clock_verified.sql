SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION private.company_today()
  RETURNS date
  LANGUAGE sql
  STABLE
  SET search_path TO ''
  AS $function$
      select (now() at time zone 'Asia/Kuala_Lumpur')::date;
    $function$;

