/**
 * Keeps the open workout visible outside the app for as long as it is open:
 * the next set, a Done button, and the rest countdown or elapsed time.
 * On iOS it is a Live Activity on the Lock Screen and in the Dynamic Island.
 * On Android it is an ongoing notification, promoted to a Live Update
 * (status bar chip) on Android 16. Web and Expo Go skip it quietly; the rest
 * notification in rest-notification.ts stays the fallback everywhere.
 */
import { Platform } from 'react-native';
import type { LiveActivityFactory } from 'expo-widgets';

import { RestLiveUpdate } from '../../modules/rest-live-update';
import type { WorkoutActivityProps } from './workout-activity';

export type { WorkoutActivityProps } from './workout-activity';

/** Matches the Done button's `target` in workout-activity.tsx and the Android action. */
const COMPLETE_SET_TARGET = 'complete-set';

let factory: LiveActivityFactory<WorkoutActivityProps> | null | undefined;

function workoutActivity(): LiveActivityFactory<WorkoutActivityProps> | null {
  if (factory !== undefined) {
    return factory;
  }
  factory = null;
  if (Platform.OS !== 'ios') {
    return null;
  }
  try {
    // Loaded lazily: importing it where the native module is missing would throw at startup.
    factory = (require('./workout-activity') as typeof import('./workout-activity')).default;
  } catch {
    factory = null;
  }
  return factory;
}

/** Shows or updates the activity, reusing a running one so only one is ever on screen. */
export function showWorkoutActivity(props: WorkoutActivityProps): void {
  const resting = props.restEndsAt > Date.now();
  if (Platform.OS === 'android') {
    try {
      RestLiveUpdate?.show({
        actionLabel: props.canComplete ? 'Done set' : '',
        body: [props.exerciseName, props.setLabel, props.nextSet].filter((part) => part.length > 0).join(' · '),
        // One-word titles leave room for the timer beside them and in Samsung's Now Bar pill.
        idleTitle: 'Workout',
        restEndsAt: resting ? props.restEndsAt : 0,
        restTitle: 'Rest',
        workoutStartedAt: props.workoutStartedAt,
      });
    } catch {
      // Notifications are blocked for Rep.
    }
    return;
  }
  const activities = workoutActivity();
  if (!activities) {
    return;
  }
  const staleDate = resting ? new Date(props.restEndsAt) : undefined;
  try {
    const [current, ...extra] = activities.getInstances();
    extra.forEach((activity) => {
      activity.end('immediate').catch(() => undefined);
    });
    if (current) {
      current.update(props, staleDate).catch(() => undefined);
      return;
    }
    activities.start(props, undefined, staleDate);
  } catch {
    // Live Activities are off in Settings, or the device is older than iOS 16.2.
  }
}

export function endWorkoutActivity(): void {
  if (Platform.OS === 'android') {
    try {
      RestLiveUpdate?.end();
    } catch {
      // Nothing showing.
    }
    return;
  }
  const activities = workoutActivity();
  if (!activities) {
    return;
  }
  try {
    activities.getInstances().forEach((activity) => {
      activity.end('immediate').catch(() => undefined);
    });
  } catch {
    // Nothing running.
  }
}

/** Calls `listener` when Done is tapped on the Lock Screen, Dynamic Island, or notification. */
export function addCompleteSetListener(listener: () => void): { remove: () => void } {
  try {
    if (Platform.OS === 'android' && RestLiveUpdate) {
      return RestLiveUpdate.addListener('onAction', (event) => {
        if (event.action === COMPLETE_SET_TARGET) {
          listener();
        }
      });
    }
    if (Platform.OS === 'ios' && workoutActivity()) {
      const widgets = require('expo-widgets') as typeof import('expo-widgets');
      return widgets.addUserInteractionListener((event) => {
        if (event.target === COMPLETE_SET_TARGET) {
          listener();
        }
      });
    }
  } catch {
    // The native side is missing, as in Expo Go.
  }
  return { remove: () => undefined };
}
