import { test, expect } from '@playwright/test';
import { publicClient } from './helpers';

for (const email of ['maya@hr.example.test', 'daniel@hr.example.test']) {
  test(`${email} cannot read colleagues' private fields or manage employment records`, async () => {
    const client = publicClient();
    const login = await client.auth.signInWithPassword({
      email,
      password: process.env.TEST_DEMO_PASSWORD ?? '',
    });
    expect(login.error).toBeNull();

    try {
      const profiles = await client.from('employee_profiles').select('*');
      expect(profiles.error).toBeNull();
      expect(profiles.data).toHaveLength(1);
      expect(profiles.data?.[0].user_id).toBe(login.data.user?.id);
      const directory = await client.from('employee_directory').select('*');
      const colleague = directory.data?.find(
        (e) => e.work_email === 'aisha@hr.example.test',
      );
      expect(colleague).toBeDefined();
      const hidden = await client
        .from('employee_profiles')
        .select('start_date,is_active')
        .eq('employee_id', colleague.employee_id);
      expect(hidden.data).toEqual([]);

      const fields = {
        p_employee_id: colleague.employee_id,
        p_full_name: 'Unauthorized edit',
        p_work_email: colleague.work_email,
        p_job_title: 'Unauthorized',
        p_department_id: colleague.department_id,
        p_manager_id: null,
        p_start_date: '2026-01-01',
      };
      expect((await client.rpc('save_employee', fields)).error?.code).toBe(
        '42501',
      );
      expect(
        (await client.rpc('save_employee', { ...fields, p_employee_id: null }))
          .error?.code,
      ).toBe('42501');
      expect(
        (
          await client
            .from('employee_records')
            .update({ full_name: 'Unauthorized' })
            .eq('employee_id', colleague.employee_id)
        ).error,
      ).not.toBeNull();
      expect(
        (
          await client
            .from('departments')
            .insert({ name: 'Unauthorized Department' })
        ).error,
      ).not.toBeNull();
      const departmentEdit = await client
        .from('departments')
        .update({ name: 'Unauthorized Department' })
        .eq('id', colleague.department_id)
        .select();
      expect(departmentEdit.data ?? []).toEqual([]);
      const unchanged = await client
        .from('employee_directory')
        .select('full_name,department')
        .eq('employee_id', colleague.employee_id)
        .single();
      expect(unchanged.data).toEqual({
        full_name: 'Aisha Rahman',
        department: 'People Operations',
      });
      expect(
        (await client.schema('private').from('employee_access').select('*'))
          .error,
      ).not.toBeNull();
      const provision = await client.rpc('provision_demo_employee', {
        p_user_id: login.data.user?.id,
        p_full_name: 'Forged',
        p_work_email: email,
        p_job_title: 'HR',
        p_department: 'HR',
        p_start_date: '2026-01-01',
        p_role: 'hr_administrator',
      });
      expect(provision.error).not.toBeNull();
    } finally {
      await client.auth.signOut({ scope: 'local' });
    }
  });
}

test('anonymous and signed-out sessions cannot browse or mutate the directory', async () => {
  const client = publicClient();
  expect(
    (await client.from('employee_directory').select('*')).error,
  ).not.toBeNull();
  expect((await client.from('departments').select('*')).error).not.toBeNull();

  const login = await client.auth.signInWithPassword({
    email: 'aisha@hr.example.test',
    password: process.env.TEST_DEMO_PASSWORD ?? '',
  });
  expect(login.error).toBeNull();
  const records = await client.from('employee_profiles').select('*');
  const record = records.data?.[0];
  const copied = publicClient(login.data.session?.access_token);
  await client.auth.signOut({ scope: 'local' });
  expect(
    (await copied.from('employee_directory').select('*')).data ?? [],
  ).toEqual([]);
  expect((await copied.from('departments').select('*')).data ?? []).toEqual([]);
  const mutation = await copied.rpc('save_employee', {
    p_employee_id: record.employee_id,
    p_full_name: record.full_name,
    p_work_email: record.work_email,
    p_job_title: 'Signed-out mutation',
    p_department_id: record.department_id,
    p_manager_id: record.manager_id,
    p_start_date: record.start_date,
  });
  expect(mutation.error?.code).toBe('42501');
});

