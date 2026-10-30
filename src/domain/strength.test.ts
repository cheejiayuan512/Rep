import { ageFactor, bestWorkingOneRepMax, overallLevel, rateLift } from './strength';
import { assertClose, assertEqual, test } from './test-support';

test('typed working sets of 10 or fewer feed the strength mark', () => {
  assertClose(bestWorkingOneRepMax([{ reps: 5, setType: 'normal', weightKg: 100 }]) ?? 0, 100 * (1 + 5 / 30));
  assertEqual(bestWorkingOneRepMax([{ reps: 5, setType: 'warmup', weightKg: 200 }]), null);
  assertEqual(bestWorkingOneRepMax([{ reps: 12, setType: 'normal', weightKg: 100 }]), null);
  assertEqual(bestWorkingOneRepMax([{ reps: 1, setType: 'drop', weightKg: 80 }]), 80);
});

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

test('age 24–39 matches the raw table; younger and older need less', () => {
  assertEqual(ageFactor(null), 1);
  assertEqual(ageFactor(30), 1);
  assertEqual(ageFactor(16) < 1, true);
  assertEqual(ageFactor(60) < 1, true);
  const peak = rateLift('back-squat', 140, 80, 'male', 30);
  const older = rateLift('back-squat', 140, 80, 'male', 60);
  assertEqual(peak?.level, 'Intermediate');
  assertEqual((older?.thresholdsKg[2] ?? 0) < (peak?.thresholdsKg[2] ?? 0), true);
  assertEqual(older?.level, 'Advanced');
});

test('the overall level is the best percentile', () => {
  const ratings = [rateLift('back-squat', 100, 80, 'male'), rateLift('deadlift', 200, 80, 'male')].flatMap((rating) => (rating ? [rating] : []));
  assertEqual(overallLevel(ratings)?.exerciseId, 'deadlift');
  assertEqual(overallLevel([]), null);
});
