/**
 * The logging pad is buttons, not a system text box.
 * The first digit replaces whatever is already in the field.
 */
import type { Page } from '@playwright/test';

export async function typePad(page: Page, value: string): Promise<void> {
  for (const key of value) {
    await page.getByRole('button', { name: key === '.' ? 'Decimal point' : key, exact: true }).click();
  }
}

export async function hidePad(page: Page): Promise<void> {
  const hide = page.getByRole('button', { name: 'Hide keyboard' });
  if ((await hide.count()) > 0) {
    await hide.click();
  }
}

export async function fillSet(page: Page, weight: string, reps: string, index = 0): Promise<void> {
  await page.getByRole('button', { name: /^Weight/ }).nth(index).click();
  await typePad(page, weight);
  await page.getByRole('button', { name: /^Reps/ }).nth(index).click();
  await typePad(page, reps);
  await hidePad(page);
}
