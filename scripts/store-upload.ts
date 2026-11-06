/**
 * Pushes the store listing and the screenshots to both stores.
 *
 * Text is `store-assets/listing.json`. Images are what `npm run assets` wrote:
 * the iPhone and iPad sets, the Play phone set, and the Play icon and feature
 * graphic. Nothing here generates art; it only uploads what is on disk.
 *
 * Run:   npm run upload          dry run: checks the text and prints the plan
 *        npm run upload:apply    writes to App Store Connect and Google Play
 *
 * Flags: --apply             actually push (without it nothing is written)
 *        --only=ios|android  one store
 *        --skip-images       text only
 *        --skip-text         images only
 *        --version=1.0       iOS version to edit; default is the editable one
 *        --prune             delete iOS screenshot sets this script does not fill
 *        --if-changed        skip a store whose inputs are unchanged since the
 *                            last --apply
 *
 * Credentials come from the environment, never from this file:
 *   EXPO_ASC_API_KEY_PATH, EXPO_ASC_KEY_ID, EXPO_ASC_ISSUER_ID
 *   GOOGLE_SERVICE_ACCOUNT_KEY_PATH
 *
 * A store version can only be edited while it is not waiting for review. If the
 * version is already `WAITING_FOR_REVIEW` or live, App Store Connect rejects the
 * write; bump the version in app.json and upload again.
 */
import { createHash, createSign, sign } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { DEVICES } from './store-shots';
import { LISTING_PATH, ROOT, STORE_DIR, readListing, validateListing } from './store-listing';

const OUT = STORE_DIR;
const UPLOAD_MANIFEST = join(OUT, 'upload.json');
const PLAY_ART = join(OUT, 'play');

const ASC_API = 'https://api.appstoreconnect.apple.com';
const PLAY_API = 'https://androidpublisher.googleapis.com/androidpublisher/v3';
// Binary uploads go to a different host prefix than the JSON API.
const PLAY_UPLOAD = 'https://androidpublisher.googleapis.com/upload/androidpublisher/v3';

const args = process.argv.slice(2);
const hasFlag = (name: string): boolean => args.includes(`--${name}`);
const flagValue = (name: string): string | undefined => {
  const hit = args.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};

const apply = hasFlag('apply');
const only = flagValue('only');
const skipImages = hasFlag('skip-images');
const skipText = hasFlag('skip-text');

if (only != null && only !== 'ios' && only !== 'android') {
  throw new Error(`--only must be ios or android, not ${only}`);
}

const listing = readListing();
validateListing(listing);

function sha256(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex');
}

function appJson(): { android: { package: string }; ios: { bundleIdentifier: string }; version: string } {
  const config = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')) as {
    expo?: { android?: { package?: string }; ios?: { bundleIdentifier?: string }; version?: string };
  };
  return {
    android: { package: config.expo?.android?.package ?? '' },
    ios: { bundleIdentifier: config.expo?.ios?.bundleIdentifier ?? '' },
    version: config.expo?.version ?? '0.0.0',
  };
}

const app = appJson();

type ShotFile = { file: string; name: string; path: string };

function pngSize(path: string): { height: number; width: number } {
  const buffer = readFileSync(path);
  return { height: buffer.readUInt32BE(20), width: buffer.readUInt32BE(16) };
}

function shotFiles(dir: string): ShotFile[] {
  const absolute = join(OUT, dir);
  if (!existsSync(absolute)) {
    return [];
  }
  return readdirSync(absolute)
    .filter((file) => file.endsWith('.png'))
    .sort()
    .map((file) => ({ file, name: file, path: join(absolute, file) }));
}

/**
 * The two iOS sets Apple asks for. 6.9" screenshots upload into the 6.7" slot:
 * the API has no APP_IPHONE_69, and App Store Connect maps 1320 x 2868 there.
 */
const IOS_SETS = [
  { dir: 'ios/iphone-6.9', displayType: 'APP_IPHONE_67', label: 'iPhone 6.9"' },
  { dir: 'ios/ipad-13', displayType: 'APP_IPAD_PRO_3GEN_129', label: 'iPad 13"' },
];

const PLAY_SHOTS = 'android/phone';
const PLAY_ICON = join(PLAY_ART, 'icon.png');
const PLAY_FEATURE = join(PLAY_ART, 'feature-graphic.png');

