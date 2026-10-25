/**
 * One full loop: start a workout, log a squat, finish, and read it back in History.
 * Playwright finds buttons by the same names a screen reader uses.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

async function swipeLeft(page: Page, row: Locator): Promise<void> {
  const box = await row.boundingBox();
  if (!box) {
    throw new Error('Row is not on screen');
  }
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width - 10, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.2, y, { steps: 12 });
  await page.mouse.up();
}

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

  await expect(page.getByText('Workout complete')).toBeVisible();
  await expect(page.getByText(/^\+\d+ XP$/)).toBeVisible();
  await expect(page.getByText(/XP to level \d+/)).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();

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

  await swipeLeft(page, page.getByTestId('set-row').nth(1));
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
  await page.getByRole('button', { name: 'Done' }).click();

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
  await page.getByRole('button', { name: 'One set' }).click();
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
  await page.getByRole('textbox', { name: 'Weight' }).first().fill('50');
  await page.getByRole('button', { name: 'Complete set' }).first().click();
  await expect(page.getByText(/^1:5[45]$/)).toBeVisible();
  await page.getByRole('button', { name: 'Skip' }).click();

  await page.getByRole('button', { name: 'Swap Back Squat' }).click();
  await page.getByRole('textbox', { name: 'Search exercises' }).fill('Front Squat');
  await page.getByRole('button', { name: 'Front Squat', exact: true }).click();
  await expect(page.getByText('Front Squat', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Swap Back Squat' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Quick add Back Squat' })).toBeVisible();

  await page.getByRole('button', { name: 'Add exercise' }).click();
  await page.getByRole('textbox', { name: 'Search exercises' }).fill('Triceps Pushdown');
  await page.getByRole('button', { name: 'Triceps Pushdown', exact: true }).click();
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Attachment Rope' }).click();
  await page.getByRole('button', { name: 'V-bar' }).click();
  await expect(page.getByRole('button', { name: 'Attachment V-bar' })).toBeVisible();
  await page.getByRole('button', { name: 'Machine setup Unknown' }).click();
  await page.getByRole('button', { name: 'Life Fitness, last —' }).click();
  await expect(page.getByRole('button', { name: 'Machine setup Life Fitness' })).toBeVisible();
  await expect(page.getByText('No session on Life Fitness yet')).toBeVisible();
});

test('add set copies a small-plate weight exactly', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
  });
  await page.goto('/');

  await page.getByRole('button', { name: 'Start workout' }).click();
  await page.getByRole('button', { name: 'Add exercise' }).click();
  await page.getByRole('textbox', { name: 'Search exercises' }).fill('Cable Lateral Raise');
  await page.getByRole('button', { name: 'Cable Lateral Raise', exact: true }).click();
  await page.getByRole('button', { name: 'Done' }).click();

  await page.getByRole('textbox', { name: 'Weight' }).fill('8.75');
  await page.getByRole('textbox', { name: 'Reps' }).fill('12');
  await page.getByRole('button', { name: 'Add set' }).click();
  await expect(page.getByRole('textbox', { name: 'Weight' }).nth(1)).toHaveValue('8.75');
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

test('a blank workout offers quick adds, and search forgives typos', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
  });
  await page.goto('/');

  await page.getByRole('button', { name: 'Start workout' }).click();
  await page.getByRole('button', { name: /^Quick add / }).first().click();
  await expect(page.getByRole('button', { name: 'Complete set' })).toBeVisible();

  await page.getByRole('button', { name: 'Add exercise' }).click();
  await page.getByRole('textbox', { name: 'Search exercises' }).fill('benhc pres');
  await expect(page.getByRole('button', { name: 'Barbell Bench Press', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search exercises' }).fill('rdl');
  await expect(page.getByRole('button', { name: 'Romanian Deadlift', exact: true })).toBeVisible();
});

test('profile holds the unit and bodyweight, and strength levels compare a lift', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
  });
  await page.goto('/');

  await page.getByRole('button', { name: 'Start workout' }).click();
  await page.getByRole('button', { name: 'Add exercise' }).click();
  await page.getByRole('textbox', { name: 'Search exercises' }).fill('Back Squat');
  await page.getByRole('button', { name: 'Back Squat', exact: true }).click();
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('textbox', { name: 'Weight' }).fill('140');
  await page.getByRole('textbox', { name: 'Reps' }).fill('3');
  await page.getByRole('button', { name: 'Complete set' }).click();
  await page.getByRole('button', { name: 'Finish' }).click();
  await page.getByRole('button', { name: 'Done' }).click();

  await page.getByRole('tab', { name: 'Profile' }).click();
  await expect(page.getByText(/^Level \d+ of 20$/)).toBeVisible();
  await page.getByRole('textbox', { name: 'Bodyweight in kg' }).fill('80');
  await page.getByRole('textbox', { name: 'Bodyweight in kg' }).press('Enter');
  await page.getByRole('button', { name: 'Male', exact: true }).click();
  await expect(page.getByText(/Stronger than about \d+% of lifters/)).toBeVisible();

  await page.getByRole('button', { name: /^Logger,/ }).click();
  await expect(page.getByText('Finished workouts.')).toBeVisible();
  await expect(page.getByText(/^Now: 1 workouts/)).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();

  await page.getByRole('button', { name: 'Strength levels' }).click();
  await expect(page.getByText('Not logged yet')).toBeVisible();
  await expect(page.getByText(/^Back Squat/).last()).toBeVisible();
});
