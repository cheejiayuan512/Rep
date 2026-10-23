/**
 * Shortcuts for screens. A hook is a function that starts with "use".
 * These read the shared store and, when the revision counter changes, load
 * fresh lists from storage.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getActiveWorkoutSummary, getAnalysisInput, getProfile, listRoutines, listTrainedExercises, listWorkoutSummaries, saveWarmupRestMultiplier, saveWeightUnit } from '../data/repository';
import type { ProfileSnapshot } from '../domain/profile';
import { buildAnalysis, buildHomeStats, type Analysis, type AnalysisInput, type HomeStats } from '../domain/stats';
import type { ActiveWorkoutSummary, RoutineSummary, TrainedExercise, WeightUnit, WorkoutSummary } from '../domain/types';
import { useAppDispatch, useAppSelector, warmupRestMultiplierChanged, weightUnitChanged } from './store';

export function useRevision(): number {
  return useAppSelector((state) => state.app.revision);
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

export function useRoutines(): RoutineSummary[] {
  const revision = useRevision();
  const [routines, setRoutines] = useState<RoutineSummary[]>([]);

  useEffect(() => {
    let cancel = false;
    void listRoutines().then((next) => {
      if (!cancel) {
        setRoutines(next);
      }
    });
    return () => {
      cancel = true;
    };
  }, [revision]);

  return routines;
}

export function useWorkoutSummaries(): WorkoutSummary[] {
  const revision = useRevision();
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);

  useEffect(() => {
    let cancel = false;
    void listWorkoutSummaries().then((next) => {
      if (!cancel) {
        setWorkouts(next);
      }
    });
    return () => {
      cancel = true;
    };
  }, [revision]);

  return workouts;
}

export function useProfile(): ProfileSnapshot | null {
  const revision = useRevision();
  const [profile, setProfile] = useState<ProfileSnapshot | null>(null);

  useEffect(() => {
    let cancel = false;
    void getProfile().then((next) => {
      if (!cancel) {
        setProfile(next);
      }
    });
    return () => {
      cancel = true;
    };
  }, [revision]);

  return profile;
}

export function useTrainedExercises(): TrainedExercise[] {
  const revision = useRevision();
  const [exercises, setExercises] = useState<TrainedExercise[]>([]);

  useEffect(() => {
    let cancel = false;
    void listTrainedExercises().then((next) => {
      if (!cancel) {
        setExercises(next);
      }
    });
    return () => {
      cancel = true;
    };
  }, [revision]);

  return exercises;
}

/** Training analysis over the last `days` days, compared with the `days` before. */
export function useAnalysis(days: number): Analysis | null {
  const revision = useRevision();
  const [input, setInput] = useState<AnalysisInput | null>(null);

  useEffect(() => {
    let cancel = false;
    void getAnalysisInput().then((next) => {
      if (!cancel) {
        setInput(next);
      }
    });
    return () => {
      cancel = true;
    };
  }, [revision]);

  return useMemo(() => (input ? buildAnalysis(input, Date.now(), days) : null), [days, input]);
}

export interface HomeData {
  active: ActiveWorkoutSummary | null;
  routines: RoutineSummary[];
  lastWorkout: WorkoutSummary | null;
  stats: HomeStats;
}

export function useHomeData(activeWorkoutId: string | null): HomeData | null {
  const revision = useRevision();
  const [data, setData] = useState<HomeData | null>(null);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      const [routines, workouts, active] = await Promise.all([
        listRoutines(),
        listWorkoutSummaries(),
        activeWorkoutId ? getActiveWorkoutSummary(activeWorkoutId) : Promise.resolve(null),
      ]);
      if (!cancel) {
        setData({
          active,
          lastWorkout: workouts[0] ?? null,
          routines,
          stats: buildHomeStats(workouts, Date.now()),
        });
      }
    })();
    return () => {
      cancel = true;
    };
  }, [activeWorkoutId, revision]);

  return data;
}