/** Fails when a screenshot is not the size its store slot expects. */
function checkSizes(): void {
  for (const set of IOS_SETS) {
    const device = DEVICES.find((item) => item.dir === set.dir);
    const files = shotFiles(set.dir);
    if (!device) {
      throw new Error(`No device in store-shots.ts has dir ${set.dir}`);
    }
    if (files.length === 0) {
      throw new Error(`No screenshots in store-assets/${set.dir}. Run npm run assets.`);
    }
    // App Store Connect accepts at most 10 screenshots per display type.
    if (files.length > 10) {
      throw new Error(`${set.dir} has ${files.length} screenshots; App Store Connect allows 10.`);
    }
    for (const shot of files) {
      const size = pngSize(shot.path);
      if (size.width !== device.width || size.height !== device.height) {
        throw new Error(`${set.dir}/${shot.file} is ${size.width}x${size.height}; expected ${device.width}x${device.height}.`);
      }
    }
  }

  const play = shotFiles(PLAY_SHOTS);
  const device = DEVICES.find((item) => item.dir === PLAY_SHOTS);
  if (!device) {
    throw new Error(`No device in store-shots.ts has dir ${PLAY_SHOTS}`);
  }
  for (const shot of play) {
    const size = pngSize(shot.path);
    if (size.width !== device.width || size.height !== device.height) {
      throw new Error(`${PLAY_SHOTS}/${shot.file} is ${size.width}x${size.height}; expected ${device.width}x${device.height}.`);
    }
  }
  if (play.length === 0) {
    throw new Error(`No screenshots in store-assets/${PLAY_SHOTS}. Run npm run assets.`);
  }
  // Google Play accepts 2 to 8 phone screenshots.
  if (play.length > 8) {
    throw new Error(`${PLAY_SHOTS} has ${play.length} screenshots; Google Play allows 8.`);
  }
}

function inputHash(): string {
  const parts: Buffer[] = [readFileSync(LISTING_PATH)];
  for (const set of IOS_SETS) {
    for (const shot of shotFiles(set.dir)) {
      parts.push(readFileSync(shot.path));
    }
  }
  for (const shot of shotFiles(PLAY_SHOTS)) {
    parts.push(readFileSync(shot.path));
  }
  for (const art of [PLAY_ICON, PLAY_FEATURE]) {
    if (existsSync(art)) {
      parts.push(readFileSync(art));
    }
  }
  return sha256(parts.map((part) => sha256(part)).join('\n'));
}

type UploadManifest = Record<string, { at: string; hash: string }>;

function readUploadManifest(): UploadManifest {
  if (!existsSync(UPLOAD_MANIFEST)) {
    return {};
  }
  return JSON.parse(readFileSync(UPLOAD_MANIFEST, 'utf8')) as UploadManifest;
}

// ---------------------------------------------------------------- App Store

/**
 * The key material, from wherever this is running.
 *
 * Locally it is a path in `*_PATH`. On an Expo worker it is the secret
 * environment variable, and an EAS *file* variable arrives as a path to the
 * file the worker wrote, not as the file body, so both shapes are handled.
 */
function secret(envName: string, pathName: string): string {
  const direct = process.env[envName];
  if (direct) {
    return existsSync(direct) ? readFileSync(direct, 'utf8') : direct;
  }
  const path = process.env[pathName];
  if (path) {
    return readFileSync(path, 'utf8');
  }
  throw new Error(`Set ${envName} (or ${pathName}).`);
}

function ascToken(): string {
  const key = secret('EXPO_ASC_API_KEY', 'EXPO_ASC_API_KEY_PATH');
  const keyId = process.env.EXPO_ASC_KEY_ID;
  const issuerId = process.env.EXPO_ASC_ISSUER_ID;
  if (!keyId || !issuerId) {
    throw new Error('Set EXPO_ASC_KEY_ID and EXPO_ASC_ISSUER_ID.');
  }
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: object): string => Buffer.from(JSON.stringify(value)).toString('base64url');
  const data = `${encode({ alg: 'ES256', kid: keyId, typ: 'JWT' })}.${encode({ aud: 'appstoreconnect-v1', exp: now + 600, iat: now, iss: issuerId })}`;
  const signature = sign('sha256', Buffer.from(data), { dsaEncoding: 'ieee-p1363', key });
  return `${data}.${signature.toString('base64url')}`;
}

