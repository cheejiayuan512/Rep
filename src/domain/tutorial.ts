/**
 * The first-run tour. Each step belongs to one screen and names the element it
 * highlights. A step moves on only when the user does the action it describes;
 * there is no Next button. `primary` says what the card's right button does:
 * - `done`: end the tour (the last step)
 * - `none`: wait for the highlighted action, so the card only offers Skip
 */
export type TourScreen = 'Workout' | 'ActiveWorkout' | 'WorkoutComplete';

export type TourSignal = 'workout-open' | 'set-completed' | 'workout-finished';

export interface TourStep {
  id: string;
  screen: TourScreen;
  /** Element id registered by `useTutorialTarget`, or null for a centred card. */
  target: string | null;
  title: string;
  body: string;
  advanceOn: TourSignal | null;
  primary: 'done' | 'none';
}

export const TOUR_STEPS: readonly TourStep[] = [
  {
    advanceOn: 'workout-open',
    body: 'Tap Start workout. The tour opens a session with one card already filled in, so you can try the loop without typing.',
    id: 'start',
    primary: 'none',
    screen: 'Workout',
    target: 'home-start',
    title: 'Start a workout',
  },
  {
    advanceOn: 'set-completed',
    body: 'That card is a placeholder. Change it if you like, then tap the check. The rest timer starts by itself.',
    id: 'check-set',
    primary: 'none',
    screen: 'ActiveWorkout',
    target: 'workout-first-set',
    title: 'Check the set',
  },
  {
    advanceOn: 'workout-finished',
    body: 'Tap Finish to save the session and see the recap: duration, volume, best sets, PRs, and XP. Skip the rest bar first.',
    id: 'finish',
    primary: 'none',
    screen: 'ActiveWorkout',
    target: 'workout-finish',
    title: 'Finish',
  },
  {
    advanceOn: null,
    body: 'That is the whole loop: start, check a set, finish. History keeps every session and Progress charts it. Open this tour again from Profile, Tutorial, Show again.',
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
