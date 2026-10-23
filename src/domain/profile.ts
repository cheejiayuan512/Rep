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
  /** Heaviest working set, 0 when everything was bodyweight. */
  heaviestKg: number;
}

export interface ProfileInput {
  workouts: ProfileWorkout[];
  customExerciseCount: number;
  /** Working sets that beat an earlier estimated 1RM for the same exercise. */
  recordCount: number;
  now: number;
}

export interface ProfileWeek {
  start: number;
  durationMinutes: number;
  volumeKg: number;
  reps: number;
}

export interface ProfileBadge {
  id: BadgeId;
  title: string;
  detail: string;
  tier: BadgeTier;
  /** 0 to 1, how full the ring is for the current tier. */
  ring: number;
  /** The amount that reaches the next tier, in the badge's unit (kg for weight). Null at Expert. */
  next: number | null;
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
    badges: buildBadges(finished, trained.size, input.recordCount),
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

export function previousWeek(weekStart: number): number {
  // Step back to the middle of the previous week so a daylight-saving shift cannot skip it.
  return startOfWeek(weekStart - 3.5 * 86400000);
}

/** The longest run of consecutive weeks with at least one workout. */
export function longestStreak(finishedAt: number[]): number {
  const weeks = [...new Set(finishedAt.map(startOfWeek))].sort((left, right) => left - right);
  let longest = 0;
  let run = 0;
  let last: number | null = null;
  for (const week of weeks) {
    run = last != null && previousWeek(week) === last ? run + 1 : 1;
    longest = Math.max(longest, run);
    last = week;
  }
  return longest;
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

export type BadgeId =
  | 'logger'
  | 'lifter'
  | 'scribe'
  | 'explorer'
  | 'streak'
  | 'reps'
  | 'heavy'
  | 'records'
  | 'marathon'
  | 'early'
  | 'night'
  | 'warmup';

function buildBadges(workouts: ProfileWorkout[], trainedCount: number, recordCount: number): ProfileBadge[] {
  const hourOf = (workout: ProfileWorkout) => new Date(workout.startedAt).getHours();
  return [
    badge('logger', 'Logger', workouts.length, [1, 10, 50]),
    badge('lifter', 'Lifter', sum(workouts, (item) => item.volumeKg), [1000, 10000, 100000]),
    badge('scribe', 'Scribe', sum(workouts, (item) => item.notedExercises), [1, 10, 40]),
    badge('explorer', 'Explorer', trainedCount, [3, 10, 25]),
    badge('streak', 'On a roll', longestStreak(workouts.map((item) => item.finishedAt)), [2, 6, 12]),
    badge('reps', 'Rep counter', sum(workouts, (item) => item.reps), [500, 5000, 25000]),
    badge('heavy', 'Heavy hitter', Math.max(0, ...workouts.map((item) => item.heaviestKg)), [60, 100, 140]),
    badge('records', 'Record breaker', recordCount, [1, 10, 50]),
    badge('marathon', 'Long haul', workouts.filter((item) => durationMinutes(item) >= 90).length, [1, 10, 30]),
    badge('early', 'Early bird', workouts.filter((item) => hourOf(item) < 8).length, [1, 10, 30]),
    badge('night', 'Night owl', workouts.filter((item) => hourOf(item) >= 21).length, [1, 10, 30]),
    badge('warmup', 'Warmed up', sum(workouts, (item) => item.warmupSets), [5, 50, 200]),
  ];
}

/** What a badge counts, after its number. `kg` badges are converted to the display unit on screen. */
export const BADGE_UNITS: Record<BadgeId, string> = {
  early: 'before 8 am',
  explorer: 'exercises',
  heavy: 'kg set',
  lifter: 'kg lifted',
  logger: 'workouts',
  marathon: '90-min sessions',
  night: 'after 9 pm',
  records: 'PRs',
  reps: 'reps',
  scribe: 'notes',
  streak: 'weeks in a row',
  warmup: 'warmups',
};

function badge(id: BadgeId, title: string, value: number, steps: [number, number, number]): ProfileBadge {
  const [novice, regular, expert] = steps;
  if (value < novice) {
    return { detail: 'Locked', id, next: novice, ring: value / novice, tier: 'locked', title };
  }
  if (value < regular) {
    return { detail: 'Novice', id, next: regular, ring: value / regular, tier: 'novice', title };
  }
  if (value < expert) {
    return { detail: 'Regular', id, next: expert, ring: value / expert, tier: 'regular', title };
  }
  return { detail: 'Expert', id, next: null, ring: 1, tier: 'expert', title };
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
