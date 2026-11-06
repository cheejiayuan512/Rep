/**
 * Store screenshots, built from the real app.
 *
 * 1. Exports the web build (`npx expo export --platform web`).
 * 2. Opens it in Chromium at each store size and captures the screens listed
 *    in `scripts/store-shots.ts`, seeded with `fixtures/Rep-demo-log.json`.
 * 3. Frames each capture on a background and writes `store-assets/`.
 *
 * Run:   npm run assets
 * Flags: --force        rebuild the web bundle and recapture
 *        --if-changed   exit early when the version and sources are unchanged
 *        --shots=home,log  capture just these shots
 *        --keep-raw     keep store-assets/.cache
 *        --debug        print the frame layout for each shot
 *
 * Backdrops are optional. Drop `backdrop-phone.png` or `backdrop-tablet.png`
 * into `store-assets/art/` and every frame uses it instead of the gradient.
 * Both files are 1320 x 2868 (phone) and 2064 x 2752 (tablet).
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

import { chromium, type Browser } from '@playwright/test';

import { readBackupDocument } from '../src/domain/log-backup';
import { DEVICES, SHOTS, type Device, type DeviceId, type Shot } from './store-shots';

const ROOT = resolve(__dirname, '..');
const DIST = join(ROOT, 'dist');
const OUT = join(ROOT, 'store-assets');
const CACHE = join(OUT, '.cache');
const MANIFEST = join(OUT, 'manifest.json');
const SEED = join(ROOT, 'fixtures', 'Rep-demo-log.json');
const PORT = 8099;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const args = process.argv.slice(2);
const hasFlag = (name: string): boolean => args.includes(`--${name}`);
const flagValue = (name: string): string | undefined => {
  const hit = args.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};

type Output = {
  configHash: string;
  device: DeviceId;
  file: string;
  height: number;
  rawHash: string;
  shot: string;
  width: number;
};

type Manifest = {
  appVersion: string;
  generatedAt: string;
  outputs: Output[];
  sourceHash: string;
};

const MIME: Record<string, string> = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.map': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2',
};

function sha256(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex');
}

function appVersion(): string {
  const config = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')) as { expo?: { version?: string } };
  return config.expo?.version ?? '0.0.0';
}

/** Every file under a folder, as paths relative to the repo. */
function walk(dir: string): string[] {
  const absolute = join(ROOT, dir);
  if (!existsSync(absolute)) {
    return [];
  }
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const child = join(dir, entry.name);
    return entry.isDirectory() ? walk(child) : [child];
  });
}

/**
 * Changes when the app source, the demo log, the shot list, or a backdrop
 * changes.
 *
 * This hashes file contents rather than git state on purpose: the screenshots
 * are committed, and CI checks out a clean tree at a different commit than the
 * one that made them. Comparing a diff would either always or never match.
 */
function sourceHash(): string {
  const art = walk('store-assets/art').filter((file) => file.endsWith('.png'));
  const files = [...walk('src'), 'App.tsx', 'index.ts', 'app.json', 'assets/icon.png', 'fixtures/Rep-demo-log.json', 'scripts/store-shots.ts', ...art].sort();
  return sha256(files.map((file) => `${file}:${sha256(readFileSync(join(ROOT, file)))}`).join('\n'));
}

function readManifest(): Manifest | undefined {
  if (!existsSync(MANIFEST)) {
    return undefined;
  }
  try {
    return JSON.parse(readFileSync(MANIFEST, 'utf8')) as Manifest;
  } catch {
    return undefined;
  }
}

function selectedShots(): Shot[] {
  const only = flagValue('shots');
  if (!only) {
    return SHOTS;
  }
  const wanted = new Set(only.split(',').map((id) => id.trim()));
  const picked = SHOTS.filter((shot) => wanted.has(shot.id));
  const missing = [...wanted].filter((id) => !SHOTS.some((shot) => shot.id === id));
  if (missing.length > 0) {
    throw new Error(`Unknown shot(s): ${missing.join(', ')}`);
  }
  return picked;
}

/** True when only some shots were asked for, so the folders must be kept. */
function isPartialRun(): boolean {
  return flagValue('shots') != null;
}

function shotsFor(device: Device, shots: Shot[]): Shot[] {
  return shots.filter((shot) => shot.devices.includes(device.id));
}

