/**
 * Shortcuts for screens. A hook is a function that starts with "use".
 * These read the shared store and, when the revision counter changes, load
 * fresh lists from storage. The first frame reads the in-memory log
 * synchronously, so a screen opens with its data instead of flashing empty.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  getActiveWorkoutSummary,
  getAnalysisInput,
  getProfile,
  getSettings,
  getStrengthOverview,
  listRoutines,
  listTrainedExercises,
  listWorkoutSummaries,
  saveBodyProfile,
  saveShowRpe,
  saveWarmupRestMultiplier,
  saveWeightUnit,
  type Reader,
  type StrengthOverview,
} from '../data/repository';
import type { ProfileSnapshot } from '../domain/profile';
import { buildAnalysis, buildHomeStats, type Analysis, type AnalysisInput, type HomeStats } from '../domain/stats';
import type { ActiveWorkoutSummary, BodyProfile, RoutineSummary, TrainedExercise, WeightUnit, WorkoutSummary } from '../domain/types';
import { dataChanged, useAppDispatch, useAppSelector, warmupRestMultiplierChanged, weightUnitChanged } from './store';

export function useRevision(): number {
  return useAppSelector((state) => state.app.revision);
}

/**
 * Runs `read` now for the first frame, then again (in the background) whenever
 * the revision or `key` changes. The last result stays on screen while the next loads.
 */
export function useStored<A extends unknown[], R>(read: Reader<A, R>, ...args: A): R | null {
  const revision = useRevision();
  const key = JSON.stringify(args);
  const [value, setValue] = useState<R | null>(() => read.now(...args));
  const fresh = useRef<string | null>(value == null ? null : `${revision}:${key}`);
  const argsRef = useRef(args);
  argsRef.current = args;

  useEffect(() => {
    const stamp = `${revision}:${key}`;
    if (fresh.current === stamp) {
      return;
    }
    fresh.current = stamp;
    let cancel = false;
    void read(...argsRef.current).then((next) => {
      if (!cancel) {
        setValue(next);
      }
    });
    return () => {
      cancel = true;
    };
  }, [key, read, revision]);

  return value;
}

export function useWeightUnit(): { unit: WeightUnit; setUnit: (unit: WeightUnit) => void } {
  const unit = useAppSelector((state) => state.app.weightUnit);
  const dispatch = useAppDispatch();
  const setUnit = useCallback(
    (next: WeightUnit) => {
      dispatch(weightUnitChanged(next));
      void saveWeightUnit(next);
    },
    [dispatch],
  );
  return { setUnit, unit };
}

export function useShowRpe(): { showRpe: boolean; loggedRpe: boolean; setShowRpe: (show: boolean) => void } {
  const settings = useStored(getSettings);
  const dispatch = useAppDispatch();
  const setShowRpe = useCallback(
    (show: boolean) => {
      void saveShowRpe(show).then(() => dispatch(dataChanged()));
    },
    [dispatch],
  );
  return { loggedRpe: settings?.loggedRpe ?? false, setShowRpe, showRpe: settings?.showRpe ?? false };
}

export function useWarmupRestMultiplier(): { warmupMultiplier: number; setWarmupMultiplier: (multiplier: number) => void } {
  const warmupMultiplier = useAppSelector((state) => state.app.warmupRestMultiplier);
  const dispatch = useAppDispatch();
  const setWarmupMultiplier = useCallback(
    (multiplier: number) => {
      dispatch(warmupRestMultiplierChanged(multiplier));
      void saveWarmupRestMultiplier(multiplier);
    },
    [dispatch],
  );
  return { setWarmupMultiplier, warmupMultiplier };
}

/** Bodyweight, age, and sex for strength levels. Saving bumps the revision so ratings refresh. */
export function useBodyProfile(): { body: BodyProfile; setBody: (body: BodyProfile) => void } {
  const settings = useStored(getSettings);
  const dispatch = useAppDispatch();
  const setBody = useCallback(
    (body: BodyProfile) => {
      void saveBodyProfile(body).then(() => dispatch(dataChanged()));
    },
    [dispatch],
  );
  const body = useMemo<BodyProfile>(
    () => ({ ageYears: settings?.ageYears ?? null, bodyweightKg: settings?.bodyweightKg ?? null, sex: settings?.sex ?? null }),
    [settings?.ageYears, settings?.bodyweightKg, settings?.sex],
  );
  return { body, setBody };
}

const noRoutines: RoutineSummary[] = [];
const noWorkouts: WorkoutSummary[] = [];
const noExercises: TrainedExercise[] = [];

export function useRoutines(): RoutineSummary[] {
  return useStored(listRoutines) ?? noRoutines;
}

export function useWorkoutSummaries(): WorkoutSummary[] {
  return useStored(listWorkoutSummaries) ?? noWorkouts;
}

export function useProfile(): ProfileSnapshot | null {
  return useStored(getProfile);
}

export function useStrengthOverview(): StrengthOverview | null {
  return useStored(getStrengthOverview);
}

export function useTrainedExercises(): TrainedExercise[] {
  return useStored(listTrainedExercises) ?? noExercises;
}

/** Training analysis over the last `days` days, compared with the `days` before. */
export function useAnalysis(days: number): Analysis | null {
  const input: AnalysisInput | null = useStored(getAnalysisInput);
  return useMemo(() => (input ? buildAnalysis(input, Date.now(), days) : null), [days, input]);
}

export interface HomeData {
  active: ActiveWorkoutSummary | null;
  routines: RoutineSummary[];
  lastWorkout: WorkoutSummary | null;
  recent: WorkoutSummary[];
  stats: HomeStats;
}

export function useHomeData(activeWorkoutId: string | null): HomeData | null {
  const routines = useStored(listRoutines);
  const workouts = useStored(listWorkoutSummaries);
  const active = useStored(getActiveWorkoutSummary, activeWorkoutId ?? '');
  return useMemo(() => {
    if (!routines || !workouts) {
      return null;
    }
    return { active: activeWorkoutId ? active : null, lastWorkout: workouts[0] ?? null, recent: workouts.slice(0, 3), routines, stats: buildHomeStats(workouts, Date.now()) };
  }, [active, activeWorkoutId, routines, workouts]);
}
