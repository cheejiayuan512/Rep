/**
 * Pure helpers for changing a workout object already in memory.
 * They do not save. The screen saves after it calls one of these.
 */
import type { PreviousSet, SetRecord, SetType, WorkoutDetail, WorkoutExercise } from './types';

export function findSet(workout: WorkoutDetail, setId: string): { exercise: WorkoutExercise; set: SetRecord } | null {
  for (const exercise of workout.exercises) {
    const set = exercise.sets.find((item) => item.id === setId);
    if (set) {
      return { exercise, set };
    }
  }

  return null;
}

export function updateSetInWorkout(workout: WorkoutDetail, setId: string, patch: Partial<SetRecord>): WorkoutDetail {
  return {
    ...workout,
    exercises: workout.exercises.map((exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set) => (set.id === setId ? { ...set, ...patch } : set)),
    })),
  };
}

export function replaceExercise(workout: WorkoutDetail, exerciseId: string, next: WorkoutExercise): WorkoutDetail {
  return {
    ...workout,
    exercises: workout.exercises.map((exercise) => (exercise.id === exerciseId ? next : exercise)),
  };
}

export function orderByIds<T extends { id: string; position: number }>(items: T[], ids: string[]): T[] {
  const remaining = new Map(items.map((item) => [item.id, item]));
  const ordered: T[] = [];
  for (const id of ids) {
    const item = remaining.get(id);
    if (!item || ordered.includes(item)) {
      continue;
    }
    ordered.push(item);
    remaining.delete(id);
  }
  for (const item of items) {
    if (remaining.has(item.id)) {
      ordered.push(item);
    }
  }
  return ordered.map((item, position) => ({ ...item, position }));
}

type OrderableSet = { id: string; position: number; setType: SetType; weightKg: number | null };

function compareWarmupWeight(left: number | null, right: number | null): number {
  if (left == null && right == null) {
    return 0;
  }
  if (left == null) {
    return 1;
  }
  if (right == null) {
    return -1;
  }
  return left - right;
}

/** Warmups first. Pass `true` to also sort those by weight, lightest first (blank last). Working sets keep their order. Null when nothing moves. */
export function warmupsFirst<T extends OrderableSet>(sets: T[], sortWeight = false): T[] | null {
  const warmups = sets.filter((set) => set.setType === 'warmup');
  const ranked = sortWeight ? [...warmups].sort((left, right) => compareWarmupWeight(left.weightKg, right.weightKg)) : warmups;
  const working = sets.filter((set) => set.setType !== 'warmup');
  const ordered = [...ranked, ...working];
  if (ordered.every((set, index) => set.id === sets[index]?.id)) {
    return null;
  }
  return ordered.map((set, position) => ({ ...set, position }));
}

/** Last session's warmup N lines up with this session's warmup N, same for working sets. */
export function previousForSet<T extends { setType: SetType }>(sets: T[], previous: PreviousSet[], index: number): PreviousSet | null {
  const set = sets[index];
  if (!set) {
    return null;
  }
  const slot = sets.slice(0, index).filter((item) => item.setType === set.setType).length;
  return previous.filter((item) => item.setType === set.setType)[slot] ?? null;
}

export interface NextSet {
  exercise: WorkoutExercise;
  set: SetRecord;
  /** "Warmup", or "Set 2 of 4" counting working sets only. */
  label: string;
}

/**
 * The set to do next: the first open set in the exercise you last checked a
 * set off in, or else the first open set in workout order.
 */
export function findNextSet(workout: WorkoutDetail, lastExerciseId: string | null): NextSet | null {
  const current = workout.exercises.find((exercise) => exercise.id === lastExerciseId);
  const exercise = current?.sets.some((set) => !set.completed) ? current : workout.exercises.find((item) => item.sets.some((set) => !set.completed));
  const set = exercise?.sets.find((item) => !item.completed);
  if (!exercise || !set) {
    return null;
  }
  if (set.setType === 'warmup') {
    return { exercise, label: 'Warmup', set };
  }
  const working = exercise.sets.filter((item) => item.setType !== 'warmup');
  return { exercise, label: `Set ${working.indexOf(set) + 1} of ${working.length}`, set };
}

export function moveById<T extends { id: string; position: number }>(items: T[], id: string, direction: -1 | 1): T[] | null {
  const index = items.findIndex((item) => item.id === id);
  const target = index + direction;
  const current = items[index];
  if (!current || target < 0 || target >= items.length) {
    return null;
  }

  const next = items.slice();
  next.splice(index, 1);
  next.splice(target, 0, current);
  return next.map((item, position) => ({ ...item, position }));
}
