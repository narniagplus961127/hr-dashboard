import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

function publicClient(token?: string) {
  const url = process.env.TEST_SUPABASE_URL;
  const key = process.env.TEST_SUPABASE_PUBLISHABLE_KEY;
  if (
    !url ||
    !key ||
    !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)
  ) {
    throw new Error(
      'Run test:setup against the isolated local backend before testing.',
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : undefined,
  });
}

async function signedInEmployee() {
  const client = publicClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: 'maya@hr.example.test',
    password: process.env.TEST_DEMO_PASSWORD ?? '',
  });
  expect(error).toBeNull();
  if (!data.session || !data.user)
    throw new Error('Employee fixture could not sign in.');
  return { client, session: data.session, user: data.user };
}

test('anonymous API requests cannot read employee profiles or register accounts', async () => {
  const client = publicClient();
  const profiles = await client.from('employee_profiles').select('*');
  expect(profiles.error).not.toBeNull();
  expect(profiles.data).toBeNull();
  const registration = await client.auth.signUp({
    email: 'uninvited@hr.example.test',
    password: 'Not-A-Real-Account-2026!',
  });
  expect(registration.error).not.toBeNull();
  expect(registration.data.session).toBeNull();
});

test('an Employee can read only their own profile and cannot change role or employment data', async () => {
  const { client, user } = await signedInEmployee();
  try {
    const profiles = await client.from('employee_profiles').select('*');
    expect(profiles.error).toBeNull();
    expect(profiles.data).toHaveLength(1);
    expect(profiles.data?.[0]).toMatchObject({
      full_name: 'Maya Tan',
      role: 'employee',
      start_date: '2025-03-10',
    });
    const others = await client
      .from('employee_profiles')
      .select('*')
      .neq('user_id', user.id);
    expect(others.error).toBeNull();
    expect(others.data).toEqual([]);
    const update = await client
      .from('employee_profiles')
      .update({
        role: 'hr_administrator',
        full_name: 'Changed without permission',
      })
      .eq('user_id', user.id)
      .select();
    expect(update.error).not.toBeNull();
    const insert = await client.from('employee_profiles').insert({
      user_id: user.id,
      full_name: 'Forged profile',
      role: 'hr_administrator',
      work_email: 'forged@hr.example.test',
      department: 'HR',
      job_title: 'HR',
      start_date: '2026-01-01',
    });
    expect(insert.error).not.toBeNull();
    const remove = await client
      .from('employee_profiles')
      .delete()
      .eq('user_id', user.id)
      .select();
    expect(remove.error).not.toBeNull();
    const current = await client
      .from('employee_profiles')
      .select('role,full_name')
      .single();
    expect(current.data).toEqual({ role: 'employee', full_name: 'Maya Tan' });
  } finally {
    await client.auth.signOut({ scope: 'local' });
  }
});

test('editing user metadata cannot elevate the trusted Employee role', async () => {
  const { client } = await signedInEmployee();
  try {
    const metadata = await client.auth.updateUser({
      data: { role: 'hr_administrator' },
    });
    expect(metadata.error).toBeNull();
    const profile = await client
      .from('employee_profiles')
      .select('role')
      .single();
    expect(profile.error).toBeNull();
    expect(profile.data).toEqual({ role: 'employee' });
  } finally {
    await client.auth.updateUser({ data: { role: null } });
    await client.auth.signOut({ scope: 'local' });
  }
});

test('a copied access token cannot read a profile after its session signs out', async () => {
  const { client, session } = await signedInEmployee();
  const copiedTokenClient = publicClient(session.access_token);
  expect(
    (await copiedTokenClient.from('employee_profiles').select('full_name'))
      .data,
  ).toHaveLength(1);
  expect((await client.auth.signOut({ scope: 'local' })).error).toBeNull();
  const afterSignOut = await copiedTokenClient
    .from('employee_profiles')
    .select('full_name');
  expect(afterSignOut.data ?? []).toEqual([]);
});
