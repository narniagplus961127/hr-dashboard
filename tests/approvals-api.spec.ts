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

function pending(id: string, owner: string) {
  return `insert into private.leave_entitlements(employee_id,leave_year,leave_type) values('${owner}',2050,'Sick') on conflict do nothing;
    insert into private.leave_requests(id,employee_id,leave_type,start_date,end_date,charged_days,reason) values('${id}','${owner}','Sick','2050-01-03','2050-01-04',2,'Approval routing fixture');
    insert into private.leave_allocations(request_id,employee_id,leave_year,leave_type,reserved_days) values('${id}','${owner}',2050,'Sick',2);
    insert into private.leave_history(request_id,actor_employee_id,action) values('${id}','${owner}','submitted');`;
}

test('the assigned Manager approves once and the owner sees usage and attributed history', async () => {
  const hr = publicClient();
  expect(
    (
      await hr.auth.signInWithPassword({
        email: 'aisha@hr.example.test',
        password: process.env.TEST_DEMO_PASSWORD ?? '',
      })
    ).error,
  ).toBeNull();
  const profiles = await hr.from('employee_profiles').select('*');
  const maya = profiles.data?.find(
    (p) => p.work_email === 'maya@hr.example.test',
  );
  const daniel = profiles.data?.find(
    (p) => p.work_email === 'daniel@hr.example.test',
  );
  provisionFixture(
    `update public.employee_records set manager_id='${daniel.employee_id}' where employee_id='${maya.employee_id}';`,
  );
  const owner = publicClient();
  const manager = publicClient();
  await owner.auth.signInWithPassword({
    email: 'maya@hr.example.test',
    password: process.env.TEST_DEMO_PASSWORD ?? '',
  });
  await manager.auth.signInWithPassword({
    email: 'daniel@hr.example.test',
    password: process.env.TEST_DEMO_PASSWORD ?? '',
  });
  const submitted = await owner.rpc('submit_leave_request', {
    p_type: 'Annual',
    p_start_date: '2036-01-07',
    p_end_date: '2036-01-07',
    p_reason: 'Approval API fixture',
  });
  expect(submitted.error).toBeNull();

  try {
    const result = await manager.rpc('decide_leave_request', {
      p_request_id: submitted.data,
      p_decision: 'approved',
    });
    expect(result.error).toBeNull();
    const request = await owner
      .from('leave_requests')
      .select('*')
      .eq('id', submitted.data)
      .single();
    expect(request.data?.status).toBe('approved');
    const balances = await owner.rpc('get_leave_balances', { p_year: 2036 });
    expect(
      balances.data?.find(
        (b: { leave_type: string }) => b.leave_type === 'Annual',
      ),
    ).toMatchObject({
      allowance: 14,
      reserved_days: 0,
      used_days: 1,
      available_days: 13,
    });
    const history = await owner
      .from('leave_history')
      .select('*')
      .eq('request_id', submitted.data);
    expect(history.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'approved',
          actor_name: 'Daniel Lee',
        }),
      ]),
    );
    expect(
      (
        await manager.rpc('decide_leave_request', {
          p_request_id: submitted.data,
          p_decision: 'approved',
        })
      ).error?.code,
    ).toBe('22023');
    expect(
      (
        await owner
          .from('leave_history')
          .select('*')
          .eq('request_id', submitted.data)
      ).data,
    ).toHaveLength(2);
  } finally {
    provisionFixture(
      `delete from private.leave_requests where id='${submitted.data}'; update public.employee_records set manager_id=${maya.manager_id ? `'${maya.manager_id}'` : 'null'} where employee_id='${maya.employee_id}';`,
    );
    await Promise.all([
      owner.auth.signOut({ scope: 'local' }),
      manager.auth.signOut({ scope: 'local' }),
      hr.auth.signOut({ scope: 'local' }),
    ]);
  }
});

