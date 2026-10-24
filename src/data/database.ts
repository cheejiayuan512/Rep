/**
 * The on-device file for the whole log. Screens should not call this directly.
 * They call src/data/repository.ts, which calls these read and write helpers.
 * Writes are queued so two saves cannot overwrite each other.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_WARMUP_MULTIPLIER, isWarmupMultiplier } from '../domain/rest';
import type { BodySex, CableAttachment, Equipment, MuscleGroup, SetType, WeightUnit } from '../domain/types';
import { isBodySex, isCableAttachment, isWeightUnit } from '../domain/types';
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
  /** Default cable attachment, or null. */
  attachment: CableAttachment | null;
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
  /** Rest after a set of this exercise. Null uses the exercise's default (src/domain/rest.ts). */
  restSeconds: number | null;
  attachment: CableAttachment | null;
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
    /** Rest after a light warmup, as a fraction of the exercise's rest. */
    warmupRestMultiplier: number;
    /** For strength levels. Null until entered on Profile. */
    bodyweightKg: number | null;
    sex: BodySex | null;
  };
}

let state: DatabaseShape | null = null;
let chain: Promise<unknown> = Promise.resolve();
const committed = new WeakSet<DatabaseShape>();
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let persisting: Promise<void> | null = null;

export function initDatabase(): Promise<void> {
  return enqueue(async () => {
    await ensureLoaded();
  });
}

/**
 * The current document, shared and not copied: a big log made every read slow.
 * Treat it as read-only. Change data only through `writeDatabase`.
 */
export function readDatabase(): Promise<DatabaseShape> {
  return enqueue(async () => ensureLoaded());
}

/**
 * The current document without waiting, or null before the first load.
 * Lets a screen draw its first frame with data instead of an empty state.
 */
export function peekDatabase(): DatabaseShape | null {
  return state;
}

/** True for a document that `writeDatabase` will never change again, so lookups built from it can be cached. */
export function isCommitted(db: DatabaseShape): boolean {
  return committed.has(db);
}

/**
 * Applies `mutator` to a copy, swaps it in, and saves to the device shortly after.
 * The save runs in the background so screens do not wait on a large JSON write.
 */
export function writeDatabase(mutator: (db: DatabaseShape) => void): Promise<void> {
  return enqueue(async () => {
    const draft = copy(await ensureLoaded());
    mutator(draft);
    commit(draft);
    schedulePersist();
  });
}

/** Waits for queued writes, then saves the latest document now. Call before the app may be suspended. */
export async function flushDatabase(): Promise<void> {
  await enqueue(async () => undefined);
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
    await persist();
  }
  await persisting;
}

function commit(db: DatabaseShape): void {
  state = db;
  committed.add(db);
}

function schedulePersist(): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
  }
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void persist();
  }, 400);
}

async function persist(): Promise<void> {
  await persisting;
  const snapshot = state;
  if (!snapshot) {
    return;
  }
  persisting = AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)).catch((error: unknown) => {
    console.warn('Rep could not save the log', error);
  });
  await persisting;
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
  commit(next);
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
  const seedAttachments = new Map(seedExercises.map((exercise) => [exercise.id, exercise.attachment ?? null]));
  for (const exercise of db.exercises) {
    if (exercise.attachment === undefined) {
      exercise.attachment = seedAttachments.get(exercise.id) ?? null;
      changed = true;
    } else if (exercise.attachment !== null && !isCableAttachment(exercise.attachment)) {
      exercise.attachment = null;
      changed = true;
    }
  }
  if (!isWarmupMultiplier(db.settings.warmupRestMultiplier)) {
    db.settings.warmupRestMultiplier = DEFAULT_WARMUP_MULTIPLIER;
    changed = true;
  }
  const bodyweight = db.settings.bodyweightKg;
  if (bodyweight !== null && !(typeof bodyweight === 'number' && Number.isFinite(bodyweight) && bodyweight > 0)) {
    db.settings.bodyweightKg = null;
    changed = true;
  }
  if (db.settings.sex !== null && !isBodySex(db.settings.sex)) {
    db.settings.sex = null;
    changed = true;
  }
  for (const exercise of db.workoutExercises) {
    if (exercise.attachment !== null && !isCableAttachment(exercise.attachment)) {
      exercise.attachment = null;
      changed = true;
    }
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
    settings: defaultSettings(),
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
      attachment: exercise.attachment ?? null,
      equipment: exercise.equipment,
      id: exercise.id,
      isCustom: false,
      muscleGroup: exercise.muscleGroup,
      name: exercise.name,
    });
    changed = true;
  }
  if (!db.settings || !isWeightUnit(db.settings.weightUnit)) {
    db.settings = defaultSettings();
    changed = true;
  }
  return changed;
}

function defaultSettings(): DatabaseShape['settings'] {
  return { bodyweightKg: null, sex: null, warmupRestMultiplier: DEFAULT_WARMUP_MULTIPLIER, weightUnit: 'kg' };
}

/** Copies every row one level deep. Mutators edit row fields, and readers still hold the old rows. */
function copy(db: DatabaseShape): DatabaseShape {
  return {
    exercises: db.exercises.map((row) => ({ ...row })),
    routineExercises: db.routineExercises.map((row) => ({ ...row })),
    routines: db.routines.map((row) => ({ ...row })),
    sets: db.sets.map((row) => ({ ...row })),
    settings: { ...db.settings },
    workoutExercises: db.workoutExercises.map((row) => ({ ...row })),
    workouts: db.workouts.map((row) => ({ ...row })),
  };
}
