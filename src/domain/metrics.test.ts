/**
 * Personal records, estimated 1RM, and the chart numbers.
 */
import { bestsFromScored, buildSessionStats, chartValues, countOneRepMaxRecords, detectRecord, detectRecords, estimateOneRepMax, filterSetsBySetup, latestSessionSets, recordCardsFromSets, recordSetIds, scoreLoggedSet, type ScoredSet } from './metrics';
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
    machineSetup: null,
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
  assertEqual(scoreLoggedSet(logged({ setType: 'drop' }))?.weightKg, 100);
  assertEqual(scoreLoggedSet(logged({ setType: 'failure', reps: 8 }))?.reps, 8);
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

test('the same load at a lower RPE is a record', () => {
  const prior = scored({ performedAt: 1, reps: 5, rpe: 8, weightKg: 100 });
  const current = scored({ performedAt: 2, reps: 5, rpe: 7, weightKg: 100 });
  assertEqual(detectRecords(current, [prior], 'kg').map((hit) => hit.kind), ['rpe']);
});

test('an easier RPE on a lighter set is not a record', () => {
  const prior = scored({ performedAt: 1, reps: 5, rpe: 8, weightKg: 100 });
  const current = scored({ performedAt: 2, reps: 5, rpe: 6, weightKg: 80 });
  assertEqual(detectRecord(current, [prior], 'kg'), null);
});

test('the first set with RPE is stored but not announced', () => {
  assertEqual(detectRecord(scored({ reps: 5, rpe: 8, weightKg: 100 }), [], 'kg'), null);
});

test('a rep record is announced only after weight and volume do not win', () => {
  const prior = scored({ performedAt: 1, reps: 5, weightKg: 100 });
  const current = scored({ performedAt: 2, reps: 6, weightKg: 40 });
  assertEqual(detectRecord(current, [prior], 'kg')?.kind, 'reps');
});

test('one set can beat weight, volume, and reps at once', () => {
  const prior = scored({ performedAt: 1, reps: 5, weightKg: 100 });
  const current = scored({ performedAt: 2, reps: 6, weightKg: 105 });
  assertEqual(
    detectRecords(current, [prior], 'kg').map((hit) => hit.kind),
    ['oneRepMax', 'heaviest', 'volume', 'reps'],
  );
});

test('a second bodyweight set is a session record when one set was the best session', () => {
  const history = scored({ performedAt: 1, reps: 8, weightKg: 0, workoutId: 'last' });
  const first = scored({ performedAt: 2, reps: 8, weightKg: 0, workoutId: 'today' });
  const second = scored({ performedAt: 3, reps: 8, weightKg: 0, workoutId: 'today' });
  assertEqual(detectRecords(first, [history], 'kg'), []);
  assertEqual(detectRecords(second, [history, first], 'kg').map((hit) => hit.kind), ['session']);
  assertEqual(detectRecords(second, [history, first], 'kg')[0]?.title, 'Session PR · 16 reps · 2 sets');
});

test('one bodyweight set that already beats the old session is not also a session record', () => {
  const history = scored({ performedAt: 1, reps: 8, weightKg: 0, workoutId: 'last' });
  const current = scored({ performedAt: 2, reps: 10, weightKg: 0, workoutId: 'today' });
  assertEqual(
    detectRecords(current, [history], 'kg').map((hit) => hit.kind),
    ['reps'],
  );
});

test('a second single is a session record when one single was the best session', () => {
  const history = scored({ performedAt: 1, reps: 1, weightKg: 100, workoutId: 'last' });
  const first = scored({ performedAt: 2, reps: 1, weightKg: 100, workoutId: 'today' });
  const second = scored({ performedAt: 3, reps: 1, weightKg: 100, workoutId: 'today' });
  assertEqual(detectRecords(first, [history], 'kg'), []);
  assertEqual(detectRecords(second, [history, first], 'kg').map((hit) => hit.kind), ['session']);
  assertEqual(detectRecords(second, [history, first], 'kg')[0]?.title, 'Session PR · 200 kg · 2 sets');
  const ids = recordSetIds(
    [
      { id: 'first', scored: first },
      { id: 'second', scored: second },
    ],
    [history],
  );
  assertEqual([...ids], ['second']);
});

test('one set that already beats the old session is not also a session record', () => {
  const history = scored({ performedAt: 1, reps: 1, weightKg: 100, workoutId: 'last' });
  const current = scored({ performedAt: 2, reps: 1, weightKg: 110, workoutId: 'today' });
  assertEqual(
    detectRecords(current, [history], 'kg').map((hit) => hit.kind),
    ['oneRepMax', 'heaviest', 'volume'],
  );
});

test('a fourth matching set is a session record', () => {
  const history = [1, 2, 3].map((position) => scored({ performedAt: position, position, reps: 5, weightKg: 100, workoutId: 'last' }));
  const today = [4, 5, 6, 7].map((position) => scored({ performedAt: position, position, reps: 5, weightKg: 100, workoutId: 'today' }));
  const fourth = today[3];
  assertTrue(fourth != null, 'expected a fourth set');
  assertEqual(detectRecords(fourth, [...history, ...today.slice(0, 3)], 'kg').map((hit) => hit.kind), ['session']);
});

test('record stars skip the first ever set and warmups', () => {
  const ids = recordSetIds(
    [
      { id: 'first', scored: scored({ performedAt: 1, reps: 5, weightKg: 100 }) },
      { id: 'warmup', scored: scoreLoggedSet(logged({ setType: 'warmup', weightKg: 200 })) },
      { id: 'heavier', scored: scored({ performedAt: 2, reps: 5, weightKg: 110 }) },
      { id: 'lighter', scored: scored({ performedAt: 3, reps: 5, weightKg: 90 }) },
    ],
    [],
  );
  assertEqual([...ids], ['heavier']);
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

test('previous and records stay on the same stack', () => {
  const precor = logged({ machineSetup: 'Precor', performedAt: 1, weightKg: 25, workoutId: 'a' });
  const life = logged({ machineSetup: 'Life Fitness', performedAt: 2, weightKg: 18, workoutId: 'b' });
  assertEqual(filterSetsBySetup([precor, life], 'Life Fitness').map((set) => set.weightKg), [18]);
  assertEqual(latestSessionSets(filterSetsBySetup([precor, life], 'Precor'))[0]?.weightKg, 25);
  const current = scoreLoggedSet(logged({ machineSetup: 'Life Fitness', performedAt: 3, weightKg: 20, workoutId: 'c' }));
  assertTrue(current != null, 'expected a scored set');
  const lifePrior = [scoreLoggedSet(life)].filter((set): set is ScoredSet => set != null);
  const mixedPrior = [scoreLoggedSet(precor), scoreLoggedSet(life)].filter((set): set is ScoredSet => set != null);
  assertEqual(detectRecord(current, lifePrior, 'kg')?.kind, 'oneRepMax');
  assertEqual(detectRecord(current, mixedPrior, 'kg'), null);
});

test('record counting skips the first set and ties', () => {
  const sets = [
    scored({ reps: 5, weightKg: 100 }),
    scored({ reps: 5, weightKg: 100 }),
    scored({ reps: 5, weightKg: 105 }),
    scored({ reps: 3, weightKg: 100 }),
    scored({ reps: 1, weightKg: 130 }),
  ];
  assertEqual(countOneRepMaxRecords(sets), 2);
  assertEqual(countOneRepMaxRecords([]), 0);
});
