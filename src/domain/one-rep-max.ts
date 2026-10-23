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

export function percentTable(oneRepMaxKg: number): PercentRow[] {
  return PERCENTS.map((percent) => ({
    percent,
    reps: percent === 100 ? 1 : Math.max(1, Math.round(30 * (100 / percent - 1))),
    weightKg: (oneRepMaxKg * percent) / 100,
  }));
}
