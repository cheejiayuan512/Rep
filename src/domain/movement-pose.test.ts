/**
 * Every built-in exercise has a pose, and a custom name still finds one.
 */
import { seedExercises } from '../data/seed-exercises';
import { movementFamily } from './exercise-families';
import { poseForExercise, poseForFamily } from './movement-pose';
import { assertEqual, assertTrue, test } from './test-support';

test('every built-in exercise has its own pose', () => {
  const missing = seedExercises.filter((seed) => poseForExercise(seed.id, seed.name) === 'generic').map((seed) => seed.id);
  assertEqual(missing, []);
});

test('a family row uses that movement pose', () => {
  const families = [...new Set(seedExercises.map((seed) => movementFamily(seed.id)).filter((family): family is string => family != null))];
  const missing = families.filter((family) => poseForFamily(family) === 'generic');
  assertEqual(missing, []);
  assertEqual(poseForFamily('Squat'), 'squat');
  assertEqual(poseForFamily('Bench Press'), 'bench');
});

test('a custom name is matched from its words', () => {
  assertEqual(poseForExercise('custom-1', 'Pause Back Squat'), 'squat');
  assertEqual(poseForExercise('custom-2', 'Single-arm cable row'), 'row');
  assertEqual(poseForExercise('custom-3', 'Zebra hold'), 'generic');
  assertTrue(poseForExercise('lying-leg-curl') === 'legcurl', 'leg curl is not a biceps curl');
});
