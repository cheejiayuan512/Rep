/**
 * Profile numbers for the local log. Points, levels, and badges come only
 * from finished workouts. Warmups do not add volume, reps, or set points.
 */

export type ProfileChartMetric = 'duration' | 'volume' | 'reps';

export type BadgeTier = 'locked' | 'novice' | 'regular' | 'expert';

export interface ProfileWorkout {
  id: string;
  name: string;
  startedAt: number;
  finishedAt: number;
  exerciseIds: string[];
  notedExercises: number;
  workingSets: number;
  warmupSets: number;
  volumeKg: number;
  reps: number;
}

export interface ProfileInput {
  workouts: ProfileWorkout[];
  customExerciseCount: number;
  now: number;
}

export interface ProfileWeek {
  start: number;
  durationMinutes: number;
  volumeKg: number;
  reps: number;
}

export interface ProfileBadge {
  id: string;
  title: string;
  detail: string;
  tier: BadgeTier;
  /** 0 to 1, how full the ring is for the current tier. */
  ring: number;
}

export interface ProfileLevel {
  level: number;
  points: number;
  floor: number;
  ceiling: number | null;
}

export interface ProfileRecent {
  id: string;
  name: string;
  startedAt: number;
  finishedAt: number;
  volumeKg: number;
  setCount: number;
}

export interface ProfileSnapshot {
  level: ProfileLevel;
  workouts: number;
  thisWeekMinutes: number;
  trainedExercises: number;
  weeks: ProfileWeek[];
  badges: ProfileBadge[];
  contributions: Array<{ id: string; label: string; value: number }>;
  recent: ProfileRecent[];
}

const LEVEL_FLOORS = [0, 20, 75, 200, 500, 1200, 3000, 8000];
const WEEK_COUNT = 12;

export function buildProfile(input: ProfileInput): ProfileSnapshot {
  const finished = input.workouts.filter((workout) => workout.finishedAt >= workout.startedAt);
  const points = scorePoints(finished, input.customExerciseCount);
  const trained = new Set(finished.flatMap((workout) => (workout.workingSets > 0 ? workout.exerciseIds : [])));
  const weekStarts = recentWeekStarts(input.now, WEEK_COUNT);
  const currentWeek = weekStarts[weekStarts.length - 1] ?? startOfWeek(input.now);

  return {
    badges: buildBadges(finished, trained.size),
    contributions: [
      { id: 'workouts', label: 'Workouts', value: finished.length },
      { id: 'sets', label: 'Sets', value: sum(finished, (workout) => workout.workingSets) },
      { id: 'reps', label: 'Reps', value: sum(finished, (workout) => workout.reps) },
      { id: 'exercises', label: 'Exercises', value: trained.size },
      { id: 'notes', label: 'Notes', value: sum(finished, (workout) => workout.notedExercises) },
      { id: 'warmups', label: 'Warmups', value: sum(finished, (workout) => workout.warmupSets) },
      { id: 'custom', label: 'Custom exercises', value: input.customExerciseCount },
    ],
    level: levelForPoints(points),
    recent: [...finished]
      .sort((left, right) => right.finishedAt - left.finishedAt)
      .slice(0, 4)
      .map((workout) => ({
        finishedAt: workout.finishedAt,
        id: workout.id,
        name: workout.name,
        setCount: workout.workingSets,
        startedAt: workout.startedAt,
        volumeKg: workout.volumeKg,
      })),
    thisWeekMinutes: finished
      .filter((workout) => startOfWeek(workout.finishedAt) === currentWeek)
      .reduce((total, workout) => total + durationMinutes(workout), 0),
    trainedExercises: trained.size,
    weeks: weekStarts.map((start) => bucketWeek(finished, start)),
    workouts: finished.length,
  };
}

export function levelForPoints(points: number): ProfileLevel {
  let index = 0;
  for (let i = 0; i < LEVEL_FLOORS.length; i += 1) {
    if (points >= LEVEL_FLOORS[i]) {
      index = i;
    }
  }
  const floor = LEVEL_FLOORS[index];
  const ceiling = index + 1 < LEVEL_FLOORS.length ? LEVEL_FLOORS[index + 1] : null;
  return { ceiling, floor, level: index + 1, points };
}

export function weekValue(week: ProfileWeek, metric: ProfileChartMetric): number {
  if (metric === 'volume') {
    return week.volumeKg;
  }
  if (metric === 'reps') {
    return week.reps;
  }
  return week.durationMinutes;
}

export function startOfWeek(timestamp: number): number {
  const date = new Date(timestamp);
  const day = date.getDay();
  const mondayOffset = day === 0 ? 6 : day - 1;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - mondayOffset).getTime();
}

function scorePoints(workouts: ProfileWorkout[], customExerciseCount: number): number {
  const trained = new Set(workouts.flatMap((workout) => (workout.workingSets > 0 ? workout.exerciseIds : [])));
  return (
    workouts.length * 10 +
    sum(workouts, (workout) => workout.workingSets) +
    sum(workouts, (workout) => workout.notedExercises) * 2 +
    trained.size * 5 +
    customExerciseCount * 5
  );
}

function buildBadges(workouts: ProfileWorkout[], trainedCount: number): ProfileBadge[] {
  const workoutCount = workouts.length;
  const volume = sum(workouts, (item) => item.volumeKg);
  const notes = sum(workouts, (item) => item.notedExercises);
  return [
    badge('logger', 'Logger', 'Finished workouts', workoutCount, [1, 10, 50]),
    badge('lifter', 'Lifter', 'Kilograms lifted', volume, [1000, 10000, 100000]),
    badge('scribe', 'Scribe', 'Exercise notes', notes, [1, 10, 40]),
    badge('explorer', 'Explorer', 'Different exercises', trainedCount, [3, 10, 25]),
  ];
}

function badge(id: string, title: string, detail: string, value: number, steps: [number, number, number]): ProfileBadge {
  const [novice, regular, expert] = steps;
  if (value < novice) {
    return { detail: `Unlock at ${formatStep(novice)}`, id, ring: value / novice, tier: 'locked', title };
  }
  if (value < regular) {
    return { detail: 'Novice', id, ring: value / regular, tier: 'novice', title };
  }
  if (value < expert) {
    return { detail: 'Regular', id, ring: value / expert, tier: 'regular', title };
  }
  return { detail: 'Expert', id, ring: 1, tier: 'expert', title };
}

function formatStep(value: number): string {
  return value >= 1000 ? `${value / 1000}k` : String(value);
}

function recentWeekStarts(now: number, count: number): number[] {
  const current = startOfWeek(now);
  const starts: number[] = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(current);
    date.setDate(date.getDate() - index * 7);
    starts.push(date.getTime());
  }
  return starts;
}

function bucketWeek(workouts: ProfileWorkout[], start: number): ProfileWeek {
  const end = start + 7 * 86400000;
  const inWeek = workouts.filter((workout) => workout.finishedAt >= start && workout.finishedAt < end);
  return {
    durationMinutes: sum(inWeek, durationMinutes),
    reps: sum(inWeek, (workout) => workout.reps),
    start,
    volumeKg: sum(inWeek, (workout) => workout.volumeKg),
  };
}

function durationMinutes(workout: ProfileWorkout): number {
  return Math.max(1, Math.round((workout.finishedAt - workout.startedAt) / 60000));
}

function sum<T>(items: T[], read: (item: T) => number): number {
  return items.reduce((total, item) => total + read(item), 0);
}
