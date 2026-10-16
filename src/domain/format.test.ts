/**
 * The words shown on a set, a clock, and a workout summary.
 */
import { formatClock, formatDuration, formatLoggedLoad, formatWorkoutWhen, summarizeNames } from './format';
import { assertEqual, assertTrue, test } from './test-support';

const noon = new Date(2026, 9, 16, 12, 0, 0).getTime();

test('an empty set is a dash', () => {
  assertEqual(formatLoggedLoad(null, null, 'kg'), '—');
});

test('bodyweight and warmup sets get a prefix', () => {
  assertEqual(formatLoggedLoad(0, 8, 'kg'), 'BW × 8');
  assertEqual(formatLoggedLoad(80, 8, 'kg', true), 'W 80 × 8');
});

test('the clock rolls into hours', () => {
  assertEqual(formatClock(95), '1:35');
  assertEqual(formatClock(3661), '1:01:01');
  assertEqual(formatClock(-5), '0:00');
});

test('duration is at least one minute', () => {
  assertEqual(formatDuration(0, 20_000), '1 min');
  assertEqual(formatDuration(0, 30 * 60_000), '30 min');
  assertEqual(formatDuration(0, 90 * 60_000), '1 hr 30 min');
  assertEqual(formatDuration(0, 120 * 60_000), '2 hr');
});

test('today and yesterday are labeled from the supplied clock', () => {
  const morning = new Date(2026, 9, 16, 9, 35, 0).getTime();
  const yesterday = new Date(2026, 9, 15, 9, 35, 0).getTime();
  assertTrue(formatWorkoutWhen(morning, noon).startsWith('Today · '), 'expected today');
  assertTrue(formatWorkoutWhen(yesterday, noon).startsWith('Yesterday · '), 'expected yesterday');
});

test('long exercise lists are shortened', () => {
  assertEqual(summarizeNames([]), 'No exercises yet');
  assertEqual(summarizeNames(['Squat', 'Bench']), 'Squat, Bench');
  assertEqual(summarizeNames(['Squat', 'Bench', 'Row', 'Curl']), 'Squat, Bench, Row +1');
});
