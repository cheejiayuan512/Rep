/**
 * Saved exercise lists. Opens from Home. Tap one to edit it.
 */
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, type ListRenderItemInfo } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { useRoutines } from '../../state/hooks';
import { activeWorkoutChanged, dataChanged, useAppDispatch, useAppSelector } from '../../state/store';
import { Button } from '../../components/button';
import { ConfirmDialog, type ConfirmRequest } from '../../components/confirm-dialog';
import { EmptyState } from '../../components/empty-state';
import { Header, TextButton } from '../../components/header';
import { Screen } from '../../components/screen';
import { createRoutine, startWorkoutFromRoutine } from '../../data/repository';
import { summarizeNames } from '../../domain/format';
import type { RoutineSummary } from '../../domain/types';
import type { StackNavigation } from '../../navigation/types';
import { colors } from '../../theme/colors';

function routineKey(routine: RoutineSummary): string {
  return routine.id;
}

export const RoutinesScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigation>();
  const dispatch = useAppDispatch();
  const routines = useRoutines();
  const activeWorkoutId = useAppSelector((state) => state.app.activeWorkoutId);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const openWorkout = useCallback(
    (workoutId: string) => {
      dispatch(activeWorkoutChanged(workoutId));
      navigation.navigate('ActiveWorkout', { workoutId });
    },
    [dispatch, navigation],
  );

  const handleCreate = useCallback(async () => {
    const routineId = await createRoutine('New routine');
    dispatch(dataChanged());
    navigation.navigate('RoutineEditor', { routineId });
  }, [dispatch, navigation]);

  const handleOpen = useCallback(
    (routineId: string) => {
      navigation.navigate('RoutineEditor', { routineId });
    },
    [navigation],
  );

  const handleStart = useCallback(
    (routineId: string) => {
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
      void startWorkoutFromRoutine(routineId).then((workoutId) => {
        dispatch(dataChanged());
        openWorkout(workoutId);
      });
    },
    [activeWorkoutId, dispatch, openWorkout],
  );

  const renderRoutine = useCallback(
    ({ item }: ListRenderItemInfo<RoutineSummary>) => <RoutineCard onOpen={handleOpen} onStart={handleStart} routine={item} />,
    [handleOpen, handleStart],
  );
  const pressCreate = useCallback(() => {
    void handleCreate();
  }, [handleCreate]);
  const closeConfirm = useCallback(() => setConfirm(null), []);

  return (
    <Screen>
      <Header left={<TextButton label="Back" onPress={navigation.goBack} />} title="Routines" />
      <FlatList
        style={styles.fill}
        contentContainerStyle={routines.length === 0 ? styles.emptyList : styles.list}
        data={routines}
        keyExtractor={routineKey}
        ListEmptyComponent={<EmptyState actionLabel="Create a routine" message="Add the exercises you repeat, then start them as a workout." onAction={pressCreate} title="No routines yet" />}
        renderItem={renderRoutine}
      />
      {routines.length > 0 ? (
        <View style={styles.footer}>
          <Button label="New routine" onPress={pressCreate} />
        </View>
      ) : null}
      <ConfirmDialog confirmLabel={confirm?.confirmLabel ?? 'OK'} message={confirm?.message ?? ''} onCancel={closeConfirm} onConfirm={confirm?.onConfirm ?? closeConfirm} title={confirm?.title ?? ''} visible={confirm != null} />
    </Screen>
  );
};

interface RoutineCardProps {
  routine: RoutineSummary;
  onOpen: (routineId: string) => void;
  onStart: (routineId: string) => void;
}

const RoutineCard: React.FC<RoutineCardProps> = React.memo(function RoutineCard({ routine, onOpen, onStart }) {
  const handleOpen = useCallback(() => {
    onOpen(routine.id);
  }, [onOpen, routine.id]);
  const handleStart = useCallback(() => {
    onStart(routine.id);
  }, [onStart, routine.id]);

  return (
    <View style={styles.card}>
      <Pressable onPress={handleOpen}>
        <Text style={styles.name}>{routine.name}</Text>
        <Text style={styles.meta}>{summarizeNames(routine.exerciseNames)}</Text>
      </Pressable>
      <Button label="Start" onPress={handleStart} style={styles.start} />
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  fill: {
    flex: 1,
  },
  footer: {
    padding: 20,
  },
  list: {
    padding: 20,
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 6,
  },
  name: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  start: {
    marginTop: 14,
  },
});
