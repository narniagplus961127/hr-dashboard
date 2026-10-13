import { test, expect } from '@playwright/test';
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

test('HR deactivates an Employee while preserving employment history; other roles cannot bypass it', async () => {
  const hr = await login('aisha@hr.example.test');
  const employee = await login('maya@hr.example.test');
  const manager = await login('daniel@hr.example.test');
  const id = randomUUID();
  provisionFixture(`insert into public.employee_records(employee_id,full_name,work_email,job_title,department_id) select '${id}','Lifecycle fixture','${id}@hr.example.test','Designer',department_id from public.employee_records limit 1;
    insert into private.employee_access(employee_id,start_date,role) values('${id}','2020-01-01','employee');`);
  try {
    for (const caller of [employee, manager, publicClient()])
      expect(
        (await caller.rpc('deactivate_employee', { p_employee_id: id })).error,
      ).not.toBeNull();
    expect(
      (await hr.rpc('deactivate_employee', { p_employee_id: id })).error,
    ).toBeNull();
    expect(
      (
        await hr
          .from('employee_profiles')
          .select('*')
          .eq('employee_id', id)
          .single()
      ).data,
    ).toMatchObject({
      is_active: false,
      full_name: 'Lifecycle fixture',
      start_date: '2020-01-01',
    });
    expect(
      (await hr.rpc('deactivate_employee', { p_employee_id: id })).error?.code,
    ).toBe('22023');
  } finally {
    provisionFixture(
      `delete from private.employee_access where employee_id='${id}'; delete from public.employee_records where employee_id='${id}';`,
    );
    await Promise.all(
      [hr, employee, manager].map((c) => c.auth.signOut({ scope: 'local' })),
    );
  }
});

test('HR reassignment transfers pending responsibility and removes the previous Manager API authority', async () => {
  const account = lifecycleAccount();
  const nextManager = lifecycleAccount('manager');
  const hr = await login('aisha@hr.example.test');
  const previous = await login('daniel@hr.example.test');
  const next = await login(nextManager.email);
  const requestId = randomUUID();
  const fallbackId = randomUUID();
  const profiles = (await hr.from('employee_profiles').select('*')).data ?? [];
  const oldManager = profiles.find(
    (p) => p.work_email === 'daniel@hr.example.test',
  );
  const record = profiles.find((p) => p.employee_id === account.employeeId);
  provisionFixture(`update public.employee_records set manager_id='${oldManager.employee_id}' where employee_id='${account.employeeId}';
    insert into private.leave_entitlements(employee_id,leave_year,leave_type) values('${account.employeeId}',2054,'Sick');
    insert into private.leave_requests(id,employee_id,leave_type,start_date,end_date,charged_days) values('${requestId}','${account.employeeId}','Sick','2054-01-05','2054-01-05',1),('${fallbackId}','${account.employeeId}','Sick','2054-02-02','2054-02-02',1);
    insert into private.leave_allocations(request_id,employee_id,leave_year,leave_type,reserved_days) values('${requestId}','${account.employeeId}',2054,'Sick',1),('${fallbackId}','${account.employeeId}',2054,'Sick',1);`);
  async function assign(manager: string | null) {
    expect(
      (
        await hr.rpc('save_employee', {
          p_employee_id: account.employeeId,
          p_full_name: record.full_name,
          p_work_email: record.work_email,
          p_job_title: record.job_title,
          p_job_level: record.job_level,
          p_department_id: record.department_id,
          p_manager_id: manager,
          p_start_date: record.start_date,
        })
      ).error,
    ).toBeNull();
  }
  try {
    expect((await previous.rpc('get_approval_requests')).data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: requestId, can_decide: true }),
      ]),
    );
    await assign(nextManager.employeeId);
    expect(
      (await previous.rpc('get_approval_requests')).data.some(
        (r: { id: string }) => r.id === requestId,
      ),
    ).toBe(false);
    expect(
      (
        await previous.rpc('decide_leave_request', {
          p_request_id: requestId,
          p_decision: 'approved',
        })
      ).error?.code,
    ).toBe('42501');
    expect((await next.rpc('get_approval_requests')).data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: requestId, can_decide: true }),
      ]),
    );
    expect(
      (
        await next.rpc('decide_leave_request', {
          p_request_id: requestId,
          p_decision: 'approved',
        })
      ).error,
    ).toBeNull();
    await assign(null);
    expect(
      (
        await next.rpc('decide_leave_request', {
          p_request_id: fallbackId,
          p_decision: 'approved',
        })
      ).error?.code,
    ).toBe('42501');
    expect((await hr.rpc('get_approval_requests')).data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: fallbackId, can_decide: true }),
      ]),
    );
    expect(
      (
        await hr.rpc('decide_leave_request', {
          p_request_id: fallbackId,
          p_decision: 'approved',
        })
      ).error,
    ).toBeNull();
  } finally {
    await Promise.all(
      [hr, previous, next].map((c) => c.auth.signOut({ scope: 'local' })),
    );
    removeLifecycleAccount(account);
    removeLifecycleAccount(nextManager);
  }
});

