import { test, expect } from '@playwright/test';
import { getCredentials } from './helpers/auth';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForSelector('.cl-modalContent', { timeout: 10_000 });
  });

  test('shows error on wrong password', async ({ page }) => {
    const { email } = getCredentials();
    await page.locator('input[name="identifier"]').fill(email);
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.waitForSelector('input[name="password"]', { timeout: 5_000 });
    await page.locator('input[name="password"]').fill('wrongpassword123');
    await page.getByRole('button', { name: 'Continue' }).click();

    const error = page.locator('.cl-formFieldErrorText, .cl-alert__message').first();
    await expect(error).toBeVisible({ timeout: 5_000 });
  });

  test('logs in successfully with valid credentials', async ({ page }) => {
    const { email, password } = getCredentials();
    await page.locator('input[name="identifier"]').fill(email);
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.waitForSelector('input[name="password"]', { timeout: 5_000 });
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.locator('.cl-modalContent')).not.toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.cl-userButtonTrigger')).toBeVisible({ timeout: 10_000 });
  });
});
