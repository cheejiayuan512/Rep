/**
 * The 1RM calculator. Three common formulas, their average, and a table of
 * training weights. Rep's records use Epley (see metrics.ts); the others are
 * shown for comparison because each one drifts differently at higher reps.
 */
import { estimateOneRepMax } from './metrics';

export interface OneRepMaxEstimate {
  epleyKg: number;
  brzyckiKg: number;
  lombardiKg: number;
  averageKg: number;
}

export interface PercentRow {
  percent: number;
  /** Reps you could expect at that weight, from Epley turned around. */
  reps: number;
  weightKg: number;
}

/** Above this many reps the formulas stop meaning much. */
export const MAX_ESTIMATE_REPS = 20;

const PERCENTS = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50];

export function estimateAll(weightKg: number, reps: number): OneRepMaxEstimate | null {
  if (!Number.isFinite(weightKg) || weightKg <= 0 || !Number.isInteger(reps) || reps < 1 || reps > MAX_ESTIMATE_REPS) {
    return null;
  }
  const epleyKg = estimateOneRepMax(weightKg, reps);
  const brzyckiKg = (weightKg * 36) / (37 - reps);
  const lombardiKg = weightKg * Math.pow(reps, 0.1);
  return { averageKg: (epleyKg + brzyckiKg + lombardiKg) / 3, brzyckiKg, epleyKg, lombardiKg };
}

export interface SessionSet {
  weightKg: number;
  reps: number;
  rpe: number | null;
}

export interface SessionEstimate {
  /** Blend of the sets near the top, leaning on the lower-rep ones. */
  sessionKg: number;
  bestKg: number;
  /** Per input set, null when it could not be estimated. */
  perSetKg: Array<number | null>;
  /** How many sets fed the blend. */
  used: number;
}

/** RPE below this says little about reps in reserve, so it is ignored. */
const MIN_USEFUL_RPE = 6;
const BLEND_WINDOW = 0.9;

/**
 * Estimates a 1RM from a whole session instead of one set. RPE turns into
 * reps in reserve (RPE 8 on 5 reps counts as 7 reps to failure). Sets within
 * 10% of the best estimate are blended, weighted by 1 / reps since low-rep
 * sets predict a single better; back-off and warmup sets fall outside.
 */
export function estimateFromSets(sets: SessionSet[]): SessionEstimate | null {
  const perSet = sets.map((set) => {
    if (!Number.isFinite(set.weightKg) || set.weightKg <= 0 || !Number.isInteger(set.reps) || set.reps < 1) {
      return null;
    }
    const reserve = set.rpe != null && set.rpe >= MIN_USEFUL_RPE ? 10 - set.rpe : 0;
    const reps = set.reps + reserve;
    return reps > MAX_ESTIMATE_REPS ? null : { kg: averageEstimate(set.weightKg, reps), reps };
  });
  const valid = perSet.filter((item): item is { kg: number; reps: number } => item != null);
  if (valid.length === 0) {
    return null;
  }
  const bestKg = Math.max(...valid.map((item) => item.kg));
  const near = valid.filter((item) => item.kg >= bestKg * BLEND_WINDOW);
  const totalWeight = near.reduce((sum, item) => sum + 1 / item.reps, 0);
  const sessionKg = near.reduce((sum, item) => sum + item.kg / item.reps, 0) / totalWeight;
  return { bestKg, perSetKg: perSet.map((item) => item?.kg ?? null), sessionKg, used: near.length };
}

/** The three formulas averaged; reps may be fractional after an RPE adjustment. */
function averageEstimate(weightKg: number, reps: number): number {
  if (reps <= 1) {
    return weightKg;
  }
  const epley = weightKg * (1 + reps / 30);
  const brzycki = (weightKg * 36) / (37 - reps);
  const lombardi = weightKg * Math.pow(reps, 0.1);
  return (epley + brzycki + lombardi) / 3;
}

export function percentTable(oneRepMaxKg: number): PercentRow[] {
  return PERCENTS.map((percent) => ({
    percent,
    reps: percent === 100 ? 1 : Math.max(1, Math.round(30 * (100 / percent - 1))),
    weightKg: (oneRepMaxKg * percent) / 100,
  }));
}
