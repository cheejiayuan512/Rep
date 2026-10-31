/**
 * Resolves the Workout Guide drawing for a built-in or a custom exercise.
 * The frames themselves live in assets/exercise-art and are CC BY-SA 4.0.
 */
import { exercisesInFamily } from './exercise-families';
import { guideNames, guideSlugById } from './guide-art-data';

export function guideSlugFor(exerciseId: string, name = ''): string | null {
  const direct = guideSlugById[exerciseId];
  if (direct) {
    return direct;
  }
  return matchGuideName(name);
}

export function guideSlugForFamily(family: string): string | null {
  for (const id of exercisesInFamily(family)) {
    const slug = guideSlugById[id];
    if (slug) {
      return slug;
    }
  }
  return null;
}

function matchGuideName(name: string): string | null {
  const key = name.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (key.length === 0) {
    return null;
  }
  for (const entry of guideNames) {
    if (containsPhrase(key, entry.name)) {
      return entry.slug;
    }
  }
  return null;
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
