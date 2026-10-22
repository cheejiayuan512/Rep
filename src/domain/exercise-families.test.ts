/**
 * Folding movement variants into one picker row.
 */
import { groupExercises } from './exercise-families';
import { assertEqual, test } from './test-support';
import type { Exercise } from './types';

function exercise(id: string, name: string): Exercise {
  return { equipment: 'Barbell', id, isCustom: false, muscleGroup: 'Chest', name };
}

const library = [
  exercise('barbell-bench-press', 'Barbell Bench Press'),
  exercise('barbell-curl', 'Barbell Curl'),
  exercise('dumbbell-bench-press', 'Dumbbell Bench Press'),
  exercise('custom-1', 'My Press'),
];

test('variants fold into one collapsed family row', () => {
  assertEqual(
    groupExercises(library, new Set(), false).map((item) => item.key),
    ['family:Bench Press', 'barbell-curl', 'custom-1'],
  );
});

test('an expanded family lists its variants under it', () => {
  assertEqual(
    groupExercises(library, new Set(['Bench Press']), false).map((item) => item.key),
    ['family:Bench Press', 'barbell-bench-press', 'dumbbell-bench-press', 'barbell-curl', 'custom-1'],
  );
});

test('a family with one visible member is a plain row', () => {
  const items = groupExercises([exercise('dumbbell-bench-press', 'Dumbbell Bench Press')], new Set(), false);
  assertEqual(items.map((item) => item.kind), ['exercise']);
});
