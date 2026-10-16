import type { SetRecord, WorkoutDetail, WorkoutExercise } from './types';

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
