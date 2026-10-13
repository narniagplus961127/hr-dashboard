import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

test('HR can reach every workspace page with accurate breadcrumbs and compact mobile navigation', async ({
  page,
}, testInfo) => {
  await page.goto('/overview');
  await page.getByLabel('Work email').fill('aisha@hr.example.test');
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env.TEST_DEMO_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Overview', exact: true }),
  ).toBeVisible();

  const nav = page.getByRole('navigation', { name: 'Workspace' });
  await expect(nav.getByRole('link')).toHaveCount(11);
  if (testInfo.project.name === 'mobile') {
    const bounds = await nav.boundingBox();
    expect(bounds?.height).toBeLessThan(70);
    expect(
      await page.locator('body').evaluate((body) => body.scrollWidth),
    ).toBeLessThanOrEqual(page.viewportSize()!.width);
  }

  for (const [link, title] of [
    ['Shared calendar', 'Shared calendar'],
    ['My leave', 'My leave'],
    ['Leave approvals', 'Leave approvals'],
    ['Public holidays', 'Public holidays'],
    ['Leave entitlements', 'Leave entitlements'],
    ['Departments', 'Departments'],
    ['HR access', 'My profile'],
    ['Overview', 'Overview'],
  ]) {
    await nav.getByRole('link', { name: link, exact: true }).click();
    await expect(page.locator('.topbar')).toContainText(title);
  }

  const artifacts =
    process.env.HR_REVIEW_SCREENSHOT_DIR ?? testInfo.outputPath('screenshots');
  await mkdir(artifacts, { recursive: true });
  if (testInfo.project.name === 'mobile') {
    await page.screenshot({
      path: resolve(artifacts, 'overview-mobile.png'),
      fullPage: true,
    });
  } else {
    await nav
      .getByRole('link', { name: 'Shared calendar', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Shared calendar', exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: resolve(artifacts, 'calendar-desktop.png'),
      fullPage: true,
    });
  }
});
