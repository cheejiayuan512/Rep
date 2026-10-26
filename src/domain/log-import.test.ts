import { detectLogExport, parseFlexibleDate, parseLogCsv } from './log-import';
import { assertEqual, assertThrows, test } from './test-support';
import type { HevyImportExerciseRef } from './hevy-import';

const library: HevyImportExerciseRef[] = [
  { equipment: 'Barbell', id: 'back-squat', isCustom: false, muscleGroup: 'Quads', name: 'Back Squat' },
  { equipment: 'Barbell', id: 'barbell-bench-press', isCustom: false, muscleGroup: 'Chest', name: 'Barbell Bench Press' },
];

test('detectLogExport reads Hevy, Strong, Jefit, and FitNotes headers', () => {
  assertEqual(detectLogExport('title,start_time,exercise_title\n'), 'hevy');
  assertEqual(detectLogExport('Date,Workout Name,Exercise Name,Set Order,Weight,Weight Unit,Reps\n'), 'strong');
  assertEqual(detectLogExport('Date,Workout Name,Exercise Name,Set,Reps,Weight\n'), 'jefit');
  assertEqual(detectLogExport('Date,Exercise,Category,Weight (kgs),Reps\n'), 'fitnotes');
  assertThrows(() => detectLogExport('a,b\n1,2'), 'Hevy, Strong, Jefit, or FitNotes');
});

test('parseFlexibleDate reads ISO and US clocks', () => {
  assertEqual(parseFlexibleDate('2026-10-20 18:42:00'), new Date(2026, 9, 20, 18, 42, 0).getTime());
  assertEqual(parseFlexibleDate('2026-10-20'), new Date(2026, 9, 20, 12, 0, 0).getTime());
  assertEqual(parseFlexibleDate('10/20/2026 6:42:00 PM'), new Date(2026, 9, 20, 18, 42, 0).getTime());
});

test('parseLogCsv reads a Strong session, warmup, and pounds', () => {
  const csv = [
    'Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Weight Unit,Reps,Distance,Distance Unit,Seconds,Notes,Workout Notes,RPE',
    '2026-10-20 18:42:00,Push,45m,Squat (Barbell),W,60,kg,5,,,,,,,',
    '2026-10-20 18:42:00,Push,45m,Squat (Barbell),1,225,lbs,5,,,,,,8',
  ].join('\n');
  const result = parseLogCsv(csv, library);
  assertEqual(result.source, 'strong');
  assertEqual(result.workouts.length, 1);
  assertEqual(result.workouts[0].name, 'Push');
  assertEqual(result.workouts[0].exercises[0].matchedExerciseId, 'back-squat');
  assertEqual(result.workouts[0].exercises[0].sets[0].setType, 'warmup');
  assertEqual(result.workouts[0].exercises[0].sets[1].setType, 'normal');
  assertEqual(result.workouts[0].exercises[0].sets[1].rpe, 8);
  assertEqual(Math.round((result.workouts[0].exercises[0].sets[1].weightKg ?? 0) * 10), 1021);
});

test('parseLogCsv reads FitNotes by date and keeps kilograms', () => {
  const csv = ['Date,Exercise,Category,Weight (kgs),Reps,Distance,Distance Unit,Time,Comment', '2026-10-20,Back Squat,Legs,100,5,,,,heavy'].join('\n');
  const result = parseLogCsv(csv, library);
  assertEqual(result.source, 'fitnotes');
  assertEqual(result.workouts[0].name, 'FitNotes');
  assertEqual(result.workouts[0].exercises[0].sets[0].weightKg, 100);
  assertEqual(result.workouts[0].exercises[0].notes, 'heavy');
});

test('parseLogCsv reads a Jefit row and creates an unmatched custom', () => {
  const csv = ['Date,Workout Name,Exercise Name,Set,Reps,Weight,Weight Unit,Notes', '2026-10-20,Arm day,Sit Up,1,15,0,kg,'].join('\n');
  const result = parseLogCsv(csv, library);
  assertEqual(result.source, 'jefit');
  assertEqual(result.workouts[0].exercises[0].matchedExerciseId, null);
  assertEqual(result.workouts[0].exercises[0].createCustom?.name, 'Sit Up');
  assertEqual(result.workouts[0].exercises[0].sets[0].reps, 15);
});