function artPath(device: Device): string | undefined {
  const path = join(OUT, 'art', device.art);
  return existsSync(path) ? path : undefined;
}

/** Composition depends on the captions, sizes, and backdrop. */
function configHashFor(device: Device, shot: Shot): string {
  const art = artPath(device);
  return sha256([shot.id, shot.caption, String(device.width), String(device.height), device.frame, art ? sha256(readFileSync(art)) : 'gradient'].join('|'));
}

function buildWeb(force: boolean): void {
  if (!force && existsSync(join(DIST, 'index.html'))) {
    console.log('· Reusing dist/. Pass --force to rebuild the web bundle.');
    return;
  }
  console.log('· Exporting the web build…');
  const result = spawnSync(process.execPath, [join(ROOT, 'node_modules', 'expo', 'bin', 'cli'), 'export', '--platform', 'web', '--output-dir', 'dist'], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(`expo export failed${result.error ? `: ${result.error.message}` : ''}`);
  }
}

function startServer(): Promise<Server> {
  const server = createServer((request, response) => {
    const requested = decodeURIComponent((request.url ?? '/').split('?')[0]);
    const relative = normalize(requested).replace(/^([/\\])+/, '');
    let file = join(DIST, relative);
    if (!existsSync(file) || relative === '' || relative === '.') {
      file = join(DIST, 'index.html');
    }
    if (!existsSync(file)) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(200, { 'Cache-Control': 'no-store', 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
    response.end(readFileSync(file));
  });
  return new Promise((resolvePromise) => {
    server.listen(PORT, '127.0.0.1', () => resolvePromise(server));
  });
}

function seedDocument(): string {
  return readBackupDocument(readFileSync(SEED, 'utf8'));
}

/** Shifts every `*At` timestamp so the log reads as current. */
function shiftTimestamps(value: unknown, delta: number, key?: string): unknown {
  if (typeof value === 'number') {
    return key && key.endsWith('At') && value > 1e12 ? value + delta : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => shiftTimestamps(item, delta));
  }
  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const shifted: Record<string, unknown> = {};
    for (const [childKey, child] of Object.entries(source)) {
      if (childKey === 'settingsUpdatedAt' && child && typeof child === 'object') {
        const stamps: Record<string, number> = {};
        for (const [stampKey, stamp] of Object.entries(child as Record<string, number>)) {
          stamps[stampKey] = stamp + delta;
        }
        shifted[childKey] = stamps;
        continue;
      }
      shifted[childKey] = shiftTimestamps(child, delta, childKey);
    }
    return shifted;
  }
  return value;
}

type SeedWorkout = { finishedAt: number | null; id: string; startedAt: number; updatedAt: number };
type SeedRow = { updatedAt: number };
type SeedSet = SeedRow & { workoutExerciseId: string };
type SeedDocument = {
  sets?: SeedSet[];
  workoutExercises?: (SeedRow & { workoutId: string })[];
  workouts?: SeedWorkout[];
};

/**
 * The demo log is dated to a fixed day. Shift it so the newest finished
 * workout is yesterday and the in-progress session started 35 minutes ago,
 * otherwise the screenshot shows a 55-hour workout and an empty week.
 */
function demoDocument(now: number): string {
  const document = JSON.parse(seedDocument()) as SeedDocument;
  const workouts = document.workouts ?? [];
  const finished = workouts.filter((workout) => workout.finishedAt != null);
  const newest = finished.length > 0 ? Math.max(...finished.map((workout) => workout.startedAt)) : now;
  const shifted = shiftTimestamps(document, now - 26 * 60 * 60 * 1000 - newest) as SeedDocument;

  const active = (shifted.workouts ?? []).find((workout) => workout.finishedAt == null);
  if (active) {
    const startedAt = now - 35 * 60 * 1000;
    active.startedAt = startedAt;
    active.updatedAt = startedAt;
    for (const exercise of shifted.workoutExercises ?? []) {
      if (exercise.workoutId === active.id) {
        exercise.updatedAt = startedAt;
      }
    }
    for (const set of shifted.sets ?? []) {
      if (set.workoutExerciseId.startsWith(`${active.id}-`)) {
        set.updatedAt = startedAt;
      }
    }
  }

  return JSON.stringify(shifted);
}