test('approval visibility and decisions follow current routing, HR exceptions, and trusted roles', async () => {
  const hr = await signedIn('aisha@hr.example.test');
  const otherHr = await signedIn('grace@hr.example.test');
  const manager = await signedIn('daniel@hr.example.test');
  const owner = await signedIn('maya@hr.example.test');
  const profiles = await hr.from('employee_profiles').select('*');
  const maya = profiles.data?.find(
    (p) => p.work_email === 'maya@hr.example.test',
  );
  const daniel = profiles.data?.find(
    (p) => p.work_email === 'daniel@hr.example.test',
  );
  const aisha = profiles.data?.find(
    (p) => p.work_email === 'aisha@hr.example.test',
  );
  const grace = profiles.data?.find(
    (p) => p.work_email === 'grace@hr.example.test',
  );
  const requests = [
    crypto.randomUUID(),
    crypto.randomUUID(),
    crypto.randomUUID(),
    crypto.randomUUID(),
    crypto.randomUUID(),
  ];
  provisionFixture(
    `update public.employee_records set manager_id='${daniel.employee_id}' where employee_id='${maya.employee_id}'; ${pending(requests[0], maya.employee_id)} ${pending(requests[1], daniel.employee_id)} ${pending(requests[2], aisha.employee_id)} ${pending(requests[3], grace.employee_id)} ${pending(requests[4], maya.employee_id)}`,
  );

  try {
    const managerQueue = await manager.rpc('get_approval_requests');
    expect(managerQueue.error).toBeNull();
    expect(managerQueue.data?.map((r: { id: string }) => r.id)).toEqual(
      expect.arrayContaining([requests[0], requests[4]]),
    );
    expect(
      managerQueue.data?.some((r: { id: string }) => r.id === requests[1]),
    ).toBe(false);
    provisionFixture(
      `update private.employee_access set role='manager' where employee_id='${grace.employee_id}';`,
    );
    expect(
      (await otherHr.rpc('get_approval_requests')).data?.some(
        (r: { id: string }) => r.id === requests[0],
      ),
    ).toBe(false);
    expect(
      (
        await otherHr.rpc('decide_leave_request', {
          p_request_id: requests[0],
          p_decision: 'approved',
        })
      ).error?.code,
    ).toBe('42501');
    provisionFixture(
      `update private.employee_access set role='hr_administrator' where employee_id='${grace.employee_id}';`,
    );
    const hrQueue = await hr.rpc('get_approval_requests');
    expect(hrQueue.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: requests[0], can_decide: false }),
        expect.objectContaining({ id: requests[1], can_decide: true }),
        expect.objectContaining({ id: requests[2], can_decide: false }),
      ]),
    );
    expect(
      (await manager.rpc('get_approval_history', { p_request_id: requests[2] }))
        .error?.code,
    ).toBe('42501');
    expect(
      (await hr.rpc('get_approval_history', { p_request_id: requests[0] }))
        .data,
    ).toHaveLength(1);
    expect(
      (
        await hr.rpc('decide_leave_request', {
          p_request_id: requests[0],
          p_decision: 'approved',
        })
      ).error?.code,
    ).toBe('42501');
    expect(
      (
        await manager.rpc('decide_leave_request', {
          p_request_id: requests[1],
          p_decision: 'approved',
        })
      ).error?.code,
    ).toBe('42501');
    expect(
      (
        await hr.rpc('decide_leave_request', {
          p_request_id: requests[2],
          p_decision: 'rejected',
          p_reason: 'Self rejection',
        })
      ).error?.code,
    ).toBe('42501');
    expect(
      (
        await otherHr.rpc('decide_leave_request', {
          p_request_id: requests[2],
          p_decision: 'approved',
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await hr.rpc('decide_leave_request', {
          p_request_id: requests[1],
          p_decision: 'approved',
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await otherHr.rpc('decide_leave_request', {
          p_request_id: requests[3],
          p_decision: 'approved',
        })
      ).error?.code,
    ).toBe('42501');

    expect(
      (await owner.auth.updateUser({ data: { role: 'hr_administrator' } }))
        .error,
    ).toBeNull();
    expect((await owner.rpc('get_approval_requests')).error?.code).toBe(
      '42501',
    );
    expect((await owner.rpc('get_approval_history')).error?.code).toBe('42501');
    expect(
      (
        await owner.rpc('decide_leave_request', {
          p_request_id: requests[0],
          p_decision: 'approved',
        })
      ).error?.code,
    ).toBe('42501');
    expect(
      (await publicClient().rpc('get_approval_requests')).error,
    ).not.toBeNull();
    const copied = publicClient(
      (await manager.auth.getSession()).data.session?.access_token,
    );
    await manager.auth.signOut({ scope: 'local' });
    expect((await copied.rpc('get_approval_requests')).error?.code).toBe(
      '42501',
    );

    provisionFixture(
      `update public.employee_records set manager_id=null where employee_id='${maya.employee_id}';`,
    );
    expect(
      (
        await hr.rpc('decide_leave_request', {
          p_request_id: requests[0],
          p_decision: 'rejected',
          p_reason: '   ',
        })
      ).error?.code,
    ).toBe('22023');
    expect(
      (
        await hr.rpc('decide_leave_request', {
          p_request_id: requests[0],
          p_decision: 'cancelled',
        })
      ).error?.code,
    ).toBe('22023');
    expect(
      (
        await hr.rpc('decide_leave_request', {
          p_request_id: requests[0],
          p_decision: 'rejected',
          p_reason: 'Choose a different date.',
        })
      ).error,
    ).toBeNull();
    const ownerHistory = await owner
      .from('leave_history')
      .select('*')
      .eq('request_id', requests[0]);
    expect(ownerHistory.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'rejected',
          actor_name: 'Aisha Rahman',
          reason: 'Choose a different date.',
        }),
      ]),
    );
    provisionFixture(
      `update public.employee_records set manager_id='${daniel.employee_id}' where employee_id='${maya.employee_id}'; update private.employee_access set is_active=false where employee_id='${daniel.employee_id}';`,
    );
    expect((await hr.rpc('get_approval_requests')).data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: requests[4], can_decide: true }),
      ]),
    );
    expect(
      (
        await hr.rpc('decide_leave_request', {
          p_request_id: requests[4],
          p_decision: 'approved',
        })
      ).error,
    ).toBeNull();
    expect(
      (await owner.rpc('get_leave_balances', { p_year: 2050 })).data?.find(
        (r: { leave_type: string }) => r.leave_type === 'Sick',
      ),
    ).toMatchObject({ reserved_days: 0, used_days: 2, available_days: 12 });
  } finally {
    provisionFixture(
      `delete from private.leave_requests where id in (${requests.map((id) => `'${id}'`).join(',')}); update private.employee_access set role='hr_administrator' where employee_id='${grace.employee_id}'; update private.employee_access set is_active=true where employee_id='${daniel.employee_id}'; update public.employee_records set manager_id=${maya.manager_id ? `'${maya.manager_id}'` : 'null'} where employee_id='${maya.employee_id}';`,
    );
    await Promise.all(
      [hr, otherHr, manager, owner].map((c) =>
        c.auth.signOut({ scope: 'local' }),
      ),
    );
  }
});

