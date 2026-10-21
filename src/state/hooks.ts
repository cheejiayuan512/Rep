/**
 * Shortcuts for screens. A hook is a function that starts with "use".
 * These read the shared store and, when the revision counter changes, load
 * fresh lists from storage.
 */
import { useCallback, useEffect, useState } from 'react';

import { getActiveWorkoutSummary, getProfile, listRoutines, listTrainedExercises, listWorkoutSummaries, saveRestSeconds, saveWeightUnit } from '../data/repository';
import type { ProfileSnapshot } from '../domain/profile';
import type { ActiveWorkoutSummary, RoutineSummary, TrainedExercise, WeightUnit, WorkoutSummary } from '../domain/types';
import { restSecondsChanged, useAppDispatch, useAppSelector, weightUnitChanged } from './store';

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

export function useRestSeconds(): { restSeconds: number; setRestSeconds: (seconds: number) => void } {
  const restSeconds = useAppSelector((state) => state.app.restSeconds);
  const dispatch = useAppDispatch();
  const setRestSeconds = useCallback(
    (seconds: number) => {
      const next = Math.min(300, Math.max(15, Math.round(seconds)));
      dispatch(restSecondsChanged(next));
      void saveRestSeconds(next);
    },
    [dispatch],
  );
  return { restSeconds, setRestSeconds };
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

export interface HomeData {
  active: ActiveWorkoutSummary | null;
  routines: RoutineSummary[];
  lastWorkout: WorkoutSummary | null;
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
        });
      }
    })();
    return () => {
      cancel = true;
    };
  }, [activeWorkoutId, revision]);

  return data;
}
