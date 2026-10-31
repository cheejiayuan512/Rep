/**
 * Every load and save the screens are allowed to do: settings, the exercise
 * library, routines, and workouts. This file turns the raw saved document
 * into the shapes declared in src/domain/types.ts.
 */
import { LOG_EXPORT_LABEL, parseLogCsv, type LogExportKind } from '../domain/log-import';
import { buildProfile, type ProfileSnapshot, type ProfileWorkout } from '../domain/profile';
import { estimateOneRepMax, latestSessionSets, oneRepMaxRecordFlags, scoreLoggedSet } from '../domain/metrics';
import type { AnalysisInput, AnalysisSet } from '../domain/stats';
import { createId } from '../domain/ids';
import type {
  ActiveWorkoutSummary,
  CableAttachment,
  Equipment,
  Exercise,
  LoggedSet,
  MuscleGroup,
  PreviousSet,
  RoutineDetail,
  RoutineExercise,
  RoutineSet,
  RoutineSummary,
  SetRecord,
  SetType,
  TrainedExercise,
  WeightUnit,
  WorkoutDetail,
  WorkoutExercise,
  WorkoutSummary,
} from '../domain/types';
import { isCableAttachment, isEquipment, isMuscleGroup, isWorkingSetType, normalizeMachineSetup, normalizeSetType, sameMachineSetup, usesMachineSetup } from '../domain/types';
import type { ExportWorkout } from '../domain/log-export';
import { filterSetsBySetup } from '../domain/metrics';
import { warmupsFirst } from '../domain/workout-edits';
import { isDefaultWorkoutName, DEFAULT_WORKOUT_NAME, suggestWorkoutName } from '../domain/workout-name';
import { clampRest, DEFAULT_WARMUP_MULTIPLIER, isWarmupMultiplier } from '../domain/rest';
import { estimateFromSets, type SessionSet } from '../domain/one-rep-max';
import { fuzzyFilter } from '../domain/fuzzy-search';
import { rateLift, STRENGTH_LIFTS, STRENGTH_MAX_REPS, type StrengthRating } from '../domain/strength';
import type { BodyProfile } from '../domain/types';
import { isBodySex, parseAgeYears } from '../domain/types';
import { flushDatabase, isCommitted, peekDatabase, readDatabase, writeDatabase, type DatabaseShape, type StoredExercise, type StoredRoutineExercise, type StoredRoutineSet, type StoredSet, type StoredWorkout, type StoredWorkoutExercise } from './database';

/** A read that screens can also run synchronously once the log is in memory, so the first frame already has data. */
export interface Reader<A extends unknown[], R> {
  (...args: A): Promise<R>;
  /** The same result without waiting, or null before the log has loaded. */
  now: (...args: A) => R | null;
}

function reader<A extends unknown[], R>(read: (db: DatabaseShape, ...args: A) => R): Reader<A, R> {
  const run = async (...args: A): Promise<R> => read(await readDatabase(), ...args);
  return Object.assign(run, {
    now: (...args: A): R | null => {
      const db = peekDatabase();
      return db ? read(db, ...args) : null;
    },
  });
}

export interface HevyImportSummary {
  source: LogExportKind;
  sourceLabel: string;
  importedWorkouts: number;
  skippedDuplicates: number;
  createdExercises: number;
  skippedCardioRows: number;
}

export interface AppSettings extends BodyProfile {
  weightUnit: WeightUnit;
  warmupRestMultiplier: number;
  showRpe: boolean;
  /** True once any set in the log has an RPE. */
  loggedRpe: boolean;
}

export interface NewSetInput {
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  durationSeconds?: number | null;
  distanceKm?: number | null;
}

// Settings: kg/lb and how long warmups rest.

export const getSettings = reader((db): AppSettings => {
  const loggedRpe = db.sets.some((set) => set.rpe != null);
  return {
    ...bodyProfileOf(db),
    loggedRpe,
    showRpe: db.settings.showRpe === true || loggedRpe,
    warmupRestMultiplier: isWarmupMultiplier(db.settings.warmupRestMultiplier) ? db.settings.warmupRestMultiplier : DEFAULT_WARMUP_MULTIPLIER,
    weightUnit: db.settings.weightUnit,
  };
});

function bodyProfileOf(db: DatabaseShape): BodyProfile {
  const bodyweight = db.settings.bodyweightKg;
  return {
    ageYears: parseAgeYears(db.settings.ageYears),
    bodyweightKg: typeof bodyweight === 'number' && bodyweight > 0 ? bodyweight : null,
    sex: isBodySex(db.settings.sex) ? db.settings.sex : null,
  };
}

/** Bodyweight in kilograms (null clears it), age, and sex, for strength levels. */
export async function saveBodyProfile(profile: BodyProfile): Promise<void> {
  await writeDatabase((db) => {
    db.settings.ageYears = parseAgeYears(profile.ageYears);
    db.settings.bodyweightKg = profile.bodyweightKg != null && profile.bodyweightKg > 0 ? Math.round(profile.bodyweightKg * 10) / 10 : null;
    db.settings.sex = profile.sex;
  });
}

export async function saveWeightUnit(unit: WeightUnit): Promise<void> {
  await writeDatabase((db) => {
    db.settings.weightUnit = unit;
  });
}

export async function saveWarmupRestMultiplier(multiplier: number): Promise<void> {
  if (!isWarmupMultiplier(multiplier)) {
    return;
  }
  await writeDatabase((db) => {
    db.settings.warmupRestMultiplier = multiplier;
  });
}

export async function saveShowRpe(showRpe: boolean): Promise<void> {
  await writeDatabase((db) => {
    db.settings.showRpe = showRpe;
  });
}

/** Saves to the device now instead of after the usual short delay. */
export async function saveNow(): Promise<void> {
  await flushDatabase();
}

// The exercise library: built-in moves plus ones you create.

/** The library, filtered by muscle group. A search is fuzzy (typos, shorthand) and sorts the best match first. */
export const listExercises = reader((db, query: string, muscleGroup: MuscleGroup | null): Exercise[] => {
  const sorted = db.exercises
    .filter((exercise) => muscleGroup == null || exercise.muscleGroup === muscleGroup)
    .sort((left, right) => Number(right.isCustom) - Number(left.isCustom) || left.name.localeCompare(right.name))
    .map(mapExercise);
  return fuzzyFilter(sorted, query);
});

const STARTER_EXERCISES = ['barbell-bench-press', 'back-squat', 'deadlift', 'overhead-press', 'barbell-row', 'lat-pulldown', 'dumbbell-curl', 'triceps-pushdown', 'leg-press', 'lateral-raise'];
const QUICK_ADD_COUNT = 8;

