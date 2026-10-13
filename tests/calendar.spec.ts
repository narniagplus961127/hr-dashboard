import { test, expect } from '@playwright/test';
import { provisionFixture } from './helpers';

test('Employee submission, Manager approval and HR cancellation update the Shared calendar with history preserved', async ({
  page,
}) => {
  async function signIn(email: string, path: string) {
    await page.goto(path);
    await page.getByLabel('Work email').fill(email);
    await page
      .getByLabel('Password', { exact: true })
      .fill(process.env.TEST_DEMO_PASSWORD ?? '');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  }
  async function signOut() {
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page.getByLabel('Work email')).toBeVisible();
  }
  provisionFixture(
    "insert into public.company_holidays(name,holiday_date) values ('Calendar integration holiday','2047-01-07');",
  );
  try {
    await signIn('maya@hr.example.test', '/my-leave');
    await page.getByLabel('Leave start date').fill('2047-01-04');
    await page.getByLabel('Leave end date').fill('2047-01-07');
    await page
      .getByLabel('Reason (optional)')
      .fill('Calendar browser private reason');
    await page
      .getByRole('button', { name: 'Submit leave request', exact: true })
      .click();
    await expect(
      page.getByRole('article', {
        name: 'Annual leave 2047-01-04 to 2047-01-07',
      }),
    ).toContainText('Pending');
    await page.goto('/calendar');
    await page.getByLabel('Calendar month').fill('2047-01');
    await expect(
      page.getByRole('article', { name: '2047-01-04', exact: true }),
    ).not.toContainText('Away');
    await signOut();
    await signIn('daniel@hr.example.test', '/approvals');
    const approval = page.getByRole('article', {
      name: 'Maya Tan Annual leave 2047-01-04 to 2047-01-07',
    });
    await approval
      .getByRole('button', { name: 'Approve', exact: true })
      .click();
    await expect(approval).toContainText('Approved');
    await signOut();
    await signIn('maya@hr.example.test', '/calendar');
    await page.getByLabel('Calendar month').fill('2047-01');
    for (const date of [
      '2047-01-04',
      '2047-01-05',
      '2047-01-06',
      '2047-01-07',
    ]) {
      const day = page.getByRole('article', { name: date, exact: true });
      await expect(day).toContainText('Away');
      await expect(day).toContainText('Maya Tan');
    }
    await expect(
      page.getByRole('article', { name: '2047-01-07', exact: true }),
    ).toContainText('Calendar integration holiday');
    await expect(page.locator('main')).not.toContainText(
      'Calendar browser private reason',
    );
    await expect(page.locator('main')).not.toContainText('Annual');
    await page.reload();
    await page.getByLabel('Calendar month').fill('2047-01');
    await expect(
      page.getByRole('article', { name: '2047-01-04', exact: true }),
    ).toContainText('Away');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/calendar-${test.info().project.name}.png`,
      fullPage: true,
    });
    await signOut();
    await signIn('aisha@hr.example.test', '/approvals');
    await page
      .getByRole('article', {
        name: 'Maya Tan Annual leave 2047-01-04 to 2047-01-07',
      })
      .getByRole('button', { name: 'Cancel approved leave', exact: true })
      .click();
    await expect(
      page.getByRole('article', {
        name: 'Maya Tan Annual leave 2047-01-04 to 2047-01-07',
      }),
    ).toContainText('Cancelled by Aisha Rahman');
    await signOut();
    await signIn('maya@hr.example.test', '/calendar');
    await page.getByLabel('Calendar month').fill('2047-01');
    await expect(
      page.getByRole('article', { name: '2047-01-04', exact: true }),
    ).not.toContainText('Away');
    await page.goto('/my-leave');
    await expect(
      page.getByRole('article', {
        name: 'Annual leave 2047-01-04 to 2047-01-07',
      }),
    ).toContainText('Cancelled by Aisha Rahman');
  } finally {
    provisionFixture(
      "delete from private.leave_requests where reason='Calendar browser private reason'; delete from public.company_holidays where name='Calendar integration holiday';",
    );
  }
});
