/**
 * The stack navigator and its transitions, native edition.
 *
 * `react-native-screens` has no transition implementation on web, so the web
 * build uses `stack-config.web.ts` instead, which swaps in the JS stack. Metro
 * picks that file only for web, so `@react-navigation/stack` never reaches the
 * iOS or Android bundle.
 */
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { colors } from '../theme/colors';
import type { RootStackParamList } from './types';

export const createStack = createNativeStackNavigator<RootStackParamList>;

export const stackOptions = {
  animation: 'slide_from_right',
  contentStyle: { backgroundColor: colors.bg },
  headerShown: false,
} as const;

export const workoutOptions = {
  animation: 'slide_from_bottom',
  gestureEnabled: true,
  presentation: 'fullScreenModal',
} as const;

export const completeOptions = {
  animation: 'fade_from_bottom',
  gestureEnabled: false,
} as const;
