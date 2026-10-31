import { seedExercises } from '../data/seed-exercises';
import { fuzzyFilter } from './fuzzy-search';
import { assertEqual, assertTrue, test } from './test-support';

function top(query: string, count = 1): string[] {
  return fuzzyFilter(seedExercises, query)
    .slice(0, count)
    .map((exercise) => exercise.name);
}

test('typos still find the exercise', () => {
  assertEqual(top('bech press')[0]?.includes('Bench Press'), true);
  assertEqual(top('deadlfit'), ['Deadlift']);
  assertEqual(top('tricpes pushdown'), ['Triceps Pushdown']);
});

test('gym shorthand expands', () => {
  assertEqual(top('ohp'), ['Overhead Press']);
  assertEqual(top('rdl'), ['Romanian Deadlift']);
  assertEqual(top('sldl'), ['Stiff-Leg Deadlift']);
  assertTrue(top('db row').includes('Dumbbell Row'), 'db row finds Dumbbell Row');
});

test('a plural or spoken name finds the exercise', () => {
  assertEqual(top('situps'), ['Sit-Up']);
  assertEqual(top('sit ups'), ['Sit-Up']);
  assertEqual(top('pullups'), ['Pull-Up']);
  assertEqual(top('pushups'), ['Push-Up']);
  assertEqual(top('military press'), ['Overhead Press']);
  assertEqual(top('farmer walk'), ['Farmer Carry']);
  assertEqual(top('air squat'), ['Bodyweight Squat']);
  assertEqual(top('hyperextension'), ['Back Extension']);
});

test('words can come in any order and match prefixes', () => {
  assertEqual(top('press incline db'), ['Incline Dumbbell Press']);
  assertEqual(top('lat pull'), ['Lat Pulldown']);
  assertEqual(top('pullup'), ['Pull-Up']);
});

test('muscle and equipment words narrow the list', () => {
  const cable = fuzzyFilter(seedExercises, 'cable chest');
  assertEqual(cable[0]?.name, 'Cable Fly');
  assertTrue(fuzzyFilter(seedExercises, 'calves').every((exercise) => exercise.muscleGroup === 'Calves'), 'calves lists calf exercises');
});

test('a word that matches nothing hides the exercise', () => {
  assertEqual(fuzzyFilter(seedExercises, 'squat zzzz').length, 0);
  assertEqual(fuzzyFilter(seedExercises, '  ').length, seedExercises.length);
});
