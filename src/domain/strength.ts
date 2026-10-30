/**
 * Strength levels: how an estimated 1RM compares with other people who lift.
 * Each lift has five bodyweight multiples (Beginner to Elite), which sit near
 * the 5th, 20th, 50th, 80th, and 95th percentile of lifters at a reference
 * bodyweight. Strength grows with bodyweight to the 2/3 power, so a heavier
 * lifter's thresholds rise more slowly than their bodyweight. Age scales the
 * table (peak 24–39). These are rough public standards, not a survey of the
 * whole population; most people who do not train would sit below Beginner.
 */
import { estimateOneRepMax } from './metrics';
import type { BodySex, SetType } from './types';
import { isWorkingSetType } from './types';

export const STRENGTH_LEVELS = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite'] as const;

/** Above this many reps an estimated max is too loose to rank strength. */
export const STRENGTH_MAX_REPS = 10;
export type StrengthLevel = (typeof STRENGTH_LEVELS)[number];

const PERCENTILES = [5, 20, 50, 80, 95];
const REFERENCE_KG: Record<BodySex, number> = { female: 65, male: 80 };

type Steps = [number, number, number, number, number];

interface Standard {
  name: string;
  male: Steps;
  female: Steps;
}

/** Bodyweight multiples for a one-rep max, Beginner to Elite. */
const STANDARDS: Record<string, Standard> = {
  'back-squat': { female: [0.5, 0.75, 1.25, 1.5, 2], male: [0.75, 1.25, 1.5, 2.25, 2.75], name: 'Back Squat' },
  'barbell-bench-press': { female: [0.25, 0.5, 0.75, 1, 1.5], male: [0.5, 0.75, 1.25, 1.5, 2], name: 'Bench Press' },
  deadlift: { female: [0.5, 1, 1.25, 1.75, 2.5], male: [1, 1.5, 2, 2.5, 3], name: 'Deadlift' },
  'overhead-press': { female: [0.2, 0.35, 0.5, 0.75, 1], male: [0.35, 0.55, 0.8, 1.05, 1.35], name: 'Overhead Press' },
  'barbell-row': { female: [0.25, 0.4, 0.65, 0.9, 1.2], male: [0.5, 0.75, 1, 1.5, 1.75], name: 'Barbell Row' },
  'front-squat': { female: [0.4, 0.65, 1, 1.25, 1.6], male: [0.6, 1, 1.25, 1.75, 2.25], name: 'Front Squat' },
  'incline-barbell-bench-press': { female: [0.2, 0.4, 0.6, 0.8, 1.2], male: [0.4, 0.65, 1, 1.3, 1.65], name: 'Incline Bench Press' },
  'romanian-deadlift': { female: [0.4, 0.75, 1, 1.4, 1.9], male: [0.6, 1, 1.4, 1.9, 2.4], name: 'Romanian Deadlift' },
  'hip-thrust': { female: [0.5, 1, 1.5, 2.25, 3], male: [0.5, 1, 1.75, 2.5, 3.25], name: 'Hip Thrust' },
  'power-clean': { female: [0.3, 0.5, 0.7, 0.95, 1.2], male: [0.5, 0.75, 1, 1.4, 1.7], name: 'Power Clean' },
};

/** Lifts with a standard, in the order the screen lists them. */
export const STRENGTH_LIFTS = Object.keys(STANDARDS);

export function hasStrengthStandard(exerciseId: string): boolean {
  return exerciseId in STANDARDS;
}

/** Highest Epley estimate among working sets of 1–10 reps. Null when none qualify. */
export function bestWorkingOneRepMax(sets: Array<{ setType: SetType; weightKg: number | null; reps: number | null }>): number | null {
  let best = 0;
  for (const set of sets) {
    const reps = set.reps ?? 0;
    const weightKg = set.weightKg ?? 0;
    if (!isWorkingSetType(set.setType) || reps <= 0 || reps > STRENGTH_MAX_REPS || weightKg <= 0) {
      continue;
    }
    best = Math.max(best, estimateOneRepMax(weightKg, reps));
  }
  return best > 0 ? best : null;
}

