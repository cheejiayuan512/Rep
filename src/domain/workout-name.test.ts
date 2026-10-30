import { assertEqual, test } from './test-support';
import { isDefaultWorkoutName, suggestWorkoutName, timeOfDayLabel } from './workout-name';

function atHour(hour: number): number {
  return new Date(2026, 9, 31, hour, 15, 0, 0).getTime();
}

test('the placeholder name is the only one that gets replaced', () => {
  assertEqual(isDefaultWorkoutName('Workout'), true);
  assertEqual(isDefaultWorkoutName('  '), true);
  assertEqual(isDefaultWorkoutName('Push day'), false);
});

test('the day is split into morning, afternoon, evening, and night', () => {
  assertEqual(timeOfDayLabel(atHour(4)), 'Night');
  assertEqual(timeOfDayLabel(atHour(5)), 'Morning');
  assertEqual(timeOfDayLabel(atHour(11)), 'Morning');
  assertEqual(timeOfDayLabel(atHour(12)), 'Afternoon');
  assertEqual(timeOfDayLabel(atHour(16)), 'Afternoon');
  assertEqual(timeOfDayLabel(atHour(17)), 'Evening');
  assertEqual(timeOfDayLabel(atHour(20)), 'Evening');
  assertEqual(timeOfDayLabel(atHour(21)), 'Night');
});

test('a finished workout is named from the time and the muscles', () => {
  assertEqual(suggestWorkoutName(atHour(9), ['Chest']), 'Morning Chest');
  assertEqual(suggestWorkoutName(atHour(14), ['Quads', 'Hamstrings']), 'Afternoon Quads and Hamstrings');
  assertEqual(suggestWorkoutName(atHour(18), ['Chest', 'Shoulders', 'Triceps']), 'Evening Chest, Shoulders, and Triceps');
  assertEqual(suggestWorkoutName(atHour(22), ['Chest', 'Back', 'Quads', 'Core']), 'Night Full body');
  assertEqual(suggestWorkoutName(atHour(7), []), 'Morning workout');
  assertEqual(suggestWorkoutName(atHour(8), ['Chest', 'Chest', 'Back']), 'Morning Chest and Back');
});
