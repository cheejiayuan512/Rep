import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { useHomeData, useWeightUnit } from '../../state/hooks';
import { activeWorkoutChanged, dataChanged, useAppDispatch, useAppSelector } from '../../state/store';
import { Button } from '../../components/button';
import { ConfirmDialog, type ConfirmRequest } from '../../components/confirm-dialog';
import { EmptyState } from '../../components/empty-state';
import { Screen } from '../../components/screen';
import { UnitToggle } from '../../components/unit-toggle';
import { formatClock, formatDuration, formatWorkoutWhen, summarizeNames } from '../../domain/format';
import { formatVolume, kgToDisplay } from '../../domain/units';
import type { RoutineSummary } from '../../domain/types';
import { createRoutine, startEmptyWorkout, startWorkoutFromRoutine } from '../../data/repository';
import type { AppNavigation } from '../../navigation/types';
import { colors } from '../../theme/colors';

export const WorkoutHomeScreen: React.FC = () => {
  const navigation = useNavigation<AppNavigation<'Workout'>>();
  const dispatch = useAppDispatch();
  const activeWorkoutId = useAppSelector((state) => state.app.activeWorkoutId);
  const home = useHomeData(activeWorkoutId);
  const { unit, setUnit } = useWeightUnit();
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
      dispatch(dataChanged());
      openWorkout(workoutId);
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
    dispatch(dataChanged());
    navigation.navigate('RoutineEditor', { routineId });
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
        <Button label="Start empty workout" onPress={handleStartEmpty} />
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
          <EmptyState actionLabel="Create a routine" message="Save a list of exercises, then start it in one tap." onAction={pressCreateRoutine} title="No routines yet" />
        )}
        <View style={styles.unitRow}>
          <Text style={styles.section}>Weight unit</Text>
          <UnitToggle onChange={setUnit} unit={unit} />
        </View>
        <Text style={[styles.section, styles.laterSection]}>Last workout</Text>
        {home?.lastWorkout ? (
          <Pressable onPress={handleOpenLast} style={styles.last}>
            <Text style={styles.resumeTitle}>{home.lastWorkout.name}</Text>
            <Text style={styles.resumeMeta}>{formatWorkoutWhen(home.lastWorkout.finishedAt)}</Text>
            <Text style={styles.body}>{summarizeNames(home.lastWorkout.exerciseNames)}</Text>
            <Text style={styles.resumeMeta}>
              {formatVolume(kgToDisplay(home.lastWorkout.volumeKg, unit))} {unit} · {home.lastWorkout.setCount} sets · {formatDuration(home.lastWorkout.startedAt, home.lastWorkout.finishedAt)}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.body}>Finish a workout and it will show up here.</Text>
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
  laterSection: {
    marginTop: 22,
  },
  last: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 10,
    padding: 16,
  },
  link: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
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
  unitRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
  },
  wordmark: {
    color: colors.text,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
});
