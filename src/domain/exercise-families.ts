/**
 * Variants of the same movement, such as the bench press done with a barbell,
 * on an incline, or with dumbbells. The picker folds each family into one row.
 * Custom exercises and moves with no listed family stay on their own row.
 */
import type { Exercise } from './types';

const families: Record<string, string[]> = {
  'Bench Press': [
    'barbell-bench-press',
    'incline-barbell-bench-press',
    'decline-barbell-bench-press',
    'dumbbell-bench-press',
    'incline-dumbbell-press',
    'machine-chest-press',
    'close-grip-bench-press',
  ],
  'Calf Raise': ['standing-calf-raise', 'seated-calf-raise'],
  Crunch: ['crunch', 'cable-crunch'],
  Curl: ['barbell-curl', 'dumbbell-curl', 'hammer-curl', 'incline-dumbbell-curl', 'preacher-curl', 'cable-curl'],
  Deadlift: ['deadlift', 'romanian-deadlift', 'dumbbell-romanian-deadlift'],
  'Chest Fly': ['dumbbell-fly', 'cable-fly'],
  'Hip Thrust': ['hip-thrust', 'glute-bridge'],
  'Lateral Raise': ['lateral-raise', 'cable-lateral-raise'],
  'Leg Curl': ['lying-leg-curl', 'seated-leg-curl'],
  Lunge: ['bulgarian-split-squat', 'walking-lunge'],
  Pulldown: ['lat-pulldown', 'straight-arm-pulldown'],
  'Pull-Up': ['pull-up', 'chin-up'],
  Row: ['barbell-row', 'dumbbell-row', 'seated-cable-row', 'chest-supported-row'],
  'Shoulder Press': ['overhead-press', 'dumbbell-shoulder-press', 'arnold-press', 'push-press'],
  Squat: ['back-squat', 'front-squat', 'goblet-squat', 'hack-squat'],
  'Triceps Extension': ['triceps-pushdown', 'overhead-triceps-extension', 'skull-crusher', 'dumbbell-kickback'],
};

const familyById = new Map<string, string>(Object.entries(families).flatMap(([family, ids]) => ids.map((id) => [id, family] as const)));

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
