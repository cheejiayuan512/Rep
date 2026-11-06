/**
 * Draws the optional backdrops that sit behind the store screenshots.
 *
 * The screenshots themselves are real captures; this is the only generated art
 * in the set, and it is only ever a dark, blurred background. It runs against a
 * local ComfyUI server, so it is free and offline. When the files are missing,
 * `npm run assets` falls back to the gradient and nothing else changes.
 *
 * Run:   npm run art          generate whatever is missing
 *        npm run art:force    redraw both
 *
 * Before the first run, start ComfyUI with the checkpoint in place:
 *   python main.py --port 8188
 *
 * Flags: --redraw                     redraw files that already exist
 *        --url=http://127.0.0.1:8188   where ComfyUI is listening
 *        --seed=7                      override the seed for both backdrops
 *        --steps=28                    sampler steps
 *        --timeout=300                 seconds to wait for one image
 *
 * Output: store-assets/art/backdrop-phone.png   (1320 x 2868)
 *         store-assets/art/backdrop-tablet.png  (2064 x 2752)
 *         store-assets/art/manifest.json        prompt, seed, and hash
 *
 * Commit the PNGs. The framing step hashes them, so a new backdrop is enough
 * to make `npm run assets:if-changed` recapture every screenshot.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { chromium } from '@playwright/test';

const ROOT = resolve(__dirname, '..');
const OUT = join(ROOT, 'store-assets', 'art');
const MANIFEST = join(OUT, 'manifest.json');

const args = process.argv.slice(2);
const hasFlag = (name: string): boolean => args.includes(`--${name}`);
const flagValue = (name: string): string | undefined => {
  const hit = args.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};

const redraw = hasFlag('redraw');
const baseUrl = (flagValue('url') ?? 'http://127.0.0.1:8188').replace(/\/$/, '');
const seedOverride = flagValue('seed');
const steps = Number(flagValue('steps') ?? 28);
const timeoutMs = Number(flagValue('timeout') ?? 300) * 1000;

/** The checkpoint ComfyUI must have under `models/checkpoints/`. */
const CHECKPOINT = 'DreamShaper_8_pruned.safetensors';

/**
 * A dark gym at night, out of focus. The frame puts the device in the middle and
 * a 58% black scrim over the top, so the backdrop only has to read as a place,
 * not as a picture: any detail here is wasted and can fight the caption.
 */
const PROMPT =
  'empty room, steel squat rack frame, stack of round weight plates on a rubber floor, ' +
  'one overhead light beam, fog, deep black shadows, out of focus, cinematic, vertical composition';
const NEGATIVE =
  'person, people, human, figure, silhouette, body, athlete, woman, man, face, hands, muscles, ' +
  'text, watermark, letters, logo, sharp focus, bright, busy, cluttered, ' +
  'low quality, jpeg artifacts';

type Target = {
  file: string;
  /** Output size, the size the store slot expects. */
  width: number;
  height: number;
  /** What SD1.5 is asked for; the result is cropped to the output size. */
  latent: { width: number; height: number };
  seed: number;
};

const TARGETS: Target[] = [
  { file: 'backdrop-phone.png', height: 2868, latent: { height: 1216, width: 832 }, seed: 7, width: 1320 },
  { file: 'backdrop-tablet.png', height: 2752, latent: { height: 1024, width: 768 }, seed: 11, width: 2064 },
];

type Manifest = Record<string, { at: string; hash: string; prompt: string; seed: number; steps: number }>;