test('submission racing deactivation cannot leave a live reservation or request', async () => {
  const account = lifecycleAccount();
  const hr = await login('aisha@hr.example.test');
  const owner = await login(account.email);
  try {
    const [submitted, deactivated] = await Promise.all([
      owner.rpc('submit_leave_request', {
        p_type: 'Annual',
        p_start_date: '2055-01-04',
        p_end_date: '2055-01-04',
      }),
      hr.rpc('deactivate_employee', { p_employee_id: account.employeeId }),
    ]);
    expect(deactivated.error).toBeNull();
    if (submitted.error) expect(submitted.error.code).toBe('42501');
    else
      expect(
        (await hr.rpc('get_approval_requests')).data.find(
          (r: { id: string }) => r.id === submitted.data,
        ),
      ).toMatchObject({ status: 'cancelled' });
    expect(
      (
        await hr.rpc('get_leave_balances', {
          p_year: 2055,
          p_employee_id: account.employeeId,
        })
      ).data.find((b: { leave_type: string }) => b.leave_type === 'Annual'),
    ).toMatchObject({ used_days: 0, reserved_days: 0, available_days: 14 });
  } finally {
    await Promise.all(
      [hr, owner].map((c) => c.auth.signOut({ scope: 'local' })),
    );
    removeLifecycleAccount(account);
  }
});

