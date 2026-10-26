/**
 * Reordering and editing a workout while it is still only in memory.
 */
import { assertEqual, assertTrue, test } from './test-support';
import type { SetRecord, WorkoutDetail, WorkoutExercise } from './types';
import { findNextSet, findSet, moveById, orderByIds, previousForSet, shouldRestAfterSet, supersetRole, toggleSupersetWithNext, updateSetInWorkout, warmupsFirst, workoutHasLoggedSet } from './workout-edits';

function set(id: string, position: number): SetRecord {
  return { completed: false, id, position, reps: 5, rpe: null, setType: 'normal', weightKg: 80 };
}

function exercise(id: string, position: number, sets: SetRecord[]): WorkoutExercise {
  return {
    attachment: null,
    equipment: 'Barbell',
    machineSetup: null,
    exerciseId: 'barbell-bench-press',
    id,
    muscleGroup: 'Chest',
    name: 'Barbell Bench Press',
    notes: '',
    position,
    previousSets: [],
    restSeconds: null,
    supersetId: null,
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

test('warmups move ahead of working sets, lightest first', () => {
  const sets = [set('a', 0), { ...set('b', 1), setType: 'warmup' as const }, set('c', 2), { ...set('d', 3), setType: 'warmup' as const }];
  const ordered = warmupsFirst(sets, true);
  assertEqual(
    ordered?.map((item) => item.id),
    ['b', 'd', 'a', 'c'],
  );
  assertEqual(
    ordered?.map((item) => item.position),
    [0, 1, 2, 3],
  );
  assertEqual(warmupsFirst(ordered ?? []), null);
});

test('a heavier warmup typed first moves below a lighter one', () => {
  const sets = [
    { ...set('heavy', 0), setType: 'warmup' as const, weightKg: 80 },
    { ...set('light', 1), setType: 'warmup' as const, weightKg: 40 },
    { ...set('work', 2), weightKg: 100 },
  ];
  const ordered = warmupsFirst(sets, true);
  assertEqual(
    ordered?.map((item) => item.id),
    ['light', 'heavy', 'work'],
  );
  assertEqual(
    warmupsFirst(
      [
        { ...set('blank', 0), setType: 'warmup' as const, weightKg: null },
        { ...set('loaded', 1), setType: 'warmup' as const, weightKg: 40 },
      ],
      true,
    )?.map((item) => item.id),
    ['loaded', 'blank'],
  );
});

test('previous lines up warmup with warmup and working with working', () => {
  const sets = [{ setType: 'warmup' as const }, { setType: 'warmup' as const }, { setType: 'normal' as const }, { setType: 'normal' as const }];
  const previous = [
    { reps: 8, setType: 'warmup' as const, weightKg: 40 },
    { reps: 5, setType: 'normal' as const, weightKg: 80 },
    { reps: 5, setType: 'normal' as const, weightKg: 90 },
  ];
  assertEqual(previousForSet(sets, previous, 0)?.weightKg, 40);
  assertEqual(previousForSet(sets, previous, 1), null);
  assertEqual(previousForSet(sets, previous, 2)?.weightKg, 80);
  assertEqual(previousForSet(sets, previous, 3)?.weightKg, 90);
});

test('the next set stays in the exercise you are working on', () => {
  const done = (item: SetRecord) => ({ ...item, completed: true });
  const plan = workout([
    exercise('ex-1', 0, [done(set('a', 0)), set('b', 1)]),
    exercise('ex-2', 1, [{ ...done(set('c', 0)), setType: 'warmup' }, set('d', 1), set('e', 2)]),
  ]);
  assertEqual(findNextSet(plan, 'ex-2')?.set.id, 'd');
  assertEqual(findNextSet(plan, 'ex-2')?.label, 'Set 1 of 2');
  assertEqual(findNextSet(plan, null)?.set.id, 'b');
  assertEqual(findNextSet(workout([exercise('ex-1', 0, [done(set('a', 0))])]), 'ex-1'), null);
});

test('a workout with no checked-off reps is empty', () => {
  const empty = workout([exercise('ex-1', 0, [set('a', 0)])]);
  assertEqual(workoutHasLoggedSet(empty), false);
  const logged = workout([exercise('ex-1', 0, [{ ...set('a', 0), completed: true }])]);
  assertEqual(workoutHasLoggedSet(logged), true);
});

test('superset links with the next exercise and rests after the round', () => {
  const pair = [exercise('a', 0, [set('a1', 0), set('a2', 1)]), exercise('b', 1, [set('b1', 0), set('b2', 1)])];
  const linked = toggleSupersetWithNext(pair, 'a', 'group-1');
  assertEqual(linked?.[0].supersetId, 'group-1');
  assertEqual(linked?.[1].supersetId, 'group-1');
  assertEqual(supersetRole(linked ?? [], 'a'), 'start');
  assertEqual(supersetRole(linked ?? [], 'b'), 'end');
  const plan = workout(linked ?? []);
  const afterA = updateSetInWorkout(plan, 'a1', { completed: true });
  assertEqual(findNextSet(afterA, 'a')?.set.id, 'b1');
  assertEqual(shouldRestAfterSet(afterA, 'a'), false);
  const afterB = updateSetInWorkout(afterA, 'b1', { completed: true });
  assertEqual(findNextSet(afterB, 'b')?.set.id, 'a2');
  assertEqual(shouldRestAfterSet(afterB, 'b'), true);
  const unlinked = toggleSupersetWithNext(linked ?? [], 'a', 'unused');
  assertEqual(unlinked?.[0].supersetId, null);
  assertEqual(unlinked?.[1].supersetId, null);
});

test('an exercise at the end cannot move further', () => {
  assertEqual(moveById([exercise('a', 0, []), exercise('b', 1, [])], 'a', -1), null);
  assertEqual(moveById([exercise('a', 0, []), exercise('b', 1, [])], 'b', 1), null);
});
