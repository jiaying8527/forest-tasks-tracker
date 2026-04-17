import { test, expect } from '@playwright/test';

test.describe('MVP: add task → complete → tree appears', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('user story 1 + 2 happy path at 390×844', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible();

    // Add a task
    await page.getByRole('link', { name: /add task/i }).click();
    await page.getByLabel('Title').fill('Buy groceries');
    await page.getByRole('button', { name: 'Save' }).click();

    // Task appears in the active list
    await expect(page.getByText('Buy groceries')).toBeVisible();

    // Complete the task
    await page.getByRole('button', { name: /complete task: buy groceries/i }).click();

    // Task leaves the active list (wait for the completion animation to finish)
    await expect(page.getByText('Buy groceries')).toHaveCount(0, { timeout: 2_000 });

    // Navigate to the forest
    await page.getByRole('link', { name: 'Forest' }).click();

    // Exactly one tree title is present (the Tree component renders an SVG <title>)
    await expect(page.locator('svg title', { hasText: 'Buy groceries' })).toHaveCount(1);

    // Un-complete via the Completed route and confirm the tree disappears
    await page.goto('/#/completed');
    await page.getByRole('button', { name: 'Un-complete' }).click();
    await page.goto('/#/forest');
    await expect(page.locator('svg title', { hasText: 'Buy groceries' })).toHaveCount(0);
  });
});
