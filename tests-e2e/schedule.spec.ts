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

test.describe('Schedule page — structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/schedule');
  });

  test('renders the weekly calendar grid', async ({ page }) => {
    await expect(page.locator('.cal-root')).toBeVisible();
    await expect(page.locator('.cal-week-grid')).toBeVisible();
  });

  test('shows day column headers', async ({ page }) => {
    // At least one day name should be visible
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
    // Should contain a year like 2025 or 2026
    await expect(page.locator('.cal-date-range')).toContainText(/20\d\d/);
  });

  test('shows All lectures filter button active by default', async ({
    page,
  }) => {
    const allBtn = page.locator('.cal-cat-btn').filter({ hasText: 'All lectures' });
    await expect(allBtn).toBeVisible();
    // default active state adds --active modifier class
    await expect(allBtn).toHaveClass(/cal-cat-btn--active/);
  });

  test('navigating to next week updates the date range', async ({ page }) => {
    const rangeText = await page.locator('.cal-date-range').textContent();
    await page.locator('.cal-nav-arrow').last().click();
    await expect(page.locator('.cal-date-range')).not.toHaveText(rangeText!, {
      timeout: 3000,
    });
  });

  test('navigating to previous week updates the date range', async ({
    page,
  }) => {
    const rangeText = await page.locator('.cal-date-range').textContent();
    await page.locator('.cal-nav-arrow').first().click();
    await expect(page.locator('.cal-date-range')).not.toHaveText(rangeText!, {
      timeout: 3000,
    });
  });

  test('clicking a non-All-lectures category deactivates All lectures', async ({
    page,
  }) => {
    // Wait for schedule to load (categories come from API)
    await page.waitForSelector('.cal-cat-btn', { timeout: 10000 });
    const buttons = page.locator('.cal-cat-btn');
    const count = await buttons.count();

    if (count > 1) {
      const secondBtn = buttons.nth(1);
      await secondBtn.click();
      const allBtn = page
        .locator('.cal-cat-btn')
        .filter({ hasText: 'All lectures' });
      await expect(allBtn).not.toHaveClass(/cal-cat-btn--active/);
      await expect(secondBtn).toHaveClass(/cal-cat-btn--active/);
    }
  });

  test('clicking All lectures after a category resets to all active', async ({
    page,
  }) => {
    await page.waitForSelector('.cal-cat-btn', { timeout: 10000 });
    const buttons = page.locator('.cal-cat-btn');
    const count = await buttons.count();

    if (count > 1) {
      await buttons.nth(1).click();
      const allBtn = page
        .locator('.cal-cat-btn')
        .filter({ hasText: 'All lectures' });
      await allBtn.click();
      await expect(allBtn).toHaveClass(/cal-cat-btn--active/);
    }
  });
});

test.describe('Schedule page — unauthenticated interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/schedule');
    // Wait for schedule to finish loading
    await page.waitForSelector('.cal-week-grid', { timeout: 10000 });
  });

  test('future lecture Register button triggers Clerk modal for guests', async ({
    page,
  }) => {
    const registerBtn = page
      .locator('.cal-register-btn')
      .filter({ hasText: 'Register' })
      .first();

    // Only test if there are future lectures available
    const count = await registerBtn.count();
    if (count === 0) {
      test.skip();
      return;
    }

    await registerBtn.click();
    await expect(page.locator('.cl-modalContent')).toBeVisible({
      timeout: 5000,
    });
    // Close the modal
    await page.keyboard.press('Escape');
  });
});

test.describe('Schedule page — authenticated interactions', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/schedule');
    await page.waitForSelector('.cal-week-grid', { timeout: 10000 });
  });

  test('register dialog appears when clicking Register on a future lecture', async ({
    page,
  }) => {
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
    await expect(
      page.getByRole('dialog').getByText('Register for lecture'),
    ).toBeVisible({ timeout: 5000 });
  });

  test('register dialog shows lecture name', async ({ page }) => {
    const registerBtn = page
      .locator('.cal-register-btn')
      .filter({ hasText: 'Register' })
      .first();

    const count = await registerBtn.count();
    if (count === 0) {
      test.skip();
      return;
    }

    // Get the lecture name from the card before clicking
    const card = registerBtn.locator('..').locator('..');
    const lectureName = await card.locator('.cal-activity-name').textContent();

    await registerBtn.click();
    if (lectureName) {
      await expect(page.getByRole('dialog')).toContainText(lectureName, {
        timeout: 5000,
      });
    }
  });

  test('closing register dialog via Escape removes it', async ({ page }) => {
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
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3000 });
  });

  test('unregister dialog appears for already-registered lecture', async ({
    page,
  }) => {
    const unregisterBtn = page
      .locator('.cal-unregister-btn')
      .filter({ hasText: 'Unregister' })
      .first();

    const count = await unregisterBtn.count();
    if (count === 0) {
      test.skip();
      return;
    }

    await unregisterBtn.click();
    await expect(
      page.getByRole('dialog').getByText('Cancel reservation'),
    ).toBeVisible({ timeout: 5000 });
  });
});
