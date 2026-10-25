/**
 * One finished workout: its exercises, notes, and each set's weight, reps, and RPE.
 * Edit reopens it in the workout screen; Duplicate starts a new workout from it.
 */
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';

import { activeWorkoutChanged, dataChanged, useAppDispatch, useAppSelector } from '../../state/store';
import { useWeightUnit } from '../../state/hooks';
import { Button } from '../../components/button';
import { ConfirmDialog, type ConfirmRequest } from '../../components/confirm-dialog';
import { EmptyState } from '../../components/empty-state';
import { Header, TextButton } from '../../components/header';
import { Screen } from '../../components/screen';
import { deleteWorkout, duplicateWorkout, getWorkout } from '../../data/repository';
import { formatDuration, formatLoggedLoad, formatWorkoutWhen } from '../../domain/format';
import { formatEstimate, formatVolume, formatWeight, kgToDisplay } from '../../domain/units';
import { estimateOneRepMax } from '../../domain/metrics';
import { estimateFromSets } from '../../domain/one-rep-max';
import { formatMachineSetup, usesMachineSetup, type SetRecord, type WeightUnit, type WorkoutDetail, type WorkoutExercise } from '../../domain/types';
import type { StackNavigation, StackRoute } from '../../navigation/types';
import { colors } from '../../theme/colors';

export const WorkoutDetailScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigation>();
  const route = useRoute<StackRoute<'WorkoutDetail'>>();
  const dispatch = useAppDispatch();
  const { unit } = useWeightUnit();
  const [workout, setWorkout] = useState<WorkoutDetail | null>(() => getWorkout.now(route.params.workoutId));
  const [loaded, setLoaded] = useState(workout != null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const activeWorkoutId = useAppSelector((state) => state.app.activeWorkoutId);

  useFocusEffect(
    useCallback(() => {
      let cancel = false;
      void getWorkout(route.params.workoutId).then((next) => {
        if (!cancel) {
          setWorkout(next);
          setLoaded(true);
        }
      });
      return () => {
        cancel = true;
      };
    }, [route.params.workoutId]),
  );

  const handleEdit = useCallback(() => {
    navigation.navigate('ActiveWorkout', { workoutId: route.params.workoutId });
  }, [navigation, route.params.workoutId]);

  const handleDuplicate = useCallback(() => {
    if (activeWorkoutId) {
      setConfirm({
        confirmLabel: 'Resume',
        message: 'Finish or discard the current workout before starting another.',
        onConfirm: () => {
          setConfirm(null);
          navigation.navigate('ActiveWorkout', { workoutId: activeWorkoutId });
        },
        title: 'Workout in progress',
      });
      return;
    }
    void duplicateWorkout(route.params.workoutId).then((workoutId) => {
      dispatch(activeWorkoutChanged(workoutId));
      dispatch(dataChanged());
      navigation.navigate('ActiveWorkout', { workoutId });
    });
  }, [activeWorkoutId, dispatch, navigation, route.params.workoutId]);

  const handleDelete = useCallback(() => {
    setConfirm({
      confirmLabel: 'Delete',
      destructive: true,
      message: 'This removes the session from history.',
      onConfirm: () => {
        setConfirm(null);
        void deleteWorkout(route.params.workoutId).then(() => {
          dispatch(dataChanged());
          navigation.goBack();
        });
      },
      title: 'Delete workout?',
    });
  }, [dispatch, navigation, route.params.workoutId]);

  const closeConfirm = useCallback(() => setConfirm(null), []);
  const working = workout ? workout.exercises.flatMap((exercise) => exercise.sets.filter(isWorking)) : [];
  const volumeKg = working.reduce((sum, set) => sum + (set.weightKg ?? 0) * (set.reps ?? 0), 0);
  const workingSetCount = working.length;

  return (
    <Screen bottomInset>
      <Header left={<TextButton label="Back" onPress={navigation.goBack} />} right={<TextButton label="Delete" onPress={handleDelete} tone="danger" />} title="Workout" />
      {!workout ? (
        loaded ? <EmptyState message="This session is no longer on the device." title="Workout missing" /> : null
      ) : (
        <ScrollView contentContainerStyle={styles.content} style={styles.fill}>
          <Text style={styles.title}>{workout.name}</Text>
          <Text style={styles.meta}>{formatWorkoutWhen(workout.finishedAt ?? workout.startedAt)}</Text>
          <View style={styles.summary}>
            <Summary label="Duration" value={workout.finishedAt ? formatDuration(workout.startedAt, workout.finishedAt) : '—'} />
            <Summary label={`Volume (${unit})`} value={formatVolume(kgToDisplay(volumeKg, unit))} />
            <Summary label="Sets" value={String(workingSetCount)} />
            <Summary label="Exercises" value={String(workout.exercises.length)} />
          </View>
          <View style={styles.actions}>
            <Button label="Edit" onPress={handleEdit} style={styles.action} variant="secondary" />
            <Button label="Duplicate" onPress={handleDuplicate} style={styles.action} />
          </View>
          {workout.exercises.map((exercise) => (
            <ExerciseSummaryCard exercise={exercise} key={exercise.id} unit={unit} />
          ))}
        </ScrollView>
      )}
      <ConfirmDialog
        confirmLabel={confirm?.confirmLabel ?? 'Delete'}
        destructive={confirm?.destructive}
        message={confirm?.message ?? ''}
        onCancel={closeConfirm}
        onConfirm={confirm?.onConfirm ?? closeConfirm}
        title={confirm?.title ?? ''}
        visible={confirm != null}
      />
    </Screen>
  );
};

