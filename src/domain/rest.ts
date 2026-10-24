/**
 * How long to rest after a set. Each exercise gets a default from how
 * demanding it is: heavy barbell compounds rest longest, small isolation
 * moves and core work the least. A rest picked on the card overrides it.
 * Warmup sets rest for a fraction of that, longer the closer they are to the working weight.
 */
import type { Equipment, MuscleGroup, SetType } from './types';

export type RestClass = 'heavy' | 'compound' | 'isolation' | 'short';

export const REST_BY_CLASS: Record<RestClass, number> = {
  compound: 120,
  heavy: 180,
  isolation: 90,
  short: 60,
};

export const REST_CLASS_LABELS: Record<RestClass, string> = {
  compound: 'Compound',
  heavy: 'Heavy compound',
  isolation: 'Isolation',
  short: 'Short',
};

export const WARMUP_MULTIPLIERS = [0.25, 0.5, 0.75, 1] as const;
export const DEFAULT_WARMUP_MULTIPLIER = 0.5;

export const MIN_REST_SECONDS = 15;
export const MAX_REST_SECONDS = 300;

export interface RestSubject {
  exerciseId: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
}

/** Built-in exercises whose name alone would land in the wrong class. */
const SEED_CLASSES: Record<string, RestClass> = {
  'barbell-bench-press': 'heavy',
  'chest-supported-row': 'compound',
  'close-grip-bench-press': 'compound',
  deadlift: 'heavy',
  'decline-barbell-bench-press': 'heavy',
  'face-pull': 'isolation',
  'good-morning': 'compound',
  'incline-barbell-bench-press': 'heavy',
  'overhead-press': 'heavy',
  'romanian-deadlift': 'heavy',
  'skull-crusher': 'isolation',
  'straight-arm-pulldown': 'isolation',
  'upright-row': 'isolation',
};

const HEAVY_WORDS = ['squat', 'deadlift', 'clean', 'snatch', 'jerk', 'thruster', 'push press', 'leg press', 'hip thrust'];
const ISOLATION_WORDS = ['curl', 'extension', 'raise', 'fly', 'flye', 'kickback', 'pushdown', 'crossover', 'pec deck', 'shrug', 'abduction', 'adduction', 'pullover', 'pull-through', 'face pull'];
const COMPOUND_WORDS = ['press', 'row', 'pull-up', 'pullup', 'chin-up', 'chinup', 'pulldown', 'dip', 'lunge', 'split squat', 'step-up', 'push-up', 'pushup', 'good morning'];

export function restClassFor(subject: RestSubject): RestClass {
  const seeded = SEED_CLASSES[subject.exerciseId];
  if (seeded) {
    return seeded;
  }
  const name = subject.name.toLowerCase();
  const has = (words: string[]) => words.some((word) => name.includes(word));
  if (subject.muscleGroup === 'Calves' || subject.muscleGroup === 'Core') {
    return 'short';
  }
  if (has(ISOLATION_WORDS)) {
    return 'isolation';
  }
  if (has(HEAVY_WORDS)) {
    return subject.equipment === 'Barbell' || subject.equipment === 'Machine' ? 'heavy' : 'compound';
  }
  if (has(COMPOUND_WORDS)) {
    return 'compound';
  }
  if (subject.muscleGroup === 'Biceps' || subject.muscleGroup === 'Triceps') {
    return 'isolation';
  }
  return subject.equipment === 'Barbell' || subject.muscleGroup === 'Full body' ? 'compound' : 'isolation';
}

export function defaultRestFor(subject: RestSubject): number {
  return REST_BY_CLASS[restClassFor(subject)];
}

export function clampRest(seconds: number): number {
  if (!Number.isFinite(seconds)) {
    return REST_BY_CLASS.isolation;
  }
  return Math.min(MAX_REST_SECONDS, Math.max(MIN_REST_SECONDS, Math.round(seconds)));
}

export function isWarmupMultiplier(value: unknown): value is number {
  return typeof value === 'number' && (WARMUP_MULTIPLIERS as readonly number[]).includes(value);
}

/**
 * Rest after one set, rounded to 5 seconds. Working sets get the exercise's rest.
 * A light warmup gets `warmupMultiplier` of it, and heavier warmups climb toward
 * the full rest: `loadRatio` is the warmup's weight over the working weight (0 to 1).
 * The climb is squared so the empty bar and early ramps stay short.
 */
export function restAfterSet(exerciseRest: number, setType: SetType, warmupMultiplier: number, loadRatio = 0): number {
  if (setType !== 'warmup') {
    return exerciseRest;
  }
  const ratio = Math.min(1, Math.max(0, Number.isFinite(loadRatio) ? loadRatio : 0));
  const factor = warmupMultiplier + (1 - warmupMultiplier) * ratio * ratio;
  return Math.max(MIN_REST_SECONDS, Math.round((exerciseRest * factor) / 5) * 5);
}

interface LoadedSet {
  setType: SetType;
  weightKg: number | null;
}

/**
 * How heavy a warmup is next to the work: its weight over the heaviest working
 * set on the card, or over last session's when nothing is entered yet. 0 when unknown.
 */
export function warmupLoadRatio(weightKg: number | null, sets: LoadedSet[], previous: LoadedSet[] = []): number {
  const heaviest = (rows: LoadedSet[]) => rows.reduce((max, row) => (row.setType === 'warmup' ? max : Math.max(max, row.weightKg ?? 0)), 0);
  const working = heaviest(sets) || heaviest(previous);
  if (!weightKg || weightKg <= 0 || working <= 0) {
    return 0;
  }
  return Math.min(1, weightKg / working);
}

export function formatMultiplier(value: number): string {
  if (value === 0.25) {
    return '¼×';
  }
  if (value === 0.5) {
    return '½×';
  }
  if (value === 0.75) {
    return '¾×';
  }
  return `${value}×`;
}
