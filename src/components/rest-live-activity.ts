/**
 * Starts, moves, and ends the rest timer Live Activity on iOS.
 * Android, web, and Expo Go (which has no widget extension) skip it quietly,
 * so the rest notification in rest-notification.ts stays the fallback.
 */
import { Platform } from 'react-native';
import type { LiveActivityFactory } from 'expo-widgets';

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

/** Shows the countdown, reusing a running activity so only one timer is ever on screen. */
export function showRestActivity(props: RestActivityProps): void {
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
