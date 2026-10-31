/**
 * Chooses which page is on screen.
 * Tabs are the buttons at the bottom. The stack is everything that
 * slides in on top of them, such as the workout you are logging.
 * On startup this opens the saved log, then shows the tabs.
 */
import React, { useCallback, useEffect } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { bootFailed, bootstrapped, tutorialClosed, useAppDispatch, useAppSelector } from '../state/store';
import { HistoryIcon, ProfileIcon, ProgressIcon, WorkoutIcon } from '../components/icons';
import { getInProgressWorkoutId, getSettings, getWorkout, saveTutorialSeen } from '../data/repository';
import { syncHomeWidget } from '../components/home-widget-sync';
import { TutorialModal } from '../components/tutorial-modal';
import { flushDatabase, initDatabase } from '../data/database';
import { endWorkoutActivity, showWorkoutActivity } from '../components/workout-live-activity';
import { activityPropsFor, installCompleteSetListener } from '../features/workout/workout-activity-sync';
import { ExerciseEditorScreen } from '../features/exercises/exercise-editor-screen';
import { ExercisesScreen } from '../features/exercises/exercises-screen';
import { HistoryScreen } from '../features/history/history-screen';
import { AnalysisScreen } from '../features/progress/analysis-screen';
import { OneRepMaxScreen } from '../features/progress/one-rep-max-screen';
import { WorkoutDetailScreen } from '../features/history/workout-detail-screen';
import { ExerciseProgressScreen } from '../features/progress/exercise-progress-screen';
import { ProfileScreen } from '../features/profile/profile-screen';
import { ProgressScreen } from '../features/progress/progress-screen';
import { RoutineEditorScreen } from '../features/routines/routine-editor-screen';
import { RoutinesScreen } from '../features/routines/routines-screen';
import { ActiveWorkoutScreen } from '../features/workout/active-workout-screen';
import { ExercisePickerScreen } from '../features/workout/exercise-picker-screen';
import { WorkoutCompleteScreen } from '../features/workout/workout-complete-screen';
import { WorkoutHomeScreen } from '../features/workout/workout-home-screen';
import { StrengthLevelsScreen } from '../features/progress/strength-levels-screen';
import { colors } from '../theme/colors';
import { navigationTheme, type RootStackParamList, type TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function renderWorkoutIcon({ color, size }: { color: string; size: number }) {
  return <WorkoutIcon color={color} size={size} />;
}

function renderHistoryIcon({ color, size }: { color: string; size: number }) {
  return <HistoryIcon color={color} size={size} />;
}

function renderProgressIcon({ color, size }: { color: string; size: number }) {
  return <ProgressIcon color={color} size={size} />;
}

function renderProfileIcon({ color, size }: { color: string; size: number }) {
  return <ProfileIcon color={color} size={size} />;
}

const Tabs: React.FC = () => {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      }}
    >
      <Tab.Screen component={WorkoutHomeScreen} name="Workout" options={{ tabBarIcon: renderWorkoutIcon }} />
      <Tab.Screen component={HistoryScreen} name="History" options={{ tabBarIcon: renderHistoryIcon }} />
      <Tab.Screen component={ProgressScreen} name="Progress" options={{ tabBarIcon: renderProgressIcon }} />
      <Tab.Screen component={ProfileScreen} name="Profile" options={{ tabBarIcon: renderProfileIcon }} />
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
          dispatch(bootstrapped({ activeWorkoutId, showTutorial: !settings.tutorialSeen, warmupRestMultiplier: settings.warmupRestMultiplier, weightUnit: settings.weightUnit }));
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

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') {
        void flushDatabase();
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const listener = installCompleteSetListener();
    return () => listener.remove();
  }, []);

  const activeWorkoutId = useAppSelector((state) => state.app.activeWorkoutId);
  const unit = useAppSelector((state) => state.app.weightUnit);
  const revision = useAppSelector((state) => state.app.revision);
  const tutorialOpen = useAppSelector((state) => state.app.tutorialOpen);
  const closeTutorial = useCallback(() => {
    dispatch(tutorialClosed());
    void saveTutorialSeen(true);
  }, [dispatch]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    syncHomeWidget();
  }, [activeWorkoutId, ready, revision, unit]);
  useEffect(() => {
    if (!ready) {
      return;
    }
    if (!activeWorkoutId) {
      endWorkoutActivity();
      return;
    }
    let cancel = false;
    void getWorkout(activeWorkoutId).then((workout) => {
      if (!cancel && workout && workout.finishedAt == null) {
        showWorkoutActivity(activityPropsFor(workout, unit));
      }
    });
    return () => {
      cancel = true;
    };
  }, [activeWorkoutId, ready, unit]);

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
      {tutorialOpen ? <TutorialModal onClose={closeTutorial} /> : null}
      <Stack.Navigator screenOptions={{ animation: 'slide_from_right', contentStyle: { backgroundColor: colors.bg }, headerShown: false }}>
        <Stack.Screen component={Tabs} name="Tabs" />
        <Stack.Screen
          component={ActiveWorkoutScreen}
          name="ActiveWorkout"
          options={{ animation: 'slide_from_bottom', gestureEnabled: true, presentation: 'fullScreenModal' }}
        />
        <Stack.Screen component={RoutinesScreen} name="Routines" />
        <Stack.Screen component={ExercisesScreen} name="Exercises" />
        <Stack.Screen component={ExercisePickerScreen} name="ExercisePicker" />
        <Stack.Screen component={RoutineEditorScreen} name="RoutineEditor" />
        <Stack.Screen component={WorkoutDetailScreen} name="WorkoutDetail" />
        <Stack.Screen component={ExerciseProgressScreen} name="ExerciseProgress" />
        <Stack.Screen component={ExerciseEditorScreen} name="ExerciseEditor" />
        <Stack.Screen component={AnalysisScreen} name="Analysis" />
        <Stack.Screen component={OneRepMaxScreen} name="OneRepMax" />
        <Stack.Screen component={WorkoutCompleteScreen} name="WorkoutComplete" options={{ animation: 'fade_from_bottom', gestureEnabled: false }} />
        <Stack.Screen component={StrengthLevelsScreen} name="StrengthLevels" />
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