/**
 * One-tap suggestions for a workout: what you train most (recent sessions
 * count more), then common starters, minus what the workout already has.
 */
export const listQuickAddExercises = reader((db, workoutId: string): Exercise[] => {
  const index = indexOf(db);
  const taken = new Set(workoutExerciseRows(db, workoutId).map((row) => row.exerciseId));
  const now = Date.now();
  const scores = new Map<string, number>();
  for (const [exerciseId, rows] of index.rowsByExercise) {
    let score = 0;
    for (const row of rows) {
      const finishedAt = index.workoutsById.get(row.workoutId)?.finishedAt;
      if (finishedAt == null) {
        continue;
      }
      const days = (now - finishedAt) / 86400000;
      score += days <= 30 ? 3 : days <= 90 ? 2 : 1;
    }
    if (score > 0) {
      scores.set(exerciseId, score);
    }
  }
  const ranked = [...scores.entries()].sort((left, right) => right[1] - left[1]).map(([exerciseId]) => exerciseId);
  const picks: Exercise[] = [];
  for (const exerciseId of [...ranked, ...STARTER_EXERCISES]) {
    const exercise = index.exercisesById.get(exerciseId);
    if (!exercise || taken.has(exerciseId) || picks.some((pick) => pick.id === exerciseId)) {
      continue;
    }
    picks.push(mapExercise(exercise));
    if (picks.length === QUICK_ADD_COUNT) {
      break;
    }
  }
  return picks;
});

export interface ExerciseInput {
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  attachment?: CableAttachment | null;
  machineSetup?: string | null;
}

export async function createExercise(input: ExerciseInput): Promise<Exercise> {
  const exercise: Exercise = {
    attachment: input.equipment === 'Cable' ? (input.attachment ?? null) : null,
    equipment: input.equipment,
    id: createId(),
    isCustom: true,
    machineSetup: usesMachineSetup(input.equipment) ? normalizeMachineSetup(input.machineSetup) : null,
    muscleGroup: input.muscleGroup,
    name: input.name.trim(),
  };
  await writeDatabase((db) => {
    db.exercises.push(exercise);
  });
  return exercise;
}

export async function updateExercise(exerciseId: string, input: ExerciseInput): Promise<void> {
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
    exercise.attachment = input.equipment === 'Cable' ? (input.attachment ?? null) : null;
    exercise.machineSetup = usesMachineSetup(input.equipment) ? normalizeMachineSetup(input.machineSetup) : null;
  });
}

/** How often an exercise is used, so the editor can explain why it cannot be deleted. */
export const getExerciseUsage = reader((db, exerciseId: string): { workouts: number; routines: number } => {
  const rows = indexOf(db).rowsByExercise.get(exerciseId) ?? [];
  return {
    routines: new Set(db.routineExercises.filter((item) => item.exerciseId === exerciseId).map((item) => item.routineId)).size,
    workouts: new Set(rows.map((row) => row.workoutId)).size,
  };
});

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

// Routines: a named list of exercises and planned sets you can start again later.

export const listRoutines = reader((db): RoutineSummary[] =>
  [...db.routines]
    .sort((left, right) => right.createdAt - left.createdAt)
    .map((routine) => ({
      exerciseNames: routineExerciseRows(db, routine.id).map((exercise) => exerciseName(db, exercise.exerciseId)),
      id: routine.id,
      name: routine.name,
    })),
);

export const getRoutine = reader((db, routineId: string): RoutineDetail | null => {
  const routine = db.routines.find((item) => item.id === routineId);
  if (!routine) {
    return null;
  }
  const rows = routineExerciseRows(db, routine.id);
  const history = historyFor(
    db,
    rows.map((row) => row.exerciseId),
    '',
  );
  return {
    exercises: rows.map((exercise) => {
      const details = requireExercise(db, exercise.exerciseId);
      return {
        equipment: details.equipment,
        exerciseId: exercise.exerciseId,
        id: exercise.id,
        muscleGroup: details.muscleGroup,
        machineSetup: usesMachineSetup(details.equipment) ? normalizeMachineSetup(exercise.machineSetup) : null,
        name: details.name,
        position: exercise.position,
        supersetId: exercise.supersetId,
        previousSets: latestSessionSets(historyForSetup(history[exercise.exerciseId] ?? [], details.equipment, exercise.machineSetup)).map((set) =>
          toPrevious(set, details.equipment),
        ),
        sets: routineSetRows(db, exercise.id).map(mapRoutineSet),
      };
    }),
    id: routine.id,
    name: routine.name,
  };
});

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
    const rowIds = new Set(db.routineExercises.filter((exercise) => exercise.routineId === routineId).map((exercise) => exercise.id));
    db.routineSets = db.routineSets.filter((set) => !rowIds.has(set.routineExerciseId));
    db.routineExercises = db.routineExercises.filter((exercise) => exercise.routineId !== routineId);
    db.routines = db.routines.filter((routine) => routine.id !== routineId);
  });
}

/** Adds an exercise with its last session's sets as the plan, or one blank set. */
export async function addExerciseToRoutine(routineId: string, exerciseId: string): Promise<void> {
  await writeDatabase((db) => {
    const rows = db.routineExercises.filter((exercise) => exercise.routineId === routineId);
    if (rows.some((exercise) => exercise.exerciseId === exerciseId)) {
      return;
    }
    const position = nextPosition(rows);
    const routineExerciseId = createId();
    const machineSetup = defaultMachineSetup(db, exerciseId);
    db.routineExercises.push({ exerciseId, id: routineExerciseId, machineSetup, position, routineId, supersetId: null });
    const previous = latestSessionSets(historyForSetup(historyFor(db, [exerciseId], '')[exerciseId] ?? [], requireExercise(db, exerciseId).equipment, machineSetup));
    const templates = previous.length > 0 ? previous.slice(0, 10) : [null];
    templates.forEach((template, index) => {
      db.routineSets.push({
        distanceKm: template?.distanceKm ?? null,
        durationSeconds: template?.durationSeconds ?? null,
        id: createId(),
        position: index,
        reps: template?.reps ?? null,
        routineExerciseId,
        setType: template?.setType ?? 'normal',
        weightKg: template?.weightKg ?? null,
      });
    });
  });
}

export async function removeRoutineExercise(routineExerciseId: string): Promise<void> {
  await writeDatabase((db) => {
    db.routineSets = db.routineSets.filter((set) => set.routineExerciseId !== routineExerciseId);
    db.routineExercises = db.routineExercises.filter((exercise) => exercise.id !== routineExerciseId);
  });
}

