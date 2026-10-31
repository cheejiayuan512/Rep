/**
 * Workout Guide drawings stay attached to the exercises they illustrate.
 */
import { guideExercises } from '../data/guide-seeds';
import { seedExercises } from '../data/seed-exercises';
import { movementFamily } from './exercise-families';
import { guideSlugFor, guideSlugForFamily } from './guide-art';
import { poseForExercise, poseForFamily } from './movement-pose';
import { assertEqual, assertTrue, test } from './test-support';

test('the barbell bench press uses the bench press drawing', () => {
  assertEqual(guideSlugFor('barbell-bench-press'), 'bench-press');
  assertEqual(guideSlugForFamily('Bench Press'), 'bench-press');
});

test('a custom name picks the closest drawing', () => {
  assertEqual(guideSlugFor('custom-1', 'Pause Back Squat'), 'squat');
  assertEqual(guideSlugFor('custom-2', 'Zebra hold'), null);
});

test('every built-in exercise has a drawing or its own pose', () => {
  const missing = seedExercises.filter((seed) => guideSlugFor(seed.id, seed.name) == null && poseForExercise(seed.id, seed.name) === 'generic').map((seed) => seed.id);
  assertEqual(missing, []);
});

test('every family row has a drawing or its own pose', () => {
  const families = [...new Set(seedExercises.map((seed) => movementFamily(seed.id)).filter((family): family is string => family != null))];
  const missing = families.filter((family) => guideSlugForFamily(family) == null && poseForFamily(family) === 'generic');
  assertEqual(missing, []);
});

test('every added guide exercise keeps its own three-frame slug', () => {
  assertTrue(guideExercises.length > 100, 'the guide catalog should be added');
  const missing = guideExercises.filter((seed) => guideSlugFor(seed.id) !== seed.id).map((seed) => seed.id);
  assertEqual(missing, []);
});