/**
 * `react-native-safe-area-context` on the web reads `env(safe-area-inset-*)`
 * from a hidden probe div it appends to <body>. A desktop browser reports 0,
 * which leaves the tab bar 49pt tall with no room under its labels, so the
 * capture sets the probe to the values a real device reports and asks the
 * provider to measure again. The script is a string on purpose: tsx rewrites
 * functions with a `__name` helper that does not exist inside the page.
 */
function insetScript(insets: { bottom: number; top: number }): string {
  return `(() => {
  let patched = 0;
  for (const element of document.body.children) {
    const style = element.getAttribute('style') || '';
    if (style.includes('z-index: -1') && style.includes('visibility: hidden')) {
      element.style.setProperty('padding-top', '${insets.top}px', 'important');
      element.style.setProperty('padding-bottom', '${insets.bottom}px', 'important');
      patched += 1;
    }
  }
  window.dispatchEvent(new Event('resize'));
  return patched;
})()`;
}

async function capture(browser: Browser, devices: Device[], shots: Shot[]): Promise<Map<string, Buffer>> {
  const seed = demoDocument(Date.now());
  const captured = new Map<string, Buffer>();

  for (const device of devices) {
    for (const shot of shotsFor(device, shots)) {
      const context = await browser.newContext({
        colorScheme: 'dark',
        deviceScaleFactor: device.scale,
        locale: 'en-US',
        reducedMotion: 'reduce',
        viewport: { height: Math.round(device.height / device.scale), width: Math.round(device.width / device.scale) },
      });
      await context.addInitScript((document) => {
        window.localStorage.clear();
        window.localStorage.setItem('rep.database.v1', document);
      }, seed);

      const page = await context.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const patched = await page.evaluate(insetScript(device.insets));
      if (patched === 0) {
        throw new Error('safe-area probe not found; insets could not be applied');
      }
      await page.waitForTimeout(200);
      await page.addStyleTag({
        content:
          '::-webkit-scrollbar{display:none} *{scrollbar-width:none} html,body{overscroll-behavior:none}' +
          // react-native-web renders a Text as an inline box; inside the tab bar
          // that box is shorter than the glyphs and overflow:hidden clips them.
          '[role="tab"]>div:not(:has(svg)){display:block!important;overflow:visible!important;text-overflow:clip!important}',
      });
      try {
        await shot.setup(page);
      } catch (error) {
        await page.screenshot({ path: join(CACHE, `failed-${device.id}-${shot.id}.png`) });
        throw new Error(`${device.id}/${shot.id}: ${(error as Error).message}`);
      }
      const raw = await page.screenshot({ animations: 'disabled', caret: 'hide', type: 'png' });
      if (hasFlag('keep-raw')) {
        writeFileSync(join(CACHE, `${device.id}-${shot.id}.png`), raw);
      }
      captured.set(`${device.id}/${shot.id}`, raw);
      await context.close();
      console.log(`  captured ${device.id}/${shot.id}`);
    }
  }

  return captured;
}

function frameRadius(device: Device): string {
  if (device.frame === 'tablet') {
    return '2.6%';
  }
  return device.id === 'android-phone' ? '8.5%' : '12%';
}

/** Every measurement of the frame, in output pixels. */
function layout(device: Device): {
  bezel: number;
  captionSize: number;
  captionTop: number;
  deviceHeight: number;
  deviceWidth: number;
  stageBottom: number;
  stageTop: number;
} {
  const stageHeight = Math.round(device.height * (device.frame === 'tablet' ? 0.76 : 0.79));
  const stageBottom = Math.round(device.height * 0.03);
  return {
    bezel: Math.round(device.width * (device.frame === 'tablet' ? 0.012 : 0.022)),
    captionSize: Math.round(device.width * 0.048),
    captionTop: Math.round(device.height * 0.042),
    deviceHeight: stageHeight,
    deviceWidth: Math.round((stageHeight * device.width) / device.height),
    stageBottom,
    stageTop: device.height - stageBottom - stageHeight,
  };
}

