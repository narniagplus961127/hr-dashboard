import { test, expect } from '@playwright/test';

test('an Employee signs in and sees only their own employment profile', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Work email').fill('maya@hr.example.test');
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env.TEST_DEMO_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Maya Tan', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('People Operations', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Aisha Rahman', { exact: true }),
  ).not.toBeVisible();
});

test('sign-out removes the profile and stays signed out after reloading', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Work email').fill('maya@hr.example.test');
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env.TEST_DEMO_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Maya Tan', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Welcome back', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Maya Tan', exact: true }),
  ).not.toBeVisible();
});

test('a Manager sees their own profile and workspace access', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Work email').fill('daniel@hr.example.test');
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env.TEST_DEMO_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Daniel Lee', exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Workspace' })
      .getByRole('link', { name: 'My profile', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Your workspace access' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Team access', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'HR access', exact: true }),
  ).not.toBeVisible();
});

for (const employee of [
  { email: 'aisha@hr.example.test', name: 'Aisha Rahman' },
  { email: 'grace@hr.example.test', name: 'Grace Lim' },
]) {
  test(`${employee.name} signs in as an HR Administrator with workspace access`, async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByLabel('Work email').fill(employee.email);
    await page
      .getByLabel('Password', { exact: true })
      .fill(process.env.TEST_DEMO_PASSWORD ?? '');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: employee.name, exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByRole('navigation', { name: 'Workspace' })
        .getByRole('link', { name: 'My profile', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Your workspace access' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'HR access', exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('link', { name: 'Team access', exact: true }),
    ).not.toBeVisible();
  });
}

test('invalid credentials show an actionable error without revealing a profile', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Work email').fill('maya@hr.example.test');
  await page
    .getByLabel('Password', { exact: true })
    .fill('Incorrect-password-2026!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Check your email and password',
  );
  await expect(page.getByLabel('Work email')).toHaveValue(
    'maya@hr.example.test',
  );
  await expect(
    page.getByRole('heading', { name: 'Maya Tan', exact: true }),
  ).not.toBeVisible();
});
