/**
 * The Workout tab. Start an empty session, resume the one in progress,
 * or start a saved routine. The Routines heading opens the full list.
 */
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { useHomeData, useWeightUnit } from '../../state/hooks';
import { activeWorkoutChanged, dataChanged, useAppDispatch, useAppSelector } from '../../state/store';
import { Button } from '../../components/button';
import { ConfirmDialog, type ConfirmRequest } from '../../components/confirm-dialog';
import { Screen } from '../../components/screen';
import { formatClock, summarizeNames } from '../../domain/format';
import type { HomeStats } from '../../domain/stats';
import { formatVolume, kgToDisplay } from '../../domain/units';
import type { RoutineSummary, WeightUnit } from '../../domain/types';
import { createRoutine, startEmptyWorkout, startWorkoutFromRoutine } from '../../data/repository';
import type { AppNavigation } from '../../navigation/types';
import { colors } from '../../theme/colors';

export const WorkoutHomeScreen: React.FC = () => {
  const navigation = useNavigation<AppNavigation<'Workout'>>();
  const dispatch = useAppDispatch();
  const activeWorkoutId = useAppSelector((state) => state.app.activeWorkoutId);
  const home = useHomeData(activeWorkoutId);
  const { unit } = useWeightUnit();
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [now, setNow] = useState(Date.now());

  React.useEffect(() => {
    if (!home?.active) {
      return;
    }
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [home?.active]);

  const openWorkout = useCallback(
    (workoutId: string) => {
      dispatch(activeWorkoutChanged(workoutId));
      navigation.navigate('ActiveWorkout', { workoutId });
    },
    [dispatch, navigation],
  );

  const begin = useCallback(
    async (create: () => Promise<string>) => {
      if (activeWorkoutId) {
        setConfirm({
          confirmLabel: 'Resume',
          message: 'Finish or discard the current workout before starting another.',
          onConfirm: () => {
            setConfirm(null);
            openWorkout(activeWorkoutId);
          },
          title: 'Workout in progress',
        });
        return;
      }
      const workoutId = await create();
      openWorkout(workoutId);
      dispatch(dataChanged());
    },
    [activeWorkoutId, dispatch, openWorkout],
  );

  const handleStartEmpty = useCallback(() => {
    void begin(startEmptyWorkout);
  }, [begin]);

  const handleStartRoutine = useCallback(
    (routineId: string) => {
      void begin(() => startWorkoutFromRoutine(routineId));
    },
    [begin],
  );

  const handleCreateRoutine = useCallback(async () => {
    const routineId = await createRoutine('New routine');
    navigation.navigate('RoutineEditor', { routineId });
    dispatch(dataChanged());
  }, [dispatch, navigation]);

  const handleOpenRoutines = useCallback(() => {
    navigation.navigate('Routines');
  }, [navigation]);

  const closeConfirm = useCallback(() => setConfirm(null), []);
  const pressCreateRoutine = useCallback(() => {
    void handleCreateRoutine();
  }, [handleCreateRoutine]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} style={styles.fill}>
        <Text style={styles.wordmark}>Rep</Text>
        {home?.active ? <ResumeCard elapsed={formatClock((now - home.active.startedAt) / 1000)} exerciseCount={home.active.exerciseCount} name={home.active.name} onPress={openWorkout} workoutId={home.active.id} /> : null}
        <Button label="Start workout" onPress={handleStartEmpty} />
        <View style={styles.sectionHead}>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={handleOpenRoutines}>
            <Text style={styles.section}>Routines</Text>
          </Pressable>
        </View>
        {home && home.routines.length > 0 ? (
          <ScrollView contentContainerStyle={styles.routineRow} horizontal showsHorizontalScrollIndicator={false}>
            {home.routines.map((routine) => (
              <RoutineStartCard key={routine.id} onStart={handleStartRoutine} routine={routine} />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.noRoutines}>
            <Text style={styles.body}>Save a list of exercises, then start it in one tap.</Text>
            <Button label="Create a routine" onPress={pressCreateRoutine} style={styles.createRoutine} variant="secondary" />
          </View>
        )}
        <Text style={styles.weekHeading}>This week</Text>
        {home ? <WeekStats stats={home.stats} unit={unit} /> : null}
      </ScrollView>
      <ConfirmDialog
        confirmLabel={confirm?.confirmLabel ?? 'OK'}
        message={confirm?.message ?? ''}
        onCancel={closeConfirm}
        onConfirm={confirm?.onConfirm ?? closeConfirm}
        title={confirm?.title ?? ''}
        visible={confirm != null}
      />
    </Screen>
  );
};

interface WeekStatsProps {
  stats: HomeStats;
  unit: WeightUnit;
}

const WeekStats: React.FC<WeekStatsProps> = React.memo(function WeekStats({ stats, unit }) {
  const { streakWeeks, thisWeek } = stats;
  const line = [
    `${thisWeek.workouts} ${thisWeek.workouts === 1 ? 'workout' : 'workouts'}`,
    `${formatVolume(kgToDisplay(thisWeek.volumeKg, unit))} ${unit}`,
    formatMinutes(thisWeek.minutes),
    `${thisWeek.sets} ${thisWeek.sets === 1 ? 'set' : 'sets'}`,
    `${streakWeeks} wk streak`,
  ].join(' · ');
  return <Text style={styles.weekLine}>{line}</Text>;
});

function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

interface RoutineStartCardProps {
  routine: RoutineSummary;
  onStart: (routineId: string) => void;
}

interface ResumeCardProps {
  workoutId: string;
  name: string;
  elapsed: string;
  exerciseCount: number;
  onPress: (workoutId: string) => void;
}

const ResumeCard: React.FC<ResumeCardProps> = ({ workoutId, name, elapsed, exerciseCount, onPress }) => {
  const handlePress = useCallback(() => {
    onPress(workoutId);
  }, [onPress, workoutId]);

  return (
    <Pressable onPress={handlePress} style={styles.resume}>
      <Text style={styles.kicker}>In progress</Text>
      <Text style={styles.resumeName}>{name}</Text>
      <Text style={styles.resumeDetails}>
        {elapsed} · {exerciseCount} exercises
      </Text>
      <Text style={styles.resumeAction}>Resume</Text>
    </Pressable>
  );
};

const RoutineStartCard: React.FC<RoutineStartCardProps> = React.memo(function RoutineStartCard({ routine, onStart }) {
  const handlePress = useCallback(() => {
    onStart(routine.id);
  }, [onStart, routine.id]);

  return (
    <Pressable onPress={handlePress} style={styles.routineCard}>
      <Text numberOfLines={1} style={styles.routineName}>
        {routine.name}
      </Text>
      <Text numberOfLines={2} style={styles.routineMeta}>
        {summarizeNames(routine.exerciseNames)}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  fill: {
    flex: 1,
  },
  kicker: {
    color: colors.accentInk,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  createRoutine: {
    marginTop: 12,
  },
  noRoutines: {
    paddingTop: 4,
  },
  resume: {
    backgroundColor: colors.accent,
    borderRadius: 18,
    marginBottom: 14,
    padding: 16,
  },
  resumeAction: {
    color: colors.accentInk,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
  },
  resumeDetails: {
    color: colors.accentInk,
    fontSize: 13,
    marginTop: 4,
    opacity: 0.8,
  },
  resumeName: {
    color: colors.accentInk,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  resumeMeta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  resumeTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  routineCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 10,
    padding: 14,
    width: 210,
  },
  routineMeta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 6,
  },
  routineName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  routineRow: {
    paddingVertical: 10,
  },
  section: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  sectionHead: {
    marginTop: 26,
  },
  weekHeading: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 26,
  },
  weekLine: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  wordmark: {
    color: colors.text,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 22,
  },
});
