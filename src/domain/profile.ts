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
  /** Muscle groups of the exercises with working sets. */
  muscleGroups: string[];
  /** Working sets with an RPE. */
  rpeSets: number;
}

export interface ProfileInput {
  workouts: ProfileWorkout[];
  customExerciseCount: number;
  /** Working sets that beat an earlier estimated 1RM for the same exercise. */
  recordCount: number;
  /** Best strength level on any lift (0 Beginner to 4 Elite), -1 below Beginner, null without bodyweight. */
  strengthLevelIndex?: number | null;
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
  /** The tier name, or Locked. */
  detail: string;
  /** What the badge counts, in a sentence. */
  description: string;
  tier: BadgeTier;
  /** 0 to 1, how full the ring is for the current tier. */
  ring: number;
  /** Where you are now, in the badge's unit (kg for weight). */
  value: number;
  /** Novice, Regular, and Expert thresholds. */
  steps: [number, number, number];
  /** The amount that reaches the next tier, in the badge's unit (kg for weight). Null at Expert. */
  next: number | null;
}

export interface ProfileLevel {
  level: number;
  /** The top level there is. */
  maxLevel: number;
  /** A name for the band this level sits in, like "Regular". */
  title: string;
  points: number;
  floor: number;
  ceiling: number | null;
  /** XP still needed for the next level. Null at the top. */
  toNext: number | null;
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

const LEVEL_FLOORS = [0, 20, 60, 120, 200, 320, 480, 700, 1000, 1400, 1900, 2500, 3200, 4000, 5000, 6200, 7600, 9200, 11000, 13000];
const LEVEL_TITLES: Array<{ from: number; title: string }> = [
  { from: 1, title: 'Starter' },
  { from: 3, title: 'Novice' },
  { from: 6, title: 'Regular' },
  { from: 9, title: 'Committed' },
  { from: 12, title: 'Seasoned' },
  { from: 15, title: 'Veteran' },
  { from: 18, title: 'Iron' },
  { from: 20, title: 'Legend' },
];
const WEEK_COUNT = 12;

/** How XP is earned, for the explanation under the level bar. */
export const XP_RULES: Array<{ label: string; points: number }> = [
  { label: 'Finish a workout', points: 10 },
  { label: 'Each working set', points: 1 },
  { label: 'Each personal record', points: 3 },
  { label: 'Each exercise note', points: 2 },
  { label: 'Each new exercise you train', points: 5 },
  { label: 'Each custom exercise', points: 5 },
];

export function buildProfile(input: ProfileInput): ProfileSnapshot {
  const finished = input.workouts.filter((workout) => workout.finishedAt >= workout.startedAt);
  const points = scorePoints(finished, input.customExerciseCount, input.recordCount);
  const trained = new Set(finished.flatMap((workout) => (workout.workingSets > 0 ? workout.exerciseIds : [])));
  const weekStarts = recentWeekStarts(input.now, WEEK_COUNT);
  const currentWeek = weekStarts[weekStarts.length - 1] ?? startOfWeek(input.now);

  return {
    badges: buildBadges(finished, trained.size, input.recordCount, input.strengthLevelIndex ?? null),
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
  const level = index + 1;
  const title = LEVEL_TITLES.reduce((name, band) => (level >= band.from ? band.title : name), LEVEL_TITLES[0].title);
  return { ceiling, floor, level, maxLevel: LEVEL_FLOORS.length, points, title, toNext: ceiling == null ? null : ceiling - points };
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

function scorePoints(workouts: ProfileWorkout[], customExerciseCount: number, recordCount: number): number {
  const trained = new Set(workouts.flatMap((workout) => (workout.workingSets > 0 ? workout.exerciseIds : [])));
  return (
    workouts.length * 10 +
    sum(workouts, (workout) => workout.workingSets) +
    recordCount * 3 +
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
  | 'warmup'
  | 'bigday'
  | 'sets'
  | 'century'
  | 'weekender'
  | 'allrounder'
  | 'rpe'
  | 'quick'
  | 'strong';

/** Strength-level badge steps: Novice, Intermediate, Advanced on any lift (level index + 1). */
const STRONG_STEPS: [number, number, number] = [2, 3, 4];

function buildBadges(workouts: ProfileWorkout[], trainedCount: number, recordCount: number, strengthLevelIndex: number | null): ProfileBadge[] {
  const hourOf = (workout: ProfileWorkout) => new Date(workout.startedAt).getHours();
  const dayOf = (workout: ProfileWorkout) => new Date(workout.startedAt).getDay();
  return [
    badge('logger', workouts.length, [1, 10, 50]),
    badge('lifter', sum(workouts, (item) => item.volumeKg), [1000, 10000, 100000]),
    badge('streak', longestStreak(workouts.map((item) => item.finishedAt)), [2, 6, 12]),
    badge('records', recordCount, [1, 10, 50]),
    badge('heavy', Math.max(0, ...workouts.map((item) => item.heaviestKg)), [60, 100, 140]),
    badge('strong', strengthLevelIndex == null ? 0 : strengthLevelIndex + 1, STRONG_STEPS),
    badge('bigday', Math.max(0, ...workouts.map((item) => item.volumeKg)), [5000, 10000, 20000]),
    badge('sets', sum(workouts, (item) => item.workingSets), [100, 1000, 5000]),
    badge('reps', sum(workouts, (item) => item.reps), [500, 5000, 25000]),
    badge('century', workouts.filter((item) => item.reps >= 100).length, [1, 10, 30]),
    badge('explorer', trainedCount, [3, 10, 25]),
    badge('allrounder', new Set(workouts.flatMap((item) => item.muscleGroups)).size, [4, 7, 10]),
    badge('scribe', sum(workouts, (item) => item.notedExercises), [1, 10, 40]),
    badge('rpe', sum(workouts, (item) => item.rpeSets), [10, 100, 500]),
    badge('warmup', sum(workouts, (item) => item.warmupSets), [5, 50, 200]),
    badge('marathon', workouts.filter((item) => durationMinutes(item) >= 90).length, [1, 10, 30]),
    badge('quick', workouts.filter((item) => durationMinutes(item) <= 45 && item.workingSets >= 10).length, [1, 10, 30]),
    badge('early', workouts.filter((item) => hourOf(item) < 8).length, [1, 10, 30]),
    badge('night', workouts.filter((item) => hourOf(item) >= 21).length, [1, 10, 30]),
    badge('weekender', workouts.filter((item) => dayOf(item) === 0 || dayOf(item) === 6).length, [1, 10, 30]),
  ];
}

interface BadgeInfo {
  title: string;
  /** What the number counts, after it. `kg` units are converted to the display unit on screen. */
  unit: string;
  description: string;
}

export const BADGE_INFO: Record<BadgeId, BadgeInfo> = {
  allrounder: { description: 'Train different muscle groups. Every group with a working set counts once.', title: 'All-rounder', unit: 'muscle groups' },
  bigday: { description: 'Move a lot in one session: the most volume (weight × reps) in a single workout.', title: 'Big day', unit: 'kg in one workout' },
  century: { description: 'Workouts with at least 100 working reps.', title: 'Century', unit: '100-rep workouts' },
  early: { description: 'Workouts started before 8 am.', title: 'Early bird', unit: 'before 8 am' },
  explorer: { description: 'Different exercises with at least one working set.', title: 'Explorer', unit: 'exercises' },
  heavy: { description: 'Your heaviest single working set on any exercise.', title: 'Heavy hitter', unit: 'kg set' },
  lifter: { description: 'Total volume (weight × reps) across every finished workout.', title: 'Lifter', unit: 'kg lifted' },
  logger: { description: 'Finished workouts.', title: 'Logger', unit: 'workouts' },
  marathon: { description: 'Sessions that ran 90 minutes or longer.', title: 'Long haul', unit: '90-min sessions' },
  night: { description: 'Workouts started at 9 pm or later.', title: 'Night owl', unit: 'after 9 pm' },
  quick: { description: 'Efficient sessions: 10 or more working sets in 45 minutes or less.', title: 'In and out', unit: 'quick sessions' },
  records: { description: 'Sets that beat your previous best estimated 1RM on that exercise.', title: 'Record breaker', unit: 'PRs' },
  reps: { description: 'Every working rep you have logged.', title: 'Rep counter', unit: 'reps' },
  rpe: { description: 'Working sets where you logged RPE. Knowing your effort makes progress easier to plan.', title: 'Self-aware', unit: 'sets with RPE' },
  scribe: { description: 'Exercises where you left a note.', title: 'Scribe', unit: 'notes' },
  sets: { description: 'Every working set you have completed.', title: 'Set machine', unit: 'sets' },
  streak: { description: 'The longest run of weeks in a row with at least one workout.', title: 'On a roll', unit: 'weeks in a row' },
  strong: {
    description: 'Your best strength level on any main lift, compared with other lifters at your bodyweight. Add your bodyweight in Profile settings.',
    title: 'Strong',
    unit: 'level',
  },
  warmup: { description: 'Warmup sets completed. They never count toward volume or records.', title: 'Warmed up', unit: 'warmups' },
  weekender: { description: 'Workouts on a Saturday or Sunday.', title: 'Weekender', unit: 'weekend workouts' },
};

/** Kept for screens that only need the unit label. */
export const BADGE_UNITS: Record<BadgeId, string> = Object.fromEntries(Object.entries(BADGE_INFO).map(([id, info]) => [id, info.unit])) as Record<BadgeId, string>;

function badge(id: BadgeId, value: number, steps: [number, number, number]): ProfileBadge {
  const [novice, regular, expert] = steps;
  const { description, title } = BADGE_INFO[id];
  const base = { description, id, steps, title, value };
  if (value < novice) {
    return { ...base, detail: 'Locked', next: novice, ring: value / novice, tier: 'locked' };
  }
  if (value < regular) {
    return { ...base, detail: 'Novice', next: regular, ring: value / regular, tier: 'novice' };
  }
  if (value < expert) {
    return { ...base, detail: 'Regular', next: expert, ring: value / expert, tier: 'regular' };
  }
  return { ...base, detail: 'Expert', next: null, ring: 1, tier: 'expert' };
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
