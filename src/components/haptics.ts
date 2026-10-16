/**
 * A tiny vibration on a phone when a set is checked or a record is hit.
 * Browsers cannot vibrate this way, so these functions do nothing on web.
 */
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export async function hapticLight(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Devices without a motor can ignore haptics.
  }
}

export async function hapticSuccess(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Devices without a motor can ignore haptics.
  }
}
