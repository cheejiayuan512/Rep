/**
 * Every load and save the screens are allowed to do: settings, the exercise
 * library, routines, and workouts. This file turns the raw saved document
 * into the shapes declared in src/domain/types.ts.
 */
import { parseHevyCsv } from '../domain/hevy-import';
import { buildProfile, type ProfileSnapshot, type ProfileWorkout } from '../domain/profile';
import { estimateOneRepMax, latestSessionSets, oneRepMaxRecordFlags, scoreLoggedSet } from '../domain/metrics';
import type { AnalysisInput, AnalysisSet } from '../domain/stats';
import { createId } from '../domain/ids';
import type {
  ActiveWorkoutSummary,
  Equipment,
  Exercise,
  LoggedSet,
  MuscleGroup,
  PreviousSet,
  RoutineDetail,
  RoutineSummary,
  SetRecord,
  SetType,
  TrainedExercise,
  WeightUnit,
  WorkoutDetail,
  WorkoutExercise,
  WorkoutSummary,
} from '../domain/types';
import { isEquipment, isMuscleGroup } from '../domain/types';
import { isCommitted, readDatabase, writeDatabase, type DatabaseShape, type StoredExercise, type StoredSet, type StoredWorkout, type StoredWorkoutExercise } from './database';

export interface HevyImportSummary {
  importedWorkouts: number;
  skippedDuplicates: number;
  createdExercises: number;
  skippedCardioRows: number;
}

export interface AppSettings {
  weightUnit: WeightUnit;
  restSeconds: number;
}

export interface NewSetInput {
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
}

// Settings: kg/lb and the default rest length.

export async function getSettings(): Promise<AppSettings> {
  const db = await readDatabase();
  return {
    restSeconds: clampRest(db.settings.restSeconds),
    weightUnit: db.settings.weightUnit,
  };
}

export async function saveWeightUnit(unit: WeightUnit): Promise<void> {
  await writeDatabase((db) => {
    db.settings.weightUnit = unit;
  });
}

export async function saveRestSeconds(seconds: number): Promise<void> {
  await writeDatabase((db) => {
    db.settings.restSeconds = clampRest(seconds);
  });
}

// The exercise library: built-in moves plus ones you create.

export async function listExercises(query: string, muscleGroup: MuscleGroup | null): Promise<Exercise[]> {
  const db = await readDatabase();
  const needle = query.trim().toLowerCase();
  return db.exercises
    .filter((exercise) => (needle.length === 0 || exercise.name.toLowerCase().includes(needle)) && (muscleGroup == null || exercise.muscleGroup === muscleGroup))
    .sort((left, right) => Number(right.isCustom) - Number(left.isCustom) || left.name.localeCompare(right.name))
    .map(mapExercise);
}

export async function createExercise(input: { name: string; muscleGroup: MuscleGroup; equipment: Equipment }): Promise<Exercise> {
  const exercise: Exercise = {
    equipment: input.equipment,
    id: createId(),
    isCustom: true,
    muscleGroup: input.muscleGroup,
    name: input.name.trim(),
  };
  await writeDatabase((db) => {
    db.exercises.push(exercise);
  });
  return exercise;
}

