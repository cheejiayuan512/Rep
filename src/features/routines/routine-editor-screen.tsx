/**
 * Rename a routine, reorder its exercises, or start a workout from it.
 * A brand-new routine named "New routine" with no exercises is deleted if you leave.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';

import { activeWorkoutChanged, dataChanged, useAppDispatch, useAppSelector } from '../../state/store';
import { Button } from '../../components/button';
import { ConfirmDialog, type ConfirmRequest } from '../../components/confirm-dialog';
import { Header, TextButton } from '../../components/header';
import { Screen } from '../../components/screen';
import {
  deleteRoutine,
  getRoutine,
  removeRoutineExercise,
  renameRoutine,
  saveRoutinePositions,
  startWorkoutFromRoutine,
} from '../../data/repository';
import type { RoutineDetail, RoutineExercise } from '../../domain/types';
import { moveById } from '../../domain/workout-edits';
import type { StackNavigation, StackRoute } from '../../navigation/types';
import { colors } from '../../theme/colors';

export const RoutineEditorScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigation>();
  const route = useRoute<StackRoute<'RoutineEditor'>>();
  const dispatch = useAppDispatch();
  const activeWorkoutId = useAppSelector((state) => state.app.activeWorkoutId);
  const [routine, setRoutine] = useState<RoutineDetail | null>(null);
  const [name, setName] = useState('New routine');
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const routineRef = useRef(routine);
  const nameRef = useRef(name);
  routineRef.current = routine;
  nameRef.current = name;

  const load = useCallback(async () => {
    const loaded = await getRoutine(route.params.routineId);
    setRoutine(loaded);
    if (loaded) {
      setName(loaded.name);
    }
  }, [route.params.routineId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      const current = routineRef.current;
      if (current && current.exercises.length === 0 && (nameRef.current.trim() || 'New routine') === 'New routine') {
        void deleteRoutine(current.id);
        dispatch(dataChanged());
      }
    });
    return unsubscribe;
  }, [dispatch, navigation]);

  const handleRename = useCallback(() => {
    const current = routineRef.current;
    if (!current) {
      return;
    }
    const next = nameRef.current.trim() || 'New routine';
    setName(next);
    setRoutine({ ...current, name: next });
    void renameRoutine(current.id, next);
    dispatch(dataChanged());
  }, [dispatch]);

  const handleAdd = useCallback(() => {
    navigation.navigate('ExercisePicker', { mode: 'routine', routineId: route.params.routineId });
  }, [navigation, route.params.routineId]);

  const handleRemove = useCallback((routineExerciseId: string) => {
    setRoutine((current) => (current ? { ...current, exercises: current.exercises.filter((exercise) => exercise.id !== routineExerciseId) } : current));
    void removeRoutineExercise(routineExerciseId);
    dispatch(dataChanged());
  }, [dispatch]);

  const handleMove = useCallback(
    (routineExerciseId: string, direction: -1 | 1) => {
      const current = routineRef.current;
      if (!current) {
        return;
      }
      const moved = moveById(current.exercises, routineExerciseId, direction);
      if (!moved) {
        return;
      }
      setRoutine({ ...current, exercises: moved });
      void saveRoutinePositions(moved.map((exercise) => ({ id: exercise.id, position: exercise.position })));
    },
    [],
  );

  const handleStart = useCallback(() => {
    const current = routineRef.current;
    if (!current || current.exercises.length === 0) {
      setConfirm({
        confirmLabel: 'OK',
        hideCancel: true,
        message: 'Add at least one exercise before starting this routine.',
        onConfirm: () => setConfirm(null),
        title: 'Routine is empty',
      });
      return;
    }
    if (activeWorkoutId) {
      setConfirm({
        confirmLabel: 'Resume',
        message: 'Finish or discard the current workout before starting another.',
        onConfirm: () => {
          setConfirm(null);
          dispatch(activeWorkoutChanged(activeWorkoutId));
          navigation.navigate('ActiveWorkout', { workoutId: activeWorkoutId });
        },
        title: 'Workout in progress',
      });
      return;
    }
    void startWorkoutFromRoutine(current.id).then((workoutId) => {
      dispatch(activeWorkoutChanged(workoutId));
      dispatch(dataChanged());
      navigation.navigate('ActiveWorkout', { workoutId });
    });
  }, [activeWorkoutId, dispatch, navigation]);

  const handleDelete = useCallback(() => {
    setConfirm({
      confirmLabel: 'Delete',
      destructive: true,
      message: 'Past workouts stay in history. This only removes the template.',
      onConfirm: () => {
        setConfirm(null);
        const current = routineRef.current;
        if (!current) {
          return;
        }
        routineRef.current = { ...current, exercises: current.exercises, name: 'kept' };
        void deleteRoutine(current.id).then(() => {
          dispatch(dataChanged());
          navigation.goBack();
        });
      },
      title: 'Delete routine?',
    });
  }, [dispatch, navigation]);

  const closeConfirm = useCallback(() => setConfirm(null), []);

  return (
    <Screen bottomInset>
      <Header left={<TextButton label="Back" onPress={navigation.goBack} />} title="Routine" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" style={styles.fill}>
        <TextInput onChangeText={setName} onEndEditing={handleRename} style={styles.name} value={name} />
        {routine?.exercises.map((exercise, index) => (
          <RoutineExerciseRow
            canMoveDown={index < (routine?.exercises.length ?? 0) - 1}
            canMoveUp={index > 0}
            exercise={exercise}
            key={exercise.id}
            onMove={handleMove}
            onRemove={handleRemove}
          />
        ))}
        <Button label="Add exercise" onPress={handleAdd} variant="secondary" />
        <Button label="Start workout" onPress={handleStart} style={styles.start} />
        <TextButton label="Delete routine" onPress={handleDelete} tone="danger" />
      </ScrollView>
      <ConfirmDialog
        confirmLabel={confirm?.confirmLabel ?? 'OK'}
        destructive={confirm?.destructive}
        hideCancel={confirm?.hideCancel}
        message={confirm?.message ?? ''}
        onCancel={closeConfirm}
        onConfirm={confirm?.onConfirm ?? closeConfirm}
        title={confirm?.title ?? ''}
        visible={confirm != null}
      />
    </Screen>
  );
};

interface RoutineExerciseRowProps {
  exercise: RoutineExercise;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (id: string, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
}

const RoutineExerciseRow: React.FC<RoutineExerciseRowProps> = React.memo(function RoutineExerciseRow({ exercise, canMoveUp, canMoveDown, onMove, onRemove }) {
  const moveUp = useCallback(() => onMove(exercise.id, -1), [exercise.id, onMove]);
  const moveDown = useCallback(() => onMove(exercise.id, 1), [exercise.id, onMove]);
  const remove = useCallback(() => onRemove(exercise.id), [exercise.id, onRemove]);

  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.exercise}>{exercise.name}</Text>
        <Text style={styles.meta}>
          {exercise.muscleGroup} · {exercise.equipment}
        </Text>
      </View>
      <TextButton disabled={!canMoveUp} label="Up" onPress={moveUp} />
      <TextButton disabled={!canMoveDown} label="Down" onPress={moveDown} />
      <TextButton label="Remove" onPress={remove} tone="danger" />
    </View>
  );
});

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  copy: {
    flex: 1,
  },
  exercise: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  name: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 16,
    padding: 0,
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  start: {
    marginBottom: 8,
    marginTop: 16,
  },
});
