import type { WeightUnit } from './types';
import { formatWeight, kgToDisplay } from './units';

export interface SetDraft {
  weightText: string;
  repsText: string;
  rpeText: string;
}

export type DraftMap = Record<string, SetDraft>;

export function draftFromSet(set: { weightKg: number | null; reps: number | null; rpe: number | null }, unit: WeightUnit): SetDraft {
  return {
    repsText: set.reps == null ? '' : String(set.reps),
    rpeText: set.rpe == null ? '' : formatWeight(set.rpe),
    weightText: set.weightKg == null ? '' : formatWeight(kgToDisplay(set.weightKg, unit)),
  };
}

export function withDraft(current: SetDraft | undefined, patch: Partial<SetDraft>): SetDraft {
  return {
    repsText: current?.repsText ?? '',
    rpeText: current?.rpeText ?? '',
    weightText: current?.weightText ?? '',
    ...patch,
  };
}

export function mergeDrafts(previous: DraftMap, sets: Array<{ id: string; weightKg: number | null; reps: number | null; rpe: number | null }>, unit: WeightUnit): DraftMap {
  const next = { ...previous };
  for (const set of sets) {
    if (!next[set.id]) {
      next[set.id] = draftFromSet(set, unit);
    }
  }

  return next;
}
