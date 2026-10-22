/**
 * A local notification when the rest timer runs out, so a locked phone still
 * says "rest is over". Nothing is sent to a server. Browsers skip this.
 * While the app is open the rest bar and haptic already cover it, so the
 * notification is not shown in the foreground.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const CHANNEL_ID = 'rest-timer';
let scheduledId: string | null = null;
let generation = 0;
let prepared: Promise<boolean> | null = null;

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: false,
      shouldShowList: false,
    }),
  });
}

function prepare(): Promise<boolean> {
  prepared ??= (async () => {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
          importance: Notifications.AndroidImportance.HIGH,
          name: 'Rest timer',
          vibrationPattern: [0, 250, 150, 250],
        });
      }
      const current = await Notifications.getPermissionsAsync();
      if (current.granted) {
        return true;
      }
      if (!current.canAskAgain) {
        return false;
      }
      const asked = await Notifications.requestPermissionsAsync();
      return asked.granted;
    } catch {
      return false;
    }
  })();
  return prepared;
}

export async function scheduleRestEnd(endsAt: number, exerciseName: string): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }
  await cancelRestEnd();
  const request = generation;
  const seconds = Math.round((endsAt - Date.now()) / 1000);
  if (seconds < 1 || !(await prepare())) {
    return;
  }
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        body: `Next set of ${exerciseName}.`,
        sound: true,
        title: 'Rest is over',
      },
      trigger: {
        channelId: CHANNEL_ID,
        seconds,
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      },
    });
    if (request !== generation) {
      await Notifications.cancelScheduledNotificationAsync(id);
      return;
    }
    scheduledId = id;
  } catch {
    scheduledId = null;
  }
}

export async function cancelRestEnd(): Promise<void> {
  generation += 1;
  if (Platform.OS === 'web' || scheduledId == null) {
    return;
  }
  const id = scheduledId;
  scheduledId = null;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Already delivered or gone.
  }
}