function sha256(value: Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function readManifest(): Manifest {
  if (!existsSync(MANIFEST)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(MANIFEST, 'utf8')) as Manifest;
  } catch {
    return {};
  }
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${path} -> ${response.status} ${text.slice(0, 300)}`);
  }
  return (text.length === 0 ? {} : JSON.parse(text)) as T;
}

/** ComfyUI answers `/system_stats` as soon as it is up, before a model loads. */
async function checkServer(): Promise<void> {
  try {
    await json('/system_stats');
  } catch (error) {
    throw new Error(
      `No ComfyUI at ${baseUrl}. Start it with "python main.py --port 8188" from the ComfyUI folder. ` +
        `(${error instanceof Error ? error.message : String(error)})`,
    );
  }
}

function workflow(target: Target, seed: number): Record<string, unknown> {
  return {
    '3': {
      class_type: 'KSampler',
      inputs: {
        cfg: 6.5,
        denoise: 1,
        latent_image: ['5', 0],
        model: ['4', 0],
        negative: ['7', 0],
        positive: ['6', 0],
        sampler_name: 'dpmpp_2m',
        scheduler: 'karras',
        seed,
        steps,
      },
    },
    '4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: CHECKPOINT } },
    '5': {
      class_type: 'EmptyLatentImage',
      inputs: { batch_size: 1, height: target.latent.height, width: target.latent.width },
    },
    '6': { class_type: 'CLIPTextEncode', inputs: { clip: ['4', 1], text: PROMPT } },
    '7': { class_type: 'CLIPTextEncode', inputs: { clip: ['4', 1], text: NEGATIVE } },
    '8': { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['4', 2] } },
    '9': { class_type: 'SaveImage', inputs: { filename_prefix: 'rep-backdrop', images: ['8', 0] } },
  };
}

type HistoryEntry = {
  outputs?: Record<string, { images?: { filename: string; subfolder: string; type: string }[] }>;
  status?: { completed?: boolean; status_str?: string };
};

const wait = (ms: number): Promise<void> => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

async function render(target: Target, seed: number): Promise<Buffer> {
  const queued = await json<{ prompt_id?: string; error?: unknown; node_errors?: unknown }>('/prompt', {
    body: JSON.stringify({ client_id: `rep-${Date.now()}`, prompt: workflow(target, seed) }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
  if (!queued.prompt_id) {
    throw new Error(`ComfyUI rejected the workflow: ${JSON.stringify(queued.error ?? queued.node_errors).slice(0, 400)}`);
  }

  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (Date.now() > deadline) {
      throw new Error(`ComfyUI did not finish ${target.file} within ${timeoutMs / 1000}s.`);
    }
    const history = await json<Record<string, HistoryEntry>>(`/history/${queued.prompt_id}`);
    const entry = history[queued.prompt_id];
    if (entry?.status?.completed) {
      const image = Object.values(entry.outputs ?? {})
        .flatMap((output) => output.images ?? [])
        .find((candidate) => candidate.type === 'output');
      if (!image) {
        throw new Error(`ComfyUI finished ${target.file} without an image.`);
      }
      const query = new URLSearchParams({ filename: image.filename, subfolder: image.subfolder, type: image.type });
      const response = await fetch(`${baseUrl}/view?${query.toString()}`);
      if (!response.ok) {
        throw new Error(`Could not download ${image.filename}: ${response.status}`);
      }
      return Buffer.from(await response.arrayBuffer());
    }
    if (entry?.status?.status_str === 'error') {
      throw new Error(`ComfyUI failed to draw ${target.file}.`);
    }
    await wait(1500);
  }
}

/**
 * SD1.5 only draws at multiples of 8 and falls apart above about a megapixel, so
 * the model draws small and this crops to the store size the same way the frame
 * does: `object-fit: cover`.
 *
 * The blur and the darkening are deliberate. The backdrop sits behind a caption
 * and a phone, and the stores treat a photo that reads as a screenshot as
 * misleading. Blurred and dim, it is unambiguously wallpaper.
 */
async function resize(raw: Buffer, target: Target): Promise<Buffer> {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ deviceScaleFactor: 1, viewport: { height: target.height, width: target.width } });
    const page = await context.newPage();
    await page.setContent(
      `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}html,body{margin:0;padding:0;width:${target.width}px;height:${target.height}px;overflow:hidden;background:#000}
  .art{position:absolute;inset:-48px;background-image:url('data:image/png;base64,${raw.toString('base64')}');
    background-size:cover;background-position:center;filter:blur(14px) brightness(.75) saturate(.8)}
</style></head><body><div class="art"></div></body></html>`,
      { waitUntil: 'load' },
    );
    return await page.screenshot({ animations: 'disabled', type: 'png' });
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });

  const missing = TARGETS.filter((target) => redraw || !existsSync(join(OUT, target.file)));
  if (missing.length === 0) {
    console.log(`· ${TARGETS.length} backdrop(s) already in store-assets/art. Run npm run art:force to redraw.`);
    return;
  }

  await checkServer();
  console.log(`· Drawing ${missing.length} backdrop(s) on ${baseUrl}…`);

  const manifest = readManifest();
  for (const target of missing) {
    const seed = seedOverride != null ? Number(seedOverride) : target.seed;
    console.log(`  ${target.file} ${target.latent.width}x${target.latent.height} seed ${seed}`);
    const raw = await render(target, seed);
    const png = await resize(raw, target);
    const path = join(OUT, target.file);
    writeFileSync(path, png);
    manifest[target.file] = { at: new Date().toISOString(), hash: sha256(png), prompt: PROMPT, seed, steps };
    console.log(`  ${target.file} ${target.width}x${target.height} ${Math.round(png.length / 1024)} KB`);
  }

  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`· Wrote ${missing.length} backdrop(s) and ${MANIFEST}`);
  console.log('  Run npm run assets:force to reframe the screenshots.');
}

void main().catch((error: unknown) => {
  console.error(`✖ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
