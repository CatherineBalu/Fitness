import { expect, type Page } from '@playwright/test';

export function getCredentials() {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'Missing E2E_TEST_EMAIL / E2E_TEST_PASSWORD. Copy .env.example to .env and fill values.',
    );
  }
  return { email, password };
}

export async function login(page: Page) {
  const { email, password } = getCredentials();

  await page.goto('/');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForSelector('.cl-modalContent', { timeout: 10_000 });

  await page.locator('input[name="identifier"]').fill(email);
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.waitForSelector('input[name="password"]', { timeout: 5_000 });
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.locator('.cl-modalContent')).not.toBeVisible({
    timeout: 10_000,
  });
  await expect(page.locator('.cl-userButtonTrigger')).toBeVisible({
    timeout: 10_000,
  });
}