type AscBody = {
  data?: { attributes?: Record<string, unknown>; id: string; type: string }[] | { attributes?: Record<string, unknown>; id: string; type: string };
  included?: { attributes?: Record<string, unknown>; id: string; type: string }[];
};

let ascCache: string | undefined;

async function asc<T = AscBody>(method: string, path: string, body?: unknown): Promise<T> {
  ascCache ??= ascToken();
  const response = await fetch(`${ASC_API}${path}`, {
    body: body == null ? undefined : JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${ascCache}`,
      ...(body == null ? {} : { 'Content-Type': 'application/json' }),
    },
    method,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`ASC ${method} ${path} -> ${response.status} ${text.slice(0, 400)}`);
  }
  return (text.length === 0 ? {} : JSON.parse(text)) as T;
}

type AscResource = { attributes?: Record<string, unknown>; id: string; type: string };

function listOf<T>(body: { data?: T[] | T }): T[] {
  if (body.data == null) {
    return [];
  }
  return Array.isArray(body.data) ? body.data : [body.data];
}

async function ascAppId(): Promise<string> {
  const found = await asc<{ data?: AscResource[] }>('GET', `/v1/apps?filter[bundleId]=${encodeURIComponent(app.ios.bundleIdentifier)}`);
  const first = found.data?.[0];
  if (!first) {
    throw new Error(`No App Store Connect app for ${app.ios.bundleIdentifier}.`);
  }
  return first.id;
}

type AscVersion = { id: string; versionString: string; state: string };

async function ascVersion(appId: string): Promise<AscVersion> {
  const body = await asc<{ data?: AscResource[] }>('GET', `/v1/apps/${appId}/appStoreVersions?limit=50`);
  const versions = (body.data ?? []).map((item) => ({
    id: item.id,
    state: String(item.attributes?.appStoreState ?? ''),
    versionString: String(item.attributes?.versionString ?? ''),
  }));
  const wanted = flagValue('version');
  if (wanted) {
    const hit = versions.find((item) => item.versionString === wanted);
    if (!hit) {
      throw new Error(`No App Store version ${wanted}. Found: ${versions.map((item) => `${item.versionString} (${item.state})`).join(', ')}`);
    }
    return hit;
  }
  const editable = versions.find((item) => item.state === 'PREPARE_FOR_SUBMISSION' || item.state === 'DEVELOPER_REJECTED' || item.state === 'REJECTED');
  if (!editable) {
    throw new Error(`No editable App Store version. Found: ${versions.map((item) => `${item.versionString} (${item.state})`).join(', ')}`);
  }
  return editable;
}

async function ascLocalization(versionId: string): Promise<string> {
  const body = await asc<{ data?: AscResource[] }>('GET', `/v1/appStoreVersions/${versionId}/appStoreVersionLocalizations?limit=50`);
  const rows = body.data ?? [];
  const hit = rows.find((item) => item.attributes?.locale === listing.ios.locale);
  if (!hit) {
    throw new Error(`No ${listing.ios.locale} localization on that version. Found: ${rows.map((item) => String(item.attributes?.locale)).join(', ')}`);
  }
  return hit.id;
}

async function ascInfoLocalization(appId: string): Promise<string | undefined> {
  const infos = await asc<{ data?: AscResource[] }>('GET', `/v1/apps/${appId}/appInfos?limit=10`);
  for (const info of infos.data ?? []) {
    const rows = await asc<{ data?: AscResource[] }>('GET', `/v1/appInfos/${info.id}/appInfoLocalizations?limit=50`);
    const hit = (rows.data ?? []).find((item) => item.attributes?.locale === listing.ios.locale);
    if (hit) {
      return hit.id;
    }
  }
  return undefined;
}

async function ascScreenshotSets(localizationId: string): Promise<{ displayType: string; id: string }[]> {
  const body = await asc<{ data?: AscResource[] }>('GET', `/v1/appStoreVersionLocalizations/${localizationId}/appScreenshotSets?limit=50`);
  return (body.data ?? []).map((item) => ({ displayType: String(item.attributes?.screenshotDisplayType ?? ''), id: item.id }));
}

async function ascScreenshots(setId: string): Promise<{ fileName: string; id: string }[]> {
  const body = await asc<{ data?: AscResource[] }>('GET', `/v1/appScreenshotSets/${setId}/appScreenshots?limit=50`);
  return (body.data ?? []).map((item) => ({ fileName: String(item.attributes?.fileName ?? ''), id: item.id }));
}

async function ascEnsureSet(localizationId: string, displayType: string): Promise<string> {
  const sets = await ascScreenshotSets(localizationId);
  const existing = sets.find((item) => item.displayType === displayType);
  if (existing) {
    return existing.id;
  }
  const created = await asc<{ data?: AscResource }>('POST', '/v1/appScreenshotSets', {
    data: {
      attributes: { screenshotDisplayType: displayType },
      relationships: { appStoreVersionLocalization: { data: { id: localizationId, type: 'appStoreVersionLocalizations' } } },
      type: 'appScreenshotSets',
    },
  });
  const id = created.data?.id;
  if (!id) {
    throw new Error(`Could not create the ${displayType} screenshot set.`);
  }
  return id;
}

/** Reserves the screenshot, PUTs the bytes, then marks it uploaded. */
async function ascUploadScreenshot(setId: string, shot: ShotFile): Promise<void> {
  const buffer = readFileSync(shot.path);
  // The reservation carries only the name and size; the bytes go to the upload
  // operations it returns.
  const created = await asc<{ data?: AscResource }>('POST', '/v1/appScreenshots', {
    data: {
      attributes: { fileName: shot.name, fileSize: buffer.length },
      relationships: { appScreenshotSet: { data: { id: setId, type: 'appScreenshotSets' } } },
      type: 'appScreenshots',
    },
  });
  const resource = created.data;
  const operations = (resource?.attributes?.uploadOperations ?? []) as {
    length: number;
    method: string;
    offset: number;
    requestHeaders?: { name: string; value: string }[];
    url: string;
  }[];
  if (!resource || operations.length === 0) {
    throw new Error(`No upload operations for ${shot.name}.`);
  }
  for (const operation of operations) {
    const headers: Record<string, string> = {};
    for (const header of operation.requestHeaders ?? []) {
      headers[header.name] = header.value;
    }
    const response = await fetch(operation.url, {
      body: buffer.subarray(operation.offset, operation.offset + operation.length),
      headers,
      method: operation.method,
    });
    if (!response.ok) {
      throw new Error(`Upload of ${shot.name} failed: ${response.status} ${(await response.text()).slice(0, 200)}`);
    }
  }
  await asc('PATCH', `/v1/appScreenshots/${resource.id}`, {
    data: { attributes: { uploaded: true }, id: resource.id, type: 'appScreenshots' },
  });
}

async function pushIos(): Promise<void> {
  const appId = await ascAppId();
  const version = await ascVersion(appId);
  console.log(`  iOS: ${app.ios.bundleIdentifier} ${version.versionString} (${version.state})`);

  if (!skipText) {
    const infoId = await ascInfoLocalization(appId);
    if (infoId) {
      await asc('PATCH', `/v1/appInfoLocalizations/${infoId}`, {
        data: {
          attributes: {
            name: listing.ios.name,
            privacyPolicyUrl: listing.app.privacyUrl,
            subtitle: listing.ios.subtitle,
          },
          id: infoId,
          type: 'appInfoLocalizations',
        },
      });
      console.log('  iOS: name, subtitle, privacy URL updated');
    } else {
      console.log('  iOS: no app info localization found; skipped name and subtitle');
    }

    const localizationId = await ascLocalization(version.id);
    const attributes = {
      description: listing.app.description,
      keywords: listing.app.keywords,
      marketingUrl: listing.app.marketingUrl,
      promotionalText: listing.app.promotionalText,
      supportUrl: listing.app.supportUrl,
      whatsNew: listing.app.whatsNew,
    };
    let notesWritten = false;
    try {
      await asc('PATCH', `/v1/appStoreVersionLocalizations/${localizationId}`, {
        data: { attributes, id: localizationId, type: 'appStoreVersionLocalizations' },
      });
      notesWritten = true;
    } catch (error) {
      // A first version can reject `whatsNew`; the rest of the text still goes.
      if (!(error instanceof Error) || !error.message.includes('whatsNew')) {
        throw error;
      }
      const { whatsNew: _ignored, ...rest } = attributes;
      await asc('PATCH', `/v1/appStoreVersionLocalizations/${localizationId}`, {
        data: { attributes: rest, id: localizationId, type: 'appStoreVersionLocalizations' },
      });
      console.log('  iOS: release notes cannot be edited for this version; the rest of the text was written');
    }
    console.log(`  iOS: description, keywords, promo text, URLs${notesWritten ? ', release notes' : ''} updated`);
  }

  if (!skipImages) {
    const localizationId = await ascLocalization(version.id);
    for (const set of IOS_SETS) {
      const files = shotFiles(set.dir);
      const setId = await ascEnsureSet(localizationId, set.displayType);
      const existing = await ascScreenshots(setId);
      const sameNames = existing.length === files.length && existing.every((shot, index) => shot.fileName === files[index]?.name);
      if (sameNames) {
        console.log(`  iOS: ${set.label} already has ${files.length} screenshots; reuploading`);
      }
      for (const shot of existing) {
        await asc('DELETE', `/v1/appScreenshots/${shot.id}`);
      }
      for (const shot of files) {
        await ascUploadScreenshot(setId, shot);
      }
      console.log(`  iOS: ${set.label} -> ${files.length} screenshots`);
    }

    if (hasFlag('prune')) {
      const wanted = new Set(IOS_SETS.map((set) => set.displayType));
      for (const set of await ascScreenshotSets(localizationId)) {
        if (!wanted.has(set.displayType)) {
          await asc('DELETE', `/v1/appScreenshotSets/${set.id}`);
          console.log(`  iOS: removed the ${set.displayType} set`);
        }
      }
    }
  }
}

// ------------------------------------------------------------------ Google

function playKey(): { client_email: string; private_key: string } {
  return JSON.parse(secret('GOOGLE_SERVICE_ACCOUNT_KEY', 'GOOGLE_SERVICE_ACCOUNT_KEY_PATH')) as {
    client_email: string;
    private_key: string;
  };
}

let playCache: string | undefined;

async function playToken(): Promise<string> {
  if (playCache) {
    return playCache;
  }
  const key = playKey();
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: object): string => Buffer.from(JSON.stringify(value)).toString('base64url');
  const data = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
  })}`;
  const signature = createSign('RSA-SHA256').update(data).sign(key.private_key);
  const assertion = `${data}.${signature.toString('base64url')}`;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    body: new URLSearchParams({ assertion, grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer' }),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    method: 'POST',
  });
  const body = (await response.json()) as { access_token?: string; error_description?: string };
  if (!response.ok || !body.access_token) {
    throw new Error(`Google token failed: ${body.error_description ?? response.status}`);
  }
  playCache = body.access_token;
  return playCache;
}

async function play<T = Record<string, unknown>>(method: string, path: string, body?: unknown): Promise<T> {
  const token = await playToken();
  const response = await fetch(`${PLAY_API}${path}`, {
    body: body == null ? undefined : JSON.stringify(body),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    method,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Play ${method} ${path} -> ${response.status} ${text.slice(0, 400)}`);
  }
  return (text.length === 0 ? {} : JSON.parse(text)) as T;
}

/** Sends the PNG bytes to the upload host, which expects the image as the body. */
async function playUpload(path: string, body: Buffer): Promise<void> {
  const token = await playToken();
  const response = await fetch(`${PLAY_UPLOAD}${path}`, {
    body: new Uint8Array(body),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/png' },
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`Play upload ${path} -> ${response.status} ${(await response.text()).slice(0, 400)}`);
  }
}

type PlayImageType = 'featureGraphic' | 'icon' | 'phoneScreenshots';

async function playUploadImages(editId: string, imageType: PlayImageType, files: string[]): Promise<void> {
  const base = `/applications/${encodeURIComponent(app.android.package)}/edits/${editId}/listings/${listing.android.locale}/${imageType}`;
  // The delete call clears every image of that type, so the order below is the
  // order Play shows.
  await play('DELETE', base).catch((error: unknown) => {
    if (!(error instanceof Error) || !error.message.includes('404')) {
      throw error;
    }
  });
  for (const file of files) {
    await playUpload(`${base}?uploadType=media`, readFileSync(file));
  }
  console.log(`  Play: ${imageType} -> ${files.length} image(s)`);
}

async function pushAndroid(): Promise<void> {
  const pkg = app.android.package;
  const edit = await play<{ id?: string }>('POST', `/applications/${encodeURIComponent(pkg)}/edits`, {});
  const editId = edit.id;
  if (!editId) {
    throw new Error('Play did not return an edit id.');
  }
  console.log(`  Play: ${pkg} edit ${editId}`);

  try {
    if (!skipText) {
      await play('PUT', `/applications/${encodeURIComponent(pkg)}/edits/${editId}/listings/${listing.android.locale}`, {
        fullDescription: listing.app.description,
        shortDescription: listing.android.shortDescription,
        title: listing.android.title,
        ...(listing.android.video ? { video: listing.android.video } : {}),
      });
      await play('PATCH', `/applications/${encodeURIComponent(pkg)}/edits/${editId}/details`, {
        contactEmail: listing.android.contactEmail,
        contactWebsite: listing.android.contactWebsite,
        defaultLanguage: listing.android.locale,
      });
      console.log('  Play: title, descriptions, contact details updated');
    }

    if (!skipImages) {
      if (existsSync(PLAY_ICON)) {
        await playUploadImages(editId, 'icon', [PLAY_ICON]);
      } else {
        console.log('  Play: no store-assets/play/icon.png; skipped the icon');
      }
      if (existsSync(PLAY_FEATURE)) {
        await playUploadImages(editId, 'featureGraphic', [PLAY_FEATURE]);
      } else {
        console.log('  Play: no store-assets/play/feature-graphic.png; skipped the feature graphic');
      }
      await playUploadImages(
        editId,
        'phoneScreenshots',
        shotFiles(PLAY_SHOTS).map((shot) => shot.path),
      );
    }

    await play('POST', `/applications/${encodeURIComponent(pkg)}/edits/${editId}:commit`, {});
    console.log('  Play: committed');
  } catch (error) {
    await play('DELETE', `/applications/${encodeURIComponent(pkg)}/edits/${editId}`).catch(() => undefined);
    throw error;
  }
}

// -------------------------------------------------------------------- main

async function main(): Promise<void> {
  checkSizes();

  const ios = only !== 'android';
  const android = only !== 'ios';
  const hash = inputHash();
  const manifest = readUploadManifest();
  const gated = hasFlag('if-changed');

  console.log(`${app.version} · ${apply ? 'applying' : 'dry run'}`);
  if (apply) {
    console.log(`  ${IOS_SETS.map((set) => `${set.label} ${shotFiles(set.dir).length}`).join(', ')}, Play phone ${shotFiles(PLAY_SHOTS).length}`);
  }

  if (ios) {
    if (gated && manifest.ios?.hash === hash) {
      console.log('  iOS: unchanged since the last upload; skipped');
    } else if (!apply) {
      console.log(
        `  iOS: would write ${listing.ios.name} (${listing.ios.name.length}), subtitle (${listing.ios.subtitle.length}), keywords (${listing.app.keywords.length}), ${listing.app.description.length} characters of description`,
      );
      console.log(`  iOS: would replace ${IOS_SETS.map((set) => `${shotFiles(set.dir).length} ${set.label}`).join(' and ')} screenshots`);
    } else {
      await pushIos();
      manifest.ios = { at: new Date().toISOString(), hash };
    }
  }

  if (android) {
    if (gated && manifest.android?.hash === hash) {
      console.log('  Play: unchanged since the last upload; skipped');
    } else if (!apply) {
      console.log(
        `  Play: would write ${listing.android.title} (${listing.android.title.length}), short description (${listing.android.shortDescription.length}), ${listing.app.description.length} characters of description`,
      );
      console.log(
        `  Play: would replace ${shotFiles(PLAY_SHOTS).length} phone screenshots${existsSync(PLAY_ICON) ? ', the icon' : ''}${existsSync(PLAY_FEATURE) ? ', the feature graphic' : ''}`,
      );
    } else {
      await pushAndroid();
      manifest.android = { at: new Date().toISOString(), hash };
    }
  }

  if (apply) {
    writeFileSync(UPLOAD_MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  } else {
    console.log('  Nothing was written. Run npm run upload:apply to push.');
  }
}

void main().catch((error: unknown) => {
  console.error(`✖ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
