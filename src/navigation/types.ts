/**
 * The address book of screens. Each name is a page. The object next to it is
 * the data that page expects, such as `{ workoutId: string }`.
 * `undefined` means the page needs nothing extra.
 */
import { DarkTheme, type Theme } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp, NavigatorScreenParams, RouteProp } from '@react-navigation/native';

import { colors } from '../theme/colors';

export type TabParamList = {
  Workout: undefined;
  Routines: undefined;
  History: undefined;
  Progress: undefined;
  Exercises: undefined;
  Profile: undefined;
};

export type ExercisePickerParams =
  | { mode: 'workout'; workoutId: string }
  | { mode: 'routine'; routineId: string }
  /** Replaces one card's exercise, then goes back. */
  | { mode: 'swap'; workoutId: string; workoutExerciseId: string; currentExerciseId: string };

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  ActiveWorkout: { workoutId: string };
  ExercisePicker: ExercisePickerParams;
  RoutineEditor: { routineId: string };
  WorkoutDetail: { workoutId: string };
  ExerciseProgress: { exerciseId: string };
  /** `null` creates a new custom exercise. */
  ExerciseEditor: { exerciseId: string | null };
  Analysis: undefined;
  OneRepMax: undefined;
};

export type AppNavigation<T extends keyof TabParamList> = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, T>,
  NativeStackNavigationProp<RootStackParamList>
>;

export type StackNavigation = NativeStackNavigationProp<RootStackParamList>;

export type StackRoute<T extends keyof RootStackParamList> = RouteProp<RootStackParamList, T>;

export const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    border: colors.border,
    card: colors.bg,
    notification: colors.accent,
    primary: colors.accent,
    text: colors.text,
  },
};
