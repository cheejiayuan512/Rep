/**
 * Throws away the open workout from outside the workout screen
 * (home / routines / history), including the Live Activity and rest alert.
 */
import { cancelRestEnd } from '../../components/rest-notification';
import { endWorkoutActivity } from '../../components/workout-live-activity';
import { discardWorkout } from '../../data/repository';
import { clearWorkoutActivityState } from './workout-activity-sync';

export async function discardInProgressWorkout(workoutId: string): Promise<void> {
  await discardWorkout(workoutId);
  clearWorkoutActivityState(workoutId);
  void cancelRestEnd();
  endWorkoutActivity();
}
