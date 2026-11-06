/**
 * Records a walkthrough of the real app and stages it as a promo clip.
 *
 * Two passes:
 *   1. Playwright drives the web build and records a raw screen capture.
 *   2. That capture is played inside a designed stage - the same backdrop,
 *      lime rule, caption, and phone frame the screenshots use - and the stage
 *      is recorded. ffmpeg encodes the result.
 *
 * It is not an App Store app preview: Apple requires previews to be captured
 * from the app on a device or simulator, and this machine is Windows. Play does
 * not take a video file either - it takes a YouTube URL, which goes in
 * `store-assets/listing.json` as `android.video`.
 *
 * Run:   npm run video
 *        npm run video -- --keep-raw   keep the intermediate captures
 *
 * Output: store-assets/video/walkthrough.mp4   1080 x 1920, H.264, no audio
 *
 * The web build must exist. `npm run assets` produces it; this reuses it.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

import { chromium } from '@playwright/test';

import { readBackupDocument } from '../src/domain/log-backup';
import { DEVICES, type Device } from './store-shots';

const ROOT = resolve(__dirname, '..');
const DIST = join(ROOT, 'dist');
const OUT = join(ROOT, 'store-assets', 'video');
const WORK = join(OUT, '.raw');
const SEED = join(ROOT, 'fixtures', 'Rep-demo-log.json');
const BACKDROP = join(ROOT, 'store-assets', 'art', 'backdrop-phone.png');
const PORT = 8098;
const FFMPEG = process.env.FFMPEG_PATH ?? 'C:\\Users\\JIAYUAN\\Downloads\\ffmpeg-6.1.1-full_build\\ffmpeg-6.1.1-full_build\\bin\\ffmpeg.exe';

const args = process.argv.slice(2);
const hasFlag = (name: string): boolean => args.includes(`--${name}`);

/** Raw capture size. 540 x 960 is 9:16 and lands 1:1 inside the stage frame. */
const RAW_SIZE = { height: 960, width: 540 };
const STAGE_SIZE = { height: 1920, width: 1080 };

const MIME: Record<string, string> = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.map': 'application/json',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2',
};

const phone = DEVICES.find((item) => item.id === 'android-phone');
if (!phone) {
  throw new Error('No android-phone device in store-shots.ts.');
}
const device: Device = phone;

const wait = (ms: number): Promise<void> => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

