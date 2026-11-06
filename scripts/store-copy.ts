/**
 * Writes the generated half of `store-assets/listing.json`.
 *
 * - `description` is assembled from `store-assets/features.json`: an intro, the
 *   feature paragraphs, then an outro. Editing a feature means editing one
 *   paragraph, not the whole listing.
 * - `whatsNew` is the bullets in `whats-new.json` when the app already shows
 *   them, otherwise the commits since the last tag that touched the app. With
 *   no tag yet there is no previous release to compare against, so the notes
 *   already in the listing stay.
 *
 * The rest of the listing (names, keywords, URLs, contact details) is
 * editorial and is left untouched. Dry run by default: pass `--write`.
 *
 * Run: npm run copy         (prints the assembled text)
 *      npm run copy:write   (writes listing.json)
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { LISTING_PATH, ROOT, STORE_DIR, readListing, validateListing, type Listing } from './store-listing';

const args = process.argv.slice(2);
const hasFlag = (name: string): boolean => args.includes(`--${name}`);

type Features = {
  intro: string;
  outro: string;
  paragraphs: string[];
};

/** Commits that are housekeeping never belong in release notes. */
const SKIP = /^(merge|chore|test|tests|docs|ci|build|refactor|style|format|perf|deps|release|revert)\b/i;

function git(argv: string[]): string {
  const result = spawnSync('git', argv, { cwd: ROOT, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : '';
}

function sentence(line: string): string {
  const text = line.replace(/\s+/g, ' ').trim();
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

/** Commits since the last tag that changed the app itself, newest first. */
function notesFromCommits(tag: string): string[] {
  const output = git(['log', `${tag}..HEAD`, '--no-merges', '--pretty=format:%s', '--', 'src', 'App.tsx', 'index.ts', 'app.json', 'assets']);
  if (!output) {
    return [];
  }
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 8 && !SKIP.test(line))
    .slice(0, 6)
    .map(sentence);
}

function releaseNotes(current: string): string {
  const notesPath = join(ROOT, 'whats-new.json');
  if (existsSync(notesPath)) {
    const file = JSON.parse(readFileSync(notesPath, 'utf8')) as { bullets?: string[] };
    const bullets = (file.bullets ?? []).map((bullet) => bullet.trim()).filter(Boolean);
    if (bullets.length > 0) {
      return bullets.join('\n');
    }
  }

  // The notes describe a change from the previous release. `HEAD^` is the point
  // before the commit being tagged, so on the tag itself `git describe` returns
  // the release before it rather than the tag that just fired the workflow.
  const tag = git(['describe', '--tags', '--abbrev=0', 'HEAD^']);
  if (!tag) {
    return current;
  }
  const commits = notesFromCommits(tag);
  return commits.length > 0 ? commits.join('\n') : current;
}

function assemble(features: Features): string {
  return [features.intro, ...features.paragraphs, features.outro]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join('\n\n');
}

function main(): void {
  const listing = readListing();
  const features = JSON.parse(readFileSync(join(STORE_DIR, 'features.json'), 'utf8')) as Features;
  const next: Listing = {
    ...listing,
    app: {
      ...listing.app,
      description: assemble(features),
      whatsNew: releaseNotes(listing.app.whatsNew),
    },
  };
  validateListing(next);

  const descriptionChanged = next.app.description !== listing.app.description;
  const notesChanged = next.app.whatsNew !== listing.app.whatsNew;
  console.log(`description ${next.app.description.length} characters (${descriptionChanged ? 'changed' : 'unchanged'})`);
  console.log(`release notes ${next.app.whatsNew.length} characters (${notesChanged ? 'changed' : 'unchanged'})`);
  for (const line of next.app.whatsNew.split('\n')) {
    console.log(`  ${line}`);
  }

  if (!descriptionChanged && !notesChanged) {
    console.log('Nothing to write.');
    return;
  }
  if (!hasFlag('write')) {
    console.log('Dry run. Run npm run copy:write to save.');
    return;
  }
  writeFileSync(LISTING_PATH, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`Wrote ${LISTING_PATH}`);
}

main();
