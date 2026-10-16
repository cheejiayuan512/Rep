/**
 * Every load and save the screens are allowed to do: settings, the exercise
 * library, routines, and workouts. This file turns the raw saved document
 * into the shapes declared in src/domain/types.ts.
 */
import { latestSessionSets } from '../domain/metrics';
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
import { readDatabase, writeDatabase, type DatabaseShape, type StoredExercise, type StoredSet, type StoredWorkoutExercise } from './database';

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
    const position = nextPosition(db.routineExercises.filter((exercise) => exercise.routineId === routineId));
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
      db.workoutExercises.push({ exerciseId: exercise.exerciseId, id: workoutExerciseId, notes: '', position: index, workoutId });
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
  return db.workouts
    .filter((workout) => workout.finishedAt != null)
    .sort((left, right) => (right.finishedAt ?? 0) - (left.finishedAt ?? 0))
    .map((workout) => {
      const names = workoutExerciseRows(db, workout.id).map((exercise) => exerciseName(db, exercise.exerciseId));
      const volumeKg = workingSets(db, workout.id).reduce((sum, set) => sum + (set.weightKg ?? 0) * (set.reps ?? 0), 0);
      return {
        exerciseNames: names,
        finishedAt: workout.finishedAt ?? workout.startedAt,
        id: workout.id,
        name: workout.name,
        setCount: workingSets(db, workout.id).length,
        startedAt: workout.startedAt,
        volumeKg,
      };
    });
}

export async function addExerciseToWorkout(workoutId: string, exerciseId: string): Promise<void> {
  await writeDatabase((db) => {
    if (!db.exercises.some((exercise) => exercise.id === exerciseId)) {
      throw new Error('Exercise not found.');
    }
    const position = nextPosition(db.workoutExercises.filter((exercise) => exercise.workoutId === workoutId));
    const workoutExerciseId = createId();
    db.workoutExercises.push({ exerciseId, id: workoutExerciseId, notes: '', position, workoutId });
    addTemplateSets(db, workoutExerciseId, latestSessionSets(historyFor(db, [exerciseId], workoutId)[exerciseId] ?? []));
  });
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

export async function removeWorkoutExercise(workoutExerciseId: string): Promise<void> {
  await writeDatabase((db) => {
    db.sets = db.sets.filter((set) => set.workoutExerciseId !== workoutExerciseId);
    db.workoutExercises = db.workoutExercises.filter((exercise) => exercise.id !== workoutExerciseId);
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

// History and progress: finished workouts and the sets that count.

export async function listTrainedExercises(): Promise<TrainedExercise[]> {
  const db = await readDatabase();
  const latest = new Map<string, number>();
  for (const workout of db.workouts) {
    if (workout.finishedAt == null) {
      continue;
    }
    for (const exercise of db.workoutExercises.filter((item) => item.workoutId === workout.id)) {
      const trained = db.sets.some((set) => set.workoutExerciseId === exercise.id && set.completed && set.setType !== 'warmup' && (set.reps ?? 0) > 0);
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

export async function getHistorySets(exerciseIds: string[], excludeWorkoutId: string): Promise<Record<string, LoggedSet[]>> {
  const db = await readDatabase();
  return historyFor(db, exerciseIds, excludeWorkoutId);
}

function historyFor(db: DatabaseShape, exerciseIds: string[], excludeWorkoutId: string): Record<string, LoggedSet[]> {
  const grouped: Record<string, LoggedSet[]> = {};
  for (const exerciseId of exerciseIds) {
    grouped[exerciseId] = [];
  }
  const wanted = new Set(exerciseIds);
  const workouts = new Map(db.workouts.map((workout) => [workout.id, workout]));
  for (const exercise of db.workoutExercises) {
    if (!wanted.has(exercise.exerciseId) || exercise.workoutId === excludeWorkoutId) {
      continue;
    }
    const workout = workouts.get(exercise.workoutId);
    if (!workout || workout.finishedAt == null) {
      continue;
    }
    const bucket = grouped[exercise.exerciseId] ?? [];
    for (const set of db.sets.filter((item) => item.workoutExerciseId === exercise.id)) {
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
  const sets = db.sets
    .filter((set) => set.workoutExerciseId === row.id)
    .sort((left, right) => left.position - right.position)
    .map(mapSet);
  return {
    equipment: exercise.equipment,
    exerciseId: row.exerciseId,
    id: row.id,
    muscleGroup: exercise.muscleGroup,
    name: exercise.name,
    notes: row.notes ?? '',
    position: row.position,
    previousSets: previous,
    sets,
  };
}

function workingSets(db: DatabaseShape, workoutId: string): StoredSet[] {
  const ids = new Set(db.workoutExercises.filter((exercise) => exercise.workoutId === workoutId).map((exercise) => exercise.id));
  return db.sets.filter((set) => ids.has(set.workoutExerciseId) && set.completed && set.setType !== 'warmup');
}

function routineExerciseRows(db: DatabaseShape, routineId: string) {
  return db.routineExercises.filter((exercise) => exercise.routineId === routineId).sort((left, right) => left.position - right.position);
}

function workoutExerciseRows(db: DatabaseShape, workoutId: string) {
  return db.workoutExercises.filter((exercise) => exercise.workoutId === workoutId).sort((left, right) => left.position - right.position);
}

function exerciseName(db: DatabaseShape, exerciseId: string): string {
  return db.exercises.find((exercise) => exercise.id === exerciseId)?.name ?? 'Exercise';
}

function requireExercise(db: DatabaseShape, exerciseId: string): { name: string; muscleGroup: MuscleGroup; equipment: Equipment } {
  const exercise = db.exercises.find((item) => item.id === exerciseId);
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
