/**
 * Opening the saved log. A broken file must throw instead of becoming an empty log.
 */
import { CorruptLogError, loadStoredDocument } from './database';
import { assertEqual, assertThrows, assertTrue, test } from '../domain/test-support';

test('a first launch is an empty log that still needs saving', () => {
  const loaded = loadStoredDocument(null);
  assertEqual(loaded.shouldPersist, true);
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

test('a file that is not a log is left unread', () => {
  assertThrows(() => loadStoredDocument('{not json'), 'saved file');
  assertThrows(() => loadStoredDocument('{"hello":1}'), 'saved file');
  try {
    loadStoredDocument('{"hello":1}');
  } catch (error) {
    assertTrue(error instanceof CorruptLogError, 'expected a corrupt-log error');
  }
});
