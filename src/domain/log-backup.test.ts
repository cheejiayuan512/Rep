import { loadStoredDocument } from '../data/database';
import { backupFilename, encodeBackup, readBackupDocument } from './log-backup';
import { assertEqual, assertThrows, test } from './test-support';

test('a backup round-trips the log, including fields a spreadsheet drops', () => {
  const loaded = loadStoredDocument(
    JSON.stringify({
      cloudCursor: 'keep',
      exercises: [],
      routineExercises: [],
      routines: [],
      sets: [
        {
          completed: true,
          distanceKm: 5.25,
          durationSeconds: 1800,
          id: 's',
          plateCount: 4,
          position: 0,
          reps: null,
          weightKg: 8.75,
          workoutExerciseId: 'we',
        },
      ],
      settings: { weightUnit: 'kg' },
      workoutExercises: [{ attachment: 'Rope', exerciseId: 'face-pull', id: 'we', position: 0, workoutId: 'w' }],
      workouts: [{ finishedAt: 2, id: 'w', name: 'Push', routineId: null, startedAt: 1 }],
    }),
  );
  const file = encodeBackup(loaded.database, 50);
  const again = loadStoredDocument(readBackupDocument(file));
  const set = again.database.sets[0];
  assertEqual(set?.weightKg, 8.75);
  assertEqual(set?.distanceKm, 5.25);
  assertEqual(set?.durationSeconds, 1800);
  assertEqual((set as { plateCount?: number }).plateCount, 4);
  assertEqual(set?.updatedAt, 0);
  assertEqual(again.database.workouts[0]?.updatedAt, 1);
  assertEqual(again.database.workoutExercises[0]?.attachment, 'Rope');
  assertEqual((again.database as { cloudCursor?: string }).cloudCursor, 'keep');
  assertEqual(again.database.schemaVersion, loaded.database.schemaVersion);
});

test('a bare log file restores too', () => {
  const loaded = loadStoredDocument(
    JSON.stringify({
      exercises: [],
      routineExercises: [],
      routines: [],
      sets: [],
      settings: { weightUnit: 'lb' },
      workoutExercises: [],
      workouts: [],
    }),
  );
  const again = loadStoredDocument(readBackupDocument(JSON.stringify(loaded.database)));
  assertEqual(again.database.settings.weightUnit, 'lb');
  assertEqual(again.database.deviceId, loaded.database.deviceId);
});

test('a spreadsheet is not a backup', () => {
  assertThrows(() => readBackupDocument('Date,Workout Name\n'), 'not a Rep backup');
  assertThrows(() => readBackupDocument('{"format":"rep.backup"}'), 'not a Rep backup');
  assertThrows(() => readBackupDocument('{"format":"other","document":{}}'), 'not a Rep backup');
});

test('the backup filename uses the local day', () => {
  assertEqual(backupFilename(new Date(2026, 9, 31, 15, 0, 0).getTime()), 'Rep-backup-2026-10-31.json');
});
