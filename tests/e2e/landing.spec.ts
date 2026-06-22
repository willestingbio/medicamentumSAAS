import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test('loads successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Medicamentum360/);
  });

  test('has hero section', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('#hero');
    await expect(hero).toBeVisible();
  });

  test('navigation links are visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Nosotros/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Marketplace/i })).toBeVisible();
  });

  test('dark mode toggle works', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: /Cambiar modo/i });
    await toggle.click();
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);
  });
});

test.describe('Auth pages', () => {
  test('sign-in page loads', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();
  });

  test('sign-up page loads', async ({ page }) => {
    await page.goto('/sign-up');
    await expect(page.getByRole('heading', { name: /crear cuenta/i })).toBeVisible();
  });
});

test.describe('Checkout flow (skeleton)', () => {
  test('redirects to sign-in when not authenticated', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page).toHaveURL(/sign-in/);
  });
});
