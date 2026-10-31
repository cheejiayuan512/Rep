import { matchHevyExercise, parseHevyCsv, parseHevyDate, type HevyImportExerciseRef } from './hevy-import';
import { assertEqual, assertThrows, test } from './test-support';

const library: HevyImportExerciseRef[] = [
  { equipment: 'Barbell', id: 'incline-barbell-bench-press', isCustom: false, muscleGroup: 'Chest', name: 'Incline Barbell Bench Press' },
  { equipment: 'Bodyweight', id: 'chin-up', isCustom: false, muscleGroup: 'Back', name: 'Chin-Up' },
  { equipment: 'Barbell', id: 'back-squat', isCustom: false, muscleGroup: 'Quads', name: 'Back Squat' },
  { equipment: 'Barbell', id: 'power-clean', isCustom: false, muscleGroup: 'Full body', name: 'Power Clean' },
  { equipment: 'Cable', id: 'triceps-pushdown', isCustom: false, muscleGroup: 'Triceps', name: 'Triceps Pushdown' },
];

test('parseHevyDate reads the Hevy export clock', () => {
  assertEqual(parseHevyDate('20 Oct 2026, 18:42'), new Date(2026, 9, 20, 18, 42, 0).getTime());
});

test('matchHevyExercise maps Hevy titles onto the seeded library', () => {
  assertEqual(matchHevyExercise('Chin Up (Weighted)', library).exerciseId, 'chin-up');
  assertEqual(matchHevyExercise('Incline Bench Press (Barbell)', library).exerciseId, 'incline-barbell-bench-press');
  assertEqual(matchHevyExercise('Squat (Barbell)', library).exerciseId, 'back-squat');
  assertEqual(matchHevyExercise('Triceps Rope Pushdown', library).exerciseId, 'triceps-pushdown');
  assertEqual(matchHevyExercise('Sit Up (Weighted)', library).exerciseId, null);
});

test('parseHevyCsv groups one session, keeps warmups, and keeps a run', () => {
  const csv = [
    'title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe',
    'Morning workout 🏋️,20 Oct 2026, 18:42,20 Oct 2026, 20:41,,Chin Up (Weighted),,go next,0,normal,10,6,,,',
    'Morning workout 🏋️,20 Oct 2026, 18:42,20 Oct 2026, 20:41,,Chin Up (Weighted),,go next,1,warmup,,3,,,',
    'Morning workout 🏋️,20 Oct 2026, 18:42,20 Oct 2026, 20:41,,Incline Bench Press (Barbell),,try 80 then 90,0,normal,85,6,,,',
    'Morning workout 🏋️,20 Oct 2026, 18:42,20 Oct 2026, 20:41,,Running,, ,0,normal,,,5,1800,',
    'Late night workout 🌙,19 Oct 2026, 20:35,19 Oct 2026, 22:12,,Squat (Barbell),,rpe 8.5,0,normal,125,5,,,',
  ].join('\n');

  const result = parseHevyCsv(csv, library);
  assertEqual(result.workouts.length, 2);
  assertEqual(result.skippedCardioRows, 0);

  const morning = result.workouts.find((workout) => workout.name === 'Morning workout');
  assertEqual(Boolean(morning), true);
  assertEqual(morning?.exercises.length, 3);
  assertEqual(morning?.exercises[0].matchedExerciseId, 'chin-up');
  assertEqual(morning?.exercises[0].sets.length, 2);
  assertEqual(morning?.exercises[0].sets[0].weightKg, 10);
  assertEqual(morning?.exercises[0].sets[0].completed, true);
  assertEqual(morning?.exercises[0].sets[1].setType, 'warmup');
  assertEqual(morning?.exercises[1].matchedExerciseId, 'incline-barbell-bench-press');
  assertEqual(morning?.exercises[1].notes, 'try 80 then 90');
  assertEqual(morning?.exercises[2].name, 'Running');
  assertEqual(morning?.exercises[2].sets[0].durationSeconds, 1800);
  assertEqual(morning?.exercises[2].sets[0].distanceKm, 5);
  assertEqual(morning?.exercises[2].sets[0].reps, null);

  const night = result.workouts.find((workout) => workout.name === 'Late night workout');
  assertEqual(night?.exercises[0].matchedExerciseId, 'back-squat');
});

test('parseHevyCsv keeps columns when Hevy already quoted the dates', () => {
  const csv = [
    '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"',
    '"Morning workout 🏋️","20 Oct 2026, 18:42","20 Oct 2026, 20:41","","Chin Up (Weighted)",,"go 11.25 next, rpe8.5",0,"normal",10,6,,,',
    '"Morning workout 🏋️","20 Oct 2026, 18:42","20 Oct 2026, 20:41","","Chin Up (Weighted)",,"go 11.25 next, rpe8.5",1,"warmup",,3,,,',
    '"Morning workout 🏋️","20 Oct 2026, 18:42","20 Oct 2026, 20:41","","Incline Bench Press (Barbell)",,"try 80*10\\nbetter 90",0,"normal",85,6,,,',
    '"Morning workout 🏋️","20 Oct 2026, 18:42","20 Oct 2026, 20:41","","Running",,"",0,"normal",,,5,1800,',
  ].join('\n');

  const result = parseHevyCsv(csv, library);
  assertEqual(result.workouts.length, 1);
  assertEqual(result.skippedCardioRows, 0);
  const morning = result.workouts[0];
  assertEqual(morning?.name, 'Morning workout');
  assertEqual(morning?.exercises.length, 3);
  assertEqual(morning?.exercises[0].sets.length, 2);
  assertEqual(morning?.exercises[0].sets[1].setType, 'warmup');
  assertEqual(morning?.exercises[0].notes, 'go 11.25 next, rpe8.5');
  assertEqual(morning?.exercises[1].notes, 'try 80*10\nbetter 90');
  assertEqual(morning?.exercises[1].sets[0].weightKg, 85);
});

test('parseHevyCsv rejects a file that is not a Hevy export', () => {
  assertThrows(() => parseHevyCsv('a,b\n1,2', library), 'Hevy');
});