/** Puts a removed routine exercise and its sets back at `index`. */
export async function restoreRoutineExercise(routineId: string, exercise: RoutineExercise, index: number): Promise<void> {
  await writeDatabase((db) => {
    if (!db.routines.some((routine) => routine.id === routineId) || db.routineExercises.some((item) => item.id === exercise.id)) {
      return;
    }
    const rows = routineExerciseRows(db, routineId);
    const restored = { exerciseId: exercise.exerciseId, id: exercise.id, machineSetup: exercise.machineSetup, position: 0, routineId, supersetId: exercise.supersetId };
    rows.splice(Math.min(index, rows.length), 0, restored);
    rows.forEach((row, position) => {
      row.position = position;
    });
    db.routineExercises.push(restored);
    exercise.sets.forEach((set, position) => {
      db.routineSets.push({ ...set, position, routineExerciseId: exercise.id });
    });
  });
}

export async function addRoutineSet(
  routineExerciseId: string,
  input: { weightKg: number | null; reps: number | null; durationSeconds?: number | null; distanceKm?: number | null },
): Promise<RoutineSet> {
  const created: StoredRoutineSet = {
    distanceKm: input.distanceKm ?? null,
    durationSeconds: input.durationSeconds ?? null,
    id: createId(),
    position: 0,
    reps: input.reps,
    routineExerciseId,
    setType: 'normal',
    weightKg: input.weightKg,
  };
  await writeDatabase((db) => {
    created.position = nextPosition(db.routineSets.filter((set) => set.routineExerciseId === routineExerciseId));
    db.routineSets.push({ ...created });
  });
  return mapRoutineSet(created);
}

export async function updateRoutineSet(
  setId: string,
  patch: Partial<Pick<RoutineSet, 'weightKg' | 'reps' | 'setType' | 'position' | 'durationSeconds' | 'distanceKm'>>,
): Promise<void> {
  await writeDatabase((db) => {
    const set = db.routineSets.find((item) => item.id === setId);
    if (set) {
      Object.assign(set, patch);
    }
  });
}

export async function saveRoutineSetPositions(rows: Array<{ id: string; position: number }>): Promise<void> {
  await writeDatabase((db) => {
    const positions = new Map(rows.map((row) => [row.id, row.position]));
    for (const set of db.routineSets) {
      const position = positions.get(set.id);
      if (position != null) {
        set.position = position;
      }
    }
  });
}

export async function deleteRoutineSet(setId: string): Promise<void> {
  await writeDatabase((db) => {
    db.routineSets = db.routineSets.filter((set) => set.id !== setId);
  });
}

/** Puts a deleted routine set back at `index` among its exercise's sets. */
export async function restoreRoutineSet(routineExerciseId: string, set: RoutineSet, index: number): Promise<void> {
  await writeDatabase((db) => {
    if (!db.routineExercises.some((exercise) => exercise.id === routineExerciseId) || db.routineSets.some((item) => item.id === set.id)) {
      return;
    }
    const siblings = routineSetRows(db, routineExerciseId);
    const restored: StoredRoutineSet = { ...set, routineExerciseId };
    siblings.splice(Math.min(index, siblings.length), 0, restored);
    siblings.forEach((item, position) => {
      item.position = position;
    });
    db.routineSets.push(restored);
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

export const getInProgressWorkoutId = reader((db): string | null => {
  const active = db.workouts
    .filter((workout) => workout.finishedAt == null)
    .sort((left, right) => right.startedAt - left.startedAt)[0];
  return active?.id ?? null;
});

export const getActiveWorkoutSummary = reader((db, workoutId: string): ActiveWorkoutSummary | null => {
  const workout = db.workouts.find((item) => item.id === workoutId && item.finishedAt == null);
  if (!workout) {
    return null;
  }
  return {
    exerciseCount: workoutExerciseRows(db, workout.id).length,
    id: workout.id,
    name: workout.name,
    startedAt: workout.startedAt,
  };
});

export async function startEmptyWorkout(): Promise<string> {
  const id = createId();
  await writeDatabase((db) => {
    db.workouts.push({ finishedAt: null, id, name: DEFAULT_WORKOUT_NAME, routineId: null, startedAt: Date.now() });
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
    const supersetIds = new Map<string, string>();
    const supersetFor = (value: string | null): string | null => {
      if (!value) {
        return null;
      }
      const existing = supersetIds.get(value);
      if (existing) {
        return existing;
      }
      const created = createId();
      supersetIds.set(value, created);
      return created;
    };
    db.workouts.push({ finishedAt: null, id: workoutId, name: routine.name, routineId: routine.id, startedAt: Date.now() });
    exercises.forEach((exercise, index) => {
      const workoutExerciseId = createId();
      const machineSetup = usesMachineSetup(requireExercise(db, exercise.exerciseId).equipment)
        ? (normalizeMachineSetup(exercise.machineSetup) ?? defaultMachineSetup(db, exercise.exerciseId))
        : null;
      db.workoutExercises.push({
        attachment: defaultAttachment(db, exercise.exerciseId),
        exerciseId: exercise.exerciseId,
        id: workoutExerciseId,
        machineSetup,
        notes: '',
        position: index,
        restSeconds: lastRestFor(db, exercise.exerciseId),
        supersetId: supersetFor(exercise.supersetId),
        workoutId,
      });
      const planned = routineSetRows(db, exercise.id);
      if (planned.length === 0) {
        addTemplateSets(
          db,
          workoutExerciseId,
          latestSessionSets(historyForSetup(historyFor(db, [exercise.exerciseId], workoutId)[exercise.exerciseId] ?? [], requireExercise(db, exercise.exerciseId).equipment, machineSetup)),
        );
        return;
      }
      planned.forEach((set, position) => {
        db.sets.push({
          completed: false,
          distanceKm: set.distanceKm ?? null,
          durationSeconds: set.durationSeconds ?? null,
          id: createId(),
          position,
          reps: set.reps,
          rpe: null,
          setType: set.setType,
          weightKg: set.weightKg,
          workoutExerciseId,
        });
      });
    });
  });
  if (!found) {
    throw new Error('Routine not found.');
  }
  return workoutId;
}

export const getWorkout = reader((db, workoutId: string): WorkoutDetail | null => {
  const workout = indexOf(db).workoutsById.get(workoutId);
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
});

export const getExercise = reader((db, exerciseId: string): Exercise | null => {
  const exercise = indexOf(db).exercisesById.get(exerciseId);
  return exercise ? mapExercise(exercise) : null;
});

export const listWorkoutSummaries = reader(workoutSummariesOf);

function workoutSummariesOf(db: DatabaseShape): WorkoutSummary[] {
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
          return { best: bestSet(sets), cardio: cardioBest(sets), name: exerciseName(db, row.exerciseId), sets: sets.length };
        }),
        finishedAt: workout.finishedAt ?? workout.startedAt,
        id: workout.id,
        name: workout.name,
        recordCount: records.get(workout.id) ?? 0,
        cardioKm: working.reduce((sum, set) => sum + (set.distanceKm ?? 0), 0),
        cardioSeconds: working.reduce((sum, set) => sum + (set.durationSeconds ?? 0), 0),
        setCount: working.length,
        startedAt: workout.startedAt,
        volumeKg: working.reduce((sum, set) => sum + (set.weightKg ?? 0) * (set.reps ?? 0), 0),
      };
    });
}

