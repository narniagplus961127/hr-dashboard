import { test, expect } from '@playwright/test';
import { provisionFixture, publicClient } from './helpers';

test('Employee submission reaches the Manager and approve/reject updates owner history and balance', async ({
  page,
}) => {
  const hr = publicClient();
  await hr.auth.signInWithPassword({
    email: 'aisha@hr.example.test',
    password: process.env.TEST_DEMO_PASSWORD ?? '',
  });
  const profiles = await hr.from('employee_profiles').select('*');
  const maya = profiles.data?.find(
    (p) => p.work_email === 'maya@hr.example.test',
  );
  const daniel = profiles.data?.find(
    (p) => p.work_email === 'daniel@hr.example.test',
  );
  provisionFixture(
    `update public.employee_records set manager_id='${daniel.employee_id}' where employee_id='${maya.employee_id}';`,
  );

  async function login(email: string) {
    await page.getByLabel('Work email').fill(email);
    await page
      .getByLabel('Password', { exact: true })
      .fill(process.env.TEST_DEMO_PASSWORD ?? '');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  }

  try {
    await page.goto('/my-leave');
    await login('maya@hr.example.test');
    await page.getByLabel('Leave start date').fill('2038-01-04');
    await page.getByLabel('Leave end date').fill('2038-01-04');
    await page.getByLabel('Reason (optional)').fill('Approval browser fixture');
    await page
      .getByRole('button', { name: 'Submit leave request', exact: true })
      .click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Leave request submitted.' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await login('daniel@hr.example.test');
    await page
      .getByRole('link', { name: 'Leave approvals', exact: true })
      .click();
    const request = page.getByRole('article', {
      name: 'Maya Tan Annual leave 2038-01-04 to 2038-01-04',
    });
    await expect(request).toContainText('Approval browser fixture');
    await request.getByRole('button', { name: 'Approve', exact: true }).click();
    await expect(request).toContainText('Approved by Daniel Lee');
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await login('maya@hr.example.test');
    await page.getByRole('link', { name: 'My leave', exact: true }).click();
    await expect(
      page.getByRole('article', {
        name: 'Annual leave 2038-01-04 to 2038-01-04',
      }),
    ).toContainText('Approved by Daniel Lee');
    await page.getByLabel('Year', { exact: true }).fill('2038');
    await expect(
      page.getByRole('row').filter({ hasText: 'Annual' }),
    ).toContainText('13');
    await page.getByLabel('Leave start date').fill('2038-01-05');
    await page.getByLabel('Leave end date').fill('2038-01-05');
    await page
      .getByLabel('Reason (optional)')
      .fill('Rejection browser fixture');
    await page
      .getByRole('button', { name: 'Submit leave request', exact: true })
      .click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Leave request submitted.' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await login('daniel@hr.example.test');
    await page
      .getByRole('link', { name: 'Leave approvals', exact: true })
      .click();
    const second = page.getByRole('article', {
      name: 'Maya Tan Annual leave 2038-01-05 to 2038-01-05',
    });
    await second.getByRole('button', { name: 'Reject', exact: true }).click();
    await expect(second).toContainText('Pending');
    await second
      .getByLabel('Rejection reason')
      .fill('Please choose another date.');
    await second.getByRole('button', { name: 'Reject', exact: true }).click();
    await expect(second).toContainText('Rejected by Daniel Lee');
    await expect(second).toContainText('Please choose another date.');
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await login('maya@hr.example.test');
    await page.getByRole('link', { name: 'My leave', exact: true }).click();
    await expect(
      page.getByRole('article', {
        name: 'Annual leave 2038-01-05 to 2038-01-05',
      }),
    ).toContainText('Please choose another date.');
    await page.getByLabel('Year', { exact: true }).fill('2038');
    await expect(
      page.getByRole('row').filter({ hasText: 'Annual' }),
    ).toContainText('13');
  } finally {
    provisionFixture(
      `delete from private.leave_requests where reason in ('Approval browser fixture','Rejection browser fixture'); update public.employee_records set manager_id=${maya.manager_id ? `'${maya.manager_id}'` : 'null'} where employee_id='${maya.employee_id}';`,
    );
    await hr.auth.signOut({ scope: 'local' });
  }
});
