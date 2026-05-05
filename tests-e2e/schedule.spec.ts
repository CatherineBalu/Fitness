import { test, expect } from '@playwright/test';

test.describe('Schedule page — structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/schedule');
  });

  test('renders the weekly calendar grid', async ({ page }) => {
    await expect(page.locator('.cal-root')).toBeVisible();
    await expect(page.locator('.cal-week-grid')).toBeVisible();
  });

  test('shows day column headers', async ({ page }) => {
    const dayNames = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
    let found = 0;
    for (const day of dayNames) {
      const visible = await page.getByText(day, { exact: true }).isVisible();
      if (visible) found++;
    }
    expect(found).toBeGreaterThan(0);
  });

  test('shows week navigation arrows', async ({ page }) => {
    await expect(page.locator('.cal-nav-arrow').first()).toBeVisible();
    await expect(page.locator('.cal-nav-arrow').last()).toBeVisible();
  });

  test('shows date range in week nav', async ({ page }) => {
    await expect(page.locator('.cal-date-range')).toBeVisible();
    await expect(page.locator('.cal-date-range')).toContainText(/20\d\d/);
  });

  test('shows All lectures filter button active by default', async ({ page }) => {
    const allBtn = page.locator('.cal-cat-btn').filter({ hasText: 'All lectures' });
    await expect(allBtn).toBeVisible();
    await expect(allBtn).toHaveClass(/cal-cat-btn--active/);
  });

  test('navigating to next week updates the date range', async ({ page }) => {
    const rangeText = await page.locator('.cal-date-range').textContent();
    await page.locator('.cal-nav-arrow').last().click();
    await expect(page.locator('.cal-date-range')).not.toHaveText(rangeText!, {
      timeout: 3_000,
    });
  });

  test('navigating to previous week updates the date range', async ({ page }) => {
    const rangeText = await page.locator('.cal-date-range').textContent();
    await page.locator('.cal-nav-arrow').first().click();
    await expect(page.locator('.cal-date-range')).not.toHaveText(rangeText!, {
      timeout: 3_000,
    });
  });

  test('clicking a non-All-lectures category deactivates All lectures', async ({ page }) => {
    await page.waitForSelector('.cal-cat-btn', { timeout: 10_000 });
    const buttons = page.locator('.cal-cat-btn');
    const count = await buttons.count();

    if (count > 1) {
      const secondBtn = buttons.nth(1);
      await secondBtn.click();
      const allBtn = page.locator('.cal-cat-btn').filter({ hasText: 'All lectures' });
      await expect(allBtn).not.toHaveClass(/cal-cat-btn--active/);
      await expect(secondBtn).toHaveClass(/cal-cat-btn--active/);
    }
  });

  test('clicking All lectures after a category resets to all active', async ({ page }) => {
    await page.waitForSelector('.cal-cat-btn', { timeout: 10_000 });
    const buttons = page.locator('.cal-cat-btn');
    const count = await buttons.count();

    if (count > 1) {
      await buttons.nth(1).click();
      const allBtn = page.locator('.cal-cat-btn').filter({ hasText: 'All lectures' });
      await allBtn.click();
      await expect(allBtn).toHaveClass(/cal-cat-btn--active/);
    }
  });
});

test.describe('Schedule page — unauthenticated interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/schedule');
    await page.waitForSelector('.cal-week-grid', { timeout: 10_000 });
  });

  test('future lecture Register button triggers Clerk modal for guests', async ({ page }) => {
    const registerBtn = page
      .locator('.cal-register-btn')
      .filter({ hasText: 'Register' })
      .first();

    const count = await registerBtn.count();
    if (count === 0) {
      test.skip();
      return;
    }

    await registerBtn.click();
    await expect(page.locator('.cl-modalContent')).toBeVisible({ timeout: 5_000 });
    await page.keyboard.press('Escape');
  });
});
