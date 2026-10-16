/**
 * Personal records, estimated 1RM, and the chart numbers.
 */
import { bestsFromScored, buildSessionStats, chartValues, detectRecord, estimateOneRepMax, latestSessionSets, recordCardsFromSets, scoreLoggedSet, type ScoredSet } from './metrics';
import { assertClose, assertEqual, assertTrue, test } from './test-support';
import type { LoggedSet } from './types';

function logged(overrides: Partial<LoggedSet>): LoggedSet {
  return {
    completed: true,
    exerciseId: 'barbell-bench-press',
    performedAt: 1,
    position: 0,
    reps: 5,
    setType: 'normal',
    weightKg: 100,
    workoutId: 'workout-1',
    ...overrides,
  };
}

function scored(overrides: Partial<LoggedSet>): ScoredSet {
  const set = scoreLoggedSet(logged(overrides));
  if (!set) {
    throw new Error('expected a scored set');
  }
  return set;
}

test('a single rep is the weight itself', () => {
  assertEqual(estimateOneRepMax(100, 1), 100);
});

test('more reps use the Epley formula', () => {
  assertClose(estimateOneRepMax(100, 5), 100 * (1 + 5 / 30));
});

test('warmups, incomplete sets, and empty reps do not score', () => {
  assertEqual(scoreLoggedSet(logged({ setType: 'warmup', weightKg: 200 })), null);
  assertEqual(scoreLoggedSet(logged({ completed: false })), null);
  assertEqual(scoreLoggedSet(logged({ reps: 0 })), null);
  assertEqual(scoreLoggedSet(logged({ reps: null })), null);
});

test('bodyweight counts reps and has no estimated max', () => {
  const bodyweight = scored({ reps: 10, weightKg: 0 });
  assertEqual(bodyweight.oneRepMaxKg, null);
  assertEqual(bodyweight.reps, 10);
});

test('a heavier set is announced as an estimated 1RM record', () => {
  const prior = scored({ performedAt: 1, reps: 5, weightKg: 100 });
  const current = scored({ performedAt: 2, reps: 5, weightKg: 102.5 });
  assertEqual(detectRecord(current, [prior], 'kg')?.kind, 'oneRepMax');
});

test('the first logged set is stored but not announced', () => {
  assertEqual(detectRecord(scored({ reps: 5, weightKg: 100 }), [], 'kg'), null);
});

test('a tiny increase inside the epsilon is not a record', () => {
  const prior = scored({ performedAt: 1, reps: 5, weightKg: 100 });
  const current = scored({ performedAt: 2, reps: 5, weightKg: 100.04 });
  assertEqual(detectRecord(current, [prior], 'kg'), null);
});

test('volume can be a record when the estimated max did not rise', () => {
  const prior = scored({ performedAt: 1, reps: 5, weightKg: 120 });
  const current = scored({ performedAt: 2, reps: 10, weightKg: 100 });
  assertEqual(detectRecord(current, [prior], 'kg')?.kind, 'volume');
});

test('a rep record is announced only after weight and volume do not win', () => {
  const prior = scored({ performedAt: 1, reps: 5, weightKg: 100 });
  const current = scored({ performedAt: 2, reps: 6, weightKg: 40 });
  assertEqual(detectRecord(current, [prior], 'kg')?.kind, 'reps');
});

test('heaviest weight and best volume are tracked separately', () => {
  const best = bestsFromScored([scored({ performedAt: 1, reps: 5, weightKg: 120 }), scored({ performedAt: 2, reps: 10, weightKg: 100 })]);
  assertEqual(best.volume?.weightKg, 100);
  assertEqual(best.heaviest?.weightKg, 120);
});

test('the latest session keeps its completed sets in order', () => {
  const sets = latestSessionSets([
    logged({ performedAt: 1, position: 1, workoutId: 'older' }),
    logged({ completed: false, performedAt: 2, position: 1, weightKg: 50, workoutId: 'newer' }),
    logged({ performedAt: 2, position: 2, weightKg: 90, workoutId: 'newer' }),
    logged({ performedAt: 2, position: 0, weightKg: 70, workoutId: 'newer' }),
  ]);
  assertEqual(
    sets.map((set) => set.weightKg),
    [70, 90],
  );
});

test('two sessions become two chart points in kilograms', () => {
  const sessions = buildSessionStats([
    logged({ performedAt: 1, reps: 8, weightKg: 80, workoutId: 'first' }),
    logged({ performedAt: 2, reps: 8, weightKg: 85, workoutId: 'second' }),
  ]);
  const points = chartValues(sessions, 'volume', 'kg');
  assertEqual(points.map((point) => point.value), [640, 680]);
});

test('record cards use the best estimated max', () => {
  const cards = recordCardsFromSets(
    [logged({ performedAt: 1, reps: 8, weightKg: 80 }), logged({ performedAt: 2, reps: 8, weightKg: 85 })],
    'kg',
  );
  const estimated = cards.find((card) => card.label === 'Est. 1RM');
  assertTrue(estimated != null, 'missing estimated max card');
  assertEqual(estimated.value, '107.7 kg');
});
