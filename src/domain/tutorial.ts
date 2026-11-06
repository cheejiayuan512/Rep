/**
 * The first-run tour. Each step belongs to one screen and names the element it
 * highlights. A step with `advanceOn` moves on by itself when the user does the
 * action, so the tour follows a real session instead of sitting on the home
 * screen. `primary` says what the card's right button does:
 * - `next`: move to the next step on this screen
 * - `done`: end the tour
 * - `none`: wait for the highlighted action, so the card only offers Skip
 */
export type TourScreen = 'Workout' | 'ActiveWorkout' | 'WorkoutComplete';

export type TourSignal = 'workout-open' | 'exercise-added' | 'set-typed' | 'set-completed' | 'workout-finished';

export interface TourStep {
  id: string;
  screen: TourScreen;
  /** Element id registered by `useTutorialTarget`, or null for a centred card. */
  target: string | null;
  title: string;
  body: string;
  advanceOn: TourSignal | null;
  primary: 'next' | 'done' | 'none';
}

export const TOUR_STEPS: readonly TourStep[] = [
  {
    advanceOn: 'workout-open',
    body: 'Tap Start workout to open an empty session. A routine starts the same way, with its exercises already on the page.',
    id: 'start',
    primary: 'none',
    screen: 'Workout',
    target: 'home-start',
    title: 'Start a workout',
  },
  {
    advanceOn: 'exercise-added',
    body: 'Tap a quick add chip, or Add exercise to search the whole library. Each exercise becomes one card.',
    id: 'add-exercise',
    primary: 'next',
    screen: 'ActiveWorkout',
    target: 'workout-quick-add',
    title: 'Add an exercise',
  },
  {
    advanceOn: 'set-typed',
    body: 'Tap the weight box, type the load, then Next for reps. Previous copies the same set from last time.',
    id: 'log-set',
    primary: 'next',
    screen: 'ActiveWorkout',
    target: 'workout-first-set',
    title: 'Log the numbers',
  },
  {
    advanceOn: 'set-completed',
    body: 'The check starts the rest timer. Warmups and sets you have not checked stay out of your totals and records.',
    id: 'check-set',
    primary: 'next',
    screen: 'ActiveWorkout',
    target: 'workout-first-set',
    title: 'Check the set',
  },
  {
    advanceOn: 'workout-finished',
    body: 'Finish saves the session and shows the recap: duration, volume, best sets, PRs, and XP. Skip the rest bar first.',
    id: 'finish',
    primary: 'done',
    screen: 'ActiveWorkout',
    target: 'workout-finish',
    title: 'Finish',
  },
  {
    advanceOn: null,
    body: 'History keeps every finished session and Progress charts it. Open this tour again from Profile, Tutorial, Show again.',
    id: 'review',
    primary: 'done',
    screen: 'WorkoutComplete',
    target: null,
    title: 'Keep it',
  },
];

/** The step after `index` when `signal` is the one that step waits for. */
export function advanceTour(index: number, signal: TourSignal): number | null {
  const step = TOUR_STEPS[index];
  if (!step || step.advanceOn !== signal) {
    return null;
  }
  return index + 1 < TOUR_STEPS.length ? index + 1 : null;
}
