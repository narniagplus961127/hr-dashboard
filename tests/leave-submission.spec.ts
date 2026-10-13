import { test, expect } from '@playwright/test';
import { provisionFixture } from './helpers';

test('Employee submits working-day leave, sees persisted pending history and reserved balance', async ({
  page,
}) => {
  await page.goto('/my-leave');
  await page.getByLabel('Work email').fill('maya@hr.example.test');
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env.TEST_DEMO_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Request leave type').selectOption('Annual');
  await page.getByLabel('Leave start date').fill('2036-01-07');
  await page.getByLabel('Leave end date').fill('2036-01-11');
  await page.getByLabel('Reason (optional)').fill('Browser submission fixture');
  await page
    .getByRole('button', { name: 'Submit leave request', exact: true })
    .click();
  try {
    await expect(
      page.getByRole('status').filter({ hasText: 'Leave request submitted.' }),
    ).toBeVisible();
    await expect(
      page.getByRole('article', {
        name: 'Annual leave 2036-01-07 to 2036-01-11',
      }),
    ).toContainText('5 working days');
    await expect(
      page.getByRole('article', {
        name: 'Annual leave 2036-01-07 to 2036-01-11',
      }),
    ).toContainText('Pending');
    await expect(
      page.getByRole('article', {
        name: 'Annual leave 2036-01-07 to 2036-01-11',
      }),
    ).toContainText('Submitted by Maya Tan');
    await page.getByLabel('Year', { exact: true }).fill('2036');
    const annual = page.getByRole('row').filter({ hasText: 'Annual' });
    await expect(annual).toContainText('9');
    await page.reload();
    await expect(
      page.getByRole('article', {
        name: 'Annual leave 2036-01-07 to 2036-01-11',
      }),
    ).toContainText('Submitted by Maya Tan');
  } finally {
    provisionFixture(
      "delete from private.leave_requests where reason='Browser submission fixture';",
    );
  }
});
