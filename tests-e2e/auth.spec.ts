import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'gejol57529@4heats.com';
const TEST_PASSWORD = 'adg;okan[;gkn15';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Open Clerk sign-in modal
    await page.getByRole('button', { name: 'Log in' }).click();

    // Wait for Clerk modal to appear
    await page.waitForSelector('.cl-modalContent', { timeout: 10000 });
  });

  test('shows error on wrong password', async ({ page }) => {
    await page.locator('input[name="identifier"]').fill(TEST_EMAIL);
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.waitForSelector('input[name="password"]', { timeout: 5000 });
    await page.locator('input[name="password"]').fill('wrongpassword123');
    await page.getByRole('button', { name: 'Continue' }).click();

    const error = page.locator('.cl-formFieldErrorText, .cl-alert__message').first();
    await expect(error).toBeVisible({ timeout: 5000 });
  });

  test('logs in successfully with valid credentials', async ({ page }) => {
    await page.locator('input[name="identifier"]').fill(TEST_EMAIL);
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.waitForSelector('input[name="password"]', { timeout: 5000 });
    await page.locator('input[name="password"]').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Continue' }).click();

    // Modal should close and user button should appear
    await expect(page.locator('.cl-modalContent')).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator('.cl-userButtonTrigger')).toBeVisible({ timeout: 10000 });
  });
});