function isWorking(set: SetRecord): boolean {
  return set.completed && set.setType !== 'warmup';
}

const Summary: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
};

/** One exercise as a small table: warmups marked W, working sets numbered on their own. */
const ExerciseSummaryCard: React.FC<{ exercise: WorkoutExercise; unit: WeightUnit }> = React.memo(function ExerciseSummaryCard({ exercise, unit }) {
  const working = exercise.sets.filter(isWorking);
  const volumeKg = working.reduce((sum, set) => sum + (set.weightKg ?? 0) * (set.reps ?? 0), 0);
  const bestOneRepMax = working.reduce((best, set) => {
    const weight = set.weightKg ?? 0;
    const reps = set.reps ?? 0;
    return weight > 0 && reps > 0 ? Math.max(best, estimateOneRepMax(weight, reps)) : best;
  }, 0);
  const session = working.length > 1 ? estimateFromSets(working.map((set) => ({ reps: set.reps ?? 0, rpe: set.rpe, weightKg: set.weightKg ?? 0 }))) : null;
  let workingNumber = 0;

  return (
    <View style={styles.card}>
      <Text style={styles.exercise}>{exercise.name}</Text>
      <Text style={styles.meta}>
        {exercise.muscleGroup} · {exercise.equipment}
        {exercise.attachment ? ` · ${exercise.attachment}` : ''}
        {usesMachineSetup(exercise.equipment) ? ` · ${formatMachineSetup(exercise.machineSetup)}` : ''}
      </Text>
      {exercise.notes.trim() ? (
        <View style={styles.notesWrap}>
          <Text style={styles.notes}>{exercise.notes.trim()}</Text>
        </View>
      ) : null}
      <View style={[styles.row, styles.headRow]}>
        <Text style={[styles.colSet, styles.head]}>Set</Text>
        <Text style={[styles.colLoad, styles.head]}>{unit} × reps</Text>
        <Text style={[styles.colRpe, styles.head]}>RPE</Text>
        <Text style={[styles.colMax, styles.head]}>e1RM</Text>
      </View>
      {exercise.sets.map((set) => {
        const warmup = set.setType === 'warmup';
        if (!warmup && set.completed) {
          workingNumber += 1;
        }
        const weight = set.weightKg ?? 0;
        const reps = set.reps ?? 0;
        const max = !warmup && set.completed && weight > 0 && reps > 0 ? estimateOneRepMax(weight, reps) : null;
        return (
          <View key={set.id} style={[styles.row, !set.completed && styles.skipped]}>
            <Text style={[styles.colSet, styles.setLabel, warmup && styles.warmup]}>{warmup ? 'W' : set.completed ? workingNumber : '–'}</Text>
            <Text style={[styles.colLoad, styles.cell, warmup && styles.warmupText]}>{formatLoggedLoad(set.weightKg, set.reps, unit)}</Text>
            <Text style={[styles.colRpe, styles.cellMuted]}>{set.rpe != null ? formatWeight(set.rpe) : '—'}</Text>
            <Text style={[styles.colMax, styles.cellMuted]}>{max != null ? formatEstimate(kgToDisplay(max, unit)) : set.completed ? '—' : 'skipped'}</Text>
          </View>
        );
      })}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {working.length} working {working.length === 1 ? 'set' : 'sets'} · {formatVolume(kgToDisplay(volumeKg, unit))} {unit}
        </Text>
        {bestOneRepMax > 0 ? (
          <Text style={styles.footerStrong}>
            Best e1RM {formatEstimate(kgToDisplay(bestOneRepMax, unit))} {unit}
          </Text>
        ) : null}
      </View>
      {session && session.used > 1 ? (
        <Text style={styles.sessionLine}>
          Session 1RM {formatEstimate(kgToDisplay(session.sessionKg, unit))} {unit}, from {session.used} of {working.length} sets
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  action: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  fill: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  exercise: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  cell: {
    color: colors.text,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  cellMuted: {
    color: colors.muted,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  colLoad: {
    flex: 1,
  },
  colMax: {
    textAlign: 'right',
    width: 64,
  },
  colRpe: {
    textAlign: 'center',
    width: 44,
  },
  colSet: {
    width: 36,
  },
  footer: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 10,
  },
  footerStrong: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
  },
  footerText: {
    color: colors.muted,
    fontSize: 13,
  },
  sessionLine: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 6,
    textAlign: 'right',
  },
  head: {
    color: colors.faint,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  headRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
    paddingBottom: 6,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  notes: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  notesWrap: {
    backgroundColor: colors.surfaceRaised,
    borderLeftColor: colors.accent,
    borderLeftWidth: 3,
    borderRadius: 8,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: 7,
  },
  setLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  skipped: {
    opacity: 0.45,
  },
  summary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 14,
    paddingVertical: 12,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
  },
  warmup: {
    color: '#F0C14A',
  },
  warmupText: {
    color: colors.muted,
  },
});
