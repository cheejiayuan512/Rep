/**
 * The text currently in a weight, reps, or RPE box.
 * The database stores numbers. The box stores whatever the person has typed,
 * including a half-finished "8." that is not a number yet.
 */
import { formatClock } from './format';
import type { WeightUnit } from './types';
import { formatDecimal, formatWeight, kgToDisplay, kmToDisplay } from './units';

export interface SetDraft {
  weightText: string;
  repsText: string;
  rpeText: string;
  durationText: string;
  distanceText: string;
}

export type DraftMap = Record<string, SetDraft>;

export function draftFromSet(
  set: { weightKg: number | null; reps: number | null; rpe: number | null; durationSeconds?: number | null; distanceKm?: number | null },
  unit: WeightUnit,
): SetDraft {
  return {
    distanceText: set.distanceKm == null ? '' : formatDecimal(kmToDisplay(set.distanceKm, unit), 2),
    durationText: set.durationSeconds == null ? '' : formatClock(set.durationSeconds),
    repsText: set.reps == null ? '' : String(set.reps),
    rpeText: set.rpe == null ? '' : formatWeight(set.rpe),
    weightText: set.weightKg == null ? '' : formatWeight(kgToDisplay(set.weightKg, unit)),
  };
}

export function withDraft(current: SetDraft | undefined, patch: Partial<SetDraft>): SetDraft {
  return {
    distanceText: current?.distanceText ?? '',
    durationText: current?.durationText ?? '',
    repsText: current?.repsText ?? '',
    rpeText: current?.rpeText ?? '',
    weightText: current?.weightText ?? '',
    ...patch,
  };
}

export function mergeDrafts(
  previous: DraftMap,
  sets: Array<{ id: string; weightKg: number | null; reps: number | null; rpe: number | null; durationSeconds?: number | null; distanceKm?: number | null }>,
  unit: WeightUnit,
): DraftMap {
  const next = { ...previous };
  for (const set of sets) {
    if (!next[set.id]) {
      next[set.id] = draftFromSet(set, unit);
    }
  }

  return next;
}
