import { test, expect } from '@playwright/test';
import { provisionFixture, publicClient } from './helpers';

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

test('owner cancels pending leave once, retains history, and can resubmit', async () => {
  const owner = await login('maya@hr.example.test');
  const result = await owner.rpc('submit_leave_request', {
    p_type: 'Annual',
    p_start_date: '2041-01-07',
    p_end_date: '2041-01-07',
    p_reason: 'Cancellation API fixture',
  });
  expect(result.error).toBeNull();
  const ids = [result.data];
  try {
    expect(
      (
        await owner.rpc('cancel_leave_request', {
          p_request_id: result.data,
          p_reason: 'Changed plans',
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await owner
          .from('leave_requests')
          .select('*')
          .eq('id', result.data)
          .single()
      ).data,
    ).toMatchObject({ status: 'cancelled', charged_days: 1 });
    expect(
      (
        await owner
          .from('leave_history')
          .select('*')
          .eq('request_id', result.data)
      ).data,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: 'submitted' }),
        expect.objectContaining({
          action: 'cancelled',
          actor_name: 'Maya Tan',
          reason: 'Changed plans',
          created_at: expect.any(String),
        }),
      ]),
    );
    expect(
      (await owner.rpc('get_leave_balances', { p_year: 2041 })).data?.find(
        (b: { leave_type: string }) => b.leave_type === 'Annual',
      ),
    ).toMatchObject({ reserved_days: 0, used_days: 0, available_days: 14 });
    expect(
      (await owner.rpc('cancel_leave_request', { p_request_id: result.data }))
        .error?.code,
    ).toBe('22023');
    const replacement = await owner.rpc('submit_leave_request', {
      p_type: 'Annual',
      p_start_date: '2041-01-07',
      p_end_date: '2041-01-07',
    });
    expect(replacement.error).toBeNull();
    ids.push(replacement.data);
  } finally {
    provisionFixture(
      `delete from private.leave_requests where id in (${ids.map((id) => `'${id}'`).join(',')});`,
    );
    await owner.auth.signOut({ scope: 'local' });
  }
});

test('cancellation enforces current roles and state; HR releases approved usage including their own leave', async () => {
  const owner = await login('maya@hr.example.test');
  const manager = await login('daniel@hr.example.test');
  const hr = await login('aisha@hr.example.test');
  const otherHr = await login('grace@hr.example.test');
  const ids: string[] = [];
  try {
    const profiles = (await hr.from('employee_profiles').select('*')).data;
    const maya = profiles?.find((p) => p.work_email === 'maya@hr.example.test');
    const originalManager = maya.manager_id;
    const daniel = profiles?.find(
      (p) => p.work_email === 'daniel@hr.example.test',
    );
    provisionFixture(
      `update public.employee_records set manager_id='${daniel.employee_id}' where employee_id='${maya.employee_id}';`,
    );
    try {
      const submitted = await owner.rpc('submit_leave_request', {
        p_type: 'Sick',
        p_start_date: '2042-01-06',
        p_end_date: '2042-01-07',
      });
      expect(submitted.error).toBeNull();
      ids.push(submitted.data);
      for (const client of [manager, hr, publicClient()])
        expect(
          (
            await client.rpc('cancel_leave_request', {
              p_request_id: submitted.data,
            })
          ).error,
        ).not.toBeNull();
      expect(
        (
          await owner
            .from('leave_requests')
            .update({ start_date: '2042-02-03' })
            .eq('id', submitted.data)
        ).error,
      ).not.toBeNull();
      expect(
        (
          await owner.rpc('cancel_leave_request', {
            p_request_id: submitted.data,
            p_reason: 'x'.repeat(1001),
          })
        ).error?.code,
      ).toBe('22023');
      expect(
        (
          await manager.rpc('decide_leave_request', {
            p_request_id: submitted.data,
            p_decision: 'approved',
          })
        ).error,
      ).toBeNull();
      expect(
        (
          await owner.rpc('cancel_leave_request', {
            p_request_id: submitted.data,
          })
        ).error?.code,
      ).toBe('42501');
      const competing = await Promise.all(
        [hr, otherHr].map((client) =>
          client.rpc('cancel_leave_request', {
            p_request_id: submitted.data,
            p_reason: 'HR correction',
          }),
        ),
      );
      expect(competing.filter((r) => !r.error)).toHaveLength(1);
      expect(competing.find((r) => r.error)?.error?.code).toBe('22023');
      expect(
        (await owner.rpc('get_leave_balances', { p_year: 2042 })).data?.find(
          (b: { leave_type: string }) => b.leave_type === 'Sick',
        ),
      ).toMatchObject({ reserved_days: 0, used_days: 0, available_days: 14 });
      expect(
        (
          await owner
            .from('leave_history')
            .select('*')
            .eq('request_id', submitted.data)
        ).data,
      ).toHaveLength(3);
      const ownHr = await hr.rpc('submit_leave_request', {
        p_type: 'Sick',
        p_start_date: '2042-03-03',
        p_end_date: '2042-03-03',
      });
      expect(ownHr.error).toBeNull();
      ids.push(ownHr.data);
      expect(
        (
          await otherHr.rpc('decide_leave_request', {
            p_request_id: ownHr.data,
            p_decision: 'approved',
          })
        ).error,
      ).toBeNull();
      expect(
        (await hr.rpc('cancel_leave_request', { p_request_id: ownHr.data }))
          .error,
      ).toBeNull();
      const copied = publicClient(
        (await owner.auth.getSession()).data.session?.access_token,
      );
      await owner.auth.signOut({ scope: 'local' });
      expect(
        (
          await copied.rpc('cancel_leave_request', {
            p_request_id: submitted.data,
          })
        ).error?.code,
      ).toBe('42501');
    } finally {
      provisionFixture(
        `update public.employee_records set manager_id=${originalManager ? `'${originalManager}'` : 'null'} where employee_id='${maya.employee_id}';`,
      );
    }
  } finally {
    if (ids.length)
      provisionFixture(
        `delete from private.leave_requests where id in (${ids.map((id) => `'${id}'`).join(',')});`,
      );
    await Promise.all(
      [owner, manager, hr, otherHr].map((c) =>
        c.auth.signOut({ scope: 'local' }),
      ),
    );
  }
});