export interface StrengthRating {
  exerciseId: string;
  liftName: string;
  oneRepMaxKg: number;
  /** -1 below Beginner, then 0 (Beginner) to 4 (Elite). */
  levelIndex: number;
  level: StrengthLevel | 'Below beginner';
  /** Share of lifters this lift beats, 1 to 99. */
  percentile: number;
  /** The 1RM for each level at this bodyweight. */
  thresholdsKg: number[];
  nextLevel: StrengthLevel | null;
  nextKg: number | null;
  /** 0 to 1 between the current level and the next. */
  progress: number;
}

/**
 * Peak ages 24–39 use the raw table. Younger and older expected 1RMs are
 * lower, so the same lift rates higher. Missing age leaves the table as-is.
 */
export function ageFactor(ageYears: number | null | undefined): number {
  if (ageYears == null || !Number.isFinite(ageYears)) {
    return 1;
  }
  const age = Math.min(80, Math.max(14, Math.round(ageYears)));
  if (age < 24) {
    return 1 - (24 - age) * 0.02;
  }
  if (age <= 39) {
    return 1;
  }
  return Math.max(0.55, 1 - (age - 39) * 0.012);
}

export function rateLift(exerciseId: string, oneRepMaxKg: number, bodyweightKg: number, sex: BodySex, ageYears?: number | null): StrengthRating | null {
  const standard = STANDARDS[exerciseId];
  if (!standard || !(bodyweightKg > 0) || !(oneRepMaxKg > 0)) {
    return null;
  }
  const scale = Math.pow(bodyweightKg, 2 / 3) * Math.cbrt(REFERENCE_KG[sex]) * ageFactor(ageYears);
  const thresholdsKg = standard[sex].map((multiple) => multiple * scale);
  let levelIndex = -1;
  thresholdsKg.forEach((threshold, index) => {
    if (oneRepMaxKg >= threshold) {
      levelIndex = index;
    }
  });
  const nextIndex = levelIndex + 1 < thresholdsKg.length ? levelIndex + 1 : null;
  const floor = levelIndex >= 0 ? thresholdsKg[levelIndex] : 0;
  const nextKg = nextIndex == null ? null : thresholdsKg[nextIndex];
  return {
    exerciseId,
    level: levelIndex >= 0 ? STRENGTH_LEVELS[levelIndex] : 'Below beginner',
    levelIndex,
    liftName: standard.name,
    nextKg,
    nextLevel: nextIndex == null ? null : STRENGTH_LEVELS[nextIndex],
    oneRepMaxKg,
    percentile: percentileFor(oneRepMaxKg, thresholdsKg),
    progress: nextKg == null ? 1 : Math.min(1, Math.max(0, (oneRepMaxKg - floor) / (nextKg - floor))),
    thresholdsKg,
  };
}

/** Straight lines between the level anchors; past Elite it creeps toward 99. */
function percentileFor(kg: number, thresholds: number[]): number {
  const first = thresholds[0];
  const last = thresholds[thresholds.length - 1];
  if (kg < first) {
    return clampPercentile((PERCENTILES[0] * kg) / first);
  }
  for (let index = 1; index < thresholds.length; index += 1) {
    const low = thresholds[index - 1];
    const high = thresholds[index];
    if (kg < high) {
      const share = (kg - low) / (high - low);
      return clampPercentile(PERCENTILES[index - 1] + share * (PERCENTILES[index] - PERCENTILES[index - 1]));
    }
  }
  const span = last - thresholds[thresholds.length - 2];
  return clampPercentile(95 + 4 * (1 - Math.exp(-(kg - last) / span)));
}

function clampPercentile(value: number): number {
  return Math.min(99, Math.max(1, Math.round(value)));
}

/** The strongest rating, for a one-line summary. */
export function overallLevel(ratings: StrengthRating[]): StrengthRating | null {
  return ratings.reduce<StrengthRating | null>((best, rating) => (!best || rating.percentile > best.percentile ? rating : best), null);
}
