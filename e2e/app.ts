/**
 * Opens the app with an empty log.
 *
 * A first run shows the tour, which dims the screen and takes the taps. Every
 * test wants the app underneath it, not the tour, so it is dismissed here and
 * the check stays best-effort: a test that no longer sees a tour still works.
 */
import type { Page } from '@playwright/test';

export async function openApp(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.clear();
  });
  await page.goto('/');
  const skip = page.getByRole('button', { name: 'Skip' });
  await skip
    .waitFor({ state: 'visible', timeout: 4000 })
    .then(() => skip.click())
    .catch(() => undefined);
}

/**
 * Finishes the workout.
 *
 * While a rest runs the rest bar replaces the Finish button, so a test that has
 * just completed a set must end the rest first.
 */
export async function finishWorkout(page: Page): Promise<void> {
  const skip = page.getByRole('button', { name: 'Skip rest' });
  try {
    await skip.waitFor({ state: 'visible', timeout: 3000 });
    await skip.click();
  } catch {
    // No rest was running.
  }
  await page.getByRole('button', { name: 'Finish' }).click();
}