test('deactivation cancels future allocations exactly once, preserves started leave, and denies an existing JWT', async () => {
  const account = lifecycleAccount();
  const hr = await login('aisha@hr.example.test');
  const otherHr = await login('grace@hr.example.test');
  const owner = await login(account.email);
  const copied = publicClient(
    (await owner.auth.getSession()).data.session?.access_token,
  );
  const pending = randomUUID();
  const future = randomUUID();
  const elapsed = randomUUID();
  const historical = randomUUID();
  provisionFixture(`insert into private.leave_entitlements(employee_id,leave_year,leave_type) values('${account.employeeId}',2051,'Annual'),('${account.employeeId}',extract(year from now() at time zone 'Asia/Kuala_Lumpur')::integer,'Sick');
    insert into private.leave_requests(id,employee_id,leave_type,start_date,end_date,charged_days,status) values
      ('${pending}','${account.employeeId}','Annual','2051-01-03','2051-01-03',1,'pending'),
      ('${future}','${account.employeeId}','Annual','2051-02-01','2051-02-02',2,'approved'),
      ('${elapsed}','${account.employeeId}','Sick',(now() at time zone 'Asia/Kuala_Lumpur')::date-1,(now() at time zone 'Asia/Kuala_Lumpur')::date+1,2,'approved'),
      ('${historical}','${account.employeeId}','Sick',date_trunc('year',now() at time zone 'Asia/Kuala_Lumpur')::date,date_trunc('year',now() at time zone 'Asia/Kuala_Lumpur')::date,1,'approved');
    insert into private.leave_allocations(request_id,employee_id,leave_year,leave_type,reserved_days,used_days) values
      ('${pending}','${account.employeeId}',2051,'Annual',1,0),('${future}','${account.employeeId}',2051,'Annual',0,2),
      ('${elapsed}','${account.employeeId}',extract(year from now() at time zone 'Asia/Kuala_Lumpur')::integer,'Sick',0,2),
      ('${historical}','${account.employeeId}',extract(year from now() at time zone 'Asia/Kuala_Lumpur')::integer,'Sick',0,1);
    insert into private.leave_history(request_id,actor_employee_id,action) select id,employee_id,'submitted' from private.leave_requests where employee_id='${account.employeeId}';`);
  try {
    const results = await Promise.all(
      [hr, otherHr].map((c) =>
        c.rpc('deactivate_employee', { p_employee_id: account.employeeId }),
      ),
    );
    expect(results.filter((r) => !r.error)).toHaveLength(1);
    expect(results.find((r) => r.error)?.error?.code).toBe('22023');
    const requests = (await hr.rpc('get_approval_requests')).data;
    expect(
      requests.find((r: { id: string }) => r.id === pending),
    ).toMatchObject({ status: 'cancelled', charged_days: 1 });
    expect(requests.find((r: { id: string }) => r.id === future)).toMatchObject(
      { status: 'cancelled', charged_days: 2 },
    );
    expect(
      requests.find((r: { id: string }) => r.id === elapsed),
    ).toMatchObject({ status: 'approved', charged_days: 2 });
    expect(
      requests.find((r: { id: string }) => r.id === historical),
    ).toMatchObject({ status: 'approved', charged_days: 1 });
    const winner = results[0].error ? 'Grace Lim' : 'Aisha Rahman';
    for (const id of [pending, future]) {
      const history = (
        await hr.rpc('get_approval_history', { p_request_id: id })
      ).data;
      expect(history).toHaveLength(2);
      expect(history).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            action: 'cancelled',
            actor_name: winner,
            reason: 'Employee deactivated by HR.',
          }),
        ]),
      );
    }
    expect(
      (
        await hr.rpc('get_leave_balances', {
          p_year: 2051,
          p_employee_id: account.employeeId,
        })
      ).data.find((b: { leave_type: string }) => b.leave_type === 'Annual'),
    ).toMatchObject({ reserved_days: 0, used_days: 0, available_days: 14 });
    const currentYear = Number(
      new Intl.DateTimeFormat('en', {
        timeZone: 'Asia/Kuala_Lumpur',
        year: 'numeric',
      }).format(new Date()),
    );
    expect(
      (
        await hr.rpc('get_leave_balances', {
          p_year: currentYear,
          p_employee_id: account.employeeId,
        })
      ).data.find((b: { leave_type: string }) => b.leave_type === 'Sick'),
    ).toMatchObject({ used_days: 3, available_days: 11 });
    for (const view of [
      'employee_profiles',
      'employee_directory',
      'leave_requests',
      'leave_history',
      'company_holidays',
    ])
      expect((await copied.from(view).select('*')).data).toEqual([]);
    for (const [rpc, args] of [
      [
        'submit_leave_request',
        {
          p_type: 'Annual',
          p_start_date: '2051-03-01',
          p_end_date: '2051-03-01',
        },
      ],
      ['get_leave_balances', { p_year: 2051 }],
      ['get_approval_requests', {}],
      ['get_calendar_absences', {}],
      ['get_workspace_overview', {}],
      ['deactivate_employee', { p_employee_id: account.employeeId }],
    ] as const)
      expect((await copied.rpc(rpc, args)).error?.code).toBe('42501');
  } finally {
    await Promise.all(
      [hr, otherHr, owner].map((c) => c.auth.signOut({ scope: 'local' })),
    );
    removeLifecycleAccount(account);
  }
});
