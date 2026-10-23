/**
 * Ties the outside-the-app workout activity to the log. While the workout
 * screen is open it handles Done itself (it holds unsaved typing). When it is
 * not, Done is handled here: check off the next set, start its rest, save now
 * because the app may be suspended again in a moment.
 * The running rest lives here too, so leaving the workout screen and coming
 * back keeps the rest bar.
 */
import { getWorkout, saveNow, updateSetCompleted } from '../../data/repository';
import { addCompleteSetListener, showWorkoutActivity, type WorkoutActivityProps } from '../../components/workout-live-activity';
import { scheduleRestEnd } from '../../components/rest-notification';
import { formatLoggedLoad } from '../../domain/format';
import { defaultRestFor, restAfterSet } from '../../domain/rest';
import type { WeightUnit, WorkoutDetail } from '../../domain/types';
import { findNextSet, updateSetInWorkout } from '../../domain/workout-edits';
import { dataChanged, store } from '../../state/store';

export interface RestState {
  workoutId: string;
  /** The workout card whose set started this rest. */
  workoutExerciseId: string;
  startedAt: number;
  endsAt: number;
}

let rest: RestState | null = null;
let lastExerciseByWorkout: Record<string, string> = {};
let screenHandler: (() => void) | null = null;

export function getRest(workoutId: string): RestState | null {
  return rest && rest.workoutId === workoutId && rest.endsAt > Date.now() ? rest : null;
}

export function setRest(next: RestState | null): void {
  rest = next;
}

/** The card you last checked a set off in, so "next set" stays on it. */
export function getLastExercise(workoutId: string): string | null {
  return lastExerciseByWorkout[workoutId] ?? null;
}

export function setLastExercise(workoutId: string, workoutExerciseId: string): void {
  lastExerciseByWorkout = { ...lastExerciseByWorkout, [workoutId]: workoutExerciseId };
}

/** Forgets a finished or discarded workout. */
export function clearWorkoutActivityState(workoutId: string): void {
  if (rest?.workoutId === workoutId) {
    rest = null;
  }
  const others = { ...lastExerciseByWorkout };
  delete others[workoutId];
  lastExerciseByWorkout = others;
}

/** The workout screen claims Done while it is open. Returns the release function. */
export function claimCompleteSet(handler: () => void): () => void {
  screenHandler = handler;
  return () => {
    if (screenHandler === handler) {
      screenHandler = null;
    }
  };
}

export function activityPropsFor(workout: WorkoutDetail, unit: WeightUnit): WorkoutActivityProps {
  const next = findNextSet(workout, getLastExercise(workout.id));
  const current = getRest(workout.id);
  const empty = workout.exercises.length === 0;
  return {
    canComplete: next != null && (next.set.reps ?? 0) > 0,
    exerciseName: next ? next.exercise.name : empty ? 'Add an exercise' : 'All sets done',
    nextSet: next ? formatLoggedLoad(next.set.weightKg, next.set.reps, unit) : empty ? '' : 'Finish in Rep',
    restEndsAt: current?.endsAt ?? 0,
    restStartedAt: current?.startedAt ?? 0,
    setLabel: next?.label ?? '',
    workoutStartedAt: workout.startedAt,
  };
}

/** Listens for Done for the life of the app. Call once at startup. */
export function installCompleteSetListener(): { remove: () => void } {
  return addCompleteSetListener(() => {
    if (screenHandler) {
      screenHandler();
      return;
    }
    void completeNextSetInBackground();
  });
}

async function completeNextSetInBackground(): Promise<void> {
  const { activeWorkoutId, warmupRestMultiplier, weightUnit } = store.getState().app;
  if (!activeWorkoutId) {
    return;
  }
  const workout = await getWorkout(activeWorkoutId);
  if (!workout || workout.finishedAt != null) {
    return;
  }
  const next = findNextSet(workout, getLastExercise(workout.id));
  if (!next || (next.set.reps ?? 0) <= 0) {
    return;
  }
  const { exercise, set } = next;
  await updateSetCompleted(set.id, true, set.weightKg, set.reps, set.rpe);
  setLastExercise(workout.id, exercise.id);
  const seconds = restAfterSet(exercise.restSeconds ?? defaultRestFor(exercise), set.setType, warmupRestMultiplier);
  const startedAt = Date.now();
  setRest({ endsAt: startedAt + seconds * 1000, startedAt, workoutExerciseId: exercise.id, workoutId: workout.id });
  showWorkoutActivity(activityPropsFor(updateSetInWorkout(workout, set.id, { completed: true }), weightUnit));
  await saveNow();
  store.dispatch(dataChanged());
  await scheduleRestEnd(startedAt + seconds * 1000, exercise.name);
}
