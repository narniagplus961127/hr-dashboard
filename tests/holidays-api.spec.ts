import { test, expect } from '@playwright/test';
import { publicClient } from './helpers';

test('company holidays are readable by active users and writable only by HR', async () => {
  const hr = publicClient();
  const employee = publicClient();
  const manager = publicClient();
  const anonymous = publicClient();
  const password = process.env.TEST_DEMO_PASSWORD ?? '';

  for (const [client, email] of [
    [hr, 'aisha@hr.example.test'],
    [employee, 'maya@hr.example.test'],
    [manager, 'daniel@hr.example.test'],
  ] as const) {
    expect(
      (await client.auth.signInWithPassword({ email, password })).error,
    ).toBeNull();
  }
  const created = await hr
    .from('company_holidays')
    .insert({ name: 'Permission test holiday', holiday_date: '2032-05-14' })
    .select('*')
    .single();
  expect(created.error).toBeNull();
  const id = created.data!.id;

  try {
    expect(
      (await anonymous.from('company_holidays').select('*')).error,
    ).not.toBeNull();
    expect(
      (
        await anonymous
          .from('company_holidays')
          .insert({ name: 'Anonymous holiday', holiday_date: '2032-05-16' })
      ).error,
    ).not.toBeNull();
    for (const client of [employee, manager]) {
      expect(
        (
          await client
            .from('company_holidays')
            .select('*')
            .eq('id', id)
            .single()
        ).data?.name,
      ).toBe('Permission test holiday');
      expect(
        (
          await client
            .from('company_holidays')
            .insert({ name: 'Forbidden holiday', holiday_date: '2032-05-16' })
        ).error,
      ).not.toBeNull();
      expect(
        (
          await client
            .from('company_holidays')
            .update({ name: 'Forbidden edit' })
            .eq('id', id)
            .select('id')
        ).data,
      ).toEqual([]);
      expect(
        (
          await client
            .from('company_holidays')
            .delete()
            .eq('id', id)
            .select('id')
        ).data,
      ).toEqual([]);
      expect(
        (await hr.from('company_holidays').select('*').eq('id', id).single())
          .data?.name,
      ).toBe('Permission test holiday');
    }
    expect(
      (
        await hr
          .from('company_holidays')
          .update({ name: 'Updated holiday' })
          .eq('id', id)
          .select('*')
          .single()
      ).data?.name,
    ).toBe('Updated holiday');
    for (const fields of [
      { name: ' ', holiday_date: '2032-05-16' },
      { name: 'Impossible date', holiday_date: '2032-02-30' },
      { name: 'Duplicate date', holiday_date: '2032-05-14' },
      { name: 'Out of range', holiday_date: '2101-01-01' },
    ])
      expect(
        (await hr.from('company_holidays').insert(fields)).error,
      ).not.toBeNull();
  } finally {
    expect(
      (await hr.from('company_holidays').delete().eq('id', id)).error,
    ).toBeNull();
    for (const client of [hr, employee, manager])
      await client.auth.signOut({ scope: 'local' });
  }
});