function serve(root: string): Promise<Server> {
  const server = createServer((request, response) => {
    const requested = decodeURIComponent((request.url ?? '/').split('?')[0]);
    const relative = normalize(requested).replace(/^([/\\])+/, '');
    let file = join(root, relative);
    if (!existsSync(file) || relative === '' || relative === '.') {
      file = join(root, 'index.html');
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

/** Same shift as the screenshots: yesterday's session, a live one just now. */
function demoDocument(now: number): string {
  const document = JSON.parse(readBackupDocument(readFileSync(SEED, 'utf8'))) as SeedDocument;
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

/** Same safe-area fix as the screenshots; a string because tsx injects __name. */
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

/** Pass 1: a clean recording of the app, no chrome. */
async function recordApp(): Promise<{ path: string; scenes: Scene[] }> {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      colorScheme: 'dark',
      deviceScaleFactor: 1,
      locale: 'en-US',
      recordVideo: { dir: join(WORK, 'app'), size: RAW_SIZE },
      reducedMotion: 'no-preference',
      viewport: RAW_SIZE,
    });
    // The beat clock starts here: the recording starts with the first page, so
    // measuring from context creation keeps captions on the video's clock.
    const startedAt = Date.now();
    const beats: Scene[] = [];
    // A string, not a function: tsx injects a `__name` helper into serialised
    // functions, and the page does not have it.
    const seed = demoDocument(Date.now());
    await context.addInitScript(`localStorage.clear(); localStorage.setItem('rep.database.v1', ${JSON.stringify(seed)});`);

    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${PORT}`, { waitUntil: 'networkidle' });
    const patched = await page.evaluate(insetScript(device.insets));
    if (patched === 0) {
      throw new Error('safe-area probe not found; insets could not be applied');
    }
    await page.addStyleTag({
      content:
        '::-webkit-scrollbar{display:none} *{scrollbar-width:none} html,body{overscroll-behavior:none}' +
        '[role="tab"]>div:not(:has(svg)){display:block!important;overflow:visible!important;text-overflow:clip!important}',
    });

    // Fixed beats rather than `waitFor`: inside a recording context the text
    // locator resolves and reports visible, yet `waitFor` never settles.
    // `click` still auto-waits for actionability, so nothing is racy.
    const tap = async (locator: ReturnType<typeof page.locator>, label: string): Promise<void> => {
      try {
        await locator.first().click({ timeout: 20000 });
      } catch (error) {
        const body = await page
          .locator('body')
          .innerText()
          .catch(() => '');
        await page.screenshot({ path: join(WORK, `failed-${label.replace(/[^a-z]/gi, '')}.png`) }).catch(() => undefined);
        throw new Error(`could not click ${label}: ${(error as Error).message.split('\n')[0]} | screen: ${JSON.stringify(body.slice(0, 200))}`);
      }
    };

    /** Many small wheel steps, so the list glides instead of jumping. */
    const glide = async (distance: number): Promise<void> => {
      const steps = 14;
      for (let i = 0; i < steps; i += 1) {
        await page.mouse.wheel(0, distance / steps);
        await wait(42);
      }
    };

    /** Best effort: a missing control should not abort the take. */
    const tapQuiet = async (locator: ReturnType<typeof page.locator>, label: string): Promise<void> => {
      try {
        await locator.first().click({ timeout: 4000 });
      } catch {
        console.log(`  (no ${label}; continuing)`);
      }
    };

    /** Waits until the rendered screen contains a marker. */
    const screenHas = async (needle: string, label: string, timeout = 12000): Promise<void> => {
      const started = Date.now();
      for (;;) {
        const has = await page.evaluate(`document.body.innerText.includes(${JSON.stringify(needle)})`);
        if (has) {
          return;
        }
        if (Date.now() - started > timeout) {
          const body = await page
            .locator('body')
            .innerText()
            .catch(() => '');
          throw new Error(`${label} never appeared (waiting for ${JSON.stringify(needle)}) | screen: ${JSON.stringify(body.slice(0, 240))}`);
        }
        await wait(110);
      }
    };

    const beat = (index: number): void => {
      beats.push({ at: Math.max(0, (Date.now() - startedAt) / 1000), text: CAPTIONS[index] });
    };

    await wait(1500);
    beat(0);

    await tap(page.getByText('Resume', { exact: true }), 'Resume');
    await screenHas('Add set', 'the workout screen');
    beat(1);
    await wait(400);
    await page.mouse.move(216, 420);
    await glide(360);
    await wait(300);

    // Completing a set runs the app's own check-pop and rest-timer animation.
    await tap(page.getByRole('button', { name: 'Complete set' }), 'Complete set');
    await wait(1500);
    await tap(page.getByRole('button', { name: 'Complete set' }), 'Complete set');
    await wait(1100);
    await glide(-340);
    await wait(300);
    // The rest bar sits over Finish; ending the rest clears it.
    await tapQuiet(page.getByRole('button', { name: 'Skip' }), 'Skip rest');
    await wait(400);

    await tap(page.getByRole('button', { name: 'Finish' }), 'Finish');
    await screenHas('Well Done!', 'the recap');
    beat(2);
    await wait(2400);

    await tap(page.getByRole('button', { name: 'Close' }), 'Close');
    await screenHas('Start workout', 'home');
    await tap(page.getByRole('tab', { name: 'History' }), 'History tab');
    await screenHas('Chest', 'the history list');
    await wait(400);
    beat(3);
    await wait(700);
    // The second row is yesterday's full session; the first is the one just
    // finished, which only has the three sets the demo completed.
    await tap(page.getByRole('button', { name: /, .+ · / }).nth(1), 'a history row');
    await screenHas('Duration', 'the workout detail');
    beat(4);
    await wait(1500);
    await page.mouse.move(216, 420);
    await glide(300);
    await wait(900);

    await tap(page.getByRole('button', { name: 'Back' }), 'Back');
    await wait(500);
    await tap(page.getByRole('tab', { name: 'Progress' }), 'Progress tab');
    beat(5);
    await wait(1500);
    await tap(page.getByRole('button', { name: 'Strength levels' }), 'Strength levels');
    await screenHas('Stronger than about', 'strength levels');
    beat(6);
    await wait(3000);

    const video = page.video();
    await context.close();
    if (!video) {
      throw new Error('Playwright did not record the app.');
    }
    return { path: await video.path(), scenes: beats };
  } finally {
    await browser.close();
  }
}

/**
 * Caption text, in order. The times are measured while recording rather than
 * hard-coded, so a slower click cannot push a caption out of sync.
 */
const CAPTIONS = [
  'Every set, one tap.',
  'Weight, reps, and effort.',
  'Finish and watch it add up.',
  'Every session, kept.',
  'Open any workout.',
  'Every lift, tracked.',
  'Know where your lifts stand.',
];

type Scene = { at: number; text: string };

const INTRO_MS = 1500;
const OUTRO_MS = 2200;

function stageHtml(scenes: Scene[]): string {
  const backdrop = readFileSync(BACKDROP).toString('base64');
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:${STAGE_SIZE.width}px;height:${STAGE_SIZE.height}px;overflow:hidden;background:#000}
  body{
    font-family:'Segoe UI',system-ui,-apple-system,'Helvetica Neue',sans-serif;color:#fff;
    background-image:url('data:image/png;base64,${backdrop}');background-size:cover;background-position:center;
    position:relative;
  }
  .scrim{position:absolute;inset:0;background:
    radial-gradient(60% 40% at 50% 92%, rgba(214,255,74,.14) 0%, rgba(214,255,74,0) 70%),
    linear-gradient(180deg, rgba(0,0,0,.78) 0%, rgba(0,0,0,.42) 30%, rgba(0,0,0,.26) 58%, rgba(0,0,0,.68) 100%);}
  .rule{position:absolute;top:196px;left:50%;transform:translateX(-50%);width:0;height:8px;border-radius:999px;background:#D6FF4A;z-index:3;opacity:0;transition:opacity .5s ease,width .6s cubic-bezier(.2,.7,.3,1)}
  .caption{position:absolute;top:250px;left:7%;right:7%;z-index:3;text-align:center;
    font-size:58px;font-weight:700;line-height:1.14;letter-spacing:-0.022em;
    text-shadow:0 4px 30px rgba(0,0,0,.6);opacity:0;transform:translateY(14px);
    transition:opacity .42s ease,transform .5s cubic-bezier(.2,.7,.3,1)}
  .stage{position:absolute;left:0;right:0;top:560px;height:1180px;display:flex;align-items:flex-start;justify-content:center;z-index:2}
  .device{width:600px;height:1067px;background:#0a0a0b;border:1px solid rgba(255,255,255,.18);
    border-radius:72px;padding:13px;
    box-shadow:0 60px 150px rgba(0,0,0,.85),0 0 0 1px rgba(0,0,0,.7),0 0 140px rgba(214,255,74,.10);
    transform:scale(.985);animation:drift 26s linear forwards}
  @keyframes drift{from{transform:scale(.985)}to{transform:scale(1.035)}}
  .screen{width:100%;height:100%;display:block;object-fit:cover;border-radius:60px;background:#000}
  .mark{position:absolute;left:0;right:0;bottom:96px;text-align:center;z-index:3;opacity:0;transition:opacity .6s ease}
  .mark .word{font-size:44px;font-weight:800;letter-spacing:-0.03em}
  .mark .tag{margin-top:10px;font-size:26px;color:#b9beb2}
  .veil{position:absolute;inset:0;background:#000;z-index:9;display:flex;align-items:center;justify-content:center;flex-direction:column;transition:opacity .6s ease}
  .veil.hidden{opacity:0;pointer-events:none}
  .veil .word{font-size:132px;font-weight:800;letter-spacing:-0.04em;line-height:1}
  .veil .bar{width:86px;height:9px;border-radius:999px;background:#D6FF4A;margin:34px 0}
  .veil .tag{font-size:34px;color:#c9cdc4;letter-spacing:-0.01em}
  .veil .out-title{font-size:96px;font-weight:800;letter-spacing:-0.04em}
  .veil .out-bar{width:64px;height:8px;border-radius:999px;background:#D6FF4A;margin:28px 0}
  .veil .out-tag{margin-top:0;font-size:32px;color:#c9cdc4}
</style></head><body>
  <div class="scrim"></div>
  <div class="rule" id="rule"></div>
  <div class="caption" id="caption"></div>
  <div class="stage"><div class="device" id="device"><video class="screen" id="v" src="app.webm" muted playsinline preload="auto"></video></div></div>
  <div class="mark" id="mark"><div class="word">Rep</div><div class="tag">Workout log</div></div>

  <div class="veil" id="intro">
    <div class="word">Rep</div>
    <div class="bar"></div>
    <div class="tag">Every set, one tap.</div>
  </div>

  <div class="veil hidden" id="outro">
    <div class="out-title">Rep</div>
    <div class="out-bar"></div>
    <div class="out-tag">No account. No ads. Just the work.</div>
  </div>

<script>
  var video = document.getElementById('v');
  var caption = document.getElementById('caption');
  var rule = document.getElementById('rule');
  var mark = document.getElementById('mark');
  var deviceEl = document.getElementById('device');
  var intro = document.getElementById('intro');
  var outro = document.getElementById('outro');
  var scenes = ${JSON.stringify(scenes)};
  var shownIndex = -1;
  var fadeTimer = null;
  var ruleTimer = null;

  function wipeRule() {
    rule.style.width = '0px';
    clearTimeout(ruleTimer);
    ruleTimer = setTimeout(function () { rule.style.width = '74px'; }, 90);
  }

  function setCaption(text) {
    if (caption.textContent === text) return;
    caption.style.opacity = '0';
    caption.style.transform = 'translateY(14px)';
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(function () {
      caption.textContent = text;
      caption.style.opacity = '1';
      caption.style.transform = 'translateY(0)';
      wipeRule();
    }, 200);
  }

  function start() {
    intro.classList.add('hidden');
    rule.style.opacity = '1';
    wipeRule();
    caption.textContent = scenes[0].text;
    caption.style.opacity = '1';
    caption.style.transform = 'translateY(0)';
    shownIndex = 0;
    mark.style.opacity = '1';
    video.play();
  }

  video.addEventListener('loadeddata', function () {
    setTimeout(start, ${INTRO_MS - 600});
  });

  function tick() {
    var t = video.currentTime;
    var index = 0;
    for (var i = 0; i < scenes.length; i += 1) {
      if (t >= scenes[i].at) index = i;
    }
    if (index !== shownIndex) {
      shownIndex = index;
      setCaption(scenes[index].text);
    }
  }
  video.addEventListener('timeupdate', tick);
  video.addEventListener('seeked', tick);

  video.addEventListener('ended', function () {
    outro.classList.remove('hidden');
    var done = document.createElement('div');
    done.id = 'done';
    setTimeout(function () { document.body.appendChild(done); }, ${OUTRO_MS});
  });
</script>
</body></html>`;
}

/** Pass 2: play the capture inside the stage and record that. */
async function recordStage(rawPath: string, scenes: Scene[]): Promise<string> {
  const dir = join(WORK, 'stage');
  mkdirSync(dir, { recursive: true });
  copyFileSync(rawPath, join(dir, 'app.webm'));
  writeFileSync(join(dir, 'index.html'), stageHtml(scenes));

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      colorScheme: 'dark',
      deviceScaleFactor: 1,
      recordVideo: { dir: join(WORK, 'out'), size: STAGE_SIZE },
      reducedMotion: 'reduce',
      viewport: STAGE_SIZE,
    });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${PORT}`, { waitUntil: 'networkidle' });

    // Wait for the outro to finish, then a beat of black.
    await page.waitForFunction("document.getElementById('done') !== null", undefined, { timeout: 60000 });
    await wait(700);

    const video = page.video();
    await context.close();
    if (!video) {
      throw new Error('Playwright did not record the stage.');
    }
    return await video.path();
  } finally {
    await browser.close();
  }
}

function encode(input: string, output: string): void {
  const result = spawnSync(
    FFMPEG,
    [
      '-y',
      '-i',
      input,
      '-vf',
      'scale=1080:1920:flags=lanczos',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-crf',
      '19',
      '-preset',
      'medium',
      '-movflags',
      '+faststart',
      '-an',
      output,
    ],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed: ${(result.stderr ?? '').slice(-500)}`);
  }
}

