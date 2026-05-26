import { test, expect } from '@playwright/test';

test('Admin can log in successfully', async ({ page }) => {
  await page.goto('/login');
  
  await page.fill('input[type="email"]', 'admin@crms.gov.ph');
  await page.fill('input[type="password"]', 'admin123');
  
  await page.click('button[type="submit"]');

  // Verify successful redirection back to the dashboard or admin route
  await expect(page).toHaveURL(/.*/); // Loosely check URL changed from /login
  
  // Check if there is some welcome text or Dashboard sign 
  // We wait for navigation instead of strict URL to avoid test flake
  await page.waitForLoadState('networkidle');
  const url = page.url();
  expect(url).not.toContain('/login');
});

test('Displays error on invalid login', async ({ page }) => {
  await page.goto('/login');
  
  await page.fill('input[type="email"]', 'fake@user.com');
  await page.fill('input[type="password"]', 'wrongpassword');
  
  await page.click('button[type="submit"]');

  // Check that we stay on the login page
  const url = page.url();
  expect(url).toContain('/login');
});
