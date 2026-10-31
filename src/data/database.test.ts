/**
 * Opening the saved log. A broken file must throw instead of becoming an empty log.
 */
import { CorruptLogError, loadStoredDocument, prepareWrite } from './database';
import { assertEqual, assertThrows, assertTrue, test } from '../domain/test-support';

test('a first launch is an empty log that still needs saving', () => {
  const loaded = loadStoredDocument(null);
  assertEqual(loaded.shouldPersist, true);
  assertEqual(loaded.database.settings.tutorialSeen, false);
  assertEqual(loaded.database.workouts.length, 0);
  assertTrue(loaded.database.exercises.some((exercise) => exercise.id === 'back-squat'), 'missing seeded squat');
});

test('an older log keeps its sets when newer fields are missing', () => {
  const raw = JSON.stringify({
    exercises: [],
    routineExercises: [],
    routines: [],
    sets: [{ completed: true, id: 's', position: 0, reps: 5, weightKg: 100, workoutExerciseId: 'we' }],
    settings: { weightUnit: 'kg' },
    workoutExercises: [{ exerciseId: 'back-squat', id: 'we', position: 0, workoutId: 'w' }],
    workouts: [{ finishedAt: 2, id: 'w', name: 'Push', routineId: null, startedAt: 1 }],
  });
  const loaded = loadStoredDocument(raw);
  assertEqual(loaded.database.workouts[0]?.name, 'Push');
  assertEqual(loaded.database.sets[0]?.weightKg, 100);
  assertEqual(loaded.database.sets[0]?.setType, 'normal');
  assertEqual(loaded.database.sets[0]?.rpe, null);
  assertEqual(loaded.database.routineSets, []);
  assertEqual(loaded.database.workoutExercises[0]?.notes, '');
  assertEqual(loaded.database.settings.tutorialSeen, true);
  assertEqual(loaded.shouldPersist, true);
});

test('a bad weight unit does not drop bodyweight', () => {
  const raw = JSON.stringify({
    exercises: [],
    routineExercises: [],
    routineSets: [],
    routines: [],
    sets: [],
    settings: { bodyweightKg: 80, weightUnit: 'stone' },
    workoutExercises: [],
    workouts: [],
  });
  const loaded = loadStoredDocument(raw);
  assertEqual(loaded.database.settings.weightUnit, 'kg');
  assertEqual(loaded.database.settings.bodyweightKg, 80);
});

test('an older log learns when its rows last changed', () => {
  const loaded = loadStoredDocument(olderLog());
  assertEqual(loaded.database.schemaVersion, 2);
  assertTrue(loaded.database.deviceId.length > 0, 'a device id is assigned once');
  assertEqual(loaded.database.workouts[0]?.updatedAt, 1);
  assertEqual(loaded.database.sets[0]?.updatedAt, 0);
  assertEqual(loaded.database.deletions, []);
  assertEqual(loaded.database.settings.settingsUpdatedAt.weightUnit, 0);
  assertEqual(loaded.database.settings.settingsUpdatedAt.tutorialSeen, 0);
});

test('a save stamps the row that changed and remembers a delete', () => {
  const loaded = loadStoredDocument(olderLog());
  const edited = prepareWrite(loaded.database, (db) => {
    const set = db.sets[0];
    if (set) {
      set.reps = 6;
    }
  }, 50);
  assertEqual(edited.sets[0]?.reps, 6);
  assertEqual(edited.sets[0]?.updatedAt, 50);
  assertEqual(edited.workouts[0]?.updatedAt, 1);
  assertEqual(edited.settings.settingsUpdatedAt.weightUnit, 0);

  const removed = prepareWrite(edited, (db) => {
    db.sets = [];
  }, 80);
  assertEqual(removed.sets, []);
  assertEqual(removed.deletions, [{ collection: 'sets', deletedAt: 80, id: 's' }]);

  const restored = prepareWrite(removed, (db) => {
    const set = edited.sets[0];
    if (set) {
      db.sets.push({ ...set });
    }
  }, 90);
  assertEqual(restored.deletions, []);
  assertEqual(restored.sets[0]?.updatedAt, 90);
});

test('a save stamps only the setting that changed', () => {
  const loaded = loadStoredDocument(olderLog());
  const next = prepareWrite(loaded.database, (db) => {
    db.settings.weightUnit = 'lb';
  }, 70);
  assertEqual(next.settings.weightUnit, 'lb');
  assertEqual(next.settings.settingsUpdatedAt.weightUnit, 70);
  assertEqual(next.settings.settingsUpdatedAt.bodyweightKg, 0);
  assertEqual(next.workouts[0]?.updatedAt, 1);
});

test('a field this version does not know survives a save', () => {
  const parsed = JSON.parse(olderLog()) as { cloudCursor?: string; sets: Array<{ plateCount?: number }> };
  parsed.cloudCursor = 'abc';
  parsed.sets[0].plateCount = 4;
  const loaded = loadStoredDocument(JSON.stringify(parsed));
  const written = prepareWrite(loaded.database, () => undefined, 5);
  assertEqual((written as { cloudCursor?: string }).cloudCursor, 'abc');
  assertEqual((written.sets[0] as { plateCount?: number }).plateCount, 4);
  assertEqual(written.sets[0]?.updatedAt, 0);
});

function olderLog(): string {
  return JSON.stringify({
    exercises: [],
    routineExercises: [],
    routines: [],
    sets: [{ completed: true, id: 's', position: 0, reps: 5, weightKg: 100, workoutExerciseId: 'we' }],
    settings: { weightUnit: 'kg' },
    workoutExercises: [{ exerciseId: 'back-squat', id: 'we', position: 0, workoutId: 'w' }],
    workouts: [{ finishedAt: 2, id: 'w', name: 'Push', routineId: null, startedAt: 1 }],
  });
}

test('a file that is not a log is left unread', () => {
  assertThrows(() => loadStoredDocument('{not json'), 'saved file');
  assertThrows(() => loadStoredDocument('{"hello":1}'), 'saved file');
  try {
    loadStoredDocument('{"hello":1}');
  } catch (error) {
    assertTrue(error instanceof CorruptLogError, 'expected a corrupt-log error');
  }
});
