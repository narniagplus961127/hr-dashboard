import { test, expect } from '@playwright/test';
import { provisionFixture, publicClient } from './helpers';

test('Employee cancels, reloads retained history and resubmits changed leave', async ({
  page,
}) => {
  await page.goto('/my-leave');
  await page.getByLabel('Work email').fill('maya@hr.example.test');
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env.TEST_DEMO_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Leave start date').fill('2044-01-04');
  await page.getByLabel('Leave end date').fill('2044-01-04');
  await page
    .getByLabel('Reason (optional)')
    .fill('Cancellation browser fixture');
  await page
    .getByRole('button', { name: 'Submit leave request', exact: true })
    .click();
  const card = page.getByRole('article', {
    name: 'Annual leave 2044-01-04 to 2044-01-04',
  });
  try {
    await expect(card).toContainText('Pending');
    await card
      .getByRole('button', { name: 'Cancel pending leave', exact: true })
      .click();
    await expect(card).toContainText('Cancelled by Maya Tan');
    await page.reload();
    await expect(card).toContainText('Cancelled by Maya Tan');
    await page.getByLabel('Year', { exact: true }).fill('2044');
    await expect(
      page.getByRole('row').filter({ hasText: 'Annual' }),
    ).toContainText('14');
    await page.getByLabel('Leave start date').fill('2044-01-04');
    await page.getByLabel('Leave end date').fill('2044-01-05');
    await page
      .getByLabel('Reason (optional)')
      .fill('Replacement browser fixture');
    await page
      .getByRole('button', { name: 'Submit leave request', exact: true })
      .click();
    await expect(
      page.getByRole('article', {
        name: 'Annual leave 2044-01-04 to 2044-01-05',
      }),
    ).toContainText('Pending');
  } finally {
    provisionFixture(
      "delete from private.leave_requests where reason in ('Cancellation browser fixture','Replacement browser fixture');",
    );
  }
});

test('HR cancels approved leave from company oversight and Employee sees released usage', async ({
  page,
}) => {
  const owner = publicClient();
  const approver = publicClient();
  expect(
    (
      await owner.auth.signInWithPassword({
        email: 'daniel@hr.example.test',
        password: process.env.TEST_DEMO_PASSWORD ?? '',
      })
    ).error,
  ).toBeNull();
  expect(
    (
      await approver.auth.signInWithPassword({
        email: 'grace@hr.example.test',
        password: process.env.TEST_DEMO_PASSWORD ?? '',
      })
    ).error,
  ).toBeNull();
  const request = await owner.rpc('submit_leave_request', {
    p_type: 'Sick',
    p_start_date: '2045-01-03',
    p_end_date: '2045-01-03',
  });
  expect(request.error).toBeNull();
  expect(
    (
      await approver.rpc('decide_leave_request', {
        p_request_id: request.data,
        p_decision: 'approved',
      })
    ).error,
  ).toBeNull();
  try {
    await page.goto('/approvals');
    await page.getByLabel('Work email').fill('aisha@hr.example.test');
    await page
      .getByLabel('Password', { exact: true })
      .fill(process.env.TEST_DEMO_PASSWORD ?? '');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    const card = page.getByRole('article', {
      name: 'Daniel Lee Sick leave 2045-01-03 to 2045-01-03',
    });
    await expect(card).toContainText('Approved');
    await card
      .getByLabel('Cancellation reason (optional)')
      .fill('Company correction');
    await card
      .getByRole('button', { name: 'Cancel approved leave', exact: true })
      .click();
    await expect(card).toContainText('Cancelled by Aisha Rahman');
    await expect(card).toContainText('Company correction');
    await page.reload();
    await expect(card).toContainText('Cancelled by Aisha Rahman');
    expect(
      (await owner.rpc('get_leave_balances', { p_year: 2045 })).data?.find(
        (b: { leave_type: string }) => b.leave_type === 'Sick',
      ),
    ).toMatchObject({ reserved_days: 0, used_days: 0, available_days: 14 });
    await page.screenshot({
      path: `test-results/cancellation-${test.info().project.name}.png`,
      fullPage: true,
    });
  } finally {
    provisionFixture(
      `delete from private.leave_requests where id='${request.data}';`,
    );
    await Promise.all(
      [owner, approver].map((c) => c.auth.signOut({ scope: 'local' })),
    );
  }
});
