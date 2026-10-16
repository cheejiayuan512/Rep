/**
 * One full loop: start a workout, log a squat, finish, and read it back in History.
 * Playwright finds buttons by the same names a screen reader uses.
 */
import { expect, test } from '@playwright/test';

test('a logged set shows up in history', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
  });
  await page.goto('/');

  await page.getByRole('button', { name: 'Start empty workout' }).click();
  await page.getByRole('button', { name: 'Add exercise' }).click();
  await page.getByRole('textbox', { name: 'Search exercises' }).fill('Back Squat');
  await page.getByRole('button', { name: 'Back Squat', exact: true }).click();
  await expect(page.getByText('Added')).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();

  await page.getByRole('textbox', { name: 'Exercise notes' }).fill('Felt steady.');
  await page.getByRole('textbox', { name: 'Weight' }).fill('100');
  await page.getByRole('textbox', { name: 'Reps' }).fill('5');
  await page.getByRole('textbox', { name: 'RPE' }).fill('8');
  await page.getByRole('button', { name: 'Complete set' }).click();
  await page.getByRole('button', { name: 'Finish' }).click();

  await page.getByRole('tab', { name: 'History' }).click();
  await page.getByText('Back Squat').click();
  await expect(page.getByText('Felt steady.')).toBeVisible();
  await expect(page.getByText('RPE 8')).toBeVisible();
});
