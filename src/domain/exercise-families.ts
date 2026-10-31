/**
 * Variants of the same movement, such as the bench press done with a barbell,
 * on an incline, or with dumbbells. The picker folds each family into one row.
 * Custom exercises and moves with no listed family stay on their own row.
 */
import { extraFamilyMembers } from './guide-families';
import type { Exercise } from './types';

function mergeFamilies(base: Record<string, readonly string[]>, extra: Record<string, readonly string[]>): Record<string, string[]> {
  const merged: Record<string, string[]> = {};
  const claimed = new Set<string>();
  for (const ids of Object.values(base)) {
    for (const id of ids) {
      claimed.add(id);
    }
  }
  for (const [family, ids] of Object.entries(base)) {
    merged[family] = [...ids];
  }
  for (const [family, ids] of Object.entries(extra)) {
    const next = merged[family] ?? [];
    for (const id of ids) {
      if (!claimed.has(id)) {
        claimed.add(id);
        next.push(id);
      }
    }
    merged[family] = next;
  }
  return merged;
}

const baseFamilies: Record<string, readonly string[]> = {
  'Bench Press': [
    'barbell-bench-press',
    'incline-barbell-bench-press',
    'decline-barbell-bench-press',
    'dumbbell-bench-press',
    'incline-dumbbell-press',
    'decline-dumbbell-press',
    'machine-chest-press',
    'close-grip-bench-press',
    'floor-press',
  ],
  'Calf Raise': ['standing-calf-raise', 'seated-calf-raise', 'donkey-calf-raise', 'single-leg-calf-raise'],
  Crunch: ['crunch', 'cable-crunch', 'bicycle-crunch'],
  Curl: [
    'barbell-curl',
    'dumbbell-curl',
    'hammer-curl',
    'incline-dumbbell-curl',
    'preacher-curl',
    'cable-curl',
    'ez-bar-curl',
    'concentration-curl',
    'reverse-curl',
    'spider-curl',
    'machine-preacher-curl',
  ],
  Deadlift: ['deadlift', 'romanian-deadlift', 'dumbbell-romanian-deadlift', 'single-leg-rdl'],
  'Chest Fly': ['dumbbell-fly', 'cable-fly', 'pec-deck', 'machine-fly', 'cable-crossover'],
  'Hip Thrust': ['hip-thrust', 'glute-bridge', 'single-leg-hip-thrust'],
  'Lateral Raise': ['lateral-raise', 'cable-lateral-raise', 'machine-lateral-raise'],
  'Leg Curl': ['lying-leg-curl', 'seated-leg-curl', 'nordic-curl'],
  Lunge: ['bulgarian-split-squat', 'walking-lunge', 'reverse-lunge', 'split-squat', 'step-up'],
  Pulldown: ['lat-pulldown', 'straight-arm-pulldown'],
  'Pull-Up': ['pull-up', 'chin-up', 'inverted-row'],
  Row: ['barbell-row', 'dumbbell-row', 'seated-cable-row', 'chest-supported-row', 't-bar-row', 'pendlay-row', 'single-arm-cable-row', 'machine-row'],
  'Shoulder Press': ['overhead-press', 'dumbbell-shoulder-press', 'arnold-press', 'push-press', 'machine-shoulder-press', 'landmine-press'],
  Shrug: ['barbell-shrug', 'dumbbell-shrug'],
  Squat: ['back-squat', 'front-squat', 'goblet-squat', 'hack-squat', 'belt-squat', 'sissy-squat'],
  'Triceps Extension': [
    'triceps-pushdown',
    'overhead-triceps-extension',
    'skull-crusher',
    'dumbbell-kickback',
    'overhead-cable-extension',
    'machine-triceps-extension',
    'bench-dip',
  ],
  Dip: ['dip', 'assisted-dip', 'chair-dip', 'chest-dip', 'weighted-dip'],
  'Push-up': [
    'push-up',
    'archer-push-up',
    'decline-push-up',
    'diamond-push-up',
    'explosive-push-up',
    'feet-elevated-pike-push-up',
    'handstand-push-up',
    'hindu-push-up',
    'incline-push-up',
    'knee-push-up',
    'pike-push-up',
    'push-up-shoulder-tap',
    'scapular-push-up',
    'typewriter-push-up',
    'wall-handstand-push-up',
    'wall-push-up',
    'weighted-push-up',
    'wide-push-up',
  ],
};

const families = mergeFamilies(baseFamilies, extraFamilyMembers);

const familyById = new Map<string, string>(Object.entries(families).flatMap(([family, ids]) => ids.map((id) => [id, family] as const)));

export function exercisesInFamily(family: string): readonly string[] {
  return families[family] ?? [];
}

export function movementFamily(exerciseId: string): string | null {
  return familyById.get(exerciseId) ?? null;
}

export type ExerciseListItem =
  | { kind: 'exercise'; key: string; exercise: Exercise; nested: boolean }
  | { kind: 'family'; key: string; family: string; count: number; expanded: boolean };

/**
 * Turns the filtered list into rows. A family with two or more visible
 * members becomes a header; its variants follow only when it is expanded.
 * The family sits where its first member would have been.
 */
export function groupExercises(exercises: Exercise[], expanded: ReadonlySet<string>, expandAll: boolean): ExerciseListItem[] {
  const members = new Map<string, Exercise[]>();
  for (const exercise of exercises) {
    const family = movementFamily(exercise.id);
    if (family) {
      members.set(family, [...(members.get(family) ?? []), exercise]);
    }
  }

  const items: ExerciseListItem[] = [];
  const placed = new Set<string>();
  for (const exercise of exercises) {
    const family = movementFamily(exercise.id);
    const group = family ? members.get(family) : undefined;
    if (!family || !group || group.length < 2) {
      items.push({ exercise, key: exercise.id, kind: 'exercise', nested: false });
      continue;
    }
    if (placed.has(family)) {
      continue;
    }
    placed.add(family);
    const open = expandAll || expanded.has(family);
    items.push({ count: group.length, expanded: open, family, key: `family:${family}`, kind: 'family' });
    if (open) {
      for (const member of group) {
        items.push({ exercise: member, key: member.id, kind: 'exercise', nested: true });
      }
    }
  }

  return items;
}
