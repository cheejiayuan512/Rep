/**
 * The Workout tab. Start an empty session, resume the one in progress,
 * start a saved routine, or open the last finished workout.
 */
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { useHomeData, useWeightUnit } from '../../state/hooks';
import { activeWorkoutChanged, dataChanged, useAppDispatch, useAppSelector } from '../../state/store';
import { Button } from '../../components/button';
import { ConfirmDialog, type ConfirmRequest } from '../../components/confirm-dialog';
import { Screen } from '../../components/screen';
import { formatClock, formatWorkoutWhen, summarizeNames } from '../../domain/format';
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

  const handleOpenLast = useCallback(() => {
    if (home?.lastWorkout) {
      navigation.navigate('WorkoutDetail', { workoutId: home.lastWorkout.id });
    }
  }, [home?.lastWorkout, navigation]);

  const closeConfirm = useCallback(() => setConfirm(null), []);
  const pressCreateRoutine = useCallback(() => {
    void handleCreateRoutine();
  }, [handleCreateRoutine]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} style={styles.fill}>
        <Text style={styles.wordmark}>Rep</Text>
        <Text style={styles.tagline}>Log the sets. Keep the numbers that move.</Text>
        {home?.active ? <ResumeCard elapsed={formatClock((now - home.active.startedAt) / 1000)} exerciseCount={home.active.exerciseCount} name={home.active.name} onPress={openWorkout} workoutId={home.active.id} /> : null}
        <Button label="Start workout" onPress={handleStartEmpty} />
        <View style={styles.sectionHead}>
          <Text style={styles.section}>Routines</Text>
          <TextButtonLike label="See all" onPress={handleOpenRoutines} />
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
        <View style={styles.sectionHead}>
          <Text style={styles.section}>This week</Text>
          {home?.lastWorkout ? <TextButtonLike label={`Last: ${formatWorkoutWhen(home.lastWorkout.finishedAt)}`} onPress={handleOpenLast} /> : null}
        </View>
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
  const { lastWeek, streakWeeks, thisWeek } = stats;
  return (
    <View style={styles.statGrid}>
      <StatTile label="Workouts" trend={compare(thisWeek.workouts, lastWeek.workouts, String)} value={String(thisWeek.workouts)} />
      <StatTile
        label={`Volume (${unit})`}
        trend={compare(thisWeek.volumeKg, lastWeek.volumeKg, (value) => formatVolume(kgToDisplay(value, unit)))}
        value={formatVolume(kgToDisplay(thisWeek.volumeKg, unit))}
      />
      <StatTile label="Time" trend={compare(thisWeek.minutes, lastWeek.minutes, formatMinutes)} value={formatMinutes(thisWeek.minutes)} />
      <StatTile label="Sets" trend={compare(thisWeek.sets, lastWeek.sets, String)} value={String(thisWeek.sets)} />
      <StatTile label="Week streak" trend={streakWeeks > 0 ? 'Keep it going' : 'Train this week to start one'} value={String(streakWeeks)} wide />
    </View>
  );
});

const StatTile: React.FC<{ label: string; value: string; trend: string; wide?: boolean }> = ({ label, trend, value, wide = false }) => {
  return (
    <View accessibilityLabel={`${label} ${value}, ${trend}`} style={[styles.statTile, wide && styles.statTileWide]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.statTrend}>
        {trend}
      </Text>
    </View>
  );
};

function compare(current: number, previous: number, format: (value: number) => string): string {
  if (previous === 0) {
    return current === 0 ? 'Nothing yet' : 'Up from 0 last week';
  }
  return `${format(previous)} last week`;
}

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

interface TextButtonLikeProps {
  label: string;
  onPress: () => void;
}

const TextButtonLike: React.FC<TextButtonLikeProps> = ({ label, onPress }) => {
  return (
    <Pressable hitSlop={8} onPress={onPress}>
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
};

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
  link: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  noRoutines: {
    paddingTop: 4,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  statTile: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    padding: 14,
  },
  statTileWide: {
    flexBasis: '100%',
  },
  statTrend: {
    color: colors.faint,
    fontSize: 12,
    marginTop: 6,
  },
  statValue: {
    color: colors.text,
    fontSize: 24,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
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
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 26,
  },
  tagline: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 22,
    marginTop: 6,
  },
  wordmark: {
    color: colors.text,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
});
