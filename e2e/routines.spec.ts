/**
 * A routine is planned like a workout: cards with sets, drag the dots to reorder, swipe a card to remove it.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

async function dragBy(page: Page, target: Locator, dx: number, dy: number): Promise<void> {
  const box = await target.boundingBox();
  if (!box) {
    throw new Error('Target is not on screen');
  }
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 16 });
  await page.mouse.up();
}

/** Swipes a card left from just beside its handle, past half its width. */
async function swipeCard(page: Page, name: string): Promise<void> {
  const box = await page.getByLabel(`Reorder ${name}`).boundingBox();
  if (!box) {
    throw new Error('Card is not on screen');
  }
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x - 40, y);
  await page.mouse.down();
  await page.mouse.move(20, y, { steps: 16 });
  await page.mouse.up();
}

async function addExercise(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: 'Add exercise' }).click();
  await page.getByRole('textbox', { name: 'Search exercises' }).fill(name);
  await page.getByRole('button', { name, exact: true }).click();
  await expect(page.getByText('Added')).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();
}

test('a routine plans sets, reorders by dragging, and removes by swiping', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
  });
  await page.goto('/');

  await page.getByRole('tab', { name: 'Routines' }).click();
  await page.getByRole('button', { name: 'Create a routine' }).click();
  await addExercise(page, 'Back Squat');
  await addExercise(page, 'Barbell Bench Press');

  await page.getByRole('textbox', { name: 'Weight' }).first().fill('100');
  await page.getByRole('textbox', { name: 'Reps' }).first().fill('5');
  await page.getByRole('button', { name: 'Add set' }).first().click();
  await expect(page.getByRole('textbox', { name: 'Weight' })).toHaveCount(3);
  await expect(page.getByRole('textbox', { name: 'Weight' }).nth(1)).toHaveValue('100');

  const squatHandle = page.getByLabel('Reorder Back Squat');
  const benchHandle = page.getByLabel('Reorder Barbell Bench Press');
  const squatBox = await squatHandle.boundingBox();
  const benchBox = await benchHandle.boundingBox();
  if (!squatBox || !benchBox) {
    throw new Error('Handles are not on screen');
  }
  await dragBy(page, benchHandle, 0, squatBox.y - benchBox.y - 20);
  await expect.poll(async () => ((await page.getByLabel('Reorder Barbell Bench Press').boundingBox())?.y ?? 0) < ((await page.getByLabel('Reorder Back Squat').boundingBox())?.y ?? 0)).toBe(true);

  await swipeCard(page, 'Barbell Bench Press');
  await expect(page.getByLabel('Reorder Barbell Bench Press')).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByLabel('Reorder Barbell Bench Press')).toHaveCount(1);
  await swipeCard(page, 'Barbell Bench Press');
  await expect(page.getByLabel('Reorder Barbell Bench Press')).toHaveCount(0);

  await page.getByRole('button', { name: 'Start workout' }).click();
  await expect(page.getByRole('button', { name: 'Complete set' })).toHaveCount(2);
  await expect(page.getByRole('textbox', { name: 'Weight' }).first()).toHaveValue('100');
  await expect(page.getByRole('textbox', { name: 'Reps' }).nth(1)).toHaveValue('5');
});
