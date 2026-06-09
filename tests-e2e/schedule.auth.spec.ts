import { test, expect } from '@playwright/test';

import { login } from './helpers/auth';

test.describe('Schedule page — authenticated interactions', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for Clerk to settle on the homepage — it will show either the
    // UserButton (valid session) or the Log in button (expired/no session).
    // Only re-login if the session wasn't recognised.
    await page.goto('/');
    const loginBtn = page.getByRole('button', { name: 'Log in' });
    const userTrigger = page.locator('.cl-userButtonTrigger');
    await expect(loginBtn.or(userTrigger)).toBeVisible({ timeout: 15_000 });
    if (await loginBtn.isVisible()) {
      await login(page);
    }
    await page.goto('/schedule');
    await expect(page.locator('.cl-userButtonTrigger')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('cal-week-grid')).toBeVisible();
  });

  test('register dialog appears when clicking Register on a future lecture', async ({ page }) => {
    const registerBtn = page
      .getByTestId('cal-register-btn')
      .filter({ hasText: 'Register' })
      .first();

    const count = await registerBtn.count();
    if (count === 0) {
      test.skip();
      return;
    }

    await registerBtn.click();
    await expect(page.getByRole('dialog').getByText('Register for lecture')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('register dialog shows lecture name', async ({ page }) => {
    const registerBtn = page
      .getByTestId('cal-register-btn')
      .filter({ hasText: 'Register' })
      .first();

    const count = await registerBtn.count();
    if (count === 0) {
      test.skip();
      return;
    }

    const card = registerBtn.locator('..').locator('..');
    const lectureName = await card.getByTestId('cal-activity-name').textContent();

    await registerBtn.click();
    if (lectureName) {
      await expect(page.getByRole('dialog')).toContainText(lectureName, { timeout: 5_000 });
    }
  });

  test('closing register dialog via Escape removes it', async ({ page }) => {
    const registerBtn = page
      .getByTestId('cal-register-btn')
      .filter({ hasText: 'Register' })
      .first();

    const count = await registerBtn.count();
    if (count === 0) {
      test.skip();
      return;
    }

    await registerBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3_000 });
  });

  test('unregister dialog appears for already-registered lecture', async ({ page }) => {
    const unregisterBtn = page
      .getByTestId('cal-unregister-btn')
      .filter({ hasText: 'Unregister' })
      .first();

    const count = await unregisterBtn.count();
    if (count === 0) {
      test.skip();
      return;
    }

    await unregisterBtn.click();
    await expect(page.getByRole('dialog').getByText('Cancel reservation')).toBeVisible({
      timeout: 5_000,
    });
  });
});
