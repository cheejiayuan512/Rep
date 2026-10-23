import { estimateAll, percentTable } from './one-rep-max';
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
