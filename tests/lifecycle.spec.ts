import { test, expect } from '@playwright/test';
import { lifecycleAccount, removeLifecycleAccount } from './lifecycle-fixtures';
import { provisionFixture, publicClient } from './helpers';

test('HR deactivates from employee details and an existing Employee screen clears on navigation', async ({
  page,
  browser,
}, testInfo) => {
  const account = lifecycleAccount();
  const ownerContext = await browser.newContext({
    ...testInfo.project.use,
    baseURL: testInfo.project.use.baseURL,
  });
  const ownerPage = await ownerContext.newPage();
  try {
    for (const [target, email] of [
      [page, 'aisha@hr.example.test'],
      [ownerPage, account.email],
    ] as const) {
      await target.goto('/login');
      await target.getByLabel('Work email').fill(email);
      await target
        .getByLabel('Password')
        .fill(process.env.TEST_DEMO_PASSWORD ?? '');
      await target
        .getByRole('button', { name: 'Sign in', exact: true })
        .click();
      await expect(
        target.getByRole('heading', {
          name: email === account.email ? account.name : 'Aisha Rahman',
          exact: true,
        }),
      ).toBeVisible();
    }
    await page.goto(`/directory/${account.employeeId}`);
    await page
      .getByRole('button', { name: 'Deactivate employee', exact: true })
      .click();
    await expect(
      page.getByText(
        'Pending and future approved leave will be cancelled. Already-started approved leave and history will be kept.',
      ),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Confirm deactivation', exact: true })
      .click();
    await expect(page.getByText('Inactive', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText('Inactive', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Deactivate employee', exact: true }),
    ).toHaveCount(0);
    await ownerPage
      .getByRole('link', { name: 'Employee directory', exact: true })
      .click();
    await expect(ownerPage).toHaveURL(/\/login$/);
    await expect(
      ownerPage.getByText(
        'Your employee profile is unavailable. Please contact your HR Administrator.',
      ),
    ).toBeVisible();
    await expect(
      ownerPage.getByRole('heading', { name: account.name, exact: true }),
    ).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath('deactivated-employee.png'),
      fullPage: true,
    });
    const hr = publicClient();
    await hr.auth.signInWithPassword({
      email: 'aisha@hr.example.test',
      password: process.env.TEST_DEMO_PASSWORD ?? '',
    });
    expect(
      (
        await hr
          .from('employee_profiles')
          .select('*')
          .eq('employee_id', account.employeeId)
          .single()
      ).data,
    ).toMatchObject({ is_active: false });
    await hr.auth.signOut({ scope: 'local' });
  } finally {
    await ownerContext.close();
    removeLifecycleAccount(account);
  }
});

test('focus preserves an active Employee draft and clears the screen after HR deactivation', async ({
  page,
}) => {
  const account = lifecycleAccount();
  const hr = publicClient();
  await hr.auth.signInWithPassword({
    email: 'aisha@hr.example.test',
    password: process.env.TEST_DEMO_PASSWORD ?? '',
  });
  try {
    await page.goto('/my-leave');
    await page.getByLabel('Work email').fill(account.email);
    await page
      .getByLabel('Password', { exact: true })
      .fill(process.env.TEST_DEMO_PASSWORD ?? '');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByLabel('Reason (optional)').fill('Keep this unsaved draft');
    const refreshed = page.waitForResponse(
      (response) =>
        response.url().includes('/employee_profiles?') &&
        response.status() === 200,
    );
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await refreshed;
    await expect(page.getByLabel('Reason (optional)')).toHaveValue(
      'Keep this unsaved draft',
    );
    expect(
      (
        await hr.rpc('deactivate_employee', {
          p_employee_id: account.employeeId,
        })
      ).error,
    ).toBeNull();
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByLabel('Reason (optional)')).toHaveCount(0);
    await expect(
      page.getByText(
        'Your employee profile is unavailable. Please contact your HR Administrator.',
      ),
    ).toBeVisible();
  } finally {
    await hr.auth.signOut({ scope: 'local' });
    removeLifecycleAccount(account);
  }
});

test('HR edits the Manager in the browser and pending approvals move to the new Manager', async ({
  page,
}) => {
  const account = lifecycleAccount();
  const manager = lifecycleAccount('manager');
  const hr = publicClient();
  await hr.auth.signInWithPassword({
    email: 'aisha@hr.example.test',
    password: process.env.TEST_DEMO_PASSWORD ?? '',
  });
  const owner = publicClient();
  await owner.auth.signInWithPassword({
    email: account.email,
    password: process.env.TEST_DEMO_PASSWORD ?? '',
  });
  const previous = (
    await hr
      .from('employee_profiles')
      .select('*')
      .eq('work_email', 'daniel@hr.example.test')
      .single()
  ).data;
  provisionFixture(
    `update public.employee_records set manager_id='${previous.employee_id}' where employee_id='${account.employeeId}';`,
  );
  expect(
    (
      await owner.rpc('submit_leave_request', {
        p_type: 'Annual',
        p_start_date: '2056-01-03',
        p_end_date: '2056-01-03',
      })
    ).error,
  ).toBeNull();

  async function login(email: string, route: string) {
    await page.goto(route);
    await page.getByLabel('Work email').fill(email);
    await page
      .getByLabel('Password', { exact: true })
      .fill(process.env.TEST_DEMO_PASSWORD ?? '');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).not.toHaveURL(/\/login$/);
  }
  const request = page.getByRole('article', {
    name: `${account.name} Annual leave 2056-01-03 to 2056-01-03`,
  });
  try {
    await login('daniel@hr.example.test', '/approvals');
    await expect(
      request.getByRole('button', { name: 'Approve', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await login('aisha@hr.example.test', `/directory/${account.employeeId}`);
    await page
      .getByRole('button', { name: 'Edit employee', exact: true })
      .click();
    await page
      .getByLabel('Manager', { exact: true })
      .selectOption(manager.employeeId);
    await page
      .getByRole('button', { name: 'Save employee', exact: true })
      .click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Employee saved.' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await login('daniel@hr.example.test', '/approvals');
    await expect(request).toHaveCount(0);
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await login(manager.email, '/approvals');
    await request.getByRole('button', { name: 'Approve', exact: true }).click();
    await expect(request).toContainText(`Approved by ${manager.name}`);
  } finally {
    await Promise.all(
      [hr, owner].map((c) => c.auth.signOut({ scope: 'local' })),
    );
    removeLifecycleAccount(account);
    removeLifecycleAccount(manager);
  }
});
