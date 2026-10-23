/**
 * Numbers for the Workout tab and the Analysis screen. Inputs are finished
 * workouts and their working sets (completed, not warmups, at least one rep).
 */
import { estimateOneRepMax } from './metrics';
import { previousWeek, startOfWeek } from './profile';
import type { MuscleGroup } from './types';

const DAY_MS = 86400000;

export interface StatWorkout {
  id: string;
  startedAt: number;
  finishedAt: number;
  volumeKg: number;
  setCount: number;
}

export interface WeekTotals {
  workouts: number;
  volumeKg: number;
  sets: number;
  minutes: number;
}

export interface HomeStats {
  thisWeek: WeekTotals;
  lastWeek: WeekTotals;
  /** Weeks in a row with a workout, counting this week or, if it is still empty, last week. */
  streakWeeks: number;
}

export function buildHomeStats(workouts: StatWorkout[], now: number): HomeStats {
  const current = startOfWeek(now);
  const previous = previousWeek(current);
  return {
    lastWeek: totalsFor(workouts.filter((workout) => startOfWeek(workout.finishedAt) === previous)),
    streakWeeks: currentStreak(workouts, current),
    thisWeek: totalsFor(workouts.filter((workout) => startOfWeek(workout.finishedAt) === current)),
  };
}

function currentStreak(workouts: StatWorkout[], current: number): number {
  const weeks = new Set(workouts.map((workout) => startOfWeek(workout.finishedAt)));
  let week = weeks.has(current) ? current : previousWeek(current);
  let streak = 0;
  while (weeks.has(week)) {
    streak += 1;
    week = previousWeek(week);
  }
  return streak;
}

function totalsFor(workouts: StatWorkout[]): WeekTotals {
  return {
    minutes: workouts.reduce((total, workout) => total + minutesOf(workout), 0),
    sets: workouts.reduce((total, workout) => total + workout.setCount, 0),
    volumeKg: workouts.reduce((total, workout) => total + workout.volumeKg, 0),
    workouts: workouts.length,
  };
}

function minutesOf(workout: { startedAt: number; finishedAt: number }): number {
  return Math.max(1, Math.round((workout.finishedAt - workout.startedAt) / 60000));
}

// Analysis

export interface AnalysisSet {
  workoutId: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  performedAt: number;
  weightKg: number;
  reps: number;
  rpe: number | null;
}

export interface AnalysisInput {
  workouts: StatWorkout[];
  /** Working sets only. */
  sets: AnalysisSet[];
}

export interface ShareRow<T extends string> {
  id: T;
  sets: number;
  /** 0 to 1 of the working sets in the period. */
  share: number;
}

export interface LiftTrend {
  exerciseId: string;
  name: string;
  sets: number;
  bestKg: number;
  /** Best estimated 1RM in the period before this one, if there was one. */
  previousKg: number | null;
}

export type RepRange = 'strength' | 'hypertrophy' | 'endurance';

export interface Analysis {
  days: number;
  workouts: number;
  perWeek: number;
  averageMinutes: number;
  averageSets: number;
  volumeKg: number;
  /** Fraction change against the previous period of the same length. Null when that period was empty. */
  volumeChange: number | null;
  workoutsChange: number | null;
  muscles: Array<ShareRow<MuscleGroup>>;
  repRanges: Array<ShareRow<RepRange>>;
  /** Monday first. */
  weekdays: number[];
  averageRpe: number | null;
  rpeShare: number;
  lifts: LiftTrend[];
}

export function buildAnalysis(input: AnalysisInput, now: number, days: number): Analysis {
  const start = now - days * DAY_MS;
  const priorStart = start - days * DAY_MS;
  const workouts = input.workouts.filter((workout) => workout.finishedAt > start && workout.finishedAt <= now);
  const priorWorkouts = input.workouts.filter((workout) => workout.finishedAt > priorStart && workout.finishedAt <= start);
  const sets = input.sets.filter((set) => set.performedAt > start && set.performedAt <= now);
  const priorSets = input.sets.filter((set) => set.performedAt > priorStart && set.performedAt <= start);
  const volumeKg = sum(sets, (set) => set.weightKg * set.reps);
  const priorVolume = sum(priorSets, (set) => set.weightKg * set.reps);
  const rated = sets.filter((set) => set.rpe != null);

  const weekdays = [0, 0, 0, 0, 0, 0, 0];
  for (const workout of workouts) {
    const day = new Date(workout.startedAt).getDay();
    weekdays[day === 0 ? 6 : day - 1] += 1;
  }

  return {
    averageMinutes: workouts.length > 0 ? Math.round(sum(workouts, minutesOf) / workouts.length) : 0,
    averageRpe: rated.length > 0 ? Math.round((sum(rated, (set) => set.rpe ?? 0) / rated.length) * 10) / 10 : null,
    averageSets: workouts.length > 0 ? Math.round((sum(workouts, (workout) => workout.setCount) / workouts.length) * 10) / 10 : 0,
    days,
    lifts: liftTrends(sets, priorSets),
    muscles: shares(sets, (set) => set.muscleGroup),
    perWeek: Math.round((workouts.length / (days / 7)) * 10) / 10,
    repRanges: shares(sets, (set) => repRange(set.reps)),
    rpeShare: sets.length > 0 ? rated.length / sets.length : 0,
    volumeChange: change(volumeKg, priorVolume),
    volumeKg,
    weekdays,
    workouts: workouts.length,
    workoutsChange: change(workouts.length, priorWorkouts.length),
  };
}

export function repRange(reps: number): RepRange {
  if (reps <= 5) {
    return 'strength';
  }
  if (reps <= 12) {
    return 'hypertrophy';
  }
  return 'endurance';
}

function liftTrends(sets: AnalysisSet[], priorSets: AnalysisSet[]): LiftTrend[] {
  const byExercise = new Map<string, LiftTrend>();
  for (const set of sets) {
    const existing = byExercise.get(set.exerciseId) ?? { bestKg: 0, exerciseId: set.exerciseId, name: set.exerciseName, previousKg: null, sets: 0 };
    existing.sets += 1;
    if (set.weightKg > 0) {
      existing.bestKg = Math.max(existing.bestKg, estimateOneRepMax(set.weightKg, set.reps));
    }
    byExercise.set(set.exerciseId, existing);
  }
  for (const set of priorSets) {
    const lift = byExercise.get(set.exerciseId);
    if (lift && set.weightKg > 0) {
      lift.previousKg = Math.max(lift.previousKg ?? 0, estimateOneRepMax(set.weightKg, set.reps));
    }
  }
  return [...byExercise.values()]
    .filter((lift) => lift.bestKg > 0)
    .sort((left, right) => right.sets - left.sets || right.bestKg - left.bestKg)
    .slice(0, 6);
}

function shares<T extends string>(sets: AnalysisSet[], key: (set: AnalysisSet) => T): Array<ShareRow<T>> {
  const counts = new Map<T, number>();
  for (const set of sets) {
    const id = key(set);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([id, count]) => ({ id, sets: count, share: count / sets.length }))
    .sort((left, right) => right.sets - left.sets);
}

function change(current: number, previous: number): number | null {
  return previous > 0 ? (current - previous) / previous : null;
}

function sum<T>(items: T[], read: (item: T) => number): number {
  return items.reduce((total, item) => total + read(item), 0);
}
