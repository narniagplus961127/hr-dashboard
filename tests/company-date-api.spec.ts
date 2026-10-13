import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { provisionFixture, publicClient } from './helpers';
import { lifecycleAccount, removeLifecycleAccount } from './lifecycle-fixtures';

async function login(email: string) {
  const client = publicClient();
  expect(
    (
      await client.auth.signInWithPassword({
        email,
        password: process.env.TEST_DEMO_PASSWORD ?? '',
      })
    ).error,
  ).toBeNull();
  return client;
}

// Trusted isolated provisioning only: no browser/API caller can select a clock.
// Authentication/session validation continues to use PostgreSQL's real clock.
function setCompanyInstant(instant?: string) {
  if (instant && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(instant))
    throw new Error('Invalid fixture instant.');

  const clock = instant ? `'${instant}'::timestamptz` : 'now()';
  provisionFixture(`create or replace function private.company_today()
    returns date language sql stable security invoker set search_path='' as $$
      select (${clock} at time zone 'Asia/Kuala_Lumpur')::date;
    $$;
    revoke all on function private.company_today() from public,anon,authenticated;`);
}

for (const boundary of [
  {
    instant: '2027-01-04T15:59:59Z',
    accepted: true,
    status: 'cancelled',
    used: 0,
  },
  {
    instant: '2027-01-04T16:00:00Z',
    accepted: false,
    status: 'approved',
    used: 3,
  },
]) {
  test(`submission and deactivation respect Kuala Lumpur midnight at ${boundary.instant}`, async () => {
    const applicant = lifecycleAccount();
    const departing = lifecycleAccount();
    const owner = await login(applicant.email);
    const hr = await login('aisha@hr.example.test');
    const approvedId = randomUUID();

    try {
      setCompanyInstant(boundary.instant);
      const submitted = await owner.rpc('submit_leave_request', {
        p_type: 'Annual',
        p_start_date: '2027-01-04',
        p_end_date: '2027-01-04',
        p_reason: 'Company midnight fixture',
      });

      if (boundary.accepted) {
        expect(submitted.error).toBeNull();
        expect(
          (
            await owner
              .from('leave_requests')
              .select('*')
              .eq('id', submitted.data)
              .single()
          ).data,
        ).toMatchObject({ start_date: '2027-01-04', charged_days: 1 });
      } else {
        expect(submitted.error?.message).toContain(
          'today or later in Kuala Lumpur',
        );
        expect((await owner.from('leave_requests').select('*')).data).toEqual(
          [],
        );
      }

      // Set up an existing approval spanning the cutoff; assert via public APIs.
      provisionFixture(`insert into private.leave_entitlements(employee_id,leave_year,leave_type)
        values('${departing.employeeId}',2027,'Annual');
        insert into private.leave_requests(id,employee_id,leave_type,start_date,end_date,charged_days,status)
        values('${approvedId}','${departing.employeeId}','Annual','2027-01-04','2027-01-06',3,'approved');
        insert into private.leave_allocations(request_id,employee_id,leave_year,leave_type,used_days)
        values('${approvedId}','${departing.employeeId}',2027,'Annual',3);
        insert into private.leave_history(request_id,actor_employee_id,action)
        values('${approvedId}','${departing.employeeId}','submitted'),
          ('${approvedId}',(select employee_id from public.employee_records where work_email='aisha@hr.example.test'),'approved');`);

      expect(
        (
          await hr.rpc('deactivate_employee', {
            p_employee_id: departing.employeeId,
          })
        ).error,
      ).toBeNull();
      const approvals = await hr.rpc('get_approval_requests');
      expect(approvals.error).toBeNull();
      expect(
        approvals.data.find(
          (request: { id: string }) => request.id === approvedId,
        ),
      ).toMatchObject({ status: boundary.status, charged_days: 3 });
      const balances = await hr.rpc('get_leave_balances', {
        p_employee_id: departing.employeeId,
        p_year: 2027,
      });
      expect(balances.error).toBeNull();
      expect(
        balances.data.find(
          (balance: { leave_type: string }) => balance.leave_type === 'Annual',
        ),
      ).toMatchObject({
        used_days: boundary.used,
        reserved_days: 0,
        available_days: 14 - boundary.used,
      });
      const history = await hr.rpc('get_approval_history', {
        p_request_id: approvedId,
      });
      expect(history.error).toBeNull();
      expect(history.data).toHaveLength(boundary.accepted ? 3 : 2);
      expect((await owner.rpc('company_today')).error).not.toBeNull();
    } finally {
      setCompanyInstant();
      removeLifecycleAccount(applicant);
      removeLifecycleAccount(departing);
      await owner.auth.signOut({ scope: 'local' });
      await hr.auth.signOut({ scope: 'local' });
    }
  });
}
