/**
 * Which screens become store screenshots, at which sizes, with which caption.
 * `scripts/store-assets.ts` renders these with Playwright, then frames them.
 *
 * The demo log in `fixtures/Rep-demo-log.json` is the data behind every shot.
 * Regenerate it with `npm run seed:demo` after changing the seed.
 */
import type { Page } from '@playwright/test';

export type DeviceId = 'iphone-6.9' | 'ipad-13' | 'android-phone';

export type Device = {
  id: DeviceId;
  /** Folder under store-assets/, one per store. */
  store: 'ios' | 'android';
  dir: string;
  /** Output pixels. These are the sizes the stores accept. */
  width: number;
  height: number;
  /** CSS pixels per output pixel. The app is rendered at 1/scale size. */
  scale: number;
  frame: 'phone' | 'tablet';
  /** Backdrop under store-assets/art/, or a gradient when it is missing. */
  art: string;
  /**
   * Safe-area insets in points. The web build reports 0 for all of them, which
   * leaves the tab bar too short for its own labels, so the capture sets these
   * to the values the real device reports.
   */
  insets: { bottom: number; top: number };
};

export type Shot = {
  id: string;
  /** One line, shown above the device. Keep it under about 46 characters. */
  caption: string;
  devices: DeviceId[];
  setup: (page: Page) => Promise<void>;
};

export const DEVICES: Device[] = [
  // 6.9" iPhone: 440 x 956 points at 3x. Apple's required iPhone size.
  {
    art: 'backdrop-phone.png',
    dir: 'ios/iphone-6.9',
    frame: 'phone',
    height: 2868,
    id: 'iphone-6.9',
    insets: { bottom: 34, top: 62 },
    scale: 3,
    store: 'ios',
    width: 1320,
  },
  // 13" iPad: 1032 x 1376 points at 2x. Required because supportsTablet is true.
  {
    art: 'backdrop-tablet.png',
    dir: 'ios/ipad-13',
    frame: 'tablet',
    height: 2752,
    id: 'ipad-13',
    insets: { bottom: 20, top: 24 },
    scale: 2,
    store: 'ios',
    width: 2064,
  },
  // Play phone: 1080 x 1920 is 9:16, the tallest shape Play accepts. 2.5x puts
  // the app at 432 x 768 points, the width of a current large Android phone.
  {
    art: 'backdrop-phone.png',
    dir: 'android/phone',
    frame: 'phone',
    height: 1920,
    id: 'android-phone',
    insets: { bottom: 24, top: 24 },
    scale: 2.5,
    store: 'android',
    width: 1080,
  },
];

/** Waits for the app to finish opening the saved log. */
async function waitForHome(page: Page): Promise<void> {
  await page.getByText('Resume', { exact: true }).waitFor();
}

async function openTab(page: Page, name: 'Workout' | 'History' | 'Progress' | 'Profile'): Promise<void> {
  await page.getByRole('tab', { name }).click();
  await page.waitForTimeout(400);
}

async function resumeWorkout(page: Page): Promise<void> {
  await waitForHome(page);
  await page.getByText('Resume', { exact: true }).click();
  await page.getByRole('button', { name: 'Finish' }).waitFor();
  await page.waitForTimeout(500);
}

export const SHOTS: Shot[] = [
  {
    caption: 'Every set, one tap.',
    devices: ['iphone-6.9', 'android-phone'],
    id: 'home',
    setup: waitForHome,
  },
  {
    caption: 'Weight, reps, and effort on the card.',
    devices: ['iphone-6.9', 'android-phone'],
    id: 'log',
    setup: resumeWorkout,
  },
  {
    caption: 'Finish and watch the work add up.',
    devices: ['iphone-6.9', 'android-phone'],
    id: 'finish',
    setup: async (page) => {
      await resumeWorkout(page);
      await page.getByRole('button', { name: 'Finish' }).click();
      await page.getByText('Well Done!').waitFor();
      await page.waitForTimeout(700);
    },
  },
  {
    caption: 'Every session, kept on your phone.',
    devices: ['iphone-6.9', 'ipad-13', 'android-phone'],
    id: 'history',
    setup: async (page) => {
      await waitForHome(page);
      await openTab(page, 'History');
      await page
        .getByRole('button', { name: /, .+ · / })
        .first()
        .waitFor();
      await page.waitForTimeout(400);
    },
  },
  {
    caption: 'Open any session. Every set is there.',
    devices: ['iphone-6.9', 'ipad-13'],
    id: 'detail',
    setup: async (page) => {
      await waitForHome(page);
      await openTab(page, 'History');
      await page
        .getByRole('button', { name: /, .+ · / })
        .first()
        .click();
      await page.getByText('Duration', { exact: true }).waitFor();
      await page.waitForTimeout(500);
    },
  },
  {
    caption: 'Volume, balance, and effort.',
    devices: ['iphone-6.9', 'ipad-13', 'android-phone'],
    id: 'analysis',
    setup: async (page) => {
      await waitForHome(page);
      await openTab(page, 'Progress');
      await page.getByRole('button', { name: 'Analysis' }).click();
      await page.getByText('Muscle groups').waitFor();
      await page.waitForTimeout(900);
    },
  },
  {
    caption: 'A record and a chart for every lift.',
    devices: ['iphone-6.9', 'ipad-13'],
    id: 'progress',
    setup: async (page) => {
      await waitForHome(page);
      await openTab(page, 'Progress');
      await page.getByRole('button', { name: 'Analysis' }).waitFor();
      await page.waitForTimeout(700);
    },
  },
  {
    caption: 'See where your lifts stand.',
    devices: ['iphone-6.9', 'ipad-13'],
    id: 'strength',
    setup: async (page) => {
      await waitForHome(page);
      await openTab(page, 'Progress');
      await page.getByRole('button', { name: 'Strength levels' }).click();
      await page.getByText('Strongest lift').waitFor();
      await page.waitForTimeout(700);
    },
  },
  {
    caption: 'Levels, streaks, and records.',
    devices: ['iphone-6.9', 'ipad-13', 'android-phone'],
    id: 'profile',
    setup: async (page) => {
      await waitForHome(page);
      await openTab(page, 'Profile');
      await page.getByText(/^Level \d+ of \d+$/).waitFor();
      await page.waitForTimeout(400);
    },
  },
  {
    caption: 'Every lift is one search away.',
    devices: ['iphone-6.9', 'ipad-13', 'android-phone'],
    id: 'library',
    setup: async (page) => {
      await waitForHome(page);
      await openTab(page, 'Profile');
      await page.getByRole('button', { name: 'Exercise library' }).click();
      const search = page.getByRole('textbox', { name: 'Search the library' });
      await search.waitFor();
      await search.fill('squat');
      await page
        .getByRole('button', { name: /Squat$/ })
        .first()
        .waitFor();
      await page.waitForTimeout(500);
    },
  },
  {
    caption: 'Estimate a max from any set.',
    devices: ['android-phone'],
    id: 'onerm',
    setup: async (page) => {
      await waitForHome(page);
      await openTab(page, 'Progress');
      await page.getByRole('button', { name: '1RM calculator' }).click();
      await page.getByRole('button', { name: 'One set' }).click();
      await page.getByRole('textbox', { name: /^Weight in (kg|lb)$/ }).fill('100');
      await page.getByRole('textbox', { name: 'Reps' }).fill('5');
      await page.waitForTimeout(500);
    },
  },
];
