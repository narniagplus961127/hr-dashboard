import { test, expect } from '@playwright/test';
import { provisionFixture, publicClient } from './helpers';

test('each role can open clearly scoped empty summaries on the overview', async ({
  page,
}) => {
  const hr = publicClient();
  expect(
    (
      await hr.auth.signInWithPassword({
        email: 'aisha@hr.example.test',
        password: process.env.TEST_DEMO_PASSWORD ?? '',
      })
    ).error,
  ).toBeNull();
  const records =
    (await hr.from('employee_profiles').select('is_active')).data ?? [];
  const expectedHeadcount = records.filter((record) => record.is_active).length;
  await hr.auth.signOut({ scope: 'local' });
  for (const [email, extra] of [
    ['maya@hr.example.test', ''],
    ['daniel@hr.example.test', 'Direct reports'],
    ['aisha@hr.example.test', 'Company leave requests'],
  ]) {
    await page.goto('/overview');
    await page.getByLabel('Work email').fill(email);
    await page
      .getByLabel('Password', { exact: true })
      .fill(process.env.TEST_DEMO_PASSWORD ?? '');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Overview', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('region', { name: 'Active headcount' }),
    ).toContainText(String(expectedHeadcount));
    await expect(
      page.getByRole('region', { name: 'My leave requests' }),
    ).toContainText('No leave requests yet.');
    if (extra)
      await expect(
        page.getByRole('region', { name: extra, exact: true }),
      ).toContainText('No leave requests yet.');
    else
      await expect(
        page.getByRole('region', { name: 'Company leave requests' }),
      ).toHaveCount(0);
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  }
});

test('Employee submission and Manager decisions refresh real overview totals for every role', async ({
  page,
}, testInfo) => {
  const hr = publicClient();
  const manager = publicClient();
  for (const [client, email] of [
    [hr, 'aisha@hr.example.test'],
    [manager, 'daniel@hr.example.test'],
  ] as const) {
    expect(
      (
        await client.auth.signInWithPassword({
          email,
          password: process.env.TEST_DEMO_PASSWORD ?? '',
        })
      ).error,
    ).toBeNull();
  }
  const profiles = (await hr.from('employee_profiles').select('*')).data ?? [];
  const maya = profiles.find((p) => p.work_email === 'maya@hr.example.test');
  const daniel = profiles.find(
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
  async function checkCounts(scope: string, counts: Record<string, string>) {
    const region = page.getByRole('region', { name: scope, exact: true });
    for (const [label, value] of Object.entries(counts)) {
      await expect(
        region
          .locator('dl > div')
          .filter({
            has: page.locator('dt', { hasText: new RegExp(`^${label}$`) }),
          })
          .locator('dd'),
      ).toHaveText(value);
    }
  }
  try {
    for (const [client, start] of [
      [manager, '2038-03-03'],
      [hr, '2038-03-04'],
    ] as const) {
      expect(
        (
          await client.rpc('submit_leave_request', {
            p_type: 'Annual',
            p_start_date: start,
            p_end_date: start,
            p_reason: 'Overview browser fixture',
          })
        ).error,
      ).toBeNull();
    }
    await page.goto('/my-leave');
    await login('maya@hr.example.test');
    for (const date of ['2038-03-01', '2038-03-02']) {
      await page.getByLabel('Leave start date').fill(date);
      await page.getByLabel('Leave end date').fill(date);
      await page
        .getByLabel('Reason (optional)')
        .fill('Overview browser fixture');
      await page
        .getByRole('button', { name: 'Submit leave request', exact: true })
        .click();
      await expect(
        page
          .getByRole('status')
          .filter({ hasText: 'Leave request submitted.' }),
      ).toBeVisible();
    }
    await page.getByRole('link', { name: 'Overview', exact: true }).click();
    await checkCounts('My leave requests', {
      Pending: '2',
      'Total requests': '2',
    });
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await login('daniel@hr.example.test');
    await page.getByRole('link', { name: 'Overview', exact: true }).click();
    await checkCounts('Direct reports', { Pending: '2' });
    await checkCounts('My leave requests', { Pending: '1' });
    await page
      .getByRole('link', { name: 'Leave approvals', exact: true })
      .click();
    const first = page.getByRole('article', {
      name: 'Maya Tan Annual leave 2038-03-01 to 2038-03-01',
    });
    await first.getByRole('button', { name: 'Approve', exact: true }).click();
    await expect(first).toContainText('Approved by Daniel Lee');
    const second = page.getByRole('article', {
      name: 'Maya Tan Annual leave 2038-03-02 to 2038-03-02',
    });
    await second
      .getByLabel('Rejection reason')
      .fill('Overview rejection fixture');
    await second.getByRole('button', { name: 'Reject', exact: true }).click();
    await expect(second).toContainText('Rejected by Daniel Lee');
    await page.getByRole('link', { name: 'Overview', exact: true }).click();
    await page.getByRole('button', { name: 'Refresh overview' }).click();
    await checkCounts('Direct reports', {
      Pending: '0',
      Approved: '1',
      Rejected: '1',
    });
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await login('aisha@hr.example.test');
    await page.getByRole('link', { name: 'Overview', exact: true }).click();
    await page.reload();
    await checkCounts('Company leave requests', {
      'Total requests': '4',
      Pending: '2',
      Approved: '1',
      Rejected: '1',
    });
    await checkCounts('My leave requests', { Pending: '1' });
    await page.screenshot({
      path: `test-results/overview-${testInfo.project.name}.png`,
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await login('maya@hr.example.test');
    await page.getByRole('link', { name: 'Overview', exact: true }).click();
    await checkCounts('My leave requests', {
      Pending: '0',
      Approved: '1',
      Rejected: '1',
    });
  } finally {
    provisionFixture(
      `delete from private.leave_requests where reason='Overview browser fixture'; update public.employee_records set manager_id=${maya.manager_id ? `'${maya.manager_id}'` : 'null'} where employee_id='${maya.employee_id}';`,
    );
    await Promise.all([
      hr.auth.signOut({ scope: 'local' }),
      manager.auth.signOut({ scope: 'local' }),
    ]);
  }
});
