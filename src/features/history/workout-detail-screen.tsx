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
import { formatVolume, formatWeight, kgToDisplay } from '../../domain/units';
import type { WorkoutDetail } from '../../domain/types';
import type { StackNavigation, StackRoute } from '../../navigation/types';
import { colors } from '../../theme/colors';

export const WorkoutDetailScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigation>();
  const route = useRoute<StackRoute<'WorkoutDetail'>>();
  const dispatch = useAppDispatch();
  const { unit } = useWeightUnit();
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const activeWorkoutId = useAppSelector((state) => state.app.activeWorkoutId);

  useFocusEffect(
    useCallback(() => {
      let cancel = false;
      void getWorkout(route.params.workoutId).then((loaded) => {
        if (!cancel) {
          setWorkout(loaded);
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
  const volumeKg = workout
    ? workout.exercises.reduce(
        (sum, exercise) => sum + exercise.sets.reduce((setSum, set) => (set.completed && set.setType !== 'warmup' ? setSum + (set.weightKg ?? 0) * (set.reps ?? 0) : setSum), 0),
        0,
      )
    : 0;

  return (
    <Screen bottomInset>
      <Header left={<TextButton label="Back" onPress={navigation.goBack} />} right={<TextButton label="Delete" onPress={handleDelete} tone="danger" />} title="Workout" />
      {!workout ? (
        <EmptyState message="This session is no longer on the device." title="Workout missing" />
      ) : (
        <ScrollView contentContainerStyle={styles.content} style={styles.fill}>
          <Text style={styles.title}>{workout.name}</Text>
          <Text style={styles.meta}>
            {formatWorkoutWhen(workout.finishedAt ?? workout.startedAt)}
            {workout.finishedAt ? ` · ${formatDuration(workout.startedAt, workout.finishedAt)}` : ''}
          </Text>
          <Text style={styles.volume}>
            {formatVolume(kgToDisplay(volumeKg, unit))} {unit} volume
          </Text>
          <View style={styles.actions}>
            <Button label="Edit" onPress={handleEdit} style={styles.action} variant="secondary" />
            <Button label="Duplicate" onPress={handleDuplicate} style={styles.action} />
          </View>
          {workout.exercises.map((exercise) => (
            <View key={exercise.id} style={styles.card}>
              <Text style={styles.exercise}>{exercise.name}</Text>
              <Text style={styles.meta}>
                {exercise.muscleGroup} · {exercise.equipment}
              </Text>
              {exercise.notes.trim() ? <Text style={styles.notes}>{exercise.notes.trim()}</Text> : null}
              {exercise.sets.map((set, index) => (
                <Text key={set.id} style={[styles.set, !set.completed && styles.incomplete]}>
                  {set.setType === 'warmup' ? 'W' : index + 1}  {formatLoggedLoad(set.weightKg, set.reps, unit)}
                  {set.rpe != null ? `  ·  RPE ${formatWeight(set.rpe)}` : ''}
                  {set.completed ? '' : '  · not completed'}
                </Text>
              ))}
            </View>
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
  incomplete: {
    color: colors.faint,
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
    marginTop: 10,
  },
  set: {
    color: colors.text,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    marginTop: 8,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
  },
  volume: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 10,
  },
});
