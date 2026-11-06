/**
 * The stack navigator and its transitions, web edition.
 *
 * The native stack renders through `react-native-screens`, which has no
 * transition implementation on web: screens swap instantly. This uses the JS
 * stack so the browser build slides, and opts the animation in explicitly -
 * the JS stack defaults to `animation: 'none'` on web to match native.
 */
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';

import { colors } from '../theme/colors';
import type { RootStackParamList } from './types';

export const createStack = createStackNavigator<RootStackParamList>;

export const stackOptions = {
  ...TransitionPresets.SlideFromRightIOS,
  animation: 'default',
  cardOverlayEnabled: false,
  cardShadowEnabled: false,
  cardStyle: { backgroundColor: colors.bg },
  headerShown: false,
} as const;

export const workoutOptions = {
  ...TransitionPresets.ModalSlideFromBottomIOS,
  animation: 'default',
  cardOverlayEnabled: false,
  cardShadowEnabled: false,
  gestureEnabled: true,
} as const;

export const completeOptions = {
  ...TransitionPresets.FadeFromBottomAndroid,
  animation: 'default',
  cardOverlayEnabled: false,
  cardShadowEnabled: false,
  gestureEnabled: false,
} as const;
