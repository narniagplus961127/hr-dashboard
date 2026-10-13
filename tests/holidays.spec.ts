import { test, expect } from '@playwright/test';

test('HR maintains a company holiday reflected on the Shared calendar for Employees', async ({
  page,
}) => {
  const name = `Company holiday ${crypto.randomUUID().slice(0, 8)}`;
  await page.goto('/');
  await page.getByLabel('Work email').fill('aisha@hr.example.test');
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env.TEST_DEMO_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page
    .getByRole('link', { name: 'Public holidays', exact: true })
    .click();
  await page.getByLabel('Holiday name').fill(name);
  await page.getByLabel('Holiday date').fill('2031-05-14');
  await page.getByRole('button', { name: 'Add holiday', exact: true }).click();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: `Edit ${name}`, exact: true }).click();
  await page.getByLabel('Holiday date').fill('2031-05-15');
  await page.getByRole('button', { name: 'Save holiday', exact: true }).click();
  await page
    .getByRole('link', { name: 'Shared calendar', exact: true })
    .click();
  await page.getByLabel('Calendar month').fill('2031-05');
  await expect(page.getByRole('article', { name: '2031-05-15' })).toContainText(
    name,
  );
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByLabel('Work email').fill('maya@hr.example.test');
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env.TEST_DEMO_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page
    .getByRole('link', { name: 'Shared calendar', exact: true })
    .click();
  await page.getByLabel('Calendar month').fill('2031-05');
  await expect(page.getByRole('article', { name: '2031-05-15' })).toContainText(
    name,
  );
  await expect(
    page.getByRole('link', { name: 'Public holidays', exact: true }),
  ).not.toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByLabel('Work email').fill('aisha@hr.example.test');
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env.TEST_DEMO_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page
    .getByRole('link', { name: 'Public holidays', exact: true })
    .click();
  await page
    .getByRole('button', { name: `Delete ${name}`, exact: true })
    .click();
  await expect(page.getByText(name, { exact: true })).not.toBeVisible();
});