/** Everything the Analysis screen needs: finished workouts and their working sets. */
export const getAnalysisInput = reader((db): AnalysisInput => {
  const summaries = workoutSummariesOf(db);
  const sets: AnalysisSet[] = [];
  for (const workout of db.workouts) {
    if (workout.finishedAt == null) {
      continue;
    }
    for (const row of workoutExerciseRows(db, workout.id)) {
      const exercise = requireExercise(db, row.exerciseId);
      for (const set of setsOf(db, row.id)) {
        if (!isWorkingSet(set) || (set.reps ?? 0) <= 0) {
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
});

function cardioBest(sets: StoredSet[]): { durationSeconds: number; distanceKm: number } | null {
  let best: StoredSet | null = null;
  for (const set of sets) {
    const distance = set.distanceKm ?? 0;
    const duration = set.durationSeconds ?? 0;
    if (distance <= 0 && duration <= 0) {
      continue;
    }
    if (!best) {
      best = set;
      continue;
    }
    const bestDistance = best.distanceKm ?? 0;
    const bestDuration = best.durationSeconds ?? 0;
    if (distance > bestDistance || (distance === bestDistance && duration > bestDuration)) {
      best = set;
    }
  }
  if (!best) {
    return null;
  }
  return { distanceKm: best.distanceKm ?? 0, durationSeconds: best.durationSeconds ?? 0 };
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
      return scored ? [{ scored, setup: set.machineSetup, workoutId: set.workoutId }] : [];
    });
    const groups = new Map<string, typeof history>();
    for (const item of history) {
      const key = item.setup ?? '';
      const group = groups.get(key);
      if (group) {
        group.push(item);
      } else {
        groups.set(key, [item]);
      }
    }
    for (const group of groups.values()) {
      oneRepMaxRecordFlags(group.map((item) => item.scored)).forEach((beat, position) => {
        const workoutId = group[position]?.workoutId;
        if (beat && workoutId) {
          counts.set(workoutId, (counts.get(workoutId) ?? 0) + 1);
        }
      });
    }
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
    const machineSetup = defaultMachineSetup(db, exerciseId);
    db.workoutExercises.push({ attachment: defaultAttachment(db, exerciseId), exerciseId, id: workoutExerciseId, machineSetup, notes: '', position, restSeconds: lastRestFor(db, exerciseId), supersetId: null, workoutId });
    addTemplateSets(db, workoutExerciseId, latestSessionSets(historyForSetup(historyFor(db, [exerciseId], workoutId)[exerciseId] ?? [], requireExercise(db, exerciseId).equipment, machineSetup)));
  });
}

