import { longestStreak } from './profile';
import { buildAnalysis, buildHomeStats, repRange, type AnalysisSet, type StatWorkout } from './stats';
import { assertClose, assertEqual, test } from './test-support';

const DAY = 86400000;
// Thursday 22 Oct 2026, noon.
const NOW = new Date(2026, 9, 22, 12).getTime();

function workout(id: string, daysAgo: number, overrides: Partial<StatWorkout> = {}): StatWorkout {
  const finishedAt = NOW - daysAgo * DAY;
  return { finishedAt, id, setCount: 10, startedAt: finishedAt - 60 * 60000, volumeKg: 1000, ...overrides };
}

function set(workoutId: string, daysAgo: number, overrides: Partial<AnalysisSet> = {}): AnalysisSet {
  return {
    exerciseId: 'back-squat',
    exerciseName: 'Back Squat',
    muscleGroup: 'Quads',
    performedAt: NOW - daysAgo * DAY,
    reps: 5,
    rpe: null,
    weightKg: 100,
    workoutId,
    ...overrides,
  };
}

test('home stats split this week from last week', () => {
  // Thursday, Tuesday, then the Thursday before.
  const stats = buildHomeStats([workout('a', 0), workout('b', 2), workout('c', 7)], NOW);
  assertEqual(stats.thisWeek.workouts, 2);
  assertEqual(stats.thisWeek.volumeKg, 2000);
  assertEqual(stats.thisWeek.minutes, 120);
  assertEqual(stats.lastWeek.workouts, 1);
  assertEqual(stats.streakWeeks, 2);
});

test('a streak survives an empty current week but not an empty last week', () => {
  assertEqual(buildHomeStats([workout('a', 7), workout('b', 14)], NOW).streakWeeks, 2);
  assertEqual(buildHomeStats([workout('a', 14)], NOW).streakWeeks, 0);
  assertEqual(buildHomeStats([], NOW).streakWeeks, 0);
});

test('the longest streak counts consecutive weeks', () => {
  const finished = [0, 7, 14, 35, 42].map((days) => NOW - days * DAY);
  assertEqual(longestStreak(finished), 3);
  assertEqual(longestStreak([]), 0);
});

test('rep ranges split at 5 and 12', () => {
  assertEqual(repRange(5), 'strength');
  assertEqual(repRange(6), 'hypertrophy');
  assertEqual(repRange(12), 'hypertrophy');
  assertEqual(repRange(13), 'endurance');
});

test('analysis compares the period with the one before it', () => {
  const analysis = buildAnalysis(
    {
      sets: [
        set('a', 1, { rpe: 8 }),
        set('a', 1, { exerciseId: 'bench', exerciseName: 'Bench', muscleGroup: 'Chest', reps: 10, weightKg: 60 }),
        set('b', 40, { weightKg: 90 }),
      ],
      workouts: [workout('a', 1, { volumeKg: 1100 }), workout('b', 40)],
    },
    NOW,
    30,
  );
  assertEqual(analysis.workouts, 1);
  assertEqual(analysis.workoutsChange, 0);
  assertEqual(analysis.volumeKg, 1100);
  assertClose(analysis.volumeChange ?? 0, 1100 / 450 - 1);
  assertEqual(analysis.muscles.map((row) => row.id), ['Quads', 'Chest']);
  assertEqual(analysis.repRanges.find((row) => row.id === 'hypertrophy')?.sets, 1);
  assertEqual(analysis.averageRpe, 8);
  assertEqual(analysis.rpeShare, 0.5);
  const squat = analysis.lifts.find((lift) => lift.exerciseId === 'back-squat');
  assertClose(squat?.bestKg ?? 0, 116.6667, 0.001);
  assertClose(squat?.previousKg ?? 0, 105, 0.001);
  assertEqual(analysis.weekdays.reduce((total, count) => total + count, 0), 1);
});

test('an empty period has no changes to report', () => {
  const analysis = buildAnalysis({ sets: [], workouts: [] }, NOW, 30);
  assertEqual(analysis.volumeChange, null);
  assertEqual(analysis.averageRpe, null);
  assertEqual(analysis.lifts, []);
});