test('HR validation rejects duplicate emails, invalid Managers, self-management, and incomplete records atomically', async () => {
  const client = publicClient();
  expect(
    (
      await client.auth.signInWithPassword({
        email: 'grace@hr.example.test',
        password: process.env.TEST_DEMO_PASSWORD ?? '',
      })
    ).error,
  ).toBeNull();

  try {
    const records = await client.from('employee_profiles').select('*');
    const maya = records.data?.find((p) => p.full_name === 'Maya Tan');
    const daniel = records.data?.find((p) => p.full_name === 'Daniel Lee');
    const email = `invalid-${crypto.randomUUID()}@hr.example.test`;
    const fields = {
      p_employee_id: null,
      p_full_name: 'Validation Example',
      p_work_email: email,
      p_job_title: 'Designer',
      p_job_level: 'Junior',
      p_department_id: maya.department_id,
      p_manager_id: null,
      p_start_date: '2026-01-01',
    };
    expect(
      (await client.rpc('save_employee', { ...fields, p_job_level: null }))
        .error?.code,
    ).toBe('22023');
    expect(
      (
        await client.rpc('save_employee', {
          ...fields,
          p_work_email: 'MAYA@hr.example.test',
        })
      ).error?.code,
    ).toBe('23505');
    expect(
      (
        await client.rpc('save_employee', {
          ...fields,
          p_manager_id: maya.employee_id,
        })
      ).error?.code,
    ).toBe('22023');
    expect(
      (
        await client.rpc('save_employee', {
          ...fields,
          p_employee_id: daniel.employee_id,
          p_manager_id: daniel.employee_id,
        })
      ).error?.code,
    ).toBe('22023');
    expect(
      (await client.rpc('save_employee', { ...fields, p_full_name: '  ' }))
        .error?.code,
    ).toBe('23514');
    expect(
      (await client.rpc('save_employee', { ...fields, p_start_date: null }))
        .error?.code,
    ).toBe('22023');
    expect(
      (
        await client.rpc('save_employee', {
          ...fields,
          p_department_id: crypto.randomUUID(),
        })
      ).error?.code,
    ).toBe('23503');
    const after = await client
      .from('employee_directory')
      .select('*')
      .eq('work_email', email);
    expect(after.data).toEqual([]);
    expect(
      (
        await client
          .from('employee_profiles')
          .update({ role: 'manager', is_active: false })
          .eq('employee_id', maya.employee_id)
      ).error,
    ).not.toBeNull();
    expect(
      (await client.rpc('save_employee', { ...fields, p_is_active: false }))
        .error,
    ).not.toBeNull();
  } finally {
    await client.auth.signOut({ scope: 'local' });
  }
});

test('Employees browse colleagues without receiving private employment fields', async () => {
  const client = publicClient();
  const login = await client.auth.signInWithPassword({
    email: 'maya@hr.example.test',
    password: process.env.TEST_DEMO_PASSWORD ?? '',
  });
  expect(login.error).toBeNull();

  try {
    const directory = await client.from('employee_directory').select('*');
    expect(directory.error).toBeNull();
    expect(directory.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          full_name: 'Daniel Lee',
          work_email: 'daniel@hr.example.test',
          department: 'Engineering',
        }),
      ]),
    );

    for (const employee of directory.data ?? []) {
      expect(employee).not.toHaveProperty('start_date');
      expect(employee).not.toHaveProperty('is_active');
      expect(employee).not.toHaveProperty('role');
      expect(employee).not.toHaveProperty('user_id');
    }

    const privateFields = await client
      .from('employee_directory')
      .select('start_date,is_active');
    expect(privateFields.error).not.toBeNull();
    expect(privateFields.data).toBeNull();
  } finally {
    await client.auth.signOut({ scope: 'local' });
  }
});

test('HR creates and edits employment records independently of login accounts', async () => {
  const client = publicClient();
  const login = await client.auth.signInWithPassword({
    email: 'aisha@hr.example.test',
    password: process.env.TEST_DEMO_PASSWORD ?? '',
  });
  expect(login.error).toBeNull();

  try {
    const suffix = crypto.randomUUID().slice(0, 8);
    const department = await client
      .from('departments')
      .insert({ name: `Learning ${suffix}` })
      .select()
      .single();
    expect(department.error).toBeNull();
    const profiles = await client.from('employee_profiles').select('*');
    const manager = profiles.data?.find((p) => p.full_name === 'Daniel Lee');
    expect(manager).toBeDefined();

    const fields = {
      p_full_name: 'Nora Test',
      p_work_email: `nora-${suffix}@hr.example.test`,
      p_job_title: 'Designer',
      p_job_level: 'Junior',
      p_department_id: department.data.id,
      p_manager_id: manager.employee_id,
      p_start_date: '2026-02-02',
    };
    const created = await client.rpc('save_employee', {
      ...fields,
      p_employee_id: null,
    });
    expect(created.error).toBeNull();
    const edited = await client.rpc('save_employee', {
      ...fields,
      p_employee_id: created.data,
      p_job_title: 'Senior Designer',
      p_job_level: 'Senior',
    });
    expect(edited.error).toBeNull();
    const rename = await client
      .from('departments')
      .update({ name: `Design ${suffix}` })
      .eq('id', department.data.id)
      .select()
      .single();
    expect(rename.error).toBeNull();

    const record = await client
      .from('employee_profiles')
      .select('*')
      .eq('employee_id', created.data)
      .single();
    expect(record.error).toBeNull();
    expect(record.data).toMatchObject({
      user_id: null,
      full_name: 'Nora Test',
      job_title: 'Senior Designer',
      department: `Design ${suffix}`,
      manager_name: 'Daniel Lee',
      start_date: '2026-02-02',
      is_active: true,
      role: 'employee',
    });
    const unaffiliated = publicClient();
    const account = await unaffiliated.auth.signInWithPassword({
      email: fields.p_work_email,
      password: process.env.TEST_DEMO_PASSWORD ?? '',
    });
    expect(account.error).not.toBeNull();
  } finally {
    await client.auth.signOut({ scope: 'local' });
  }
});
