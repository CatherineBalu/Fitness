import { test, expect } from '@playwright/test';

test.describe('Navbar — unauthenticated', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows logo and brand name', async ({ page }) => {
    await expect(page.getByTestId('navbar-logo')).toBeVisible();
    await expect(page.getByTestId('logo-text')).toContainText('FITNESS');
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
    await expect(page.getByTestId('cal-root')).toBeVisible();
  });

  test('clicking logo on schedule page navigates back to home', async ({ page }) => {
    await page.goto('/schedule');
    await page.getByTestId('navbar-logo').click();
    await expect(page).toHaveURL('/');
    await expect(page.getByTestId('hero-section')).toBeVisible();
  });

  test('Contact anchor link scrolls to footer', async ({ page }) => {
    await page.getByRole('link', { name: 'Contact' }).click();
    await expect(page.locator('#contact')).toBeVisible();
  });
});

test.describe('404 page', () => {
  test('unknown route shows not-found page', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible();
  });
});

test.describe('Protected routes — unauthenticated redirect', () => {
  test('visiting /checkout without auth redirects to home', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page).toHaveURL('/');
  });

  test('visiting /admin without auth redirects to home', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL('/');
  });

  test('visiting /my-profile without auth redirects to home', async ({ page }) => {
    await page.goto('/my-profile');
    await expect(page).toHaveURL('/');
  });
});
