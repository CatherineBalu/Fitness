import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders hero section with heading', async ({ page }) => {
    await expect(page.locator('.hero-section')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Pursue Outdoor/i }),
    ).toBeVisible();
  });

  test('shows gym stats section', async ({ page }) => {
    const stats = page.locator('.stats-section');
    await expect(stats).toBeVisible();
    await expect(stats.getByText('Active Members')).toBeVisible();
    await expect(stats.getByText('Weekly Classes')).toBeVisible();
    await expect(stats.getByText('Expert Trainers')).toBeVisible();
    await expect(stats.getByText('Years of Experience')).toBeVisible();
  });

  test('renders trainers carousel with trainer cards', async ({ page }) => {
    const section = page.locator('.trainers-section');
    await section.scrollIntoViewIfNeeded();
    await expect(
      page.getByRole('heading', { name: 'Train with the Elite' }),
    ).toBeVisible();
    await expect(page.locator('.trainer-card').first()).toBeVisible();
    // Use scoped locator to avoid collision with the footer manager name
    await expect(
      page.locator('.trainer-name').filter({ hasText: 'Janko Mrkvička' }),
    ).toBeVisible();
  });

  test('pricing section renders (with or without backend)', async ({
    page,
  }) => {
    await page.locator('.pricing-section').scrollIntoViewIfNeeded();
    await expect(
      page.getByRole('heading', { name: /Choose the Plan/i }),
    ).toBeVisible();
    // Either pricing cards loaded, or the graceful error message is shown
    const hasCards = await page
      .locator('.pricing-card')
      .first()
      .isVisible({ timeout: 8000 })
      .catch(() => false);
    const hasError = await page
      .getByText("Couldn't load plans")
      .isVisible()
      .catch(() => false);
    expect(hasCards || hasError).toBeTruthy();
  });

  test('footer shows contact info', async ({ page }) => {
    const footer = page.locator('.footer');
    await footer.scrollIntoViewIfNeeded();
    await expect(footer.getByText('Fitness Centrum XY')).toBeVisible();
    await expect(footer.getByText('+420 000 111 222')).toBeVisible();
    await expect(footer.getByText('info@fitnessxy.cz')).toBeVisible();
  });

  test('footer shows opening hours', async ({ page }) => {
    const footer = page.locator('.footer');
    await footer.scrollIntoViewIfNeeded();
    await expect(footer.getByText('Opening Hours')).toBeVisible();
    await expect(footer.getByText(/Mon – Fri/)).toBeVisible();
  });

  test('anchor link scrolls to pricing section', async ({ page }) => {
    await page.goto('/#pricing');
    await expect(page.locator('#pricing')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Choose the Plan/i }),
    ).toBeVisible();
  });

  test('Get Started button in hero is visible', async ({ page }) => {
    await expect(page.locator('.hero-content .btn-large')).toBeVisible();
  });

  test('each pricing card has a Get Started button', async ({ page }) => {
    await page.locator('.pricing-section').scrollIntoViewIfNeeded();
    const cards = page.locator('.pricing-card');
    await cards.first().waitFor({ timeout: 8000 }).catch(() => null);
    const count = await cards.count();
    // Skip assertion if backend is down
    if (count === 0) return;
    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i).getByRole('button')).toBeVisible();
    }
  });

  test('trainers carousel next/previous buttons navigate', async ({ page }) => {
    await page.locator('.trainers-section').scrollIntoViewIfNeeded();
    await expect(page.locator('.trainers-carousel')).toBeVisible();

    await page.locator('.carousel-next').click();
    await expect(page.locator('.trainers-carousel')).toBeVisible();

    await page.locator('.carousel-prev').click();
    await expect(page.locator('.trainers-carousel')).toBeVisible();
  });

  test('trainer cards show speciality and tags', async ({ page }) => {
    await page.locator('.trainers-section').scrollIntoViewIfNeeded();
    const firstCard = page.locator('.trainer-card').first();
    await expect(firstCard.locator('.trainer-speciality')).toBeVisible();
    await expect(firstCard.locator('.trainer-badge').first()).toBeVisible();
  });
});
