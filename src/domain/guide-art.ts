/**
 * Resolves the Workout Guide drawing for a built-in or a custom exercise.
 * The frames themselves live in assets/exercise-art and are CC BY-SA 4.0.
 */
import { exercisesInFamily } from './exercise-families';
import { guideNames, guideSlugById } from './guide-art-data';

/**
 * Library rows that have no drawing of their own, and common moves added
 * beside an existing one. Each reuses a Workout Guide animation.
 */
const sharedDrawings: Record<string, string> = {
  'box-jump': 'jump-squat',
  'box-squat': 'squat',
  'dumbbell-pullover': 'straight-arm-pulldown',
  'floor-press': 'bench-press',
  'glute-ham-raise': 'nordic-hamstring-curl',
  'machine-triceps-extension': 'overhead-tricep-extension',
  'muscle-up': 'pull-up',
  'safety-bar-squat': 'squat',
  'sit-up': 'decline-sit-up',
  'stiff-leg-deadlift': 'romanian-deadlift',
  'toes-to-bar': 'hanging-leg-raise',
  'zercher-squat': 'squat',
  'zottman-curl': 'bicep-curl',
};

/** Spoken names that are not a separate exercise. Longest phrase first. */
const spokenDrawings: Array<{ name: string; slug: string }> = [
  { name: 'conventional deadlift', slug: 'deadlift' },
  { name: 'military press', slug: 'overhead-press' },
  { name: 'strict press', slug: 'overhead-press' },
  { name: 'farmers walk', slug: 'farmer-carry' },
  { name: 'farmer s walk', slug: 'farmer-carry' },
  { name: 'farmer walk', slug: 'farmer-carry' },
  { name: 'air squat', slug: 'bodyweight-squat' },
  { name: 'hyperextension', slug: 'back-extension' },
  { name: 'sit up', slug: 'decline-sit-up' },
];

export function guideSlugFor(exerciseId: string, name = ''): string | null {
  const shared = sharedDrawings[exerciseId];
  if (shared) {
    return shared;
  }
  const direct = guideSlugById[exerciseId];
  if (direct) {
    return direct;
  }
  return matchGuideName(name);
}

export function guideSlugForFamily(family: string): string | null {
  for (const id of exercisesInFamily(family)) {
    const slug = guideSlugFor(id);
    if (slug) {
      return slug;
    }
  }
  return null;
}

function matchGuideName(name: string): string | null {
  const key = nameKey(name);
  if (key.length === 0) {
    return null;
  }
  for (const entry of guideNames) {
    if (containsPhrase(key, entry.name)) {
      return entry.slug;
    }
  }
  for (const entry of spokenDrawings) {
    if (key === entry.name || containsPhrase(key, entry.name)) {
      return entry.slug;
    }
  }
  return null;
}

function nameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\bsitups\b/g, 'sit up')
    .replace(/\bpullups\b/g, 'pull up')
    .replace(/\bpushups\b/g, 'push up')
    .replace(/\bchinups\b/g, 'chin up')
    .replace(/\bups\b/g, 'up');
}

function containsPhrase(text: string, phrase: string): boolean {
  let from = 0;
  while (from <= text.length - phrase.length) {
    const index = text.indexOf(phrase, from);
    if (index < 0) {
      return false;
    }
    const before = index === 0 || text[index - 1] === ' ';
    const afterIndex = index + phrase.length;
    const after = afterIndex === text.length || text[afterIndex] === ' ';
    if (before && after) {
      return true;
    }
    from = index + 1;
  }
  return false;
}
