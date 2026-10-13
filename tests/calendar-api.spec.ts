import { test, expect } from '@playwright/test';
import { publicClient, provisionFixture } from './helpers';

test('Shared calendar exposes only approved Away identity and dates to active users', async () => {
  const owner = publicClient();
  const manager = publicClient();
  const hr = publicClient();
  for (const [client, email] of [
    [owner, 'maya@hr.example.test'],
    [manager, 'daniel@hr.example.test'],
    [hr, 'aisha@hr.example.test'],
  ] as const) {
    expect(
      (
        await client.auth.signInWithPassword({
          email,
          password: process.env.TEST_DEMO_PASSWORD ?? '',
        })
      ).error,
    ).toBeNull();
  }
  const ids: string[] = [];
  try {
    const submitted = await owner.rpc('submit_leave_request', {
      p_type: 'Sick',
      p_start_date: '2046-01-05',
      p_end_date: '2046-01-08',
      p_reason: 'Private calendar reason',
    });
    expect(submitted.error).toBeNull();
    ids.push(submitted.data);
    const pending = await hr.rpc('get_calendar_absences');
    expect(pending.error).toBeNull();
    expect(pending.data).toEqual([]);
    expect(
      (
        await manager.rpc('decide_leave_request', {
          p_request_id: submitted.data,
          p_decision: 'approved',
        })
      ).error,
    ).toBeNull();
    for (const client of [owner, manager, hr]) {
      const response = await client.rpc('get_calendar_absences');
      expect(response.error).toBeNull();
      expect(response.data).toHaveLength(1);
      expect(Object.keys(response.data[0]).sort()).toEqual([
        'employee_id',
        'end_date',
        'full_name',
        'start_date',
      ]);
      expect(response.data[0]).toMatchObject({
        full_name: 'Maya Tan',
        start_date: '2046-01-05',
        end_date: '2046-01-08',
      });
      expect(JSON.stringify(response.data)).not.toContain(
        'Private calendar reason',
      );
      expect(JSON.stringify(response.data)).not.toContain('Sick');
    }
    expect(
      (
        await manager
          .from('leave_requests')
          .select('*')
          .eq('id', submitted.data)
      ).data,
    ).toEqual([]);
    expect(
      (await hr.rpc('cancel_leave_request', { p_request_id: submitted.data }))
        .error,
    ).toBeNull();
    expect((await owner.rpc('get_calendar_absences')).data).toEqual([]);
    expect(
      (
        await owner
          .from('leave_history')
          .select('*')
          .eq('request_id', submitted.data)
      ).data,
    ).toHaveLength(3);
    const rejected = await owner.rpc('submit_leave_request', {
      p_type: 'Annual',
      p_start_date: '2046-02-05',
      p_end_date: '2046-02-05',
    });
    expect(rejected.error).toBeNull();
    ids.push(rejected.data);
    expect(
      (
        await manager.rpc('decide_leave_request', {
          p_request_id: rejected.data,
          p_decision: 'rejected',
          p_reason: 'Not available',
        })
      ).error,
    ).toBeNull();
    const cancelledPending = await owner.rpc('submit_leave_request', {
      p_type: 'Annual',
      p_start_date: '2046-03-05',
      p_end_date: '2046-03-05',
    });
    expect(cancelledPending.error).toBeNull();
    ids.push(cancelledPending.data);
    expect(
      (
        await owner.rpc('cancel_leave_request', {
          p_request_id: cancelledPending.data,
        })
      ).error,
    ).toBeNull();
    expect((await owner.rpc('get_calendar_absences')).data).toEqual([]);
    const profile = (
      await owner.from('employee_profiles').select('employee_id').single()
    ).data;
    if (!profile) throw new Error('Expected the active owner profile.');
    provisionFixture(
      `update private.employee_access set is_active=false where employee_id='${profile.employee_id}';`,
    );
    try {
      expect((await owner.rpc('get_calendar_absences')).error?.code).toBe(
        '42501',
      );
    } finally {
      provisionFixture(
        `update private.employee_access set is_active=true where employee_id='${profile.employee_id}';`,
      );
    }
    expect(
      (await publicClient().rpc('get_calendar_absences')).error,
    ).not.toBeNull();
    expect(
      (
        await owner.rpc('get_calendar_absences', {
          p_employee_id: '00000000-0000-0000-0000-000000000000',
        })
      ).error,
    ).not.toBeNull();
    const stale = publicClient(
      (await owner.auth.getSession()).data.session?.access_token,
    );
    await owner.auth.signOut({ scope: 'local' });
    expect((await stale.rpc('get_calendar_absences')).error?.code).toBe(
      '42501',
    );
  } finally {
    if (ids.length)
      provisionFixture(
        `delete from private.leave_requests where id in (${ids.map((id) => `'${id}'`).join(',')});`,
      );
    await Promise.all(
      [owner, manager, hr].map((client) =>
        client.auth.signOut({ scope: 'local' }),
      ),
    );
  }
});
