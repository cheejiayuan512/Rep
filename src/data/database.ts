/**
 * The on-device file for the whole log. Screens should not call this directly.
 * They call src/data/repository.ts, which calls these read and write helpers.
 * Writes are queued so two saves cannot overwrite each other.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Equipment, MuscleGroup, SetType, WeightUnit } from '../domain/types';
import { isWeightUnit } from '../domain/types';
import { seedExercises } from './seed-exercises';

/**
 * One JSON document for the whole log.
 * AsyncStorage is used because the expo-sqlite web worker cannot resolve its wasm file.
 */
const STORAGE_KEY = 'rep.database.v1';

export interface StoredExercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  isCustom: boolean;
}

export interface StoredRoutine {
  id: string;
  name: string;
  createdAt: number;
}

export interface StoredRoutineExercise {
  id: string;
  routineId: string;
  exerciseId: string;
  position: number;
}

export interface StoredWorkout {
  id: string;
  name: string;
  routineId: string | null;
  startedAt: number;
  finishedAt: number | null;
}

export interface StoredWorkoutExercise {
  id: string;
  workoutId: string;
  exerciseId: string;
  position: number;
  notes: string;
  /** Rest after a set of this exercise. Null uses the default in settings. */
  restSeconds: number | null;
}

export interface StoredSet {
  id: string;
  workoutExerciseId: string;
  position: number;
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  completed: boolean;
}

export interface DatabaseShape {
  exercises: StoredExercise[];
  routines: StoredRoutine[];
  routineExercises: StoredRoutineExercise[];
  workouts: StoredWorkout[];
  workoutExercises: StoredWorkoutExercise[];
  sets: StoredSet[];
  settings: {
    weightUnit: WeightUnit;
    restSeconds: number;
  };
}

let state: DatabaseShape | null = null;
let chain: Promise<unknown> = Promise.resolve();

export function initDatabase(): Promise<void> {
  return enqueue(async () => {
    await ensureLoaded();
  });
}

export function readDatabase(): Promise<DatabaseShape> {
  return enqueue(async () => clone(await ensureLoaded()));
}

export function writeDatabase(mutator: (db: DatabaseShape) => void): Promise<void> {
  return enqueue(async () => {
    const draft = clone(await ensureLoaded());
    mutator(draft);
    state = draft;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  });
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function ensureLoaded(): Promise<DatabaseShape> {
  if (state) {
    return state;
  }

  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const parsed = raw ? parseDatabase(raw) : null;
  const next = parsed ?? emptyDatabase();
  const seeded = ensureSeed(next);
  const normalized = normalizeStored(next);
  state = next;
  if (!parsed || seeded || normalized) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

function parseDatabase(raw: string): DatabaseShape | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!isDatabaseShape(value)) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

function isDatabaseShape(value: unknown): value is DatabaseShape {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Partial<DatabaseShape>;
  return (
    Array.isArray(record.exercises) &&
    Array.isArray(record.routines) &&
    Array.isArray(record.routineExercises) &&
    Array.isArray(record.workouts) &&
    Array.isArray(record.workoutExercises) &&
    Array.isArray(record.sets) &&
    !!record.settings &&
    isWeightUnit(record.settings.weightUnit)
  );
}

function normalizeStored(db: DatabaseShape): boolean {
  let changed = false;
  for (const exercise of db.workoutExercises) {
    if (typeof exercise.notes !== 'string') {
      exercise.notes = '';
      changed = true;
    }
    const rest = typeof exercise.restSeconds === 'number' && Number.isFinite(exercise.restSeconds) ? exercise.restSeconds : null;
    if (exercise.restSeconds !== rest) {
      exercise.restSeconds = rest;
      changed = true;
    }
  }
  for (const set of db.sets) {
    const rpe = storedRpe(set.rpe);
    if (set.rpe !== rpe) {
      set.rpe = rpe;
      changed = true;
    }
  }
  return changed;
}

function storedRpe(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 10) {
    return null;
  }

  return Math.round(value * 10) / 10;
}

function emptyDatabase(): DatabaseShape {
  return {
    exercises: [],
    routineExercises: [],
    routines: [],
    sets: [],
    settings: { restSeconds: 90, weightUnit: 'kg' },
    workoutExercises: [],
    workouts: [],
  };
}

function ensureSeed(db: DatabaseShape): boolean {
  let changed = false;
  const ids = new Set(db.exercises.map((exercise) => exercise.id));
  for (const exercise of seedExercises) {
    if (ids.has(exercise.id)) {
      continue;
    }
    db.exercises.push({
      equipment: exercise.equipment,
      id: exercise.id,
      isCustom: false,
      muscleGroup: exercise.muscleGroup,
      name: exercise.name,
    });
    changed = true;
  }
  if (!db.settings || !isWeightUnit(db.settings.weightUnit)) {
    db.settings = { restSeconds: 90, weightUnit: 'kg' };
    changed = true;
  }
  return changed;
}

function clone(db: DatabaseShape): DatabaseShape {
  return JSON.parse(JSON.stringify(db)) as DatabaseShape;
}
