import { backspaceDuration, formatCardioEffort, isCardioExercise, parseDurationText, typeDurationKey } from './cardio';
import { assertEqual, test } from './test-support';

test('a run is cardio and a squat is not', () => {
  assertEqual(isCardioExercise('running', 'Running'), true);
  assertEqual(isCardioExercise('custom', 'Easy Run'), true);
  assertEqual(isCardioExercise('custom', 'Stationary Bike'), true);
  assertEqual(isCardioExercise('back-squat', 'Back Squat'), false);
  assertEqual(isCardioExercise('custom', 'Walking Lunges'), false);
  assertEqual(isCardioExercise('custom', 'Farmer Walk'), false);
  assertEqual(isCardioExercise('barbell-row', 'Barbell Row'), false);
});

test('time is entered like a clock', () => {
  assertEqual(typeDurationKey('', '1', true), '0:01');
  assertEqual(typeDurationKey('0:01', '2', false), '0:12');
  assertEqual(typeDurationKey('0:12', '3', false), '1:23');
  assertEqual(typeDurationKey('1:23', '0', false), '12:30');
  assertEqual(parseDurationText('12:30'), 12 * 60 + 30);
  assertEqual(parseDurationText('1:05:00'), 3900);
  assertEqual(backspaceDuration('12:30', false), '1:23');
  assertEqual(typeDurationKey('0:16', '0', false), null);
});

test('a cardio effort reads as time and distance', () => {
  assertEqual(formatCardioEffort(750, 5, 'kg'), '12:30 · 5 km');
  assertEqual(formatCardioEffort(750, null, 'kg'), '12:30');
  assertEqual(formatCardioEffort(null, null, 'kg'), '—');
});
