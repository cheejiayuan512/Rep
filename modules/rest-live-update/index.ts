/**
 * The Android rest countdown notification (a Live Update on Android 16).
 * Null on iOS, web, and in Expo Go, where the native module is not built in.
 */
import { requireOptionalNativeModule } from 'expo';

interface RestLiveUpdateNative {
  show(title: string, body: string, endsAt: number): void;
  end(): void;
}

export const RestLiveUpdate = requireOptionalNativeModule<RestLiveUpdateNative>('RestLiveUpdate');
