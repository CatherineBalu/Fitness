import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'gejol57529@4heats.com';
const TEST_PASSWORD = 'adg;okan[;gkn15';

async function login(page: Parameters<Parameters<typeof test>[1]>[0]['page']) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForSelector('.cl-modalContent', { timeout: 10000 });
  await page.locator('input[name="identifier"]').fill(TEST_EMAIL);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForSelector('input[name="password"]', { timeout: 5000 });
  await page.locator('input[name="password"]').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.locator('.cl-modalContent')).not.toBeVisible({
    timeout: 10000,
  });
  await expect(page.locator('.cl-userButtonTrigger')).toBeVisible({
    timeout: 10000,
  });
}

test.describe('Navbar — unauthenticated', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows logo and brand name', async ({ page }) => {
    await expect(page.locator('.navbar-logo')).toBeVisible();
    await expect(page.locator('.logo-text')).toContainText('FITNESS');
  });

  test('shows Home, Schedule, and Contact links', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Schedule' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Contact' })).toBeVisible();
  });

  test('shows Log in button when not signed in', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
  });

  test('clicking Schedule navigates to /schedule', async ({ page }) => {
    await page.getByRole('link', { name: 'Schedule' }).click();
    await expect(page).toHaveURL('/schedule');
    await expect(page.locator('.cal-root')).toBeVisible();
  });

  test('clicking logo on schedule page navigates back to home', async ({
    page,
  }) => {
    await page.goto('/schedule');
    await page.locator('.navbar-logo').click();
    await expect(page).toHaveURL('/');
    await expect(page.locator('.hero-section')).toBeVisible();
  });

  test('Contact anchor link scrolls to footer', async ({ page }) => {
    await page.getByRole('link', { name: 'Contact' }).click();
    await expect(page.locator('#contact')).toBeVisible();
  });
});

test.describe('Navbar — authenticated', () => {
  test('shows user button after login and hides Log in', async ({ page }) => {
    await login(page);
    await expect(page.locator('.cl-userButtonTrigger')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Log in' }),
    ).not.toBeVisible();
  });

  test('signing out brings back Log in button', async ({ page }) => {
    await login(page);
    // Open user menu
    await page.locator('.cl-userButtonTrigger').click();
    await page.waitForSelector('.cl-userButtonPopoverCard', { timeout: 5000 });
    // Click sign out
    await page.getByRole('menuitem', { name: /sign out/i }).click();
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe('404 page', () => {
  test('unknown route shows not-found page', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    // App renders NotFoundPage — check for some recognisable text or status
    await expect(
      page.getByRole('heading', { name: /page not found/i }),
    ).toBeVisible();
  });
});

test.describe('Protected routes — unauthenticated redirect', () => {
  test('visiting /checkout without auth redirects to home', async ({
    page,
  }) => {
    await page.goto('/checkout');
    await expect(page).toHaveURL('/');
  });

  test('visiting /admin without auth redirects to home', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL('/');
  });

  test('visiting /my-profile without auth redirects to home', async ({
    page,
  }) => {
    await page.goto('/my-profile');
    await expect(page).toHaveURL('/');
  });
});
