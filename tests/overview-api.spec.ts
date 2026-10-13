import { test, expect } from '@playwright/test';
import { provisionFixture, publicClient } from './helpers';

async function signedIn(email: string) {
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

test('an Employee overview uses persisted active headcount and only their own leave', async () => {
  const employee = await signedIn('maya@hr.example.test');
  const hr = await signedIn('aisha@hr.example.test');
  const records =
    (await hr.from('employee_profiles').select('is_active')).data ?? [];
  const expectedHeadcount = records.filter((record) => record.is_active).length;
  try {
    const result = await employee.rpc('get_workspace_overview');
    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      active_headcount: expectedHeadcount,
      summaries: [
        {
          scope: 'own',
          total_requests: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          cancelled: 0,
        },
      ],
    });
  } finally {
    await employee.auth.signOut({ scope: 'local' });
    await hr.auth.signOut({ scope: 'local' });
  }
});

test('persisted submissions, decisions and reporting changes update each authorized aggregate scope', async () => {
  const employee = await signedIn('maya@hr.example.test');
  const manager = await signedIn('daniel@hr.example.test');
  const hr = await signedIn('aisha@hr.example.test');
  const profiles = (await hr.from('employee_profiles').select('*')).data ?? [];
  const expectedHeadcount = profiles.filter(
    (record) => record.is_active,
  ).length;
  const maya = profiles.find((p) => p.work_email === 'maya@hr.example.test');
  const daniel = profiles.find(
    (p) => p.work_email === 'daniel@hr.example.test',
  );
  provisionFixture(
    `update public.employee_records set manager_id='${daniel.employee_id}' where employee_id='${maya.employee_id}';`,
  );
  try {
    for (const [client, start] of [
      [employee, '2038-02-01'],
      [employee, '2038-02-02'],
      [manager, '2038-02-03'],
      [hr, '2038-02-04'],
    ] as const) {
      const submitted = await client.rpc('submit_leave_request', {
        p_type: 'Annual',
        p_start_date: start,
        p_end_date: start,
        p_reason: 'Overview API fixture',
      });
      expect(submitted.error).toBeNull();
    }
    expect(
      (await employee.rpc('get_workspace_overview')).data?.summaries,
    ).toEqual([
      {
        scope: 'own',
        total_requests: 2,
        pending: 2,
        approved: 0,
        rejected: 0,
        cancelled: 0,
      },
    ]);
    expect(
      (await manager.rpc('get_workspace_overview')).data?.summaries,
    ).toEqual([
      {
        scope: 'own',
        total_requests: 1,
        pending: 1,
        approved: 0,
        rejected: 0,
        cancelled: 0,
      },
      {
        scope: 'direct_reports',
        total_requests: 2,
        pending: 2,
        approved: 0,
        rejected: 0,
        cancelled: 0,
      },
    ]);
    expect((await hr.rpc('get_workspace_overview')).data?.summaries).toEqual([
      {
        scope: 'own',
        total_requests: 1,
        pending: 1,
        approved: 0,
        rejected: 0,
        cancelled: 0,
      },
      {
        scope: 'company',
        total_requests: 4,
        pending: 4,
        approved: 0,
        rejected: 0,
        cancelled: 0,
      },
    ]);
    const requests =
      (await employee.from('leave_requests').select('*').order('start_date'))
        .data ?? [];
    expect(
      (
        await manager.rpc('decide_leave_request', {
          p_request_id: requests[0].id,
          p_decision: 'approved',
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await manager.rpc('decide_leave_request', {
          p_request_id: requests[1].id,
          p_decision: 'rejected',
          p_reason: 'Overview decision fixture',
        })
      ).error,
    ).toBeNull();
    expect(
      (await manager.rpc('get_workspace_overview')).data?.summaries[1],
    ).toEqual({
      scope: 'direct_reports',
      total_requests: 2,
      pending: 0,
      approved: 1,
      rejected: 1,
      cancelled: 0,
    });
    expect(
      (await hr.rpc('get_workspace_overview')).data?.summaries[1],
    ).toMatchObject({
      total_requests: 4,
      pending: 2,
      approved: 1,
      rejected: 1,
    });
    const saved = await hr.rpc('save_employee', {
      p_employee_id: maya.employee_id,
      p_full_name: maya.full_name,
      p_work_email: maya.work_email,
      p_job_title: maya.job_title,
      p_department_id: maya.department_id,
      p_manager_id: null,
      p_start_date: maya.start_date,
      p_job_level: maya.job_level,
    });
    expect(saved.error).toBeNull();
    expect(
      (await manager.rpc('get_workspace_overview')).data?.summaries[1],
    ).toMatchObject({ total_requests: 0, approved: 0, rejected: 0 });
    provisionFixture(
      `update private.employee_access set is_active=false where employee_id='${maya.employee_id}';`,
    );
    expect((await hr.rpc('get_workspace_overview')).data).toMatchObject({
      active_headcount: expectedHeadcount - 1,
      summaries: [{ scope: 'own' }, { scope: 'company', total_requests: 4 }],
    });
    expect((await employee.rpc('get_workspace_overview')).error?.code).toBe(
      '42501',
    );
  } finally {
    provisionFixture(
      `delete from private.leave_requests where reason='Overview API fixture'; update private.employee_access set is_active=true where employee_id='${maya.employee_id}'; update public.employee_records set manager_id=${maya.manager_id ? `'${maya.manager_id}'` : 'null'} where employee_id='${maya.employee_id}';`,
    );
    await Promise.all([
      employee.auth.signOut({ scope: 'local' }),
      manager.auth.signOut({ scope: 'local' }),
      hr.auth.signOut({ scope: 'local' }),
    ]);
  }
});

test('anonymous, forged scope and metadata, and revoked tokens cannot access broader overview aggregates', async () => {
  expect((await publicClient().rpc('get_workspace_overview')).error?.code).toBe(
    '42501',
  );
  const employee = await signedIn('maya@hr.example.test');
  try {
    expect(
      (
        await employee.rpc('get_workspace_overview', {
          p_role: 'hr_administrator',
          p_scope: 'company',
        })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await employee.auth.updateUser({
          data: { role: 'hr_administrator', scope: 'company' },
        })
      ).error,
    ).toBeNull();
    const refreshed = await employee.auth.refreshSession();
    expect(refreshed.error).toBeNull();
    const result = await employee.rpc('get_workspace_overview');
    expect(result.data?.summaries).toHaveLength(1);
    expect(result.data?.summaries[0].scope).toBe('own');
    expect(Object.keys(result.data)).toEqual(
      expect.arrayContaining(['active_headcount', 'summaries']),
    );
    expect(JSON.stringify(result.data)).not.toMatch(
      /employee_id|reason|leave_type|work_email/,
    );
    const oldToken = refreshed.data.session?.access_token;
    expect(oldToken).toBeTruthy();
    await employee.auth.signOut({ scope: 'local' });
    expect(
      (await publicClient(oldToken).rpc('get_workspace_overview')).error?.code,
    ).toBe('42501');
  } finally {
    await employee.auth.signOut({ scope: 'local' });
  }
});
