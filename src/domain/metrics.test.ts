import { bestsFromScored, detectRecord, estimateOneRepMax, scoreLoggedSet, type ScoredSet } from './metrics';
import type { LoggedSet } from './types';
import { displayToKg, kgToDisplay } from './units';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const epley = estimateOneRepMax(100, 5);
assert(Math.abs(epley - 100 * (1 + 5 / 30)) < 0.0001, 'epley formula');
assert(estimateOneRepMax(100, 1) === 100, 'single rep is the weight');

const pounds = kgToDisplay(100, 'lb');
assert(Math.abs(pounds - 220.46226218) < 0.0001, 'kg to lb');
assert(Math.abs(displayToKg(225, 'lb') - 225 / 2.2046226218) < 0.0001, 'lb to kg');

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

const prior = scored({ performedAt: 1, reps: 5, weightKg: 100 });
const current = scored({ performedAt: 2, reps: 5, weightKg: 102.5 });
assert(detectRecord(current, [prior], 'kg')?.kind === 'oneRepMax', 'heavier set is a 1RM record');
assert(scoreLoggedSet(logged({ setType: 'warmup', weightKg: 200 })) == null, 'warmups do not score');

const bodyweight = scored({ reps: 10, weightKg: 0 });
assert(bodyweight.oneRepMaxKg == null, 'bodyweight has no estimated max');
assert(bodyweight.reps === 10, 'bodyweight reps still count');

const volumeBest = bestsFromScored([scored({ performedAt: 1, reps: 5, weightKg: 120 }), scored({ performedAt: 2, reps: 10, weightKg: 100 })]);
assert(volumeBest.volume?.weightKg === 100, 'best volume is the heavier total');
assert(volumeBest.heaviest?.weightKg === 120, 'heaviest weight is tracked separately');
assert(detectRecord(prior, [], 'kg') == null, 'first logged set is not announced as a record');

console.log('metrics ok');
