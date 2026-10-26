import { parseLogCsv } from './log-import';
import { formatExportDuration, workoutsToCsv, type ExportWorkout } from './log-export';
import { assertEqual, test } from './test-support';

test('formatExportDuration uses Strong words', () => {
  const start = new Date(2026, 9, 26, 21, 28, 7).getTime();
  assertEqual(formatExportDuration(start, start + 25_000), '25s');
  assertEqual(formatExportDuration(start, start + 45 * 60_000), '45m');
  assertEqual(formatExportDuration(start, start + 62 * 60_000), '1h 2m');
});

test('workoutsToCsv round-trips through the Strong importer', () => {
  const startedAt = new Date(2026, 9, 26, 21, 28, 7).getTime();
  const workout: ExportWorkout = {
    exercises: [
      {
        name: 'Squat (Barbell)',
        notes: 'belt',
        restSeconds: 120,
        sets: [
          { completed: true, reps: 5, rpe: 8, setType: 'warmup', weightKg: 60 },
          { completed: true, reps: 1, rpe: null, setType: 'normal', weightKg: 158 },
          { completed: true, reps: 3, rpe: null, setType: 'drop', weightKg: 140 },
          { completed: false, reps: 5, rpe: null, setType: 'normal', weightKg: 100 },
        ],
      },
    ],
    finishedAt: startedAt + 25_000,
    name: 'Evening Workout',
    startedAt,
  };
  const csv = workoutsToCsv([workout]);
  assertEqual(csv.startsWith('Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE'), true);
  const parsed = parseLogCsv(csv, [{ equipment: 'Barbell', id: 'back-squat', isCustom: false, muscleGroup: 'Quads', name: 'Back Squat' }]);
  assertEqual(parsed.workouts.length, 1);
  assertEqual(parsed.workouts[0].name, 'Evening Workout');
  const sets = parsed.workouts[0].exercises[0].sets;
  assertEqual(sets.length, 3);
  assertEqual(sets[0].setType, 'warmup');
  assertEqual(sets[0].rpe, 8);
  assertEqual(sets[1].setType, 'normal');
  assertEqual(sets[1].weightKg, 158);
  assertEqual(sets[1].rpe, null);
  assertEqual(sets[2].setType, 'drop');
  assertEqual(parsed.workouts[0].exercises[0].notes, 'belt');
});
