import { test, expect } from '@playwright/test';
import { publicClient, provisionFixture } from './helpers';

async function login(email = 'maya@hr.example.test') {
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

function cleanup() {
  provisionFixture(
    "delete from private.leave_requests where reason like 'Submission API fixture%'; delete from public.company_holidays where name='Submission API fixture holiday';",
  );
}

test('submission excludes weekends and company holidays, and rejects invalid or unavailable dates atomically', async () => {
  const owner = await login();
  const hr = await login('aisha@hr.example.test');
  cleanup();
  expect(
    (
      await hr.from('company_holidays').insert({
        holiday_date: '2037-01-06',
        name: 'Submission API fixture holiday',
      })
    ).error,
  ).toBeNull();
  const args = {
    p_type: 'Annual',
    p_start_date: '2037-01-05',
    p_end_date: '2037-01-11',
    p_reason: 'Submission API fixture holiday calculation',
  };

  try {
    const submitted = await owner.rpc('submit_leave_request', args);
    expect(submitted.error).toBeNull();
    const request = await owner
      .from('leave_requests')
      .select('*')
      .eq('id', submitted.data)
      .single();
    expect(request.data).toMatchObject({
      charged_days: 4,
      status: 'pending',
      leave_type: 'Annual',
    });
    const history = await owner
      .from('leave_history')
      .select('*')
      .eq('request_id', submitted.data);
    expect(history.data).toHaveLength(1);
    expect(history.data?.[0]).toMatchObject({
      action: 'submitted',
      actor_name: 'Maya Tan',
    });
    const balance = await owner.rpc('get_leave_balances', { p_year: 2037 });
    expect(
      balance.data?.find(
        (row: { leave_type: string }) => row.leave_type === 'Annual',
      ),
    ).toMatchObject({ reserved_days: 4, used_days: 0, available_days: 10 });

    for (const invalid of [
      { p_start_date: '2037-01-12', p_end_date: '2037-01-11' },
      { p_start_date: '2037-01-10', p_end_date: '2037-01-11' },
      { p_start_date: '2037-01-06', p_end_date: '2037-01-06' },
      { p_start_date: '2037-12-31', p_end_date: '2038-01-02' },
      { p_start_date: '2010-01-04', p_end_date: '2010-01-05' },
      { p_type: 'Unpaid' },
      { p_start_date: null },
      { p_reason: 'x'.repeat(1001) },
      { p_start_date: '2037-01-07', p_end_date: '2037-01-07', p_type: 'Sick' },
      { p_start_date: '2037-02-02', p_end_date: '2037-02-28' },
    ]) {
      expect(
        (await owner.rpc('submit_leave_request', { ...args, ...invalid })).error
          ?.code,
      ).toBe('22023');
    }
    expect(
      (
        await owner
          .from('leave_requests')
          .select('*')
          .eq('reason', args.p_reason)
      ).data,
    ).toHaveLength(1);
    expect(
      (await owner.rpc('get_leave_balances', { p_year: 2037 })).data?.find(
        (row: { leave_type: string }) => row.leave_type === 'Annual',
      ),
    ).toMatchObject({ reserved_days: 4, available_days: 10 });
  } finally {
    cleanup();
    await owner.auth.signOut({ scope: 'local' });
    await hr.auth.signOut({ scope: 'local' });
  }
});

test('only the active owner can submit and see private requests and history', async () => {
  const owner = await login();
  const other = await login('daniel@hr.example.test');
  const hr = await login('aisha@hr.example.test');
  cleanup();
  const args = {
    p_type: 'Sick',
    p_start_date: '2038-02-01',
    p_end_date: '2038-02-01',
    p_reason: 'Submission API fixture private reason',
  };
  try {
    const created = await owner.rpc('submit_leave_request', args);
    expect(created.error).toBeNull();
    const request = await owner
      .from('leave_requests')
      .select('*')
      .eq('id', created.data)
      .single();
    expect(request.data?.reason).toBe(args.p_reason);
    const ownerId = request.data!.employee_id;
    for (const client of [other, hr]) {
      expect(
        (await client.from('leave_requests').select('*').eq('id', created.data))
          .data,
      ).toEqual([]);
      expect(
        (
          await client
            .from('leave_history')
            .select('*')
            .eq('request_id', created.data)
        ).data,
      ).toEqual([]);
      expect(
        (
          await client.rpc('submit_leave_request', {
            ...args,
            p_employee_id: ownerId,
          })
        ).error,
      ).not.toBeNull();
    }
    expect(
      (
        await owner.from('leave_requests').insert({
          ...request.data,
          id: crypto.randomUUID(),
          status: 'approved',
        })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await owner
          .from('leave_requests')
          .update({ status: 'approved' })
          .eq('id', created.data)
      ).error,
    ).not.toBeNull();
    expect(
      (await owner.from('leave_requests').delete().eq('id', created.data))
        .error,
    ).not.toBeNull();
    expect(
      (
        await owner.from('leave_history').insert({
          request_id: created.data,
          actor_employee_id: ownerId,
          action: 'approved',
        })
      ).error,
    ).not.toBeNull();
    expect(
      (await publicClient().from('leave_requests').select('*')).error,
    ).not.toBeNull();
    expect(
      (await publicClient().rpc('submit_leave_request', args)).error,
    ).not.toBeNull();
    const token = (await owner.auth.getSession()).data.session!.access_token;
    await owner.auth.signOut({ scope: 'local' });
    const stale = publicClient(token);
    expect((await stale.from('leave_requests').select('*')).data).toEqual([]);
    expect((await stale.rpc('submit_leave_request', args)).error?.code).toBe(
      '42501',
    );
  } finally {
    cleanup();
    for (const client of [owner, other, hr])
      await client.auth.signOut({ scope: 'local' });
  }
});

test('competing submissions cannot overspend or overlap across leave types', async () => {
  const owner = await login();
  const hr = await login('aisha@hr.example.test');
  cleanup();
  const profile = await owner.from('employee_profiles').select('*').single();
  const entitlement = {
    p_employee_id: profile.data!.employee_id,
    p_year: 2038,
    p_type: 'Annual',
    p_allowance: 1,
  };
  expect(
    (await hr.rpc('save_leave_entitlement', entitlement)).error,
  ).toBeNull();
  try {
    const responses = await Promise.all(
      ['2038-01-04', '2038-01-05'].map((date) =>
        owner.rpc('submit_leave_request', {
          p_type: 'Annual',
          p_start_date: date,
          p_end_date: date,
          p_reason: 'Submission API fixture concurrent allowance',
        }),
      ),
    );
    expect(
      responses.filter((response) => response.error === null),
    ).toHaveLength(1);
    expect(
      responses.find((response) => response.error)?.error?.message,
    ).toContain('Insufficient');
    expect(
      (await owner.rpc('get_leave_balances', { p_year: 2038 })).data?.find(
        (row: { leave_type: string }) => row.leave_type === 'Annual',
      ),
    ).toMatchObject({ allowance: 1, reserved_days: 1, available_days: 0 });
    cleanup();
    expect(
      (
        await hr.rpc('save_leave_entitlement', {
          ...entitlement,
          p_allowance: 14,
        })
      ).error,
    ).toBeNull();
    const overlaps = await Promise.all(
      ['Annual', 'Sick'].map((type) =>
        owner.rpc('submit_leave_request', {
          p_type: type,
          p_start_date: '2038-01-11',
          p_end_date: '2038-01-11',
          p_reason: 'Submission API fixture concurrent overlap',
        }),
      ),
    );
    expect(overlaps.filter((response) => response.error === null)).toHaveLength(
      1,
    );
    expect(
      overlaps.find((response) => response.error)?.error?.message,
    ).toContain('overlap');
    const id = overlaps.find((response) => response.error === null)!.data;
    provisionFixture(
      `update private.leave_requests set status='approved' where id='${id}'; update private.leave_allocations set used_days=reserved_days,reserved_days=0 where request_id='${id}';`,
    );
    expect(
      (
        await owner.rpc('submit_leave_request', {
          p_type: 'Sick',
          p_start_date: '2038-01-11',
          p_end_date: '2038-01-11',
          p_reason: 'Submission API fixture approved overlap',
        })
      ).error?.message,
    ).toContain('overlap');
  } finally {
    cleanup();
    await hr.rpc('save_leave_entitlement', { ...entitlement, p_allowance: 14 });
    await owner.auth.signOut({ scope: 'local' });
    await hr.auth.signOut({ scope: 'local' });
  }
});

test('submission uses Kuala Lumpur today and rejects yesterday', async () => {
  const owner = await login();
  cleanup();
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const yesterday = new Date(`${today}T12:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const lastDate = yesterday.toISOString().slice(0, 10);
  try {
    expect(
      (
        await owner.rpc('submit_leave_request', {
          p_type: 'Sick',
          p_start_date: lastDate,
          p_end_date: lastDate,
          p_reason: 'Submission API fixture yesterday',
        })
      ).error?.message,
    ).toContain('today or later in Kuala Lumpur');
    const response = await owner.rpc('submit_leave_request', {
      p_type: 'Sick',
      p_start_date: today,
      p_end_date: today,
      p_reason: 'Submission API fixture today',
    });
    const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
    if (weekday === 0 || weekday === 6)
      expect(response.error?.message).toContain('working day');
    else {
      expect(response.error).toBeNull();
      expect(
        (
          await owner
            .from('leave_requests')
            .select('*')
            .eq('id', response.data)
            .single()
        ).data,
      ).toMatchObject({ start_date: today, end_date: today, charged_days: 1 });
    }
  } finally {
    cleanup();
    await owner.auth.signOut({ scope: 'local' });
  }
});
