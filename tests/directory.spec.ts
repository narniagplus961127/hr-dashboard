import { test, expect } from '@playwright/test';
import { publicClient } from './helpers';

test('an Employee browses colleague details without private employment information', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Work email').fill('maya@hr.example.test');
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env.TEST_DEMO_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page
    .getByRole('link', { name: 'Employee directory', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Employee directory', exact: true }),
  ).toBeVisible();

  await page.getByLabel('Search employees').fill('Daniel');
  await page
    .getByRole('button', { name: 'View Daniel Lee', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Daniel Lee', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('daniel@hr.example.test', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Start date', { exact: true })).not.toBeVisible();
  await expect(
    page.getByText('Employment status', { exact: true }),
  ).not.toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Edit employee', exact: true }),
  ).not.toBeVisible();
  await page
    .getByRole('button', { name: 'Back to directory', exact: true })
    .click();
  await page.getByLabel('Search employees').fill('No matching colleague');
  await expect(page.getByText('No employees match your search.')).toBeVisible();
  await page.getByLabel('Search employees').fill('Maya');
  await page
    .getByRole('button', { name: 'View Maya Tan', exact: true })
    .click();
  await expect(page.getByText('Start date', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Employment status', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Departments', exact: true }),
  ).not.toBeVisible();
  await page.goto('/departments');
  await expect(
    page.getByRole('heading', { name: 'Employee directory', exact: true }),
  ).toBeVisible();
});

test('HR gets an actionable duplicate email error and keeps the entered Employee fields', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Work email').fill('grace@hr.example.test');
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env.TEST_DEMO_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page
    .getByRole('link', { name: 'Employee directory', exact: true })
    .click();
  await page.getByRole('button', { name: 'Add employee', exact: true }).click();
  await page
    .getByLabel('Full name', { exact: true })
    .fill('Duplicate Employee');
  await page
    .getByLabel('Work email', { exact: true })
    .fill('maya@hr.example.test');
  await page.getByLabel('Job title', { exact: true }).fill('Designer');
  await page.getByLabel('Job level', { exact: true }).selectOption('Junior');
  await page
    .getByLabel('Department', { exact: true })
    .selectOption({ label: 'Engineering' });
  await page.getByLabel('Start date', { exact: true }).fill('2026-03-02');
  await page
    .getByRole('button', { name: 'Save employee', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText(
    'already uses this work email',
  );
  await expect(page.getByLabel('Full name', { exact: true })).toHaveValue(
    'Duplicate Employee',
  );
  await expect(page.getByLabel('Job title', { exact: true })).toHaveValue(
    'Designer',
  );
  await expect(
    page.getByRole('button', { name: /deactivate/i }),
  ).not.toBeVisible();
});

test('an HR edit of their own record appears in My profile without changing login identity', async ({
  page,
}) => {
  const client = publicClient();
  expect(
    (
      await client.auth.signInWithPassword({
        email: 'grace@hr.example.test',
        password: process.env.TEST_DEMO_PASSWORD ?? '',
      })
    ).error,
  ).toBeNull();
  const original = await client
    .from('employee_profiles')
    .select('*')
    .eq('work_email', 'grace@hr.example.test')
    .single();
  expect(original.error).toBeNull();

  try {
    await page.goto('/');
    await page.getByLabel('Work email').fill('grace@hr.example.test');
    await page
      .getByLabel('Password', { exact: true })
      .fill(process.env.TEST_DEMO_PASSWORD ?? '');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page
      .getByRole('link', { name: 'Employee directory', exact: true })
      .click();
    await page.getByLabel('Search employees').fill('Grace');
    await page
      .getByRole('button', { name: 'View Grace Lim', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Edit employee', exact: true })
      .click();
    await page
      .getByLabel('Job title', { exact: true })
      .fill('Senior HR Administrator');
    await page
      .getByRole('button', { name: 'Save employee', exact: true })
      .click();
    await expect(
      page.getByText('Senior HR Administrator', { exact: true }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'My profile', exact: true }).click();
    await expect(
      page.getByRole('region', { name: 'Grace Lim', exact: true }),
    ).toContainText('Senior HR Administrator');
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
    });
    expect(restored.error).toBeNull();
    await client.auth.signOut({ scope: 'local' });
  }
});

test('HR maintains a Department and creates and edits an Employee visible to colleagues', async ({
  page,
}) => {
  const suffix = crypto.randomUUID().slice(0, 8);
  const departmentName = `Creative ${suffix}`;
  const employeeName = `Lina ${suffix}`;

  await page.goto('/');
  await page.getByLabel('Work email').fill('aisha@hr.example.test');
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env.TEST_DEMO_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('link', { name: 'Departments', exact: true }).click();
  await page
    .getByLabel('Department name', { exact: true })
    .fill(departmentName);
  await page
    .getByRole('button', { name: 'Add department', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: `Rename ${departmentName}`, exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: `Rename ${departmentName}`, exact: true })
    .click();
  await page
    .getByLabel('Department name', { exact: true })
    .fill(`Studio ${suffix}`);
  await page
    .getByRole('button', { name: 'Save department', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: `Rename Studio ${suffix}`, exact: true }),
  ).toBeVisible();

  await page
    .getByRole('link', { name: 'Employee directory', exact: true })
    .click();
  await page.getByRole('button', { name: 'Add employee', exact: true }).click();
  await page.getByLabel('Full name', { exact: true }).fill(employeeName);
  await page
    .getByLabel('Work email', { exact: true })
    .fill(`lina-${suffix}@hr.example.test`);
  await page.getByLabel('Job title', { exact: true }).fill('Designer');
  await page.getByLabel('Job level', { exact: true }).selectOption('Junior');
  await page
    .getByLabel('Department', { exact: true })
    .selectOption({ label: `Studio ${suffix}` });
  await page
    .getByLabel('Manager', { exact: true })
    .selectOption({ label: 'Daniel Lee' });
  await page.getByLabel('Start date', { exact: true }).fill('2026-03-02');
  await page
    .getByRole('button', { name: 'Save employee', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: employeeName, exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Start date', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Edit employee', exact: true })
    .click();
  await page.getByLabel('Job title', { exact: true }).fill('Lead Designer');
  await page.getByLabel('Job level', { exact: true }).selectOption('Lead');
  await page
    .getByRole('button', { name: 'Save employee', exact: true })
    .click();
  await expect(page.getByText('Lead Designer', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();

  await page.getByLabel('Work email').fill('maya@hr.example.test');
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env.TEST_DEMO_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page
    .getByRole('link', { name: 'Employee directory', exact: true })
    .click();
  await page.getByLabel('Search employees').fill(employeeName);
  await page
    .getByRole('button', { name: `View ${employeeName}`, exact: true })
    .click();
  await expect(page.getByText('Lead Designer', { exact: true })).toBeVisible();
  await expect(page.getByText('Daniel Lee', { exact: true })).toBeVisible();
  await expect(page.getByText('Start date', { exact: true })).not.toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Edit employee', exact: true }),
  ).not.toBeVisible();
});
