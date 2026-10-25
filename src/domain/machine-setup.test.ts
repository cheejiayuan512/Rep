/**
 * Which stacks appear in the switcher, and in what order.
 */
import { machineSetupOptions } from './machine-setup';
import { assertEqual, test } from './test-support';
import type { LoggedSet } from './types';

function logged(overrides: Partial<LoggedSet>): LoggedSet {
  return {
    completed: true,
    exerciseId: 'triceps-pushdown',
    machineSetup: null,
    performedAt: 1,
    position: 0,
    reps: 12,
    setType: 'normal',
    weightKg: 20,
    workoutId: 'w1',
    ...overrides,
  };
}

test('used stacks sort above unused brands, most recent first', () => {
  const options = machineSetupOptions([
    logged({ machineSetup: 'Precor', performedAt: 1, weightKg: 25, workoutId: 'a' }),
    logged({ machineSetup: 'Life Fitness', performedAt: 2, weightKg: 18, workoutId: 'b' }),
  ]);
  assertEqual(
    options.filter((option) => option.usedAt != null).map((option) => option.setup),
    ['Life Fitness', 'Precor'],
  );
  assertEqual(options.find((option) => option.setup === 'Life Fitness')?.last?.weightKg, 18);
  assertEqual(options.find((option) => option.setup === 'Hammer Strength')?.last, null);
  assertEqual(options[options.length - 1]?.setup, null);
});

test('a stack with only a warmup still counts as used', () => {
  const options = machineSetupOptions([logged({ machineSetup: 'Precor', setType: 'warmup', weightKg: 10 })]);
  assertEqual(options.find((option) => option.setup === 'Precor')?.last?.weightKg, 10);
});