test('competing owner cancellations and approval races preserve a single legal allocation', async () => {
  const owner = await login('daniel@hr.example.test');
  const hr = await login('aisha@hr.example.test');
  const ids: string[] = [];
  try {
    const submitted = await owner.rpc('submit_leave_request', {
      p_type: 'Annual',
      p_start_date: '2043-01-05',
      p_end_date: '2043-01-05',
    });
    expect(submitted.error).toBeNull();
    ids.push(submitted.data);
    const results = await Promise.all(
      [1, 2].map(() =>
        owner.rpc('cancel_leave_request', { p_request_id: submitted.data }),
      ),
    );
    expect(results.filter((r) => !r.error)).toHaveLength(1);
    expect(results.find((r) => r.error)?.error?.code).toBe('22023');
    expect(
      (
        await owner
          .from('leave_history')
          .select('*')
          .eq('request_id', submitted.data)
      ).data,
    ).toHaveLength(2);
    const race = await owner.rpc('submit_leave_request', {
      p_type: 'Annual',
      p_start_date: '2043-02-02',
      p_end_date: '2043-02-02',
    });
    expect(race.error).toBeNull();
    ids.push(race.data);
    const actions = await Promise.all([
      owner.rpc('cancel_leave_request', { p_request_id: race.data }),
      hr.rpc('decide_leave_request', {
        p_request_id: race.data,
        p_decision: 'approved',
      }),
    ]);
    expect(actions.filter((r) => !r.error)).toHaveLength(1);
    const request = (
      await owner
        .from('leave_requests')
        .select('*')
        .eq('id', race.data)
        .single()
    ).data;
    expect(['approved', 'cancelled']).toContain(request.status);
    expect(
      (
        await owner
          .from('leave_history')
          .select('*')
          .eq('request_id', race.data)
      ).data,
    ).toHaveLength(2);
    expect(
      (await owner.rpc('get_leave_balances', { p_year: 2043 })).data?.find(
        (b: { leave_type: string }) => b.leave_type === 'Annual',
      ),
    ).toMatchObject({
      reserved_days: 0,
      used_days: request.status === 'approved' ? 1 : 0,
      available_days: request.status === 'approved' ? 13 : 14,
    });
  } finally {
    if (ids.length)
      provisionFixture(
        `delete from private.leave_requests where id in (${ids.map((id) => `'${id}'`).join(',')});`,
      );
    await Promise.all(
      [owner, hr].map((c) => c.auth.signOut({ scope: 'local' })),
    );
  }
});