function composeHtml(device: Device, shot: Shot, raw: Buffer, art: string | undefined): string {
  const image = `data:image/png;base64,${raw.toString('base64')}`;
  const backdrop = art
    ? `background-image:url('data:image/png;base64,${readFileSync(art).toString('base64')}');background-size:cover;background-position:center;`
    : 'background:radial-gradient(120% 80% at 50% 0%, #1b2410 0%, #0b0f06 45%, #000000 100%);';
  const box = layout(device);
  const radius = frameRadius(device);

  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;width:${device.width}px;height:${device.height}px;overflow:hidden}
  body{${backdrop}font-family:'Segoe UI',system-ui,-apple-system,'Helvetica Neue',sans-serif;color:#fff;position:relative}
  body::before{content:'';position:absolute;inset:0;background:radial-gradient(58% 42% at 50% 88%, rgba(214,255,74,.16) 0%, rgba(214,255,74,0) 70%);z-index:0}
  body::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.58) 0%,rgba(0,0,0,.14) 32%,rgba(0,0,0,.02) 60%,rgba(0,0,0,.42) 100%);z-index:1}
  .caption{position:absolute;top:${box.captionTop}px;left:7%;right:7%;z-index:3;text-align:center;font-size:${box.captionSize}px;font-weight:700;line-height:1.15;letter-spacing:-0.022em;text-shadow:0 2px 24px rgba(0,0,0,.55)}
  .rule{position:absolute;top:${box.captionTop - Math.round(box.captionSize * 1.45)}px;left:50%;transform:translateX(-50%);width:${Math.round(device.width * 0.06)}px;height:${Math.max(4, Math.round(device.width * 0.006))}px;border-radius:999px;background:#D6FF4A;z-index:3}
  .stage{position:absolute;left:0;right:0;top:${box.stageTop}px;height:${box.deviceHeight}px;display:flex;align-items:flex-end;justify-content:center;z-index:2}
  .device{width:${box.deviceWidth}px;height:${box.deviceHeight}px;background:#0a0a0b;border:1px solid rgba(255,255,255,.14);border-radius:${radius};padding:${box.bezel}px;box-shadow:0 50px 130px rgba(0,0,0,.78),0 0 0 1px rgba(0,0,0,.6)}
  .screen{width:100%;height:100%;display:block;object-fit:cover;border-radius:${Math.round(box.deviceWidth * 0.1)}px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.06)}
</style></head>
<body>
  <div class="rule"></div>
  <div class="caption">${shot.caption.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</div>
  <div class="stage"><div class="device"><img class="screen" src="${image}" alt=""></div></div>
</body></html>`;
}

async function compose(browser: Browser, devices: Device[], shots: Shot[], captured: Map<string, Buffer>): Promise<Output[]> {
  const outputs: Output[] = [];

  for (const device of devices) {
    const deviceShots = shotsFor(device, shots);
    const dir = join(OUT, device.dir);
    // A full run owns the whole folder: drop shots that this device no longer
    // takes, otherwise the numbering and the folder contents drift apart.
    if (!isPartialRun()) {
      rmSync(dir, { force: true, recursive: true });
    }
    mkdirSync(dir, { recursive: true });

    const context = await browser.newContext({ deviceScaleFactor: 1, viewport: { height: device.height, width: device.width } });
    const page = await context.newPage();

    // Number from the full per-device list, not the selected subset: a partial
    // run must overwrite 07-progress.png, not create a second 01-progress.png.
    const ordered = shotsFor(device, SHOTS);
    for (const shot of deviceShots) {
      const raw = captured.get(`${device.id}/${shot.id}`);
      if (!raw) {
        continue;
      }
      await page.setContent(composeHtml(device, shot, raw, artPath(device)), { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      if (hasFlag('debug')) {
        console.log(`  ${device.id}/${shot.id} ${JSON.stringify(layout(device))}`);
      }
      const index = ordered.findIndex((item) => item.id === shot.id);
      const file = `${String(index + 1).padStart(2, '0')}-${shot.id}.png`;
      await page.screenshot({ animations: 'disabled', path: join(dir, file), type: 'png' });
      outputs.push({
        configHash: configHashFor(device, shot),
        device: device.id,
        file: `${device.dir}/${file}`,
        height: device.height,
        rawHash: sha256(raw),
        shot: shot.id,
        width: device.width,
      });
      console.log(`  framed ${device.dir}/${file}`);
    }

    await context.close();
  }

  return outputs;
}

/**
 * Play wants a 512 x 512 icon and a 1024 x 500 feature graphic. Neither is a
 * screenshot, so this is the one place the pipeline draws rather than captures:
 * the app icon on black, and the wordmark on the same gradient the frames use.
 */
async function composePlayArt(browser: Browser): Promise<void> {
  const dir = join(OUT, 'play');
  mkdirSync(dir, { recursive: true });
  const icon = `data:image/png;base64,${readFileSync(join(ROOT, 'assets', 'icon.png')).toString('base64')}`;
  const context = await browser.newContext({ deviceScaleFactor: 1, viewport: { height: 512, width: 512 } });
  const page = await context.newPage();

  await page.setContent(
    `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}html,body{margin:0;padding:0;width:512px;height:512px;background:#000;overflow:hidden}
  img{display:block;width:512px;height:512px}
</style></head><body><img src="${icon}" alt=""></body></html>`,
    { waitUntil: 'load' },
  );
  await page.screenshot({ path: join(dir, 'icon.png'), type: 'png' });

  await page.setViewportSize({ height: 500, width: 1024 });
  await page.setContent(
    `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}html,body{margin:0;padding:0;width:1024px;height:500px;overflow:hidden}
  body{background:radial-gradient(120% 150% at 18% 0%, #1b2410 0%, #0b0f06 48%, #000 100%);font-family:'Segoe UI',system-ui,-apple-system,'Helvetica Neue',sans-serif;color:#fff;position:relative}
  body::before{content:'';position:absolute;inset:0;background:radial-gradient(46% 70% at 8% 100%, rgba(214,255,74,.18) 0%, rgba(214,255,74,0) 70%)}
  .rule{position:absolute;top:96px;left:72px;width:64px;height:8px;border-radius:999px;background:#D6FF4A}
  .name{position:absolute;top:130px;left:72px;font-size:132px;font-weight:800;letter-spacing:-0.04em;line-height:1}
  .tag{position:absolute;top:296px;left:76px;font-size:40px;font-weight:600;color:#c9cdc4;letter-spacing:-0.01em}
  .icon{position:absolute;right:96px;top:118px;width:264px;height:264px;border-radius:60px;border:1px solid rgba(255,255,255,.14);box-shadow:0 30px 80px rgba(0,0,0,.7)}
</style></head><body>
  <div class="rule"></div>
  <div class="name">Rep</div>
  <div class="tag">Every set, one tap.</div>
  <img class="icon" src="${icon}" alt="">
</body></html>`,
    { waitUntil: 'load' },
  );
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(dir, 'feature-graphic.png'), type: 'png' });
  await context.close();
  console.log('  play/icon.png, play/feature-graphic.png');
}

async function main(): Promise<void> {
  const shots = selectedShots();
  const devices = DEVICES.filter((device) => shotsFor(device, shots).length > 0);
  const force = hasFlag('force');
  const previous = readManifest();
  const currentSource = sourceHash();

  if (hasFlag('if-changed') && !force && previous && previous.sourceHash === currentSource && previous.appVersion === appVersion()) {
    console.log(`· Nothing changed since ${previous.generatedAt}. Pass --force to recapture.`);
    return;
  }

  rmSync(CACHE, { force: true, recursive: true });
  mkdirSync(CACHE, { recursive: true });
  mkdirSync(join(OUT, 'art'), { recursive: true });

  buildWeb(force);
  const server = await startServer();
  const browser = await chromium.launch();

  try {
    console.log(`· Capturing ${shots.length} shot(s) on ${devices.length} device(s)…`);
    const captured = await capture(browser, devices, shots);
    console.log('· Framing…');
    const outputs = await compose(browser, devices, shots, captured);
    console.log('· Play art…');
    await composePlayArt(browser);

    const merged = new Map<string, Output>();
    for (const output of previous?.outputs ?? []) {
      merged.set(`${output.device}/${output.shot}`, output);
    }
    for (const output of outputs) {
      merged.set(`${output.device}/${output.shot}`, output);
    }

    const manifest: Manifest = {
      appVersion: appVersion(),
      generatedAt: new Date().toISOString(),
      outputs: [...merged.values()].sort((a, b) => `${a.device}/${a.shot}`.localeCompare(`${b.device}/${b.shot}`)),
      sourceHash: currentSource,
    };
    writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`· Wrote ${outputs.length} screenshot(s) and ${MANIFEST}`);
  } finally {
    await browser.close();
    await new Promise<void>((resolvePromise) => server.close(() => resolvePromise()));
    if (!hasFlag('keep-raw')) {
      rmSync(CACHE, { force: true, recursive: true });
    }
  }
}

main().catch((error: unknown) => {
  console.error(`\n✖ ${(error as Error).message}`);
  process.exit(1);
});
