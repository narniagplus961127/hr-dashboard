import { expect, test } from '@playwright/test';

test('visitors can view demo credentials, close the popup, and sign in with them', async ({
  page,
}) => {
  await page.goto('/login');
  const trigger = page.getByRole('button', {
    name: 'View demo accounts',
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Try the HR Dashboard' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('listitem')).toHaveCount(4);
  await expect(dialog).toContainText('aisha@hr.example.test');
  await expect(dialog).toContainText('grace@hr.example.test');
  await expect(dialog).toContainText('daniel@hr.example.test');
  await expect(dialog).toContainText('maya@hr.example.test');
  const password = await dialog.locator('.demo-password code').innerText();
  // Compare as a boolean so a failed assertion cannot print a password.
  expect(password === process.env.TEST_DEMO_PASSWORD).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole('button', { name: 'Close demo accounts' }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByLabel('Work email').fill('maya@hr.example.test');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Maya Tan', exact: true }),
  ).toBeVisible();
});
