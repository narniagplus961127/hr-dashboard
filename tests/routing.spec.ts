import { test, expect } from '@playwright/test';
import { publicClient } from './helpers';

test('directory URLs survive refresh, browser history, and direct navigation', async ({
  page,
}) => {
  await page.goto('/directory');
  await page.getByLabel('Work email').fill('maya@hr.example.test');
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env.TEST_DEMO_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Employee directory', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Search employees').fill('Daniel');
  await page
    .getByRole('button', { name: 'View Daniel Lee', exact: true })
    .click();
  await expect(page).toHaveURL(/\/directory\/[a-f0-9-]+$/);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Daniel Lee', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'My profile', exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await page.goBack();
  await expect(
    page.getByRole('heading', { name: 'Daniel Lee', exact: true }),
  ).toBeVisible();
  await page.goto('/departments');
  await expect(page).toHaveURL(/\/directory$/);
  await expect(
    page.getByRole('heading', { name: 'Employee directory', exact: true }),
  ).toBeVisible();
});

test('HR selects job seniority independently of access roles and sees reporting lines', async ({
  page,
}) => {
  const client = publicClient();
  expect(
    (
      await client.auth.signInWithPassword({
        email: 'aisha@hr.example.test',
        password: process.env.TEST_DEMO_PASSWORD ?? '',
      })
    ).error,
  ).toBeNull();
  const original = await client
    .from('employee_profiles')
    .select('*')
    .eq('work_email', 'maya@hr.example.test')
    .single();
  expect(original.error).toBeNull();

  try {
    await page.goto('/directory');
    await page.getByLabel('Work email').fill('aisha@hr.example.test');
    await page
      .getByLabel('Password', { exact: true })
      .fill(process.env.TEST_DEMO_PASSWORD ?? '');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByLabel('Search employees').fill('Maya');
    await page
      .getByRole('button', { name: 'View Maya Tan', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Edit employee', exact: true })
      .click();
    await expect(
      page.getByLabel('Job level', { exact: true }).locator('option'),
    ).toHaveText([
      'Choose a job level',
      'Director',
      'Head',
      'Manager',
      'Lead',
      'Senior',
      'Junior',
    ]);
    await page.getByLabel('Job level', { exact: true }).selectOption('Lead');
    await page
      .getByRole('button', { name: 'Save employee', exact: true })
      .click();
    await expect(page.getByText('Lead', { exact: true })).toBeVisible();
    const saved = await client
      .from('employee_profiles')
      .select('job_level,role,manager_name')
      .eq('employee_id', original.data.employee_id)
      .single();
    expect(saved.data).toEqual({
      job_level: 'Lead',
      role: 'employee',
      manager_name: 'Daniel Lee',
    });
    await page
      .getByRole('link', { name: 'Reporting structure', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Reporting structure', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('list', {
        name: 'Direct reports of Daniel Lee',
        exact: true,
      }),
    ).toContainText('Maya Tan');
    await page
      .getByRole('link', { name: 'Employee directory', exact: true })
      .click();
    // Navigation completes before the asynchronous directory request. Wait for
    // the ordered names, including their presence, instead of reading an empty list.
    await expect(page.locator('.directory-card h2')).toContainText([
      'Aisha Rahman',
      'Daniel Lee',
      'Maya Tan',
    ]);
  } finally {
    const record = original.data;
    const restored = await client.rpc('save_employee', {
      p_employee_id: record.employee_id,
      p_full_name: record.full_name,
      p_work_email: record.work_email,
      p_job_title: record.job_title,
      p_department_id: record.department_id,
      p_manager_id: record.manager_id,
      p_start_date: record.start_date,
      p_job_level: record.job_level,
    });
    expect(restored.error).toBeNull();
    await client.auth.signOut({ scope: 'local' });
  }
});

test('reporting requires sign-in and rejects unsupported job levels through the API', async ({
  page,
}) => {
  await page.goto('/reporting');
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole('heading', { name: 'Welcome back', exact: true }),
  ).toBeVisible();

  const client = publicClient();
  expect(
    (
      await client.auth.signInWithPassword({
        email: 'aisha@hr.example.test',
        password: process.env.TEST_DEMO_PASSWORD ?? '',
      })
    ).error,
  ).toBeNull();
  try {
    const record = (
      await client
        .from('employee_profiles')
        .select('*')
        .eq('work_email', 'maya@hr.example.test')
        .single()
    ).data;
    const invalid = await client.rpc('save_employee', {
      p_employee_id: record.employee_id,
      p_full_name: record.full_name,
      p_work_email: record.work_email,
      p_job_title: record.job_title,
      p_department_id: record.department_id,
      p_manager_id: record.manager_id,
      p_start_date: record.start_date,
      p_job_level: 'Unapproved level',
    });
    expect(invalid.error?.code).toBe('22023');
    expect(
      (
        await client
          .from('employee_profiles')
          .select('job_level')
          .eq('employee_id', record.employee_id)
          .single()
      ).data?.job_level,
    ).toBe('Junior');
  } finally {
    await client.auth.signOut({ scope: 'local' });
  }
});