export async function updateExercise(exerciseId: string, input: { name: string; muscleGroup: MuscleGroup; equipment: Equipment }): Promise<void> {
  const name = input.name.trim();
  if (name.length < 2) {
    throw new Error('Give the exercise a name.');
  }
  await writeDatabase((db) => {
    if (db.exercises.some((item) => item.id !== exerciseId && item.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('Another exercise already has that name.');
    }
    const exercise = db.exercises.find((item) => item.id === exerciseId);
    if (!exercise) {
      throw new Error('Exercise not found.');
    }
    exercise.name = name;
    exercise.muscleGroup = input.muscleGroup;
    exercise.equipment = input.equipment;
  });
}

/** How often an exercise is used, so the editor can explain why it cannot be deleted. */
export async function getExerciseUsage(exerciseId: string): Promise<{ workouts: number; routines: number }> {
  const db = await readDatabase();
  const rows = indexOf(db).rowsByExercise.get(exerciseId) ?? [];
  return {
    routines: new Set(db.routineExercises.filter((item) => item.exerciseId === exerciseId).map((item) => item.routineId)).size,
    workouts: new Set(rows.map((row) => row.workoutId)).size,
  };
}

export async function deleteCustomExercise(exerciseId: string): Promise<'deleted' | 'in-use' | 'missing'> {
  const db = await readDatabase();
  const exercise = db.exercises.find((item) => item.id === exerciseId);
  if (!exercise?.isCustom) {
    return 'missing';
  }
  const inUse = db.workoutExercises.some((item) => item.exerciseId === exerciseId) || db.routineExercises.some((item) => item.exerciseId === exerciseId);
  if (inUse) {
    return 'in-use';
  }
  await writeDatabase((draft) => {
    draft.exercises = draft.exercises.filter((item) => item.id !== exerciseId);
  });
  return 'deleted';
}

// Routines: a named list of exercises you can start again later.

export async function listRoutines(): Promise<RoutineSummary[]> {
  const db = await readDatabase();
  return [...db.routines]
    .sort((left, right) => right.createdAt - left.createdAt)
    .map((routine) => ({
      exerciseNames: routineExerciseRows(db, routine.id).map((exercise) => exerciseName(db, exercise.exerciseId)),
      id: routine.id,
      name: routine.name,
    }));
}

export async function getRoutine(routineId: string): Promise<RoutineDetail | null> {
  const db = await readDatabase();
  const routine = db.routines.find((item) => item.id === routineId);
  if (!routine) {
    return null;
  }
  return {
    exercises: routineExerciseRows(db, routine.id).map((exercise) => {
      const details = requireExercise(db, exercise.exerciseId);
      return {
        equipment: details.equipment,
        exerciseId: exercise.exerciseId,
        id: exercise.id,
        muscleGroup: details.muscleGroup,
        name: details.name,
        position: exercise.position,
      };
    }),
    id: routine.id,
    name: routine.name,
  };
}

export async function createRoutine(name: string): Promise<string> {
  const id = createId();
  await writeDatabase((db) => {
    db.routines.push({ createdAt: Date.now(), id, name: name.trim() || 'New routine' });
  });
  return id;
}

export async function renameRoutine(routineId: string, name: string): Promise<void> {
  await writeDatabase((db) => {
    const routine = db.routines.find((item) => item.id === routineId);
    if (routine) {
      routine.name = name.trim() || 'New routine';
    }
  });
}

export async function deleteRoutine(routineId: string): Promise<void> {
  await writeDatabase((db) => {
    db.routineExercises = db.routineExercises.filter((exercise) => exercise.routineId !== routineId);
    db.routines = db.routines.filter((routine) => routine.id !== routineId);
  });
}

export async function addExerciseToRoutine(routineId: string, exerciseId: string): Promise<void> {
  await writeDatabase((db) => {
    const rows = db.routineExercises.filter((exercise) => exercise.routineId === routineId);
    if (rows.some((exercise) => exercise.exerciseId === exerciseId)) {
      return;
    }
    const position = nextPosition(rows);
    db.routineExercises.push({ exerciseId, id: createId(), position, routineId });
  });
}

export async function removeRoutineExercise(routineExerciseId: string): Promise<void> {
  await writeDatabase((db) => {
    db.routineExercises = db.routineExercises.filter((exercise) => exercise.id !== routineExerciseId);
  });
}

export async function saveRoutinePositions(rows: Array<{ id: string; position: number }>): Promise<void> {
  await writeDatabase((db) => {
    for (const row of rows) {
      const exercise = db.routineExercises.find((item) => item.id === row.id);
      if (exercise) {
        exercise.position = row.position;
      }
    }
  });
}

// Workouts: start one, edit its sets, then finish or discard it.

export async function getInProgressWorkoutId(): Promise<string | null> {
  const db = await readDatabase();
  const active = db.workouts
    .filter((workout) => workout.finishedAt == null)
    .sort((left, right) => right.startedAt - left.startedAt)[0];
  return active?.id ?? null;
}

export async function getActiveWorkoutSummary(workoutId: string): Promise<ActiveWorkoutSummary | null> {
  const db = await readDatabase();
  const workout = db.workouts.find((item) => item.id === workoutId && item.finishedAt == null);
  if (!workout) {
    return null;
  }
  return {
    exerciseCount: db.workoutExercises.filter((exercise) => exercise.workoutId === workout.id).length,
    id: workout.id,
    name: workout.name,
    startedAt: workout.startedAt,
  };
}

export async function startEmptyWorkout(): Promise<string> {
  const id = createId();
  await writeDatabase((db) => {
    db.workouts.push({ finishedAt: null, id, name: 'Workout', routineId: null, startedAt: Date.now() });
  });
  return id;
}

export async function startWorkoutFromRoutine(routineId: string): Promise<string> {
  const workoutId = createId();
  let found = false;
  await writeDatabase((db) => {
    const routine = db.routines.find((item) => item.id === routineId);
    if (!routine) {
      return;
    }
    found = true;
    const exercises = routineExerciseRows(db, routine.id);
    db.workouts.push({ finishedAt: null, id: workoutId, name: routine.name, routineId: routine.id, startedAt: Date.now() });
    exercises.forEach((exercise, index) => {
      const workoutExerciseId = createId();
      db.workoutExercises.push({ exerciseId: exercise.exerciseId, id: workoutExerciseId, notes: '', position: index, restSeconds: lastRestFor(db, exercise.exerciseId), workoutId });
      addTemplateSets(db, workoutExerciseId, latestSessionSets(historyFor(db, [exercise.exerciseId], workoutId)[exercise.exerciseId] ?? []));
    });
  });
  if (!found) {
    throw new Error('Routine not found.');
  }
  return workoutId;
}

export async function getWorkout(workoutId: string): Promise<WorkoutDetail | null> {
  const db = await readDatabase();
  const workout = db.workouts.find((item) => item.id === workoutId);
  if (!workout) {
    return null;
  }
  const exercises = workoutExerciseRows(db, workout.id).map((row) => toWorkoutExercise(db, row, workout.id));
  return {
    exercises,
    finishedAt: workout.finishedAt,
    id: workout.id,
    name: workout.name,
    routineId: workout.routineId,
    startedAt: workout.startedAt,
  };
}

export async function getExercise(exerciseId: string): Promise<Exercise | null> {
  const db = await readDatabase();
  const exercise = db.exercises.find((item) => item.id === exerciseId);
  return exercise ? mapExercise(exercise) : null;
}

export async function listWorkoutSummaries(): Promise<WorkoutSummary[]> {
  const db = await readDatabase();
  const records = recordsByWorkout(db);
  return db.workouts
    .filter((workout) => workout.finishedAt != null)
    .sort((left, right) => (right.finishedAt ?? 0) - (left.finishedAt ?? 0))
    .map((workout) => {
      const rows = workoutExerciseRows(db, workout.id);
      const working = workingSets(db, workout.id);
      return {
        exerciseNames: rows.map((exercise) => exerciseName(db, exercise.exerciseId)),
        exercises: rows.map((row) => {
          const sets = setsOf(db, row.id).filter((set) => set.completed && set.setType !== 'warmup');
          return { best: bestSet(sets), name: exerciseName(db, row.exerciseId), sets: sets.length };
        }),
        finishedAt: workout.finishedAt ?? workout.startedAt,
        id: workout.id,
        name: workout.name,
        recordCount: records.get(workout.id) ?? 0,
        setCount: working.length,
        startedAt: workout.startedAt,
        volumeKg: working.reduce((sum, set) => sum + (set.weightKg ?? 0) * (set.reps ?? 0), 0),
      };
    });
}

/** Everything the Analysis screen needs: finished workouts and their working sets. */
export async function getAnalysisInput(): Promise<AnalysisInput> {
  const db = await readDatabase();
  const summaries = await listWorkoutSummaries();
  const sets: AnalysisSet[] = [];
  for (const workout of db.workouts) {
    if (workout.finishedAt == null) {
      continue;
    }
    for (const row of workoutExerciseRows(db, workout.id)) {
      const exercise = requireExercise(db, row.exerciseId);
      for (const set of setsOf(db, row.id)) {
        if (!isWorkingSet(set)) {
          continue;
        }
        sets.push({
          exerciseId: row.exerciseId,
          exerciseName: exercise.name,
          muscleGroup: exercise.muscleGroup,
          performedAt: workout.finishedAt,
          reps: set.reps ?? 0,
          rpe: typeof set.rpe === 'number' ? set.rpe : null,
          weightKg: set.weightKg ?? 0,
          workoutId: workout.id,
        });
      }
    }
  }
  return { sets, workouts: summaries };
}

function bestSet(sets: StoredSet[]): { weightKg: number; reps: number } | null {
  let best: { weightKg: number; reps: number; score: number } | null = null;
  for (const set of sets) {
    const reps = set.reps ?? 0;
    if (reps <= 0) {
      continue;
    }
    const weightKg = set.weightKg ?? 0;
    // Weighted sets rank by estimated 1RM; bodyweight sets (score by reps) only win when nothing was weighted.
    const score = weightKg > 0 ? 1000 + estimateOneRepMax(weightKg, reps) : reps;
    if (!best || score > best.score) {
      best = { reps, score, weightKg };
    }
  }
  return best ? { reps: best.reps, weightKg: best.weightKg } : null;
}

const recordCache = new WeakMap<DatabaseShape, Map<string, number>>();

/** Per finished workout, how many of its sets beat an earlier estimated 1RM for the same exercise. */
function recordsByWorkout(db: DatabaseShape): Map<string, number> {
  const cached = recordCache.get(db);
  if (cached) {
    return cached;
  }
  const counts = new Map<string, number>();
  for (const exerciseId of indexOf(db).rowsByExercise.keys()) {
    const history = (historyFor(db, [exerciseId], '')[exerciseId] ?? []).flatMap((set) => {
      const scored = scoreLoggedSet(set);
      return scored ? [{ scored, workoutId: set.workoutId }] : [];
    });
    oneRepMaxRecordFlags(history.map((item) => item.scored)).forEach((beat, position) => {
      const workoutId = history[position]?.workoutId;
      if (beat && workoutId) {
        counts.set(workoutId, (counts.get(workoutId) ?? 0) + 1);
      }
    });
  }
  if (isCommitted(db)) {
    recordCache.set(db, counts);
  }
  return counts;
}

export async function addExerciseToWorkout(workoutId: string, exerciseId: string): Promise<void> {
  await writeDatabase((db) => {
    if (!db.exercises.some((exercise) => exercise.id === exerciseId)) {
      throw new Error('Exercise not found.');
    }
    const rows = db.workoutExercises.filter((exercise) => exercise.workoutId === workoutId);
    if (rows.some((exercise) => exercise.exerciseId === exerciseId)) {
      return;
    }
    const position = nextPosition(rows);
    const workoutExerciseId = createId();
    db.workoutExercises.push({ exerciseId, id: workoutExerciseId, notes: '', position, restSeconds: lastRestFor(db, exerciseId), workoutId });
    addTemplateSets(db, workoutExerciseId, latestSessionSets(historyFor(db, [exerciseId], workoutId)[exerciseId] ?? []));
  });
}

/** Library exercise ids already in a workout or routine, for the picker's add/remove toggle. */
export async function listTargetExerciseIds(target: { workoutId: string } | { routineId: string }): Promise<string[]> {
  const db = await readDatabase();
  const rows = 'workoutId' in target ? workoutExerciseRows(db, target.workoutId) : routineExerciseRows(db, target.routineId);
  return rows.map((row) => row.exerciseId);
}

/**
 * Takes an exercise back out of a workout from the picker. An exercise with a
 * completed set stays, so a stray tap cannot throw away logged work.
 */
export async function removeExerciseFromWorkout(workoutId: string, exerciseId: string): Promise<'removed' | 'has-sets'> {
  let result: 'removed' | 'has-sets' = 'removed';
  await writeDatabase((db) => {
    const rows = db.workoutExercises.filter((exercise) => exercise.workoutId === workoutId && exercise.exerciseId === exerciseId);
    const rowIds = new Set(rows.map((row) => row.id));
    if (db.sets.some((set) => rowIds.has(set.workoutExerciseId) && set.completed)) {
      result = 'has-sets';
      return;
    }
    db.sets = db.sets.filter((set) => !rowIds.has(set.workoutExerciseId));
    db.workoutExercises = db.workoutExercises.filter((exercise) => !rowIds.has(exercise.id));
  });
  return result;
}

export async function removeExerciseFromRoutine(routineId: string, exerciseId: string): Promise<void> {
  await writeDatabase((db) => {
    db.routineExercises = db.routineExercises.filter((exercise) => exercise.routineId !== routineId || exercise.exerciseId !== exerciseId);
  });
}

/** Starts a new workout with the same exercises, notes, rest, and set numbers. Nothing is checked off. */
export async function duplicateWorkout(workoutId: string): Promise<string> {
  const id = createId();
  let found = false;
  await writeDatabase((db) => {
    const source = db.workouts.find((workout) => workout.id === workoutId);
    if (!source) {
      return;
    }
    found = true;
    db.workouts.push({ finishedAt: null, id, name: source.name, routineId: source.routineId, startedAt: Date.now() });
    workoutExerciseRows(db, source.id).forEach((row, index) => {
      const workoutExerciseId = createId();
      db.workoutExercises.push({ exerciseId: row.exerciseId, id: workoutExerciseId, notes: row.notes, position: index, restSeconds: row.restSeconds, workoutId: id });
      db.sets
        .filter((set) => set.workoutExerciseId === row.id)
        .sort((left, right) => left.position - right.position)
        .forEach((set, position) => {
          db.sets.push({ completed: false, id: createId(), position, reps: set.reps, rpe: null, setType: set.setType, weightKg: set.weightKg, workoutExerciseId });
        });
    });
  });
  if (!found) {
    throw new Error('Workout not found.');
  }
  return id;
}

export async function insertSet(workoutExerciseId: string, input: NewSetInput): Promise<SetRecord> {
  const created: StoredSet = {
    completed: false,
    id: createId(),
    position: 0,
    reps: input.reps,
    rpe: input.rpe,
    setType: input.setType,
    weightKg: input.weightKg,
    workoutExerciseId,
  };
  await writeDatabase((db) => {
    created.position = nextPosition(db.sets.filter((set) => set.workoutExerciseId === workoutExerciseId));
    db.sets.push({ ...created });
  });
  return mapSet(created);
}

export async function updateSetNumbers(setId: string, weightKg: number | null, reps: number | null, rpe: number | null): Promise<void> {
  await writeDatabase((db) => {
    const set = db.sets.find((item) => item.id === setId);
    if (set) {
      set.weightKg = weightKg;
      set.reps = reps;
      set.rpe = rpe;
    }
  });
}

export async function updateSetCompleted(setId: string, completed: boolean, weightKg: number | null, reps: number | null, rpe: number | null): Promise<void> {
  await writeDatabase((db) => {
    const set = db.sets.find((item) => item.id === setId);
    if (set) {
      set.completed = completed;
      set.weightKg = weightKg;
      set.reps = reps;
      set.rpe = rpe;
    }
  });
}

export async function updateWorkoutExerciseNotes(workoutExerciseId: string, notes: string): Promise<void> {
  await writeDatabase((db) => {
    const exercise = db.workoutExercises.find((item) => item.id === workoutExerciseId);
    if (exercise) {
      exercise.notes = notes.slice(0, 500);
    }
  });
}

export async function updateSetType(setId: string, setType: SetType): Promise<void> {
  await writeDatabase((db) => {
    const set = db.sets.find((item) => item.id === setId);
    if (set) {
      set.setType = setType;
    }
  });
}

export async function deleteSet(setId: string): Promise<void> {
  await writeDatabase((db) => {
    db.sets = db.sets.filter((set) => set.id !== setId);
  });
}

/** Puts a deleted set back at `index` among its exercise's sets. */
export async function restoreSet(workoutExerciseId: string, set: SetRecord, index: number): Promise<void> {
  await writeDatabase((db) => {
    if (!db.workoutExercises.some((exercise) => exercise.id === workoutExerciseId) || db.sets.some((item) => item.id === set.id)) {
      return;
    }
    const siblings = db.sets.filter((item) => item.workoutExerciseId === workoutExerciseId).sort((left, right) => left.position - right.position);
    const restored: StoredSet = { ...set, workoutExerciseId };
    siblings.splice(Math.min(index, siblings.length), 0, restored);
    siblings.forEach((item, position) => {
      item.position = position;
    });
    db.sets.push(restored);
  });
}

export async function updateWorkoutExerciseRest(workoutExerciseId: string, restSeconds: number | null): Promise<void> {
  await writeDatabase((db) => {
    const exercise = db.workoutExercises.find((item) => item.id === workoutExerciseId);
    if (exercise) {
      exercise.restSeconds = restSeconds == null ? null : clampRest(restSeconds);
    }
  });
}

export async function removeWorkoutExercise(workoutExerciseId: string): Promise<void> {
  await writeDatabase((db) => {
    db.sets = db.sets.filter((set) => set.workoutExerciseId !== workoutExerciseId);
    db.workoutExercises = db.workoutExercises.filter((exercise) => exercise.id !== workoutExerciseId);
  });
}

/** Puts a removed exercise and its sets back at `index` in the workout. */
export async function restoreWorkoutExercise(workoutId: string, exercise: WorkoutExercise, index: number): Promise<void> {
  await writeDatabase((db) => {
    if (!db.workouts.some((workout) => workout.id === workoutId) || db.workoutExercises.some((item) => item.id === exercise.id)) {
      return;
    }
    const rows = workoutExerciseRows(db, workoutId);
    const restored: StoredWorkoutExercise = {
      exerciseId: exercise.exerciseId,
      id: exercise.id,
      notes: exercise.notes,
      position: 0,
      restSeconds: exercise.restSeconds,
      workoutId,
    };
    rows.splice(Math.min(index, rows.length), 0, restored);
    rows.forEach((row, position) => {
      row.position = position;
    });
    db.workoutExercises.push(restored);
    exercise.sets.forEach((set, position) => {
      db.sets.push({ ...set, position, workoutExerciseId: exercise.id });
    });
  });
}

export async function saveWorkoutExercisePositions(rows: Array<{ id: string; position: number }>): Promise<void> {
  await writeDatabase((db) => {
    for (const row of rows) {
      const exercise = db.workoutExercises.find((item) => item.id === row.id);
      if (exercise) {
        exercise.position = row.position;
      }
    }
  });
}

export async function renameWorkout(workoutId: string, name: string): Promise<void> {
  await writeDatabase((db) => {
    const workout = db.workouts.find((item) => item.id === workoutId);
    if (workout) {
      workout.name = name.trim() || 'Workout';
    }
  });
}

export async function finishWorkout(workoutId: string): Promise<void> {
  await writeDatabase((db) => {
    const workout = db.workouts.find((item) => item.id === workoutId && item.finishedAt == null);
    if (workout) {
      workout.finishedAt = Date.now();
    }
  });
}

export async function discardWorkout(workoutId: string): Promise<void> {
  await deleteWorkout(workoutId);
}

export async function deleteWorkout(workoutId: string): Promise<void> {
  await writeDatabase((db) => {
    const exerciseIds = new Set(db.workoutExercises.filter((exercise) => exercise.workoutId === workoutId).map((exercise) => exercise.id));
    db.sets = db.sets.filter((set) => !exerciseIds.has(set.workoutExerciseId));
    db.workoutExercises = db.workoutExercises.filter((exercise) => exercise.workoutId !== workoutId);
    db.workouts = db.workouts.filter((workout) => workout.id !== workoutId);
  });
}

export async function importHevyCsv(csvText: string): Promise<HevyImportSummary> {
  const db = await readDatabase();
  const parsed = parseHevyCsv(
    csvText,
    db.exercises.map((exercise) => ({
      equipment: isEquipment(exercise.equipment) ? exercise.equipment : 'Other',
      id: exercise.id,
      isCustom: exercise.isCustom,
      muscleGroup: isMuscleGroup(exercise.muscleGroup) ? exercise.muscleGroup : 'Full body',
      name: exercise.name,
    })),
  );

  let importedWorkouts = 0;
  let skippedDuplicates = 0;
  let createdExercises = 0;

  await writeDatabase((draft) => {
    const existingKeys = new Set(draft.workouts.map((workout) => `${workout.name}\0${workout.startedAt}`));
    const exerciseIdsByName = new Map(draft.exercises.map((exercise) => [exercise.name.toLowerCase(), exercise.id]));

    for (const workout of parsed.workouts) {
      const key = `${workout.name}\0${workout.startedAt}`;
      if (existingKeys.has(key)) {
        skippedDuplicates += 1;
        continue;
      }

      const workoutId = createId();
      draft.workouts.push({
        finishedAt: workout.finishedAt,
        id: workoutId,
        name: workout.name,
        routineId: null,
        startedAt: workout.startedAt,
      });
      existingKeys.add(key);
      importedWorkouts += 1;

      for (const exercise of workout.exercises) {
        let exerciseId = exercise.matchedExerciseId;
        if (!exerciseId && exercise.createCustom) {
          const existingCustom = exerciseIdsByName.get(exercise.createCustom.name.toLowerCase());
          if (existingCustom) {
            exerciseId = existingCustom;
          } else {
            exerciseId = createId();
            draft.exercises.push({
              equipment: exercise.createCustom.equipment,
              id: exerciseId,
              isCustom: true,
              muscleGroup: exercise.createCustom.muscleGroup,
              name: exercise.createCustom.name,
            });
            exerciseIdsByName.set(exercise.createCustom.name.toLowerCase(), exerciseId);
            createdExercises += 1;
          }
        }
        if (!exerciseId) {
          continue;
        }

        const workoutExerciseId = createId();
        const notes =
          exercise.position === 0 && workout.description
            ? [workout.description, exercise.notes].filter((part) => part.trim().length > 0).join('\n').slice(0, 500)
            : exercise.notes.slice(0, 500);
        draft.workoutExercises.push({
          exerciseId,
          id: workoutExerciseId,
          notes,
          position: exercise.position,
          restSeconds: null,
          workoutId,
        });

        for (const set of exercise.sets) {
          draft.sets.push({
            completed: set.completed,
            id: createId(),
            position: set.position,
            reps: set.reps,
            rpe: set.rpe,
            setType: set.setType,
            weightKg: set.weightKg,
            workoutExerciseId,
          });
        }
      }
    }
  });

  return {
    createdExercises,
    importedWorkouts,
    skippedCardioRows: parsed.skippedCardioRows,
    skippedDuplicates,
  };
}

// History and progress: finished workouts and the sets that count.

export async function getProfile(now = Date.now()): Promise<ProfileSnapshot> {
  const db = await readDatabase();
  const workouts: ProfileWorkout[] = db.workouts
    .filter((workout) => workout.finishedAt != null)
    .map((workout) => {
      const exercises = workoutExerciseRows(db, workout.id);
      const sets = exercises.flatMap((exercise) => setsOf(db, exercise.id));
      const working = sets.filter(isWorkingSet);
      const heaviestKg = working.reduce((max, set) => Math.max(max, set.weightKg ?? 0), 0);
      return {
        exerciseIds: [...new Set(exercises.filter((exercise) => working.some((set) => set.workoutExerciseId === exercise.id)).map((exercise) => exercise.exerciseId))],
        finishedAt: workout.finishedAt ?? workout.startedAt,
        heaviestKg,
        id: workout.id,
        name: workout.name,
        notedExercises: exercises.filter((exercise) => exercise.notes.trim().length > 0).length,
        reps: working.reduce((total, set) => total + (set.reps ?? 0), 0),
        startedAt: workout.startedAt,
        volumeKg: working.reduce((total, set) => total + (set.weightKg ?? 0) * (set.reps ?? 0), 0),
        warmupSets: sets.filter((set) => set.completed && set.setType === 'warmup').length,
        workingSets: working.length,
      };
    });

  let recordCount = 0;
  for (const count of recordsByWorkout(db).values()) {
    recordCount += count;
  }
  return buildProfile({
    customExerciseCount: db.exercises.filter((exercise) => exercise.isCustom).length,
    now,
    recordCount,
    workouts,
  });
}

export async function listTrainedExercises(): Promise<TrainedExercise[]> {
  const db = await readDatabase();
  const latest = new Map<string, number>();
  for (const workout of db.workouts) {
    if (workout.finishedAt == null) {
      continue;
    }
    for (const exercise of workoutExerciseRows(db, workout.id)) {
      const trained = setsOf(db, exercise.id).some(isWorkingSet);
      if (!trained) {
        continue;
      }
      latest.set(exercise.exerciseId, Math.max(latest.get(exercise.exerciseId) ?? 0, workout.finishedAt));
    }
  }

  return [...latest.entries()]
    .map(([exerciseId, lastPerformedAt]) => {
      const exercise = requireExercise(db, exerciseId);
      return { id: exerciseId, lastPerformedAt, muscleGroup: exercise.muscleGroup, name: exercise.name };
    })
    .sort((left, right) => right.lastPerformedAt - left.lastPerformedAt);
}

export async function getExerciseLog(exerciseId: string): Promise<LoggedSet[]> {
  const db = await readDatabase();
  return historyFor(db, [exerciseId], '')[exerciseId] ?? [];
}

/** Finished sets from other workouts. With `before`, only workouts started earlier count, so an edited past session compares against its own past. */
export async function getHistorySets(exerciseIds: string[], excludeWorkoutId: string, before?: number): Promise<Record<string, LoggedSet[]>> {
  const db = await readDatabase();
  const history = historyFor(db, exerciseIds, excludeWorkoutId);
  if (before == null) {
    return history;
  }
  const earlier = new Set(db.workouts.filter((workout) => workout.startedAt < before).map((workout) => workout.id));
  return Object.fromEntries(Object.entries(history).map(([exerciseId, sets]) => [exerciseId, sets.filter((set) => earlier.has(set.workoutId))]));
}

function historyFor(db: DatabaseShape, exerciseIds: string[], excludeWorkoutId: string): Record<string, LoggedSet[]> {
  const grouped: Record<string, LoggedSet[]> = {};
  for (const exerciseId of exerciseIds) {
    grouped[exerciseId] = [];
  }
  const index = indexOf(db);
  const rows = [...new Set(exerciseIds)].flatMap((exerciseId) => index.rowsByExercise.get(exerciseId) ?? []);
  for (const exercise of rows) {
    if (exercise.workoutId === excludeWorkoutId) {
      continue;
    }
    const workout = index.workoutsById.get(exercise.workoutId);
    if (!workout || workout.finishedAt == null) {
      continue;
    }
    const bucket = grouped[exercise.exerciseId] ?? [];
    for (const set of setsOf(db, exercise.id)) {
      bucket.push({
        completed: set.completed,
        exerciseId: exercise.exerciseId,
        performedAt: workout.finishedAt,
        position: set.position,
        reps: set.reps,
        setType: set.setType,
        weightKg: set.weightKg,
        workoutId: workout.id,
      });
    }
    grouped[exercise.exerciseId] = bucket;
  }
  for (const exerciseId of exerciseIds) {
    grouped[exerciseId]?.sort((left, right) => left.performedAt - right.performedAt || left.position - right.position);
  }
  return grouped;
}

function addTemplateSets(db: DatabaseShape, workoutExerciseId: string, previous: LoggedSet[]): void {
  const templates = previous.length > 0 ? previous.slice(0, 10) : [null];
  templates.forEach((template, index) => {
    db.sets.push({
      completed: false,
      id: createId(),
      position: index,
      reps: template?.reps ?? null,
      rpe: null,
      setType: template?.setType ?? 'normal',
      weightKg: template?.weightKg ?? null,
      workoutExerciseId,
    });
  });
}

function toWorkoutExercise(db: DatabaseShape, row: StoredWorkoutExercise, workoutId: string): WorkoutExercise {
  const exercise = requireExercise(db, row.exerciseId);
  const previous = latestSessionSets(historyFor(db, [row.exerciseId], workoutId)[row.exerciseId] ?? []).map(toPrevious);
  const sets = setsOf(db, row.id).map(mapSet);
  return {
    equipment: exercise.equipment,
    exerciseId: row.exerciseId,
    id: row.id,
    muscleGroup: exercise.muscleGroup,
    name: exercise.name,
    notes: row.notes ?? '',
    position: row.position,
    previousSets: previous,
    restSeconds: row.restSeconds ?? null,
    sets,
  };
}

/** The rest picked for this exercise in the latest workout that set one. */
function lastRestFor(db: DatabaseShape, exerciseId: string): number | null {
  const index = indexOf(db);
  let latest: { at: number; rest: number } | null = null;
  for (const row of index.rowsByExercise.get(exerciseId) ?? []) {
    const at = index.workoutsById.get(row.workoutId)?.startedAt;
    if (row.restSeconds == null || at == null) {
      continue;
    }
    if (!latest || at > latest.at) {
      latest = { at, rest: row.restSeconds };
    }
  }
  return latest?.rest ?? null;
}

interface DbIndex {
  exercisesById: Map<string, StoredExercise>;
  workoutsById: Map<string, StoredWorkout>;
  rowsByWorkout: Map<string, StoredWorkoutExercise[]>;
  rowsByExercise: Map<string, StoredWorkoutExercise[]>;
  setsByRow: Map<string, StoredSet[]>;
}

const indexCache = new WeakMap<DatabaseShape, DbIndex>();

/**
 * Lookup maps so a log with hundreds of workouts is not scanned once per row.
 * Cached only for committed documents; a draft inside a write is still changing.
 */
function indexOf(db: DatabaseShape): DbIndex {
  const cached = indexCache.get(db);
  if (cached) {
    return cached;
  }
  const index: DbIndex = {
    exercisesById: new Map(db.exercises.map((exercise) => [exercise.id, exercise])),
    rowsByExercise: groupBy(db.workoutExercises, (row) => row.exerciseId),
    rowsByWorkout: groupBy(db.workoutExercises, (row) => row.workoutId),
    setsByRow: groupBy(db.sets, (set) => set.workoutExerciseId),
    workoutsById: new Map(db.workouts.map((workout) => [workout.id, workout])),
  };
  for (const rows of index.rowsByWorkout.values()) {
    rows.sort((left, right) => left.position - right.position);
  }
  for (const sets of index.setsByRow.values()) {
    sets.sort((left, right) => left.position - right.position);
  }
  if (isCommitted(db)) {
    indexCache.set(db, index);
  }
  return index;
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const id = key(item);
    const group = groups.get(id);
    if (group) {
      group.push(item);
    } else {
      groups.set(id, [item]);
    }
  }
  return groups;
}

