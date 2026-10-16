import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { bootFailed, bootstrapped, useAppDispatch, useAppSelector } from '../state/store';
import { HistoryIcon, ProgressIcon, RoutinesIcon, WorkoutIcon } from '../components/icons';
import { getInProgressWorkoutId, getSettings } from '../data/repository';
import { initDatabase } from '../data/database';
import { HistoryScreen } from '../features/history/history-screen';
import { WorkoutDetailScreen } from '../features/history/workout-detail-screen';
import { ExerciseProgressScreen } from '../features/progress/exercise-progress-screen';
import { ProgressScreen } from '../features/progress/progress-screen';
import { RoutineEditorScreen } from '../features/routines/routine-editor-screen';
import { RoutinesScreen } from '../features/routines/routines-screen';
import { ActiveWorkoutScreen } from '../features/workout/active-workout-screen';
import { ExercisePickerScreen } from '../features/workout/exercise-picker-screen';
import { WorkoutHomeScreen } from '../features/workout/workout-home-screen';
import { colors } from '../theme/colors';
import { navigationTheme, type RootStackParamList, type TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function renderWorkoutIcon({ color, size }: { color: string; size: number }) {
  return <WorkoutIcon color={color} size={size} />;
}

function renderRoutinesIcon({ color, size }: { color: string; size: number }) {
  return <RoutinesIcon color={color} size={size} />;
}

function renderHistoryIcon({ color, size }: { color: string; size: number }) {
  return <HistoryIcon color={color} size={size} />;
}

function renderProgressIcon({ color, size }: { color: string; size: number }) {
  return <ProgressIcon color={color} size={size} />;
}

const Tabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tab.Screen component={WorkoutHomeScreen} name="Workout" options={{ tabBarIcon: renderWorkoutIcon }} />
      <Tab.Screen component={RoutinesScreen} name="Routines" options={{ tabBarIcon: renderRoutinesIcon }} />
      <Tab.Screen component={HistoryScreen} name="History" options={{ tabBarIcon: renderHistoryIcon }} />
      <Tab.Screen component={ProgressScreen} name="Progress" options={{ tabBarIcon: renderProgressIcon }} />
    </Tab.Navigator>
  );
};

export const RootNavigator: React.FC = () => {
  const dispatch = useAppDispatch();
  const ready = useAppSelector((state) => state.app.ready);
  const bootError = useAppSelector((state) => state.app.bootError);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      try {
        await initDatabase();
        const settings = await getSettings();
        const activeWorkoutId = await getInProgressWorkoutId();
        if (!cancel) {
          dispatch(bootstrapped({ activeWorkoutId, restSeconds: settings.restSeconds, weightUnit: settings.weightUnit }));
        }
      } catch (error) {
        if (!cancel) {
          dispatch(bootFailed(error instanceof Error ? error.message : 'Could not open the workout database.'));
        }
      }
    })();
    return () => {
      cancel = true;
    };
  }, [dispatch]);

  if (bootError) {
    return (
      <View style={styles.boot}>
        <Text style={styles.wordmark}>Rep</Text>
        <Text style={styles.error}>{bootError}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.boot}>
        <Text style={styles.wordmark}>Rep</Text>
        <Text style={styles.loading}>Opening your log…</Text>
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ animation: 'slide_from_right', contentStyle: { backgroundColor: colors.bg }, headerShown: false }}>
        <Stack.Screen component={Tabs} name="Tabs" />
        <Stack.Screen component={ActiveWorkoutScreen} name="ActiveWorkout" />
        <Stack.Screen component={ExercisePickerScreen} name="ExercisePicker" />
        <Stack.Screen component={RoutineEditorScreen} name="RoutineEditor" />
        <Stack.Screen component={WorkoutDetailScreen} name="WorkoutDetail" />
        <Stack.Screen component={ExerciseProgressScreen} name="ExerciseProgress" />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  boot: {
    alignItems: 'center',
    backgroundColor: colors.bg,
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  error: {
    color: colors.danger,
    fontSize: 15,
    marginTop: 12,
    textAlign: 'center',
  },
  loading: {
    color: colors.muted,
    fontSize: 15,
    marginTop: 8,
  },
  wordmark: {
    color: colors.text,
    fontSize: 40,
    fontWeight: '800',
  },
});
