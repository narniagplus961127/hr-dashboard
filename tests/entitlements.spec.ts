import { test, expect } from '@playwright/test';

test('HR edits a year allowance and the owner sees the persisted balance', async ({
  page,
}) => {
  await page.goto('/entitlements');
  await page.getByLabel('Work email').fill('aisha@hr.example.test');
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env.TEST_DEMO_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Leave entitlements', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Year', { exact: true }).fill('2035');
  await page
    .getByLabel('Employee', { exact: true })
    .selectOption({ label: 'Maya Tan' });
  await page.getByLabel('Leave type', { exact: true }).selectOption('Annual');
  await page.getByLabel('Allowance in days').fill('19');
  await page.getByRole('button', { name: 'Save entitlement' }).click();
  await expect(page.getByRole('status')).toHaveText('Leave entitlement saved.');
  await page.reload();
  await page.getByLabel('Year', { exact: true }).fill('2035');
  await expect(
    page
      .getByRole('row')
      .filter({ hasText: 'Maya Tan' })
      .filter({ hasText: 'Annual' }),
  ).toContainText('19');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByLabel('Work email').fill('maya@hr.example.test');
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env.TEST_DEMO_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('link', { name: 'My leave', exact: true }).click();
  await page.getByLabel('Year', { exact: true }).fill('2035');
  await expect(
    page.getByRole('row').filter({ hasText: 'Annual' }),
  ).toContainText('19');
  await expect(page.getByRole('row').filter({ hasText: 'Sick' })).toContainText(
    '14',
  );
  await expect(
    page.getByRole('link', { name: 'Leave entitlements', exact: true }),
  ).not.toBeVisible();
});
