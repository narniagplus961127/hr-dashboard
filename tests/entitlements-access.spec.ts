import { test, expect } from '@playwright/test';
import { publicClient } from './helpers';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Trusted fixture provisioning only; all behavior is observed through the API.
function fixture(sql: string) {
  const project = readFileSync('supabase/config.toml', 'utf8').match(
    /^project_id = "([^"]+)"/m,
  )?.[1];
  if (!project || !/^hr-dashboard(?:-[a-z]+)*-test$/.test(project))
    throw new Error('Fixture requires an isolated HR test project.');
  const result = spawnSync(
    'docker',
    [
      'exec',
      '-i',
      `supabase_db_${project}`,
      'psql',
      '-U',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
    ],
    { input: sql, encoding: 'utf8' },
  );
  if (result.status !== 0) throw new Error(result.stderr);
}

test('owners receive separate Annual and Sick balances with demo defaults', async () => {
  const client = publicClient();
  const login = await client.auth.signInWithPassword({
    email: 'maya@hr.example.test',
    password: process.env.TEST_DEMO_PASSWORD ?? '',
  });
  expect(login.error).toBeNull();

  try {
    const balances = await client.rpc('get_leave_balances', { p_year: 2034 });
    expect(balances.error).toBeNull();
    expect(balances.data).toHaveLength(2);
    expect(balances.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          leave_type: 'Annual',
          allowance: 14,
          used_days: 0,
          reserved_days: 0,
          available_days: 14,
        }),
        expect.objectContaining({
          leave_type: 'Sick',
          allowance: 14,
          used_days: 0,
          reserved_days: 0,
          available_days: 14,
        }),
      ]),
    );
  } finally {
    await client.auth.signOut({ scope: 'local' });
  }
});

test('Employees and Managers cannot read another owner or edit allowances', async () => {
  const hr = publicClient();
  await hr.auth.signInWithPassword({
    email: 'aisha@hr.example.test',
    password: process.env.TEST_DEMO_PASSWORD ?? '',
  });
  const records = await hr.from('employee_profiles').select('*');
  const aisha = records.data?.find(
    (record) => record.work_email === 'aisha@hr.example.test',
  );
  await hr.auth.signOut({ scope: 'local' });

  for (const email of ['maya@hr.example.test', 'daniel@hr.example.test']) {
    const client = publicClient();
    const login = await client.auth.signInWithPassword({
      email,
      password: process.env.TEST_DEMO_PASSWORD ?? '',
    });
    expect(login.error).toBeNull();
    try {
      expect(
        (await client.rpc('get_leave_balances', { p_year: 2034 })).data,
      ).toHaveLength(2);
      expect(
        (
          await client.rpc('get_leave_balances', {
            p_year: 2034,
            p_employee_id: aisha.employee_id,
          })
        ).error?.code,
      ).toBe('42501');
      expect(
        (
          await client.rpc('save_leave_entitlement', {
            p_employee_id: aisha.employee_id,
            p_year: 2034,
            p_type: 'Annual',
            p_allowance: 99,
          })
        ).error?.code,
      ).toBe('42501');
      expect(
        (await client.schema('private').from('leave_entitlements').select('*'))
          .error,
      ).not.toBeNull();
      const copied = publicClient(login.data.session?.access_token);
      await client.auth.signOut({ scope: 'local' });
      expect(
        (await copied.rpc('get_leave_balances', { p_year: 2034 })).error?.code,
      ).toBe('42501');
    } finally {
      await client.auth.signOut({ scope: 'local' });
    }
  }
  expect(
    (await publicClient().rpc('get_leave_balances', { p_year: 2034 })).error,
  ).not.toBeNull();
});

test('HR rejects invalid allowances and used plus reserved floors with year and type separation', async () => {
  const hr = publicClient();
  expect(
    (
      await hr.auth.signInWithPassword({
        email: 'grace@hr.example.test',
        password: process.env.TEST_DEMO_PASSWORD ?? '',
      })
    ).error,
  ).toBeNull();
  const profiles = await hr.from('employee_profiles').select('*');
  const owner = profiles.data?.find(
    (record) => record.work_email === 'maya@hr.example.test',
  );
  const request = crypto.randomUUID();
  const reservation = crypto.randomUUID();
  const args = {
    p_employee_id: owner.employee_id,
    p_year: 2040,
    p_type: 'Annual',
    p_allowance: 14,
  };
  expect((await hr.rpc('save_leave_entitlement', args)).error).toBeNull();
  fixture(
    `insert into private.leave_allocations(request_id,employee_id,leave_year,leave_type,used_days,reserved_days) values ('${request}','${owner.employee_id}',2040,'Annual',4,0),('${reservation}','${owner.employee_id}',2040,'Annual',0,3);`,
  );

  try {
    const before = await hr.rpc('get_leave_balances', {
      p_year: 2040,
      p_employee_id: owner.employee_id,
    });
    expect(before.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          leave_type: 'Annual',
          allowance: 14,
          used_days: 4,
          reserved_days: 3,
          available_days: 7,
        }),
        expect.objectContaining({
          leave_type: 'Sick',
          allowance: 14,
          available_days: 14,
        }),
      ]),
    );
    for (const allowance of [-1, 367, 6, null])
      expect(
        (
          await hr.rpc('save_leave_entitlement', {
            ...args,
            p_allowance: allowance,
          })
        ).error?.code,
      ).toBe('22023');
    expect(
      (await hr.rpc('save_leave_entitlement', { ...args, p_allowance: 1.5 }))
        .error,
    ).not.toBeNull();
    expect(
      (await hr.rpc('save_leave_entitlement', { ...args, p_year: 1999 })).error
        ?.code,
    ).toBe('22023');
    expect(
      (await hr.rpc('save_leave_entitlement', { ...args, p_type: 'Unpaid' }))
        .error?.code,
    ).toBe('22023');
    expect(
      (await hr.rpc('save_leave_entitlement', { ...args, p_allowance: 7 }))
        .error,
    ).toBeNull();
    const after = await hr.rpc('get_leave_balances', {
      p_year: 2040,
      p_employee_id: owner.employee_id,
    });
    expect(
      after.data?.find(
        (balance: { leave_type: string }) => balance.leave_type === 'Annual',
      ),
    ).toMatchObject({ allowance: 7, available_days: 0 });
    const otherYear = await hr.rpc('get_leave_balances', {
      p_year: 2041,
      p_employee_id: owner.employee_id,
    });
    expect(
      otherYear.data?.every(
        (balance: { available_days: number }) => balance.available_days === 14,
      ),
    ).toBe(true);
  } finally {
    fixture(
      `delete from private.leave_allocations where request_id in ('${request}','${reservation}');`,
    );
    await hr.rpc('save_leave_entitlement', args);
    await hr.auth.signOut({ scope: 'local' });
  }
});
