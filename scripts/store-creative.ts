/**
 * The two App Store creative assets Apple added for iOS 27: the product page
 * header and the search results creative.
 *
 * Both are built from the same real screenshots, backdrop, and type as the
 * store frames, so the product page reads as one piece. Nothing here is a mock
 * of the app; the phone shows an actual capture.
 *
 * Specs (App Store Connect Help, Creative assets specifications):
 *   product page header   21:9   3840 x 1646   .jpeg / .jpg / .png
 *   search results        3:2    1920 x 1280 .. 3840 x 2560
 *   universal             16:9   5244 x 2950   .png, serves both placements
 *
 * Run: npm run creative
 *
 * Output: store-assets/appstore/header.png
 *         store-assets/appstore/search-results.png
 *         store-assets/appstore/universal.png
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { chromium } from '@playwright/test';

const ROOT = resolve(__dirname, '..');
const OUT = join(ROOT, 'store-assets', 'appstore');
// Raw captures, not the framed store shots: the phone must show the app only.
const SHOTS = join(ROOT, 'store-assets', '.cache');
const BACKDROP = join(ROOT, 'store-assets', 'art', 'backdrop-phone.png');

const args = process.argv.slice(2);
const only = args.find((arg) => arg.startsWith('--only='))?.slice(7);

type Layout = {
  file: string;
  width: number;
  height: number;
  /** Left-hand copy. */
  kicker: string;
  headline: string;
  sub: string;
  /** Which captures sit on the right. */
  screens: string[];
  /** Headline size in px at this canvas width. */
  headlineSize: number;
  /** How far the phones are scaled, as a fraction of canvas height. */
  phoneHeight: number;
};

const LAYOUTS: Layout[] = [
  {
    file: 'header.png',
    width: 3840,
    height: 1646,
    kicker: 'WORKOUT LOG',
    headline: 'Every set,\none tap.',
    sub: 'Sets, reps, and personal records. No account, no ads, all on your phone.',
    screens: ['iphone-6.9-home.png', 'iphone-6.9-log.png'],
    headlineSize: 210,
    phoneHeight: 0.80,
  },
  {
    file: 'search-results.png',
    width: 1920,
    height: 1280,
    kicker: 'WORKOUT LOG',
    headline: 'Log every set.',
    sub: 'Weight, reps, and a PR the moment you beat one.',
    screens: ['iphone-6.9-log.png'],
    headlineSize: 150,
    phoneHeight: 0.80,
  },
  {
    file: 'universal.png',
    width: 5244,
    height: 2950,
    kicker: 'WORKOUT LOG',
    headline: 'Every set,\none tap.',
    sub: 'Sets, reps, and personal records. No account, no ads, all on your phone.',
    screens: ['iphone-6.9-home.png', 'iphone-6.9-log.png'],
    headlineSize: 300,
    phoneHeight: 0.70,
  },
];

function dataUri(path: string): string {
  return `data:image/png;base64,${readFileSync(path).toString('base64')}`;
}

function html(layout: Layout): string {
  const backdrop = dataUri(BACKDROP);
  const phones = layout.screens.map((name) => {
    const path = join(SHOTS, name);
    if (!existsSync(path)) {
      throw new Error(`Missing ${path}. Run: npx tsx scripts/store-assets.ts --shots=home,log --keep-raw`);
    }
    return dataUri(path);
  });

  const phoneHeight = Math.round(layout.height * layout.phoneHeight);
  const phoneWidth = Math.round((phoneHeight * 1320) / 2868);
  const bezel = Math.round(phoneWidth * 0.022);
  const radius = Math.round(phoneWidth * 0.12);
  const gap = Math.round(phoneWidth * 0.14);
  // Overlap the pair slightly so it reads as one object, not two diagrams.
  const stackWidth = phones.length === 2 ? phoneWidth * 2 - gap : phoneWidth;
  const headline = layout.headline.replace(/\n/g, '<br>');

  const cards = phones
    .map(
      (uri, index) => `
      <div class="device" style="${index === 1 ? `margin-left:${-gap}px;` : ''}">
        <img class="screen" src="${uri}" alt="">
      </div>`,
    )
    .join('');

  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:${layout.width}px;height:${layout.height}px;overflow:hidden;background:#000}
  body{
    font-family:'Segoe UI',system-ui,-apple-system,'Helvetica Neue',sans-serif;color:#fff;
    background-image:url('${backdrop}');background-size:cover;background-position:center;position:relative;
  }
  .scrim{position:absolute;inset:0;background:
    radial-gradient(56% 80% at 78% 48%, rgba(214,255,74,.10) 0%, rgba(214,255,74,0) 62%),
    linear-gradient(100deg, rgba(0,0,0,.88) 0%, rgba(0,0,0,.72) 38%, rgba(0,0,0,.28) 68%, rgba(0,0,0,.55) 100%);}
  .copy{position:absolute;left:8%;top:50%;transform:translateY(-50%);width:44%;z-index:2}
  .rule{width:${Math.round(layout.width * 0.018)}px;height:${Math.round(layout.height * 0.006)}px;border-radius:999px;background:#D6FF4A;margin-bottom:${Math.round(layout.height * 0.045)}px}
  .kicker{font-size:${Math.round(layout.headlineSize * 0.17)}px;font-weight:800;letter-spacing:.16em;color:#D6FF4A;margin-bottom:${Math.round(layout.height * 0.022)}px}
  .head{font-size:${layout.headlineSize}px;font-weight:800;line-height:1.02;letter-spacing:-0.035em}
  .sub{margin-top:${Math.round(layout.height * 0.045)}px;font-size:${Math.round(layout.headlineSize * 0.19)}px;line-height:1.35;color:#c2c7ba;max-width:88%}
  .art{position:absolute;right:9%;top:50%;transform:translateY(-50%);display:flex;align-items:center;justify-content:flex-end;width:${stackWidth}px;height:${phoneHeight}px;z-index:2}
  .device{width:${phoneWidth}px;height:${phoneHeight}px;background:#0a0a0b;border:1px solid rgba(255,255,255,.18);
    border-radius:${radius}px;padding:${bezel}px;position:relative;
    box-shadow:0 60px 140px rgba(0,0,0,.85), 0 0 0 1px rgba(0,0,0,.7), 0 0 120px rgba(214,255,74,.10)}
  .screen{display:block;width:100%;height:100%;object-fit:cover;border-radius:${Math.round(radius * 0.84)}px}
</style></head><body>
  <div class="scrim"></div>
  <div class="copy">
    <div class="rule"></div>
    <div class="kicker">${layout.kicker}</div>
    <div class="head">${headline}</div>
    <div class="sub">${layout.sub}</div>
  </div>
  <div class="art">${cards}</div>
</body></html>`;
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const layout of LAYOUTS) {
      if (only && only !== layout.file) {
        continue;
      }
      const context = await browser.newContext({ deviceScaleFactor: 1, viewport: { height: layout.height, width: layout.width } });
      const page = await context.newPage();
      await page.setContent(html(layout), { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const path = join(OUT, layout.file);
      const buffer = await page.screenshot({ animations: 'disabled', type: 'png' });
      writeFileSync(path, buffer);
      await context.close();
      console.log(`  ${layout.file} ${layout.width}x${layout.height} ${Math.round(buffer.length / 1024)} KB`);
    }
  } finally {
    await browser.close();
  }
  console.log(`· Wrote ${OUT}`);
}

main().catch((error: unknown) => {
  console.error(`✖ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
