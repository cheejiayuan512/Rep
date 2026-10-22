/**
 * Reordering and editing a workout while it is still only in memory.
 */
import { assertEqual, assertTrue, test } from './test-support';
import type { SetRecord, WorkoutDetail, WorkoutExercise } from './types';
import { findSet, moveById, orderByIds, updateSetInWorkout } from './workout-edits';

function set(id: string, position: number): SetRecord {
  return { completed: false, id, position, reps: 5, rpe: null, setType: 'normal', weightKg: 80 };
}

function exercise(id: string, position: number, sets: SetRecord[]): WorkoutExercise {
  return {
    equipment: 'Barbell',
    exerciseId: 'barbell-bench-press',
    id,
    muscleGroup: 'Chest',
    name: 'Barbell Bench Press',
    notes: '',
    position,
    previousSets: [],
    restSeconds: null,
    sets,
  };
}

function workout(exercises: WorkoutExercise[]): WorkoutDetail {
  return { exercises, finishedAt: null, id: 'workout-1', name: 'Workout', routineId: null, startedAt: 1 };
}

test('a set can be found inside its exercise', () => {
  const found = findSet(workout([exercise('ex-1', 0, [set('set-1', 0)])]), 'set-1');
  assertEqual(found?.set.id, 'set-1');
  assertEqual(found?.exercise.id, 'ex-1');
  assertEqual(findSet(workout([]), 'missing'), null);
});

test('updating a set does not change the original workout', () => {
  const original = workout([exercise('ex-1', 0, [set('set-1', 0)])]);
  const next = updateSetInWorkout(original, 'set-1', { completed: true, reps: 8 });
  assertEqual(original.exercises[0]?.sets[0]?.completed, false);
  assertEqual(next.exercises[0]?.sets[0]?.reps, 8);
  assertEqual(next.exercises[0]?.sets[0]?.completed, true);
});

test('moving an exercise rewrites positions', () => {
  const moved = moveById([exercise('a', 0, []), exercise('b', 1, [])], 'a', 1);
  assertTrue(moved != null, 'expected the exercise to move down');
  assertEqual(
    moved.map((item) => item.id),
    ['b', 'a'],
  );
  assertEqual(
    moved.map((item) => item.position),
    [0, 1],
  );
});

test('a dragged order rewrites positions and keeps unknown rows', () => {
  const ordered = orderByIds([exercise('a', 0, []), exercise('b', 1, []), exercise('c', 2, [])], ['c', 'a']);
  assertEqual(
    ordered.map((item) => item.id),
    ['c', 'a', 'b'],
  );
  assertEqual(
    ordered.map((item) => item.position),
    [0, 1, 2],
  );
});

test('an exercise at the end cannot move further', () => {
  assertEqual(moveById([exercise('a', 0, []), exercise('b', 1, [])], 'a', -1), null);
  assertEqual(moveById([exercise('a', 0, []), exercise('b', 1, [])], 'b', 1), null);
});