test('competing HR decisions produce one transition and release or transfer days once', async () => {
  const hr = await signedIn('aisha@hr.example.test');
  const otherHr = await signedIn('grace@hr.example.test');
  const owner = await signedIn('daniel@hr.example.test');
  const profiles = await hr.from('employee_profiles').select('*');
  const daniel = profiles.data?.find(
    (p) => p.work_email === 'daniel@hr.example.test',
  );
  const id = crypto.randomUUID();
  provisionFixture(pending(id, daniel.employee_id));

  try {
    const results = await Promise.all([
      hr.rpc('decide_leave_request', {
        p_request_id: id,
        p_decision: 'approved',
      }),
      otherHr.rpc('decide_leave_request', {
        p_request_id: id,
        p_decision: 'rejected',
        p_reason: 'Race rejection',
      }),
    ]);
    expect(results.filter((r) => r.error === null)).toHaveLength(1);
    expect(results.find((r) => r.error)?.error?.code).toBe('22023');
    const request = await owner
      .from('leave_requests')
      .select('*')
      .eq('id', id)
      .single();
    expect(['approved', 'rejected']).toContain(request.data?.status);
    const history = await owner
      .from('leave_history')
      .select('*')
      .eq('request_id', id);
    expect(history.data).toHaveLength(2);
    const balances = await owner.rpc('get_leave_balances', { p_year: 2050 });
    expect(
      balances.data?.find(
        (b: { leave_type: string }) => b.leave_type === 'Sick',
      ),
    ).toMatchObject({
      reserved_days: 0,
      used_days: request.data?.status === 'approved' ? 2 : 0,
      available_days: request.data?.status === 'approved' ? 12 : 14,
    });
    expect(
      (
        await hr.rpc('decide_leave_request', {
          p_request_id: id,
          p_decision: 'approved',
        })
      ).error?.code,
    ).toBe('22023');
    expect(
      (await owner.from('leave_history').select('*').eq('request_id', id)).data,
    ).toHaveLength(2);
  } finally {
    provisionFixture(`delete from private.leave_requests where id='${id}';`);
    await Promise.all(
      [hr, otherHr, owner].map((c) => c.auth.signOut({ scope: 'local' })),
    );
  }
});
