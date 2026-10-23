import { estimateAll, estimateFromSets, percentTable } from './one-rep-max';
import { assertClose, assertEqual, test } from './test-support';

test('a single is its own 1RM in every formula', () => {
  const estimate = estimateAll(100, 1);
  assertClose(estimate?.epleyKg ?? 0, 100);
  assertClose(estimate?.brzyckiKg ?? 0, 100);
  assertClose(estimate?.lombardiKg ?? 0, 100);
  assertClose(estimate?.averageKg ?? 0, 100);
});

test('five reps at 100 kg lands near 113–117 kg', () => {
  const estimate = estimateAll(100, 5);
  assertClose(estimate?.epleyKg ?? 0, 116.6667, 0.001);
  assertClose(estimate?.brzyckiKg ?? 0, 112.5, 0.001);
  assertClose(estimate?.lombardiKg ?? 0, 117.4619, 0.001);
});

test('bad input gives no estimate', () => {
  assertEqual(estimateAll(0, 5), null);
  assertEqual(estimateAll(100, 0), null);
  assertEqual(estimateAll(100, 21), null);
  assertEqual(estimateAll(100, 2.5), null);
});

test('the percent table starts at the 1RM for one rep', () => {
  const table = percentTable(200);
  assertEqual(table[0], { percent: 100, reps: 1, weightKg: 200 });
  assertEqual(table.find((row) => row.percent === 80)?.reps, 8);
  assertClose(table.find((row) => row.percent === 80)?.weightKg ?? 0, 160);
});

test('a session of identical sets estimates the same as one of them', () => {
  const session = estimateFromSets([
    { reps: 5, rpe: null, weightKg: 100 },
    { reps: 5, rpe: null, weightKg: 100 },
    { reps: 5, rpe: null, weightKg: 100 },
  ]);
  assertClose(session?.sessionKg ?? 0, estimateAll(100, 5)?.averageKg ?? 0, 0.001);
  assertEqual(session?.used, 3);
});

test('warmups and back-off sets do not drag a session estimate down', () => {
  const session = estimateFromSets([
    { reps: 5, rpe: null, weightKg: 60 },
    { reps: 3, rpe: null, weightKg: 120 },
    { reps: 3, rpe: null, weightKg: 120 },
    { reps: 8, rpe: null, weightKg: 90 },
  ]);
  assertEqual(session?.used, 2);
  assertClose(session?.sessionKg ?? 0, estimateAll(120, 3)?.averageKg ?? 0, 0.001);
});

test('RPE adds reps in reserve to the estimate', () => {
  const plain = estimateFromSets([{ reps: 5, rpe: null, weightKg: 100 }]);
  const easy = estimateFromSets([{ reps: 5, rpe: 8, weightKg: 100 }]);
  assertClose(easy?.sessionKg ?? 0, estimateAll(100, 7)?.averageKg ?? 0, 0.001);
  assertEqual((easy?.sessionKg ?? 0) > (plain?.sessionKg ?? 0), true);
  assertClose(estimateFromSets([{ reps: 5, rpe: 4, weightKg: 100 }])?.sessionKg ?? 0, plain?.sessionKg ?? 0, 0.001);
});

test('a session with nothing usable has no estimate', () => {
  assertEqual(estimateFromSets([]), null);
  assertEqual(estimateFromSets([{ reps: 0, rpe: null, weightKg: 100 }]), null);
  assertEqual(estimateFromSets([{ reps: 5, rpe: null, weightKg: 0 }])?.perSetKg ?? null, null);
});
