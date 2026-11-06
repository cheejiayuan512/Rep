import { advanceTour, TOUR_STEPS, type TourSignal } from './tutorial';
import { assertEqual, assertTrue, test } from './test-support';

test('the tour follows the workout it is describing', () => {
  const signals: TourSignal[] = ['workout-open', 'exercise-added', 'set-typed', 'set-completed', 'workout-finished'];
  let index = 0;
  for (const signal of signals) {
    const next = advanceTour(index, signal);
    assertTrue(next != null, `step ${index} advances on ${signal}`);
    index = next;
  }
  assertEqual(index, TOUR_STEPS.length - 1);
});

test('a signal from another step does not move the tour', () => {
  assertEqual(advanceTour(0, 'set-completed'), null);
  assertEqual(advanceTour(2, 'exercise-added'), null);
  assertEqual(advanceTour(4, 'set-typed'), null);
});

test('the last step has nothing left to wait for', () => {
  assertEqual(advanceTour(TOUR_STEPS.length - 1, 'workout-finished'), null);
  assertTrue(TOUR_STEPS[TOUR_STEPS.length - 1].advanceOn == null, 'the last step does not wait for an action');
});

test('every step says where it lives and what it points at', () => {
  const ids = new Set<string>();
  for (const step of TOUR_STEPS) {
    assertTrue(!ids.has(step.id), `duplicate step id ${step.id}`);
    ids.add(step.id);
    assertTrue(step.title.length > 0 && step.body.length > 0, `${step.id} has copy`);
    if (step.advanceOn != null) {
      assertTrue(step.target != null, `${step.id} waits for an action, so it highlights something`);
    }
  }
  assertEqual(TOUR_STEPS[0].screen, 'Workout');
  assertEqual(TOUR_STEPS[TOUR_STEPS.length - 1].screen, 'WorkoutComplete');
});

test('only the first step waits without a next button', () => {
  assertEqual(TOUR_STEPS[0].primary, 'none');
  for (const step of TOUR_STEPS.slice(1)) {
    assertTrue(step.primary !== 'none', `${step.id} can be dismissed with a button`);
  }
});
