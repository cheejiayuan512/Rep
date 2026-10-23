/**
 * Shows the running rest countdown outside the app. On iOS it is a Live Activity
 * on the Lock Screen and in the Dynamic Island. On Android it is an ongoing
 * countdown notification, promoted to a Live Update (status bar chip) on Android 16.
 * Web and Expo Go skip it quietly; the rest notification in rest-notification.ts
 * stays the fallback everywhere.
 */
import { Platform } from 'react-native';
import type { LiveActivityFactory } from 'expo-widgets';

import { RestLiveUpdate } from '../../modules/rest-live-update';
import type { RestActivityProps } from './rest-activity';

let factory: LiveActivityFactory<RestActivityProps> | null | undefined;

function restActivity(): LiveActivityFactory<RestActivityProps> | null {
  if (factory !== undefined) {
    return factory;
  }
  factory = null;
  if (Platform.OS !== 'ios') {
    return null;
  }
  try {
    // Loaded lazily: importing it where the native module is missing would throw at startup.
    factory = (require('./rest-activity') as typeof import('./rest-activity')).default;
  } catch {
    factory = null;
  }
  return factory;
}

/** Shows the countdown, reusing a running one so only one timer is ever on screen. */
export function showRestActivity(props: RestActivityProps): void {
  if (Platform.OS === 'android') {
    try {
      RestLiveUpdate?.show(`Rest · ${props.exerciseName}`, props.nextSet ? `Next: ${props.nextSet}` : 'Next set coming up', props.endsAt);
    } catch {
      // Notifications are blocked for Rep.
    }
    return;
  }
  const activities = restActivity();
  if (!activities) {
    return;
  }
  try {
    const [current, ...extra] = activities.getInstances();
    extra.forEach((activity) => {
      activity.end('immediate').catch(() => undefined);
    });
    if (current) {
      current.update(props, new Date(props.endsAt)).catch(() => undefined);
      return;
    }
    activities.start(props, undefined, new Date(props.endsAt));
  } catch {
    // Live Activities are off in Settings, or the device is older than iOS 16.2.
  }
}

export function endRestActivity(): void {
  if (Platform.OS === 'android') {
    try {
      RestLiveUpdate?.end();
    } catch {
      // Nothing showing.
    }
    return;
  }
  const activities = restActivity();
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