async function main(): Promise<void> {
  if (!existsSync(join(DIST, 'index.html'))) {
    throw new Error('dist/ is missing. Run npm run assets first.');
  }
  if (!existsSync(FFMPEG)) {
    throw new Error(`No ffmpeg at ${FFMPEG}. Set FFMPEG_PATH.`);
  }
  if (!existsSync(BACKDROP)) {
    throw new Error('store-assets/art/backdrop-phone.png is missing. Run npm run art.');
  }

  mkdirSync(OUT, { recursive: true });
  rmSync(WORK, { force: true, recursive: true });
  mkdirSync(join(WORK, 'app'), { recursive: true });
  mkdirSync(join(WORK, 'out'), { recursive: true });

  const appServer = await serve(DIST);
  let app: { path: string; scenes: Scene[] };
  try {
    console.log('· Recording the app…');
    app = await recordApp();
  } finally {
    await new Promise<void>((resolvePromise) => appServer.close(() => resolvePromise()));
  }

  const stageServer = await serve(join(WORK, 'stage'));
  let staged: string;
  try {
    console.log('· Staging…');
    staged = await recordStage(app.path, app.scenes);
  } finally {
    await new Promise<void>((resolvePromise) => stageServer.close(() => resolvePromise()));
  }

  const mp4 = join(OUT, 'walkthrough.mp4');
  console.log('· Encoding…');
  encode(staged, mp4);

  if (hasFlag('keep-raw')) {
    copyFileSync(app.path, join(OUT, 'walkthrough-raw.webm'));
    console.log(`  ${join(OUT, 'walkthrough-raw.webm')}`);
  }
  rmSync(WORK, { force: true, recursive: true });

  const bytes = readFileSync(mp4).length;
  console.log(`· Wrote ${mp4} (${(bytes / 1024 / 1024).toFixed(1)} MB)`);
}

main().catch((error: unknown) => {
  console.error(`✖ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
