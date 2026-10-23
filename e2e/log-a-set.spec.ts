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
  await page.getByText('Back Squat').last().click();
  await expect(page.getByText('Felt steady.')).toBeVisible();
  await expect(page.getByText('RPE 8')).toBeVisible();
});

test('variants fold, a heavier set is starred, and deletes can be undone', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
  });
  await page.goto('/');

  await page.getByRole('button', { name: 'Start empty workout' }).click();
  await page.getByRole('button', { name: 'Add exercise' }).click();
  await expect(page.getByRole('button', { name: 'Incline Barbell Bench Press' })).toHaveCount(0);
  await page.getByRole('button', { name: /^Bench Press, \d+ variations$/ }).click();
  await page.getByRole('button', { name: 'Barbell Bench Press', exact: true }).click();
  await expect(page.getByText('Added')).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();

  await page.getByRole('textbox', { name: 'Weight' }).fill('100');
  await page.getByRole('textbox', { name: 'Reps' }).fill('5');
  await page.getByRole('button', { name: 'Complete set' }).click();
  await expect(page.getByText('New PR', { exact: false })).toHaveCount(0);

  await page.getByRole('button', { name: 'Add set' }).click();
  await page.getByRole('textbox', { name: 'Weight' }).nth(1).fill('110');
  await page.getByRole('button', { name: 'Complete set' }).click();
  await expect(page.getByText('★ New PR · Barbell Bench Press')).toBeVisible();
  await expect(page.getByLabel('Personal record')).toHaveCount(1);

  await page.getByLabel('Delete set').nth(1).click();
  await expect(page.getByRole('textbox', { name: 'Weight' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('textbox', { name: 'Weight' })).toHaveCount(2);

  await page.getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByText('Removed Barbell Bench Press')).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('textbox', { name: 'Weight' })).toHaveCount(2);

  await page.getByRole('button', { name: /^Rest timer/ }).click();
  await page.getByRole('button', { name: '2:00' }).click();
  await expect(page.getByRole('button', { name: 'Rest timer 2:00' })).toBeVisible();
});

test('the picker toggles, and a past workout can be edited and duplicated', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
  });
  await page.goto('/');

  await page.getByRole('button', { name: 'Start empty workout' }).click();
  await page.getByRole('button', { name: 'Add exercise' }).click();
  await page.getByRole('textbox', { name: 'Search exercises' }).fill('Back Squat');
  const squat = page.getByRole('button', { name: 'Back Squat', exact: true });
  await squat.click();
  await expect(page.getByText('Added')).toBeVisible();
  await squat.click();
  await expect(page.getByText('Added')).toHaveCount(0);
  await squat.click();
  await expect(page.getByText('Added')).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('button', { name: 'Remove' })).toHaveCount(1);

  await page.getByRole('textbox', { name: 'Weight' }).fill('100');
  await page.getByRole('textbox', { name: 'Reps' }).fill('5');
  await page.getByRole('button', { name: 'Complete set' }).click();
  await page.getByRole('button', { name: 'Finish' }).click();

  await page.getByRole('tab', { name: 'History' }).click();
  await page.getByText('Back Squat').last().click();
  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.getByText('Edit workout')).toBeVisible();
  await page.getByRole('textbox', { name: 'Reps' }).fill('6');
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByText('100 × 6')).toBeVisible();

  await page.getByRole('button', { name: 'Duplicate' }).click();
  await expect(page.getByRole('button', { name: 'Finish' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Weight' })).toHaveValue('100');
  await expect(page.getByRole('textbox', { name: 'Reps' })).toHaveValue('6');
  await expect(page.getByRole('button', { name: 'Complete set' })).toBeVisible();
});
