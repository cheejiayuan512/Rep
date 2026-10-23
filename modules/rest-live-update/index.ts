/**
 * The Android workout notification (a Live Update on Android 16): the rest
 * countdown or elapsed time, the next set, and a Done set action.
 * Null on iOS, web, and in Expo Go, where the native module is not built in.
 */
import { requireOptionalNativeModule, type NativeModule } from 'expo';

export interface LiveUpdateOptions {
  restTitle: string;
  idleTitle: string;
  body: string;
  workoutStartedAt: number;
  /** 0 when not resting. After this time the notification switches to elapsed time on its own. */
  restEndsAt: number;
  /** Empty hides the action button. */
  actionLabel: string;
}

type RestLiveUpdateEvents = {
  onAction: (event: { action: string }) => void;
};

declare class RestLiveUpdateNative extends NativeModule<RestLiveUpdateEvents> {
  show(options: LiveUpdateOptions): void;
  end(): void;
}

export const RestLiveUpdate = requireOptionalNativeModule<RestLiveUpdateNative>('RestLiveUpdate');
