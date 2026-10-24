import { overallLevel, rateLift } from './strength';
import { assertClose, assertEqual, test } from './test-support';

test('at the reference bodyweight the thresholds are plain multiples', () => {
  const rating = rateLift('back-squat', 120, 80, 'male');
  assertClose(rating?.thresholdsKg[2] ?? 0, 120, 0.001);
  assertEqual(rating?.level, 'Intermediate');
  assertEqual(rating?.percentile, 50);
  assertEqual(rating?.nextLevel, 'Advanced');
  assertClose(rating?.nextKg ?? 0, 180, 0.001);
});

test('percentiles fall between the levels', () => {
  // Bench at 80 kg: Novice 60, Intermediate 100.
  assertEqual(rateLift('barbell-bench-press', 80, 80, 'male')?.percentile, 35);
  assertEqual(rateLift('barbell-bench-press', 80, 80, 'male')?.progress, 0.5);
  assertEqual(rateLift('barbell-bench-press', 20, 80, 'male')?.level, 'Below beginner');
  assertEqual(rateLift('deadlift', 400, 80, 'male')?.level, 'Elite');
  assertEqual((rateLift('deadlift', 400, 80, 'male')?.percentile ?? 0) <= 99, true);
});

test('heavier lifters need less per kilogram of bodyweight', () => {
  const light = rateLift('deadlift', 1, 60, 'male')?.thresholdsKg[2] ?? 0;
  const heavy = rateLift('deadlift', 1, 120, 'male')?.thresholdsKg[2] ?? 0;
  assertEqual(heavy > light, true);
  assertEqual(heavy / 120 < light / 60, true);
});

test('female standards and unknown lifts', () => {
  assertEqual(rateLift('barbell-bench-press', 50, 65, 'female')?.level, 'Intermediate');
  assertEqual(rateLift('cable-fly', 50, 65, 'female'), null);
  assertEqual(rateLift('back-squat', 100, 0, 'male'), null);
});

test('the overall level is the best percentile', () => {
  const ratings = [rateLift('back-squat', 100, 80, 'male'), rateLift('deadlift', 200, 80, 'male')].flatMap((rating) => (rating ? [rating] : []));
  assertEqual(overallLevel(ratings)?.exerciseId, 'deadlift');
  assertEqual(overallLevel([]), null);
});
