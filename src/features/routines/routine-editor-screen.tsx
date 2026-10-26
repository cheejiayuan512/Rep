/**
 * Plan a routine the way you log a workout: one card per exercise with its sets, weight, and reps.
 * Drag a card's three dots to reorder, swipe a card left to remove it. Starting the routine copies these sets.
 * A brand-new routine named "New routine" with no exercises is deleted if you leave.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { activeWorkoutChanged, dataChanged, useAppDispatch, useAppSelector } from '../../state/store';
import { useWeightUnit } from '../../state/hooks';
import { Button } from '../../components/button';
import { ConfirmDialog, type ConfirmRequest } from '../../components/confirm-dialog';
import { hapticLight } from '../../components/haptics';
import { Header, TextButton } from '../../components/header';
import { Screen } from '../../components/screen';
import { SortableList, type SortHandle } from '../../components/sortable-list';
import {
  addRoutineSet,
  deleteRoutine,
  deleteRoutineSet,
  getRoutine,
  removeRoutineExercise,
  renameRoutine,
  restoreRoutineExercise,
  restoreRoutineSet,
  saveRoutinePositions,
  saveRoutineSetPositions,
  saveSupersetIds,
  getExerciseLog,
  startWorkoutFromRoutine,
  switchRoutineExerciseSetup,
  updateRoutineSet,
} from '../../data/repository';
import { draftFromSet, mergeDrafts, withDraft, type DraftMap } from '../../domain/drafts';
import { machineSetupOptions } from '../../domain/machine-setup';
import type { RoutineDetail, RoutineExercise, RoutineSet, SetType, WeightUnit } from '../../domain/types';
import { parseDecimal, repsTextToNumber, weightTextToKg } from '../../domain/units';
import { createId } from '../../domain/ids';
import { moveById, supersetRole, toggleSupersetWithNext, warmupsFirst } from '../../domain/workout-edits';
import type { StackNavigation, StackRoute } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { RoutineExerciseCard } from './routine-exercise-card';

interface PendingSet {
  weightKg: number | null;
  reps: number | null;
}

interface UndoToast {
  message: string;
  restore: () => void;
}

function draftsFor(routine: RoutineDetail | null, unit: WeightUnit, previous: DraftMap = {}): DraftMap {
  return routine ? mergeDrafts(previous, routine.exercises.flatMap((exercise) => exercise.sets.map((set) => ({ ...set, rpe: null }))), unit) : previous;
}

function exerciseKey(exercise: RoutineExercise): string {
  return exercise.id;
}

function mapSets(routine: RoutineDetail, routineExerciseId: string, change: (sets: RoutineSet[]) => RoutineSet[]): RoutineDetail {
  return {
    ...routine,
    exercises: routine.exercises.map((exercise) => (exercise.id === routineExerciseId ? { ...exercise, sets: change(exercise.sets) } : exercise)),
  };
}

function findSet(routine: RoutineDetail | null, setId: string): { exercise: RoutineExercise; set: RoutineSet; index: number } | null {
  for (const exercise of routine?.exercises ?? []) {
    const index = exercise.sets.findIndex((set) => set.id === setId);
    const set = exercise.sets[index];
    if (set) {
      return { exercise, index, set };
    }
  }
  return null;
}

export const RoutineEditorScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigation>();
  const route = useRoute<StackRoute<'RoutineEditor'>>();
  const dispatch = useAppDispatch();
  const { unit } = useWeightUnit();
  const activeWorkoutId = useAppSelector((state) => state.app.activeWorkoutId);
  const [routine, setRoutine] = useState<RoutineDetail | null>(() => getRoutine.now(route.params.routineId));
  const [drafts, setDrafts] = useState<DraftMap>(() => draftsFor(routine, unit));
  const [name, setName] = useState(() => routine?.name ?? 'New routine');
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [undo, setUndo] = useState<UndoToast | null>(null);
  const [dragging, setDragging] = useState(false);
  const routineRef = useRef(routine);
  const nameRef = useRef(name);
  const draftsRef = useRef(drafts);
  const unitRef = useRef(unit);
  const pendingRef = useRef<Record<string, PendingSet>>({});
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const orderTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  routineRef.current = routine;
  nameRef.current = name;
  draftsRef.current = drafts;
  unitRef.current = unit;

  const applyRoutine = useCallback((next: RoutineDetail | null) => {
    routineRef.current = next;
    setRoutine(next);
  }, []);

  const applyWarmupOrder = useCallback(
    (routineExerciseId: string) => {
      const current = routineRef.current;
      const exercise = current?.exercises.find((item) => item.id === routineExerciseId);
      if (!current || !exercise) {
        return;
      }
      const ordered = warmupsFirst(exercise.sets, true);
      if (!ordered) {
        return;
      }
      applyRoutine(mapSets(current, routineExerciseId, () => ordered));
      void saveRoutineSetPositions(ordered.map((set) => ({ id: set.id, position: set.position })));
    },
    [applyRoutine],
  );

  const scheduleWarmupOrder = useCallback(
    (routineExerciseId: string) => {
      const existing = orderTimersRef.current[routineExerciseId];
      if (existing) {
        clearTimeout(existing);
      }
      orderTimersRef.current[routineExerciseId] = setTimeout(() => {
        delete orderTimersRef.current[routineExerciseId];
        applyWarmupOrder(routineExerciseId);
      }, 300);
    },
    [applyWarmupOrder],
  );

  const flushPending = useCallback(async () => {
    const patches = pendingRef.current;
    pendingRef.current = {};
    for (const timer of Object.values(timersRef.current)) {
      clearTimeout(timer);
    }
    timersRef.current = {};
    await Promise.all(Object.entries(patches).map(([setId, patch]) => updateRoutineSet(setId, patch)));
  }, []);

  // Wait until typing pauses, then save. A burst of keystrokes becomes one write.
  const queueSave = useCallback((setId: string, patch: PendingSet) => {
    pendingRef.current[setId] = patch;
    const existing = timersRef.current[setId];
    if (existing) {
      clearTimeout(existing);
    }
    timersRef.current[setId] = setTimeout(() => {
      const next = pendingRef.current[setId];
      delete pendingRef.current[setId];
      delete timersRef.current[setId];
      if (next) {
        void updateRoutineSet(setId, next);
      }
    }, 300);
  }, []);

  const clearPending = useCallback((setId: string) => {
    delete pendingRef.current[setId];
    const timer = timersRef.current[setId];
    if (timer) {
      clearTimeout(timer);
    }
    delete timersRef.current[setId];
  }, []);

  const load = useCallback(async () => {
    await flushPending();
    const loaded = await getRoutine(route.params.routineId);
    applyRoutine(loaded);
    setDrafts((previous) => draftsFor(loaded, unitRef.current, previous));
    if (loaded) {
      setName(loaded.name);
    }
  }, [applyRoutine, flushPending, route.params.routineId]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        void flushPending();
      };
    }, [flushPending, load]),
  );

  useEffect(() => {
    setDrafts(draftsFor(routineRef.current, unit));
  }, [unit]);

  useEffect(() => {
    if (!undo) {
      return;
    }
    const id = setTimeout(() => setUndo(null), 5000);
    return () => clearTimeout(id);
  }, [undo]);

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
    applyRoutine({ ...current, name: next });
    void renameRoutine(current.id, next);
    dispatch(dataChanged());
  }, [applyRoutine, dispatch]);

  const handleAdd = useCallback(() => {
    navigation.navigate('ExercisePicker', { mode: 'routine', routineId: route.params.routineId });
  }, [navigation, route.params.routineId]);

  /** The set's numbers with what is typed in its boxes applied. */
  const readSetNumbers = useCallback((set: RoutineSet, override?: { weightText?: string; repsText?: string }): PendingSet => {
    const draft = draftsRef.current[set.id];
    return {
      reps: repsTextToNumber(override?.repsText ?? draft?.repsText ?? '', set.reps),
      weightKg: weightTextToKg(override?.weightText ?? draft?.weightText ?? '', unitRef.current, set.weightKg),
    };
  }, []);

  const applyNumbers = useCallback(
    (setId: string, override: { weightText?: string; repsText?: string }) => {
      const current = routineRef.current;
      const located = findSet(current, setId);
      if (!current || !located) {
        return;
      }
      const numbers = readSetNumbers(located.set, override);
      applyRoutine(mapSets(current, located.exercise.id, (sets) => sets.map((set) => (set.id === setId ? { ...set, ...numbers } : set))));
      queueSave(setId, numbers);
      if (located.set.setType === 'warmup' && override.weightText != null) {
        scheduleWarmupOrder(located.exercise.id);
      }
    },
    [applyRoutine, queueSave, readSetNumbers, scheduleWarmupOrder],
  );

  const handleChangeWeight = useCallback(
    (setId: string, value: string) => {
      setDrafts((previous) => ({ ...previous, [setId]: withDraft(previous[setId], { weightText: value }) }));
      if (value.trim() !== '' && parseDecimal(value) == null) {
        return;
      }
      applyNumbers(setId, { weightText: value });
    },
    [applyNumbers],
  );

  const handleChangeReps = useCallback(
    (setId: string, value: string) => {
      setDrafts((previous) => ({ ...previous, [setId]: withDraft(previous[setId], { repsText: value }) }));
      if (value.trim() !== '' && repsTextToNumber(value, null) == null) {
        return;
      }
      applyNumbers(setId, { repsText: value });
    },
    [applyNumbers],
  );

  const handleChangeSetType = useCallback(
    (setId: string, setType: SetType) => {
      const current = routineRef.current;
      const located = findSet(current, setId);
      if (!current || !located || located.set.setType === setType) {
        return;
      }
      const toggled = located.exercise.sets.map((set): RoutineSet => (set.id === setId ? { ...set, setType } : set));
      const ordered = warmupsFirst(toggled, true) ?? toggled.map((set, position) => ({ ...set, position }));
      applyRoutine(mapSets(current, located.exercise.id, () => ordered));
      void updateRoutineSet(setId, { setType });
      void saveRoutineSetPositions(ordered.map((set) => ({ id: set.id, position: set.position })));
      const pendingOrder = orderTimersRef.current[located.exercise.id];
      if (pendingOrder) {
        clearTimeout(pendingOrder);
        delete orderTimersRef.current[located.exercise.id];
      }
    },
    [applyRoutine],
  );

  const handleToggleSuperset = useCallback(
    (routineExerciseId: string) => {
      const current = routineRef.current;
      if (!current) {
        return;
      }
      const next = toggleSupersetWithNext(current.exercises, routineExerciseId, createId());
      if (!next) {
        return;
      }
      applyRoutine({ ...current, exercises: next });
      void saveSupersetIds(
        'routine',
        next.map((exercise) => ({ id: exercise.id, supersetId: exercise.supersetId })),
      );
    },
    [applyRoutine],
  );

  const handleDeleteSet = useCallback(
    (setId: string) => {
      const current = routineRef.current;
      const located = findSet(current, setId);
      if (!current || !located) {
        return;
      }
      clearPending(setId);
      const removed = { ...located.set, ...readSetNumbers(located.set) };
      const exerciseId = located.exercise.id;
      applyRoutine(mapSets(current, exerciseId, (sets) => sets.filter((set) => set.id !== setId).map((set, position) => ({ ...set, position }))));
      void deleteRoutineSet(setId);
      setUndo({
        message: `Deleted set ${located.index + 1} of ${located.exercise.name}`,
        restore: () => {
          const latest = routineRef.current;
          if (!latest) {
            return;
          }
          applyRoutine(
            mapSets(latest, exerciseId, (sets) => {
              if (sets.some((set) => set.id === setId)) {
                return sets;
              }
              const next = [...sets];
              next.splice(Math.min(located.index, next.length), 0, removed);
              return next.map((set, position) => ({ ...set, position }));
            }),
          );
          void restoreRoutineSet(exerciseId, removed, located.index);
        },
      });
    },
    [applyRoutine, clearPending, readSetNumbers],
  );

  const handleAddSet = useCallback(
    async (routineExerciseId: string) => {
      const exercise = routineRef.current?.exercises.find((item) => item.id === routineExerciseId);
      if (!exercise) {
        return;
      }
      const last = exercise.sets[exercise.sets.length - 1];
      const created = await addRoutineSet(routineExerciseId, last ? readSetNumbers(last) : { reps: null, weightKg: null });
      const latest = routineRef.current;
      if (latest) {
        applyRoutine(mapSets(latest, routineExerciseId, (sets) => [...sets, created]));
      }
      setDrafts((previous) => ({ ...previous, [created.id]: draftFromSet({ ...created, rpe: null }, unitRef.current) }));
    },
    [applyRoutine, readSetNumbers],
  );

  const pressAddSet = useCallback(
    (routineExerciseId: string) => {
      void handleAddSet(routineExerciseId);
    },
    [handleAddSet],
  );

  const handleRemove = useCallback(
    (routineExerciseId: string) => {
      const current = routineRef.current;
      const index = current?.exercises.findIndex((item) => item.id === routineExerciseId) ?? -1;
      const exercise = current?.exercises[index];
      if (!current || !exercise) {
        return;
      }
      exercise.sets.forEach((set) => clearPending(set.id));
      const snapshot = { ...exercise, sets: exercise.sets.map((set) => ({ ...set, ...readSetNumbers(set) })) };
      applyRoutine({ ...current, exercises: current.exercises.filter((item) => item.id !== routineExerciseId) });
      void removeRoutineExercise(routineExerciseId);
      dispatch(dataChanged());
      setUndo({
        message: `Removed ${exercise.name}`,
        restore: () => {
          const latest = routineRef.current;
          if (!latest || latest.exercises.some((item) => item.id === snapshot.id)) {
            return;
          }
          const exercises = [...latest.exercises];
          exercises.splice(Math.min(index, exercises.length), 0, snapshot);
          applyRoutine({ ...latest, exercises: exercises.map((item, position) => ({ ...item, position })) });
          void restoreRoutineExercise(latest.id, snapshot, index);
          dispatch(dataChanged());
        },
      });
    },
    [applyRoutine, clearPending, dispatch, readSetNumbers],
  );

  const saveOrder = useCallback(
    (exercises: RoutineExercise[]) => {
      const current = routineRef.current;
      if (!current) {
        return;
      }
      const positioned = exercises.map((exercise, position) => ({ ...exercise, position }));
      applyRoutine({ ...current, exercises: positioned });
      void saveRoutinePositions(positioned.map((exercise) => ({ id: exercise.id, position: exercise.position })));
      dispatch(dataChanged());
    },
    [applyRoutine, dispatch],
  );

  const handleReorder = useCallback(
    (ids: string[]) => {
      const byId = new Map(routineRef.current?.exercises.map((exercise) => [exercise.id, exercise]));
      saveOrder(ids.flatMap((id) => byId.get(id) ?? []));
    },
    [saveOrder],
  );

  const handleMove = useCallback(
    (routineExerciseId: string, direction: -1 | 1) => {
      const moved = routineRef.current ? moveById(routineRef.current.exercises, routineExerciseId, direction) : null;
      if (moved) {
        saveOrder(moved);
      }
    },
    [saveOrder],
  );

  const handleUndo = useCallback(() => {
    const pending = undo;
    setUndo(null);
    pending?.restore();
    void hapticLight();
  }, [undo]);

  const handleStart = useCallback(async () => {
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
    await flushPending();
    const workoutId = await startWorkoutFromRoutine(current.id);
    navigation.navigate('ActiveWorkout', { workoutId });
    dispatch(activeWorkoutChanged(workoutId));
    dispatch(dataChanged());
  }, [activeWorkoutId, dispatch, flushPending, navigation]);

  const pressStart = useCallback(() => {
    void handleStart();
  }, [handleStart]);

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
        routineRef.current = { ...current, name: 'kept' };
        void deleteRoutine(current.id).then(() => {
          dispatch(dataChanged());
          navigation.goBack();
        });
      },
      title: 'Delete routine?',
    });
  }, [dispatch, navigation]);

  const handleChangeSetup = useCallback((routineExerciseId: string, setup: string | null) => {
    const current = routineRef.current;
    const exercise = current?.exercises.find((item) => item.id === routineExerciseId);
    if (!current || !exercise || exercise.machineSetup === setup) {
      return;
    }
    void switchRoutineExerciseSetup(routineExerciseId, setup).then(() => {
      void load();
    });
  }, [load]);

  const closeConfirm = useCallback(() => setConfirm(null), []);

  const renderExercise = useCallback(
    (exercise: RoutineExercise, handle: SortHandle) => (
      <RoutineExerciseCard
        dragging={handle.dragging}
        drafts={drafts}
        exercise={exercise}
        onAddSet={pressAddSet}
        onChangeReps={handleChangeReps}
        onChangeSetType={handleChangeSetType}
        onChangeSetup={handleChangeSetup}
        setupOptions={machineSetupOptions(getExerciseLog.now(exercise.exerciseId) ?? [])}
        onChangeWeight={handleChangeWeight}
        onDeleteSet={handleDeleteSet}
        onMove={handleMove}
        onRemove={handleRemove}
        onToggleSuperset={handleToggleSuperset}
        panHandlers={handle.panHandlers}
        canLinkSuperset={(routine?.exercises[routine.exercises.length - 1]?.id ?? exercise.id) !== exercise.id}
        superset={supersetRole(routine?.exercises ?? [], exercise.id)}
        unit={unit}
      />
    ),
    [drafts, handleChangeReps, handleChangeSetType, handleChangeSetup, handleChangeWeight, handleDeleteSet, handleMove, handleRemove, handleToggleSuperset, pressAddSet, routine?.exercises, unit],
  );

  const exercises = routine?.exercises ?? [];

  return (
    <Screen bottomInset>
      <Header left={<TextButton label="Back" onPress={navigation.goBack} />} title="Routine" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: undo ? 120 : 40 }]}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!dragging}
          style={styles.fill}
        >
          <TextInput accessibilityLabel="Routine name" onChangeText={setName} onEndEditing={handleRename} style={styles.name} value={name} />
          {exercises.length > 0 ? <Text style={styles.hint}>Drag ⋮ to reorder. Swipe a card left to remove it.</Text> : null}
          <SortableList items={exercises} keyOf={exerciseKey} onDraggingChange={setDragging} onReorder={handleReorder} renderItem={renderExercise} />
          <Button label="Add exercise" onPress={handleAdd} variant="secondary" />
          <Button label="Start workout" onPress={pressStart} style={styles.start} />
          <TextButton label="Delete routine" onPress={handleDelete} tone="danger" />
        </ScrollView>
      </KeyboardAvoidingView>
      {undo ? (
        <View pointerEvents="box-none" style={styles.toasts}>
          <View style={styles.undo}>
            <Text numberOfLines={1} style={styles.undoText}>
              {undo.message}
            </Text>
            <TextButton label="Undo" onPress={handleUndo} tone="accent" />
          </View>
        </View>
      ) : null}
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

const styles = StyleSheet.create({
  content: {
    padding: 20,
  },
  fill: {
    flex: 1,
  },
  hint: {
    color: colors.faint,
    fontSize: 13,
    marginBottom: 12,
  },
  name: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 12,
    padding: 0,
  },
  start: {
    marginBottom: 8,
    marginTop: 16,
  },
  toasts: {
    bottom: 16,
    left: 20,
    position: 'absolute',
    right: 20,
  },
  undo: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  undoText: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
});