/** Library exercise ids already in a workout or routine, for the picker's add/remove toggle. */
export const listTargetExerciseIds = reader((db, target: { workoutId: string } | { routineId: string }): string[] => {
  const rows = 'workoutId' in target ? workoutExerciseRows(db, target.workoutId) : routineExerciseRows(db, target.routineId);
  return rows.map((row) => row.exerciseId);
});

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
    const rowIds = new Set(db.routineExercises.filter((exercise) => exercise.routineId === routineId && exercise.exerciseId === exerciseId).map((exercise) => exercise.id));
    db.routineSets = db.routineSets.filter((set) => !rowIds.has(set.routineExerciseId));
    db.routineExercises = db.routineExercises.filter((exercise) => !rowIds.has(exercise.id));
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
    const supersetIds = new Map<string, string>();
    db.workouts.push({ finishedAt: null, id, name: source.name, routineId: source.routineId, startedAt: Date.now() });
    workoutExerciseRows(db, source.id).forEach((row, index) => {
      const workoutExerciseId = createId();
      let supersetId: string | null = null;
      if (row.supersetId) {
        supersetId = supersetIds.get(row.supersetId) ?? createId();
        supersetIds.set(row.supersetId, supersetId);
      }
      db.workoutExercises.push({ attachment: row.attachment, exerciseId: row.exerciseId, id: workoutExerciseId, machineSetup: row.machineSetup, notes: row.notes, position: index, restSeconds: row.restSeconds, supersetId, workoutId: id });
      db.sets
        .filter((set) => set.workoutExerciseId === row.id)
        .sort((left, right) => left.position - right.position)
        .forEach((set, position) => {
          db.sets.push({
          completed: false,
          distanceKm: set.distanceKm ?? null,
          durationSeconds: set.durationSeconds ?? null,
          id: createId(),
          position,
          reps: set.reps,
          rpe: null,
          setType: set.setType,
          weightKg: set.weightKg,
          workoutExerciseId,
        });
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
    distanceKm: input.distanceKm ?? null,
    durationSeconds: input.durationSeconds ?? null,
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

export async function updateSetNumbers(
  setId: string,
  weightKg: number | null,
  reps: number | null,
  rpe: number | null,
  durationSeconds: number | null = null,
  distanceKm: number | null = null,
): Promise<void> {
  await writeDatabase((db) => {
    const set = db.sets.find((item) => item.id === setId);
    if (set) {
      set.weightKg = weightKg;
      set.reps = reps;
      set.rpe = rpe;
      set.durationSeconds = durationSeconds;
      set.distanceKm = distanceKm;
    }
  });
}

export async function updateSetCompleted(
  setId: string,
  completed: boolean,
  weightKg: number | null,
  reps: number | null,
  rpe: number | null,
  durationSeconds: number | null = null,
  distanceKm: number | null = null,
): Promise<void> {
  await writeDatabase((db) => {
    const set = db.sets.find((item) => item.id === setId);
    if (set) {
      set.completed = completed;
      set.weightKg = weightKg;
      set.reps = reps;
      set.rpe = rpe;
      set.durationSeconds = durationSeconds;
      set.distanceKm = distanceKm;
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

/** Sets the attachment for this workout and makes it the exercise's default for the next one. */
export async function updateWorkoutExerciseAttachment(workoutExerciseId: string, attachment: CableAttachment | null): Promise<void> {
  await writeDatabase((db) => {
    const row = db.workoutExercises.find((item) => item.id === workoutExerciseId);
    if (!row) {
      return;
    }
    row.attachment = attachment;
    const exercise = db.exercises.find((item) => item.id === row.exerciseId);
    if (exercise?.equipment === 'Cable') {
      exercise.attachment = attachment;
    }
  });
}

/** Sets the stack for this workout and makes it the exercise's default for the next one. */
export async function updateWorkoutExerciseSetup(workoutExerciseId: string, machineSetup: string | null): Promise<void> {
  await writeDatabase((db) => {
    applyWorkoutSetup(db, workoutExerciseId, machineSetup);
  });
}

/**
 * Changes the stack. Unchecked sets are refilled from that stack's last session
 * (or one blank set). Once a set is checked off, the numbers stay.
 */
export async function switchWorkoutExerciseSetup(workoutExerciseId: string, machineSetup: string | null): Promise<SetRecord[]> {
  let next: SetRecord[] = [];
  await writeDatabase((db) => {
    const row = applyWorkoutSetup(db, workoutExerciseId, machineSetup);
    if (!row) {
      return;
    }
    const current = setsOf(db, row.id);
    if (current.some((set) => set.completed)) {
      next = current.map(mapSet);
      return;
    }
    db.sets = db.sets.filter((set) => set.workoutExerciseId !== row.id);
    addTemplateSets(db, row.id, latestSessionSets(historyForSetup(historyFor(db, [row.exerciseId], row.workoutId)[row.exerciseId] ?? [], requireExercise(db, row.exerciseId).equipment, row.machineSetup)));
    next = setsOf(db, row.id).map(mapSet);
  });
  return next;
}

/** Puts a card's sets back after switching stack, for Undo. */
export async function replaceWorkoutExerciseSets(workoutExerciseId: string, sets: SetRecord[]): Promise<void> {
  await writeDatabase((db) => {
    if (!db.workoutExercises.some((exercise) => exercise.id === workoutExerciseId)) {
      return;
    }
    db.sets = db.sets.filter((set) => set.workoutExerciseId !== workoutExerciseId);
    sets.forEach((set, position) => {
      db.sets.push({
        completed: set.completed,
        distanceKm: set.distanceKm ?? null,
        durationSeconds: set.durationSeconds ?? null,
        id: set.id,
        position,
        reps: set.reps,
        rpe: set.rpe,
        setType: set.setType,
        weightKg: set.weightKg,
        workoutExerciseId,
      });
    });
  });
}

function applyWorkoutSetup(db: DatabaseShape, workoutExerciseId: string, machineSetup: string | null): StoredWorkoutExercise | null {
  const row = db.workoutExercises.find((item) => item.id === workoutExerciseId);
  if (!row) {
    return null;
  }
  const exercise = db.exercises.find((item) => item.id === row.exerciseId);
  const setup = exercise && usesMachineSetup(exercise.equipment) ? normalizeMachineSetup(machineSetup) : null;
  row.machineSetup = setup;
  if (exercise && usesMachineSetup(exercise.equipment)) {
    exercise.machineSetup = setup;
  }
  return row;
}

export async function updateRoutineExerciseSetup(routineExerciseId: string, machineSetup: string | null): Promise<void> {
  await writeDatabase((db) => {
    applyRoutineSetup(db, routineExerciseId, machineSetup);
  });
}

/** Changes a routine's stack and replaces its planned sets with that stack's last session. */
export async function switchRoutineExerciseSetup(routineExerciseId: string, machineSetup: string | null): Promise<RoutineSet[]> {
  let next: RoutineSet[] = [];
  await writeDatabase((db) => {
    const row = applyRoutineSetup(db, routineExerciseId, machineSetup);
    if (!row) {
      return;
    }
    db.routineSets = db.routineSets.filter((set) => set.routineExerciseId !== row.id);
    const previous = latestSessionSets(historyForSetup(historyFor(db, [row.exerciseId], '')[row.exerciseId] ?? [], requireExercise(db, row.exerciseId).equipment, row.machineSetup));
    const templates = previous.length > 0 ? previous.slice(0, 10) : [null];
    templates.forEach((template, index) => {
      db.routineSets.push({
        id: createId(),
        position: index,
        reps: template?.reps ?? null,
        routineExerciseId: row.id,
        setType: template?.setType ?? 'normal',
        weightKg: template?.weightKg ?? null,
      });
    });
    next = routineSetRows(db, row.id).map(mapRoutineSet);
  });
  return next;
}

function applyRoutineSetup(db: DatabaseShape, routineExerciseId: string, machineSetup: string | null): StoredRoutineExercise | null {
  const row = db.routineExercises.find((item) => item.id === routineExerciseId);
  if (!row) {
    return null;
  }
  const exercise = db.exercises.find((item) => item.id === row.exerciseId);
  const setup = exercise && usesMachineSetup(exercise.equipment) ? normalizeMachineSetup(machineSetup) : null;
  row.machineSetup = setup;
  if (exercise && usesMachineSetup(exercise.equipment)) {
    exercise.machineSetup = setup;
  }
  return row;
}

/**
 * Points a workout card at another exercise. Rest and attachment reset to the
 * new exercise's. Sets nobody has checked off are replaced with the new
 * exercise's last session; once a set is checked off, the sets stay as logged.
 */
export async function swapWorkoutExercise(workoutExerciseId: string, exerciseId: string): Promise<void> {
  await writeDatabase((db) => {
    const row = db.workoutExercises.find((item) => item.id === workoutExerciseId);
    if (!row || row.exerciseId === exerciseId) {
      return;
    }
    if (!db.exercises.some((exercise) => exercise.id === exerciseId)) {
      throw new Error('Exercise not found.');
    }
    if (db.workoutExercises.some((item) => item.workoutId === row.workoutId && item.exerciseId === exerciseId)) {
      throw new Error('That exercise is already in this workout.');
    }
    const restSeconds = lastRestFor(db, exerciseId);
    const attachment = defaultAttachment(db, exerciseId);
    const machineSetup = defaultMachineSetup(db, exerciseId);
    row.exerciseId = exerciseId;
    row.restSeconds = restSeconds;
    row.attachment = attachment;
    row.machineSetup = machineSetup;
    const sets = db.sets.filter((set) => set.workoutExerciseId === row.id);
    if (sets.some((set) => set.completed)) {
      return;
    }
    db.sets = db.sets.filter((set) => set.workoutExerciseId !== row.id);
    addTemplateSets(db, row.id, latestSessionSets(historyForSetup(historyFor(db, [exerciseId], row.workoutId)[exerciseId] ?? [], requireExercise(db, exerciseId).equipment, machineSetup)));
  });
}

export async function saveSetPositions(rows: Array<{ id: string; position: number }>): Promise<void> {
  await writeDatabase((db) => {
    const positions = new Map(rows.map((row) => [row.id, row.position]));
    for (const set of db.sets) {
      const position = positions.get(set.id);
      if (position != null) {
        set.position = position;
      }
    }
  });
}

/** Working sets from the last finished workout with this exercise, for the 1RM calculator. */
export const getLatestSession = reader((db, exerciseId: string): { finishedAt: number; sets: SessionSet[] } | null => {
  const index = indexOf(db);
  let latest: { finishedAt: number; rowId: string } | null = null;
  for (const row of index.rowsByExercise.get(exerciseId) ?? []) {
    const finishedAt = index.workoutsById.get(row.workoutId)?.finishedAt;
    if (finishedAt == null || (latest && latest.finishedAt >= finishedAt) || !setsOf(db, row.id).some(isWorkingSet)) {
      continue;
    }
    latest = { finishedAt, rowId: row.id };
  }
  if (!latest) {
    return null;
  }
  const sets = setsOf(db, latest.rowId)
    .filter(isWorkingSet)
    .map((set) => ({ reps: set.reps ?? 0, rpe: typeof set.rpe === 'number' ? set.rpe : null, weightKg: set.weightKg ?? 0 }));
  return { finishedAt: latest.finishedAt, sets };
});

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
      attachment: exercise.attachment,
      exerciseId: exercise.exerciseId,
      id: exercise.id,
      machineSetup: exercise.machineSetup,
      notes: exercise.notes,
      position: 0,
      restSeconds: exercise.restSeconds,
      supersetId: exercise.supersetId,
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
      workout.name = name.trim() || DEFAULT_WORKOUT_NAME;
    }
  });
}

export async function finishWorkout(workoutId: string): Promise<void> {
  await writeDatabase((db) => {
    const workout = db.workouts.find((item) => item.id === workoutId && item.finishedAt == null);
    if (workout) {
      if (isDefaultWorkoutName(workout.name)) {
        workout.name = suggestWorkoutName(workout.startedAt, muscleGroupsWorked(db, workout.id));
      }
      workout.finishedAt = Date.now();
    }
  });
}

export async function unfinishWorkout(workoutId: string): Promise<void> {
  await writeDatabase((db) => {
    const workout = db.workouts.find((item) => item.id === workoutId);
    if (workout) {
      workout.finishedAt = null;
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
  return importWorkoutCsv(csvText);
}

export async function importWorkoutCsv(csvText: string): Promise<HevyImportSummary> {
  const db = await readDatabase();
  const parsed = parseLogCsv(
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
              attachment: null,
              equipment: exercise.createCustom.equipment,
              id: exerciseId,
              isCustom: true,
              machineSetup: null,
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
          attachment: null,
          exerciseId,
          id: workoutExerciseId,
          machineSetup: null,
          notes,
          position: exercise.position,
          restSeconds: null,
          supersetId: null,
          workoutId,
        });

        for (const set of exercise.sets) {
          draft.sets.push({
            completed: set.completed,
            distanceKm: set.distanceKm ?? null,
            durationSeconds: set.durationSeconds ?? null,
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
    source: parsed.source,
    sourceLabel: LOG_EXPORT_LABEL[parsed.source],
  };
}

// History and progress: finished workouts and the sets that count.

export const getProfile = reader((db): ProfileSnapshot => profileOf(db, Date.now(), null));

/** The profile from finished workouts, optionally as it was before `withoutWorkoutId` was logged. */
function profileOf(db: DatabaseShape, now: number, withoutWorkoutId: string | null): ProfileSnapshot {
  const workouts: ProfileWorkout[] = db.workouts
    .filter((workout) => workout.finishedAt != null && workout.id !== withoutWorkoutId)
    .map((workout) => {
      const exercises = workoutExerciseRows(db, workout.id);
      const sets = exercises.flatMap((exercise) => setsOf(db, exercise.id));
      const working = sets.filter(isWorkingSet);
      const heaviestKg = working.reduce((max, set) => Math.max(max, set.weightKg ?? 0), 0);
      const trained = exercises.filter((exercise) => working.some((set) => set.workoutExerciseId === exercise.id));
      return {
        exerciseIds: [...new Set(trained.map((exercise) => exercise.exerciseId))],
        finishedAt: workout.finishedAt ?? workout.startedAt,
        heaviestKg,
        id: workout.id,
        muscleGroups: [...new Set(trained.map((exercise) => requireExercise(db, exercise.exerciseId).muscleGroup))],
        name: workout.name,
        notedExercises: exercises.filter((exercise) => exercise.notes.trim().length > 0).length,
        reps: working.reduce((total, set) => total + (set.reps ?? 0), 0),
        rpeSets: working.filter((set) => typeof set.rpe === 'number').length,
        startedAt: workout.startedAt,
        volumeKg: working.reduce((total, set) => total + (set.weightKg ?? 0) * (set.reps ?? 0), 0),
        warmupSets: sets.filter((set) => set.completed && set.setType === 'warmup').length,
        workingSets: working.length,
      };
    });

  let recordCount = 0;
  for (const [workoutId, count] of recordsByWorkout(db)) {
    if (workoutId !== withoutWorkoutId) {
      recordCount += count;
    }
  }
  const ratings = strengthRatingsOf(db, withoutWorkoutId);
  return buildProfile({
    customExerciseCount: db.exercises.filter((exercise) => exercise.isCustom).length,
    now,
    recordCount,
    strengthLevelIndex: ratings == null ? null : ratings.reduce((best, rating) => Math.max(best, rating.levelIndex), -1),
    workouts,
  });
}

export interface StrengthOverview {
  body: BodyProfile;
  /** Rated lifts you have trained, strongest percentile first. Empty without bodyweight and sex. */
  ratings: Array<StrengthRating & { achievedAt: number }>;
  /** Lifts with a standard you have not logged yet. */
  untrained: Array<{ exerciseId: string; name: string }>;
}

export const getStrengthOverview = reader((db): StrengthOverview => {
  const body = bodyProfileOf(db);
  const ratings = strengthRatingsOf(db, null) ?? [];
  const rated = new Set(ratings.map((rating) => rating.exerciseId));
  const best = bestLifts(db, null);
  return {
    body,
    ratings: [...ratings].sort((left, right) => right.percentile - left.percentile),
    untrained: STRENGTH_LIFTS.filter((exerciseId) => !rated.has(exerciseId) && !best.has(exerciseId)).map((exerciseId) => ({ exerciseId, name: exerciseName(db, exerciseId) })),
  };
});

/** Null when bodyweight or sex is missing. */
function strengthRatingsOf(db: DatabaseShape, withoutWorkoutId: string | null): Array<StrengthRating & { achievedAt: number }> | null {
  const { ageYears, bodyweightKg, sex } = bodyProfileOf(db);
  if (bodyweightKg == null || sex == null) {
    return null;
  }
  const ratings: Array<StrengthRating & { achievedAt: number }> = [];
  for (const [exerciseId, lift] of bestLifts(db, withoutWorkoutId)) {
    const rating = rateLift(exerciseId, lift.oneRepMaxKg, bodyweightKg, sex, ageYears);
    if (rating) {
      ratings.push({ ...rating, achievedAt: lift.achievedAt, liftName: exerciseName(db, exerciseId) });
    }
  }
  return ratings;
}

/** Best Epley estimate per rated lift, from working sets of 10 reps or fewer. */
function bestLifts(db: DatabaseShape, withoutWorkoutId: string | null): Map<string, { oneRepMaxKg: number; achievedAt: number }> {
  const best = new Map<string, { oneRepMaxKg: number; achievedAt: number }>();
  const history = historyFor(db, STRENGTH_LIFTS, withoutWorkoutId ?? '');
  for (const exerciseId of STRENGTH_LIFTS) {
    for (const set of history[exerciseId] ?? []) {
      const reps = set.reps ?? 0;
      const weightKg = set.weightKg ?? 0;
      if (!set.completed || !isWorkingSetType(set.setType) || reps <= 0 || reps > STRENGTH_MAX_REPS || weightKg <= 0) {
        continue;
      }
      const oneRepMaxKg = estimateOneRepMax(weightKg, reps);
      if (oneRepMaxKg > (best.get(exerciseId)?.oneRepMaxKg ?? 0)) {
        best.set(exerciseId, { achievedAt: set.performedAt, oneRepMaxKg });
      }
    }
  }
  return best;
}

export interface WorkoutRecap {
  workout: WorkoutSummary;
  /** 1 for the earliest finished session, counting this one. */
  sessionNumber: number;
  reps: number;
  exercises: Array<{ name: string; sets: number; best: { weightKg: number; reps: number } | null; cardio: { durationSeconds: number; distanceKm: number } | null; sessionKg: number | null }>;
  /** Exercises where a set beat the previous best estimated 1RM. */
  records: Array<{ name: string; oneRepMaxKg: number }>;
  before: ProfileSnapshot;
  after: ProfileSnapshot;
}

/** What a finished workout added: its numbers, records, and the XP and badges it earned. */
export const getWorkoutRecap = reader((db, workoutId: string): WorkoutRecap | null => {
  const workout = workoutSummariesOf(db).find((item) => item.id === workoutId);
  if (!workout) {
    return null;
  }
  const rows = workoutExerciseRows(db, workoutId);
  const exercises = rows.map((row) => {
    const sets = setsOf(db, row.id).filter(isWorkingSet);
    const loaded = sets.filter((set) => (set.reps ?? 0) > 0);
    const estimate = estimateFromSets(loaded.map((set) => ({ reps: set.reps ?? 0, rpe: typeof set.rpe === 'number' ? set.rpe : null, weightKg: set.weightKg ?? 0 })));
    return { best: bestSet(sets), cardio: cardioBest(sets), name: exerciseName(db, row.exerciseId), sessionKg: estimate?.sessionKg ?? null, sets: sets.length };
  });
  const records: WorkoutRecap['records'] = [];
  for (const row of rows) {
    const history = (historyFor(db, [row.exerciseId], '')[row.exerciseId] ?? []).flatMap((set) => {
      const scored = scoreLoggedSet(set);
      return scored ? [{ scored, setup: set.machineSetup, workoutId: set.workoutId }] : [];
    });
    const group = history.filter((item) => sameMachineSetup(item.setup, row.machineSetup));
    let best = 0;
    oneRepMaxRecordFlags(group.map((item) => item.scored)).forEach((beat, position) => {
      const item = group[position];
      if (beat && item?.workoutId === workoutId) {
        best = Math.max(best, item.scored.oneRepMaxKg ?? 0);
      }
    });
    if (best > 0) {
      records.push({ name: exerciseName(db, row.exerciseId), oneRepMaxKg: best });
    }
  }
  const now = Date.now();
  const finished = db.workouts.filter((item) => item.finishedAt != null).sort((left, right) => (left.finishedAt ?? 0) - (right.finishedAt ?? 0));
  return {
    after: profileOf(db, now, null),
    before: profileOf(db, now, workoutId),
    exercises: exercises.filter((exercise) => exercise.sets > 0),
    records,
    reps: rows.reduce((total, row) => total + setsOf(db, row.id).filter(isWorkingSet).reduce((sum, set) => sum + (set.reps ?? 0), 0), 0),
    sessionNumber: Math.max(1, finished.findIndex((item) => item.id === workoutId) + 1),
    workout,
  };
});

/** Finished workouts in Strong's column shape. Weight stays kilograms. */
export const listWorkoutsForExport = reader((db): ExportWorkout[] => {
  return db.workouts
    .filter((workout) => workout.finishedAt != null)
    .map((workout) => ({
      exercises: workoutExerciseRows(db, workout.id).map((row) => ({
        name: exerciseName(db, row.exerciseId),
        notes: row.notes ?? '',
        restSeconds: row.restSeconds,
        sets: setsOf(db, row.id).map((set) => ({
          completed: set.completed,
          reps: set.reps,
          rpe: set.rpe,
          setType: normalizeSetType(set.setType),
          weightKg: set.weightKg,
        })),
      })),
      finishedAt: workout.finishedAt ?? workout.startedAt,
      name: workout.name,
      startedAt: workout.startedAt,
    }));
});

/** Writes the superset group for each exercise. A null id means the card stands alone. */
export async function saveSupersetIds(kind: 'workout' | 'routine', rows: Array<{ id: string; supersetId: string | null }>): Promise<void> {
  await writeDatabase((db) => {
    const list = kind === 'workout' ? db.workoutExercises : db.routineExercises;
    const ids = new Map(rows.map((row) => [row.id, row.supersetId]));
    for (const row of list) {
      if (ids.has(row.id)) {
        row.supersetId = ids.get(row.id) ?? null;
      }
    }
  });
}

export const listTrainedExercises = reader((db): TrainedExercise[] => {
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
});

export const getExerciseLog = reader((db, exerciseId: string): LoggedSet[] => historyFor(db, [exerciseId], '')[exerciseId] ?? []);

/** Finished sets from other workouts. With `before`, only workouts started earlier count, so an edited past session compares against its own past. */
export const getHistorySets = reader((db, exerciseIds: string[], excludeWorkoutId: string, before?: number): Record<string, LoggedSet[]> => {
  const history = historyFor(db, exerciseIds, excludeWorkoutId);
  if (before == null) {
    return history;
  }
  const earlier = new Set(db.workouts.filter((workout) => workout.startedAt < before).map((workout) => workout.id));
  return Object.fromEntries(Object.entries(history).map(([exerciseId, sets]) => [exerciseId, sets.filter((set) => earlier.has(set.workoutId))]));
});

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
        machineSetup: exercise.machineSetup ?? null,
        performedAt: workout.finishedAt,
        position: set.position,
        distanceKm: set.distanceKm ?? null,
        durationSeconds: set.durationSeconds ?? null,
        reps: set.reps,
        rpe: typeof set.rpe === 'number' ? set.rpe : null,
        setType: normalizeSetType(set.setType),
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
  const tagged = previous.map((set, position) => ({ ...set, id: `previous-${position}`, position }));
  const ordered = warmupsFirst(tagged, true) ?? tagged;
  const templates = ordered.length > 0 ? ordered.slice(0, 10) : [null];
  templates.forEach((template, index) => {
    db.sets.push({
      completed: false,
      distanceKm: template?.distanceKm ?? null,
      durationSeconds: template?.durationSeconds ?? null,
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
  const previous = latestSessionSets(historyForSetup(historyFor(db, [row.exerciseId], workoutId)[row.exerciseId] ?? [], exercise.equipment, row.machineSetup)).map((set) =>
    toPrevious(set, exercise.equipment),
  );
  const mapped = setsOf(db, row.id).map(mapSet);
  const sets = warmupsFirst(mapped) ?? mapped;
  return {
    attachment: isCableAttachment(row.attachment) ? row.attachment : null,
    equipment: exercise.equipment,
    exerciseId: row.exerciseId,
    id: row.id,
    machineSetup: usesMachineSetup(exercise.equipment) ? normalizeMachineSetup(row.machineSetup) : null,
    muscleGroup: exercise.muscleGroup,
    name: exercise.name,
    notes: row.notes ?? '',
    position: row.position,
    previousSets: previous,
    supersetId: row.supersetId,
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

function muscleGroupsWorked(db: DatabaseShape, workoutId: string): string[] {
  const rows = workoutExerciseRows(db, workoutId);
  const trained = (row: StoredWorkoutExercise, workingOnly: boolean) =>
    setsOf(db, row.id).some((set) => (workingOnly ? isWorkingSet(set) : set.completed && ((set.reps ?? 0) > 0 || (set.durationSeconds ?? 0) > 0 || (set.distanceKm ?? 0) > 0)));
  const working = rows.filter((row) => trained(row, true));
  const source = working.length > 0 ? working : rows.filter((row) => trained(row, false));
  const groups: string[] = [];
  for (const row of source) {
    const group = requireExercise(db, row.exerciseId).muscleGroup;
    if (!groups.includes(group)) {
      groups.push(group);
    }
  }
  return groups;
}

function setsOf(db: DatabaseShape, workoutExerciseId: string): StoredSet[] {
  return indexOf(db).setsByRow.get(workoutExerciseId) ?? [];
}

function isWorkingSet(set: StoredSet): boolean {
  return set.completed && set.setType !== 'warmup' && ((set.reps ?? 0) > 0 || (set.durationSeconds ?? 0) > 0 || (set.distanceKm ?? 0) > 0);
}

function workingSets(db: DatabaseShape, workoutId: string): StoredSet[] {
  return workoutExerciseRows(db, workoutId).flatMap((row) => setsOf(db, row.id).filter((set) => set.completed && set.setType !== 'warmup'));
}

function routineExerciseRows(db: DatabaseShape, routineId: string) {
  return db.routineExercises.filter((exercise) => exercise.routineId === routineId).sort((left, right) => left.position - right.position);
}

function routineSetRows(db: DatabaseShape, routineExerciseId: string): StoredRoutineSet[] {
  return db.routineSets.filter((set) => set.routineExerciseId === routineExerciseId).sort((left, right) => left.position - right.position);
}

function mapRoutineSet(set: StoredRoutineSet): RoutineSet {
  return {
    distanceKm: set.distanceKm ?? null,
    durationSeconds: set.durationSeconds ?? null,
    id: set.id,
    position: set.position,
    reps: set.reps,
    setType: normalizeSetType(set.setType),
    weightKg: set.weightKg,
  };
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
  const equipment = isEquipment(exercise.equipment) ? exercise.equipment : 'Other';
  return {
    attachment: isCableAttachment(exercise.attachment) ? exercise.attachment : null,
    equipment,
    id: exercise.id,
    isCustom: exercise.isCustom,
    machineSetup: usesMachineSetup(equipment) ? normalizeMachineSetup(exercise.machineSetup) : null,
    muscleGroup: isMuscleGroup(exercise.muscleGroup) ? exercise.muscleGroup : 'Full body',
    name: exercise.name,
  };
}

function mapSet(set: StoredSet): SetRecord {
  return {
    completed: set.completed,
    distanceKm: set.distanceKm ?? null,
    durationSeconds: set.durationSeconds ?? null,
    id: set.id,
    position: set.position,
    reps: set.reps,
    rpe: typeof set.rpe === 'number' ? set.rpe : null,
    setType: normalizeSetType(set.setType),
    weightKg: set.weightKg,
  };
}

function toPrevious(set: LoggedSet, equipment: Equipment): PreviousSet {
  return {
    distanceKm: set.distanceKm ?? null,
    durationSeconds: set.durationSeconds ?? null,
    machineSetup: usesMachineSetup(equipment) ? (set.machineSetup ?? null) : undefined,
    reps: set.reps,
    setType: normalizeSetType(set.setType),
    weightKg: set.weightKg,
  };
}

function historyForSetup(sets: LoggedSet[], equipment: Equipment, setup: string | null | undefined): LoggedSet[] {
  return usesMachineSetup(equipment) ? filterSetsBySetup(sets, normalizeMachineSetup(setup)) : sets;
}

function defaultMachineSetup(db: DatabaseShape, exerciseId: string): string | null {
  const exercise = indexOf(db).exercisesById.get(exerciseId);
  return exercise && usesMachineSetup(exercise.equipment) ? normalizeMachineSetup(exercise.machineSetup) : null;
}

function nextPosition(rows: Array<{ position: number }>): number {
  return rows.reduce((max, row) => Math.max(max, row.position), -1) + 1;
}

function defaultAttachment(db: DatabaseShape, exerciseId: string): CableAttachment | null {
  const exercise = indexOf(db).exercisesById.get(exerciseId);
  return exercise?.equipment === 'Cable' && isCableAttachment(exercise.attachment) ? exercise.attachment : null;
}
