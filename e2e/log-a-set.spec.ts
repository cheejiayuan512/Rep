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

  await page.getByRole('button', { name: 'Start workout' }).click();
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
  await expect(page.getByText('Best e1RM 116.7 kg')).toBeVisible();
});

test('variants fold, a heavier set is starred, and deletes can be undone', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
  });
  await page.goto('/');

  await page.getByRole('button', { name: 'Start workout' }).click();
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

  await page.getByRole('button', { name: 'Start workout' }).click();
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
  await expect(page.getByText(/^100 . 6$/).last()).toBeVisible();

  await page.getByRole('button', { name: 'Duplicate' }).click();
  await expect(page.getByRole('button', { name: 'Finish' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Weight' })).toHaveValue('100');
  await expect(page.getByRole('textbox', { name: 'Reps' })).toHaveValue('6');
  await expect(page.getByRole('button', { name: 'Complete set' })).toBeVisible();
});

test('exercises can be edited from their tab, and the calculators open', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
  });
  await page.goto('/');

  await page.getByRole('tab', { name: 'Exercises' }).click();
  await page.getByRole('textbox', { name: 'Search the library' }).fill('Back Squat');
  await page.getByRole('button', { name: 'Back Squat', exact: true }).click();
  await page.getByRole('textbox', { name: 'Exercise name' }).fill('Back Squat (High Bar)');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.getByRole('textbox', { name: 'Search the library' }).fill('High Bar');
  await expect(page.getByRole('button', { name: 'Back Squat (High Bar)' })).toBeVisible();

  await page.getByRole('tab', { name: 'Workout' }).click();
  await page.getByRole('button', { name: 'Start workout' }).click();
  await page.getByRole('button', { name: 'Add exercise' }).click();
  await expect(page.getByText('Delete', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Discard' }).click();
  await page.getByRole('button', { name: 'Discard' }).last().click();

  await page.getByRole('tab', { name: 'Progress' }).click();
  await page.getByRole('button', { name: '1RM calculator' }).click();
  await page.getByRole('textbox', { name: 'Weight in kg' }).fill('100');
  await page.getByRole('textbox', { name: 'Reps' }).fill('5');
  await expect(page.getByLabel('Estimated one-rep max 115.5 kg')).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByRole('button', { name: 'Analysis' }).click();
  await expect(page.getByText('No workouts in this period')).toBeVisible();
});

test('rest follows the exercise, warmups sort first, and a card can swap or change attachment', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
  });
  await page.goto('/');

  await page.getByRole('button', { name: 'Start workout' }).click();
  await page.getByRole('button', { name: 'Add exercise' }).click();
  await page.getByRole('textbox', { name: 'Search exercises' }).fill('Back Squat');
  await page.getByRole('button', { name: 'Back Squat', exact: true }).click();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('button', { name: 'Rest timer 3:00, default' })).toBeVisible();

  await page.getByRole('textbox', { name: 'Weight' }).fill('100');
  await page.getByRole('textbox', { name: 'Reps' }).fill('5');
  await page.getByRole('button', { name: 'Complete set' }).click();
  await page.getByRole('button', { name: '+15' }).click();
  await expect(page.getByRole('button', { name: 'Rest timer 3:00, default' })).toBeVisible();
  await page.getByRole('button', { name: 'Skip' }).click();

  await page.getByRole('button', { name: 'Add set' }).click();
  await page.getByLabel('Mark as a warmup set').nth(1).click();
  await expect(page.getByLabel(/^Mark as a/).first()).toHaveAccessibleName('Mark as a working set');
  await page.getByRole('button', { name: 'Complete set' }).first().click();
  await expect(page.getByText(/^1:(29|30)$/)).toBeVisible();
  await page.getByRole('button', { name: 'Skip' }).click();

  await page.getByRole('button', { name: 'Swap Back Squat' }).click();
  await page.getByRole('textbox', { name: 'Search exercises' }).fill('Front Squat');
  await page.getByRole('button', { name: 'Front Squat', exact: true }).click();
  await expect(page.getByText('Front Squat', { exact: true })).toBeVisible();
  await expect(page.getByText('Back Squat', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Add exercise' }).click();
  await page.getByRole('textbox', { name: 'Search exercises' }).fill('Triceps Pushdown');
  await page.getByRole('button', { name: 'Triceps Pushdown', exact: true }).click();
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Attachment Rope' }).click();
  await page.getByRole('button', { name: 'V-bar' }).click();
  await expect(page.getByRole('button', { name: 'Attachment V-bar' })).toBeVisible();
});

test('the 1RM calculator blends a whole session', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
  });
  await page.goto('/');

  await page.getByRole('tab', { name: 'Progress' }).click();
  await page.getByRole('button', { name: '1RM calculator' }).click();
  await page.getByRole('button', { name: 'Whole session' }).click();
  await page.getByRole('textbox', { name: 'Session weight in kg' }).nth(0).fill('120');
  await page.getByRole('textbox', { name: 'Session reps' }).nth(0).fill('3');
  await page.getByRole('textbox', { name: 'Session weight in kg' }).nth(1).fill('120');
  await page.getByRole('textbox', { name: 'Session reps' }).nth(1).fill('3');
  await page.getByRole('textbox', { name: 'Session weight in kg' }).nth(2).fill('90');
  await page.getByRole('textbox', { name: 'Session reps' }).nth(2).fill('8');
  await expect(page.getByLabel('Estimated one-rep max 131 kg')).toBeVisible();
  await expect(page.getByText('Blends 2 of 3 sets', { exact: false })).toBeVisible();
});
