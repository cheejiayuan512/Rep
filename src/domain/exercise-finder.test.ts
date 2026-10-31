/**
 * Finding an exercise from where you feel it, what you hold, and how you stand.
 */
import { seedExercises } from '../data/seed-exercises';
import { guideSlugFor } from './guide-art';
import { findExercises, movementCue } from './exercise-finder';
import { assertEqual, assertTrue, test } from './test-support';
import type { Exercise } from './types';

const library: Exercise[] = seedExercises.map((seed) => ({ ...seed, attachment: seed.attachment ?? null, isCustom: false, machineSetup: null }));

test('back of upper arm on a cable while standing finds the pushdown', () => {
  const matches = findExercises(library, { equipment: 'Cable', muscle: 'Triceps', position: 'Standing' });
  const pushdown = matches.find((match) => match.exercise.id === 'triceps-pushdown');
  assertTrue(pushdown != null, 'missing triceps pushdown');
  assertEqual(pushdown?.exact, true);
});

test('side raise on a cable is found from shoulders, cable, standing', () => {
  const ids = findExercises(library, { equipment: 'Cable', muscle: 'Shoulders', position: 'Standing' })
    .filter((match) => match.exact)
    .map((match) => match.exercise.id);
  assertTrue(ids.includes('cable-lateral-raise'), 'missing cable lateral raise');
  assertTrue(ids.includes('face-pull') === false, 'face pull is a back exercise here');
});

test('a wrong guess on one question still shows the move as a near match', () => {
  const matches = findExercises(library, { equipment: 'Machine', muscle: 'Back', position: 'Seated' });
  const pulldown = matches.find((match) => match.exercise.id === 'lat-pulldown');
  assertTrue(pulldown != null, 'lat pulldown should be a near match');
  assertEqual(pulldown?.exact, false);
});

test('not sure answers match everything in the muscle group', () => {
  const matches = findExercises(library, { equipment: null, muscle: 'Calves', position: null });
  const ids = matches.map((match) => match.exercise.id);
  assertTrue(ids.includes('seated-calf-raise'), 'missing seated calf raise');
  assertTrue(ids.includes('standing-calf-raise'), 'missing standing calf raise');
  assertTrue(matches.every((match) => match.exact), 'every match is exact');
});

test('every built-in exercise describes its movement', () => {
  const missing = seedExercises.filter((seed) => movementCue(seed.id) == null && guideSlugFor(seed.id) == null).map((seed) => seed.id);
  assertEqual(missing, []);
});
