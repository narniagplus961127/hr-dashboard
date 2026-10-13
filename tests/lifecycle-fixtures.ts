import { randomUUID } from 'node:crypto';
import { provisionFixture } from './helpers';

export function lifecycleAccount(role = 'employee') {
  const userId = randomUUID();
  const employeeId = randomUUID();
  const email = `${userId}@hr.example.test`;
  const name = `Lifecycle ${employeeId.slice(0, 8)}`;
  provisionFixture(`insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change)
    select instance_id,'${userId}',aud,role,'${email}',encrypted_password,now(),raw_app_meta_data,'{}',now(),now(),'','','','' from auth.users where email='maya@hr.example.test';
    insert into auth.identities(id,user_id,provider_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values(gen_random_uuid(),'${userId}','${userId}',jsonb_build_object('sub','${userId}','email','${email}'),'email',now(),now(),now());
    insert into public.employee_records(employee_id,full_name,work_email,job_title,department_id,job_level)
    select '${employeeId}','${name}','${email}','Designer',department_id,'Junior' from public.employee_records limit 1;
    insert into private.employee_access(employee_id,user_id,start_date,role) values('${employeeId}','${userId}','2020-01-01','${role}');`);
  return { userId, employeeId, email, name };
}

export function removeLifecycleAccount(
  account: ReturnType<typeof lifecycleAccount>,
) {
  provisionFixture(`delete from private.leave_requests where employee_id='${account.employeeId}';
    delete from private.leave_entitlements where employee_id='${account.employeeId}';
    delete from private.employee_access where employee_id='${account.employeeId}';
    delete from public.employee_records where employee_id='${account.employeeId}';
    delete from auth.users where id='${account.userId}';`);
}
