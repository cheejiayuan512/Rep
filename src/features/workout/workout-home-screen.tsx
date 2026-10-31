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
import { formatClock, formatDuration, formatLoggedLoad, formatWorkoutWhen, summarizeNames } from '../../domain/format';
import type { HomeStats } from '../../domain/stats';
import { formatVolume, kgToDisplay } from '../../domain/units';
import type { RoutineSummary, WeightUnit, WorkoutSummary } from '../../domain/types';
import { PencilIcon } from '../../components/icons';
import { createRoutine, startEmptyWorkout, startWorkoutFromRoutine } from '../../data/repository';
import type { AppNavigation } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { screenTitle, screenTitleInset } from '../../theme/layout';

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

  const handleEditRoutine = useCallback(
    (routineId: string) => {
      navigation.navigate('RoutineEditor', { routineId });
    },
    [navigation],
  );

  const handleOpenWorkout = useCallback(
    (workoutId: string) => {
      navigation.navigate('WorkoutDetail', { workoutId });
    },
    [navigation],
  );

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
          <Pressable accessibilityRole="button" hitSlop={8} onPress={handleOpenRoutines}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>
        {home && home.routines.length > 0 ? (
          <ScrollView contentContainerStyle={styles.routineRow} horizontal showsHorizontalScrollIndicator={false}>
            {home.routines.map((routine) => (
              <RoutineStartCard key={routine.id} onEdit={handleEditRoutine} onStart={handleStartRoutine} routine={routine} />
            ))}
            <Pressable accessibilityRole="button" onPress={pressCreateRoutine} style={styles.newRoutine}>
              <Text style={styles.newRoutineText}>New routine</Text>
            </Pressable>
          </ScrollView>
        ) : (
          <View style={styles.noRoutines}>
            <Text style={styles.body}>Save a list of exercises, then start it in one tap.</Text>
            <Button label="Create a routine" onPress={pressCreateRoutine} style={styles.createRoutine} variant="secondary" />
          </View>
        )}
        <Text style={styles.weekHeading}>This week</Text>
        {home ? <WeekStats stats={home.stats} unit={unit} /> : null}
        <Text style={styles.weekHeading}>Recent</Text>
        {home && home.recent.length > 0 ? (
          home.recent.map((workout) => <RecentWorkout key={workout.id} onOpen={handleOpenWorkout} unit={unit} workout={workout} />)
        ) : (
          <Text style={styles.weekLine}>Finished workouts show up here.</Text>
        )}
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
  return (
    <View>
      <View style={styles.tiles}>
        <Tile label={thisWeek.workouts === 1 ? 'Workout' : 'Workouts'} value={String(thisWeek.workouts)} />
        <Tile label={unit} value={formatVolume(kgToDisplay(thisWeek.volumeKg, unit))} />
        <Tile label="Time" value={formatMinutes(thisWeek.minutes)} />
        <Tile label={thisWeek.sets === 1 ? 'Set' : 'Sets'} value={String(thisWeek.sets)} />
      </View>
      <Text style={styles.weekLine}>{streakWeeks} wk streak</Text>
    </View>
  );
});

const Tile: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.tile}>
    <Text style={styles.tileValue}>{value}</Text>
    <Text style={styles.tileLabel}>{label}</Text>
  </View>
);

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
  onEdit: (routineId: string) => void;
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

const RoutineStartCard: React.FC<RoutineStartCardProps> = React.memo(function RoutineStartCard({ routine, onStart, onEdit }) {
  const handlePress = useCallback(() => {
    onStart(routine.id);
  }, [onStart, routine.id]);
  const handleEdit = useCallback(() => {
    onEdit(routine.id);
  }, [onEdit, routine.id]);

  return (
    <View style={styles.routineCard}>
      <Pressable accessibilityRole="button" onPress={handlePress} style={styles.routineBody}>
        <Text numberOfLines={1} style={styles.routineName}>
          {routine.name}
        </Text>
        <Text numberOfLines={2} style={styles.routineMeta}>
          {summarizeNames(routine.exerciseNames)}
        </Text>
      </Pressable>
      <Pressable accessibilityLabel={`Edit ${routine.name}`} accessibilityRole="button" hitSlop={8} onPress={handleEdit} style={styles.edit}>
        <PencilIcon color={colors.muted} size={16} />
      </Pressable>
    </View>
  );
});

interface RecentWorkoutProps {
  workout: WorkoutSummary;
  unit: WeightUnit;
  onOpen: (workoutId: string) => void;
}

const RecentWorkout: React.FC<RecentWorkoutProps> = React.memo(function RecentWorkout({ workout, unit, onOpen }) {
  const handlePress = useCallback(() => {
    onOpen(workout.id);
  }, [onOpen, workout.id]);
  const best = workout.exercises.find((exercise) => exercise.best);
  return (
    <Pressable accessibilityRole="button" onPress={handlePress} style={styles.recent}>
      <View style={styles.recentCopy}>
        <Text style={styles.routineName}>{workout.name}</Text>
        <Text style={styles.routineMeta}>{formatWorkoutWhen(workout.finishedAt)}</Text>
      </View>
      <Text style={styles.recentStat}>
        {formatDuration(workout.startedAt, workout.finishedAt)} · {formatVolume(kgToDisplay(workout.volumeKg, unit))} {unit}
        {best?.best ? ` · ${formatLoggedLoad(best.best.weightKg, best.best.reps, unit)}` : ''}
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
    ...screenTitleInset,
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
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginRight: 10,
    padding: 14,
    width: 220,
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
  edit: {
    padding: 4,
  },
  newRoutine: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    justifyContent: 'center',
    marginRight: 10,
    minHeight: 84,
    padding: 14,
    width: 140,
  },
  newRoutineText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '800',
  },
  recent: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  recentCopy: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recentStat: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  routineBody: {
    flex: 1,
    paddingRight: 8,
  },
  sectionHead: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 26,
  },
  seeAll: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  tile: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexGrow: 1,
    flexBasis: '46%',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  tileLabel: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  tileValue: {
    color: colors.text,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
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
    ...screenTitle,
    marginBottom: 22,
  },
});