function setsOf(db: DatabaseShape, workoutExerciseId: string): StoredSet[] {
  return indexOf(db).setsByRow.get(workoutExerciseId) ?? [];
}

function isWorkingSet(set: StoredSet): boolean {
  return set.completed && set.setType !== 'warmup' && (set.reps ?? 0) > 0;
}

function workingSets(db: DatabaseShape, workoutId: string): StoredSet[] {
  return workoutExerciseRows(db, workoutId).flatMap((row) => setsOf(db, row.id).filter((set) => set.completed && set.setType !== 'warmup'));
}

function routineExerciseRows(db: DatabaseShape, routineId: string) {
  return db.routineExercises.filter((exercise) => exercise.routineId === routineId).sort((left, right) => left.position - right.position);
}

function workoutExerciseRows(db: DatabaseShape, workoutId: string): StoredWorkoutExercise[] {
  return [...(indexOf(db).rowsByWorkout.get(workoutId) ?? [])];
}

function exerciseName(db: DatabaseShape, exerciseId: string): string {
  return indexOf(db).exercisesById.get(exerciseId)?.name ?? 'Exercise';
}

function requireExercise(db: DatabaseShape, exerciseId: string): { name: string; muscleGroup: MuscleGroup; equipment: Equipment } {
  const exercise = indexOf(db).exercisesById.get(exerciseId);
  return {
    equipment: exercise && isEquipment(exercise.equipment) ? exercise.equipment : 'Other',
    muscleGroup: exercise && isMuscleGroup(exercise.muscleGroup) ? exercise.muscleGroup : 'Full body',
    name: exercise?.name ?? 'Exercise',
  };
}

function mapExercise(exercise: StoredExercise): Exercise {
  return {
    equipment: isEquipment(exercise.equipment) ? exercise.equipment : 'Other',
    id: exercise.id,
    isCustom: exercise.isCustom,
    muscleGroup: isMuscleGroup(exercise.muscleGroup) ? exercise.muscleGroup : 'Full body',
    name: exercise.name,
  };
}

function mapSet(set: StoredSet): SetRecord {
  return {
    completed: set.completed,
    id: set.id,
    position: set.position,
    reps: set.reps,
    rpe: typeof set.rpe === 'number' ? set.rpe : null,
    setType: set.setType === 'warmup' ? 'warmup' : 'normal',
    weightKg: set.weightKg,
  };
}

function toPrevious(set: LoggedSet): PreviousSet {
  return { reps: set.reps, setType: set.setType, weightKg: set.weightKg };
}

function nextPosition(rows: Array<{ position: number }>): number {
  return rows.reduce((max, row) => Math.max(max, row.position), -1) + 1;
}

function clampRest(seconds: number): number {
  if (!Number.isFinite(seconds)) {
    return 90;
  }
  return Math.min(300, Math.max(15, Math.round(seconds)));
}
