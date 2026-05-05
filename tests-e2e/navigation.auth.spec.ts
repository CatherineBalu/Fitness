import { test, expect } from '@playwright/test';

test.describe('Navbar — authenticated', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows user button after login and hides Log in', async ({ page }) => {
    await expect(page.locator('.cl-userButtonTrigger')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log in' })).not.toBeVisible();
  });

  test('signing out brings back Log in button', async ({ page }) => {
    await page.locator('.cl-userButtonTrigger').click();
    await page.waitForSelector('.cl-userButtonPopoverCard', { timeout: 5_000 });
    await page.getByRole('menuitem', { name: /sign out/i }).click();
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible({
      timeout: 10_000,
    });
  });
});
