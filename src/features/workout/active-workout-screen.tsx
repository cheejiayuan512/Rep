/**
 * The page you see while a workout is open. It owns the typed text, waits a
 * moment, then asks the repository to save. The ticking clock and rest bar
 * are separate components so this page does not redraw every second.
 * See docs/tour.md for the full path.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRestSeconds, useWeightUnit } from '../../state/hooks';
import { activeWorkoutChanged, dataChanged, useAppDispatch } from '../../state/store';
import { ExerciseBlock } from '../../components/exercise-block';
import { ExerciseOrderList } from '../../components/exercise-order-list';
import { ConfirmDialog, type ConfirmRequest } from '../../components/confirm-dialog';
import { ElapsedClock } from '../../components/elapsed-clock';
import { EmptyState } from '../../components/empty-state';
import { hapticLight, hapticSuccess } from '../../components/haptics';
import { Header, TextButton } from '../../components/header';
import { KeyboardDoneBar } from '../../components/keyboard-done-bar';
import { RestBar } from '../../components/rest-bar';
import type { RestActivityProps } from '../../components/rest-activity';
import { endRestActivity, showRestActivity } from '../../components/rest-live-activity';
import { cancelRestEnd, scheduleRestEnd } from '../../components/rest-notification';
import { formatLoggedLoad, formatWorkoutWhen } from '../../domain/format';
import { Screen } from '../../components/screen';
import { UnitToggle } from '../../components/unit-toggle';
import { draftFromSet, mergeDrafts, withDraft, type DraftMap } from '../../domain/drafts';
import { detectRecords, recordSetIds, scoreLoggedSet, toLoggedSet, type ScoredSet } from '../../domain/metrics';
import type { LoggedSet, SetRecord, WorkoutDetail, WorkoutExercise } from '../../domain/types';
import { findSet, orderByIds, updateSetInWorkout } from '../../domain/workout-edits';
import { parseDecimal, parseRpe, repsTextToNumber, rpeTextToNumber, weightTextToKg } from '../../domain/units';
import {
  deleteSet,
  discardWorkout,
  finishWorkout,
  getHistorySets,
  getWorkout,
  insertSet,
  removeWorkoutExercise,
  renameWorkout,
  restoreSet,
  restoreWorkoutExercise,
  saveWorkoutExercisePositions,
  updateSetCompleted,
  updateSetNumbers,
  updateSetType,
  updateWorkoutExerciseNotes,
  updateWorkoutExerciseRest,
} from '../../data/repository';
import type { StackNavigation, StackRoute } from '../../navigation/types';
import { colors } from '../../theme/colors';

interface PendingSet {
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
}

interface RecordToast {
  exerciseName: string;
  lines: string[];
}

interface UndoToast {
  message: string;
  restore: () => void;
}

const noRecords: ReadonlySet<string> = new Set();

function scoreWorkoutSet(workout: WorkoutDetail, exercise: WorkoutExercise, set: SetRecord, performedAt: number): ScoredSet | null {
  return scoreLoggedSet(
    toLoggedSet({
      completed: set.completed,
      exerciseId: exercise.exerciseId,
      performedAt,
      position: set.position,
      reps: set.reps,
      setType: set.setType,
      weightKg: set.weightKg,
      workoutId: workout.id,
    }),
  );
}

function clampRestSeconds(seconds: number): number {
  return Math.min(300, Math.max(15, Math.round(seconds)));
}

export const ActiveWorkoutScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigation>();
  const route = useRoute<StackRoute<'ActiveWorkout'>>();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { unit, setUnit } = useWeightUnit();
  const { restSeconds, setRestSeconds } = useRestSeconds();
  const workoutId = route.params.workoutId;
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [historyByExercise, setHistoryByExercise] = useState<Record<string, LoggedSet[]>>({});
  const [missing, setMissing] = useState(false);
  const [title, setTitle] = useState('Workout');
  const [banner, setBanner] = useState<string | null>(null);
  const [recordBanner, setRecordBanner] = useState<RecordToast | null>(null);
  const [undo, setUndo] = useState<UndoToast | null>(null);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const restExerciseRef = useRef<string | null>(null);
  const restActivityRef = useRef<Omit<RestActivityProps, 'endsAt'> | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [orderIds, setOrderIds] = useState<string[] | null>(null);
  const [orderDragging, setOrderDragging] = useState(false);
  const workoutRef = useRef(workout);
  const draftsRef = useRef(drafts);
  const unitRef = useRef(unit);
  const titleRef = useRef(title);
  const titleFocused = useRef(false);
  const historyRef = useRef(historyByExercise);
  const pendingRef = useRef<Record<string, PendingSet>>({});
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const notePendingRef = useRef<Record<string, string>>({});
  const noteTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const restEndsAtRef = useRef(restEndsAt);

  // A finished workout opened from History: same cards, but no rest timer, PR toast, or finish step.
  const editing = workout?.finishedAt != null;
  const editingRef = useRef(editing);
  editingRef.current = editing;
  workoutRef.current = workout;
  restEndsAtRef.current = restEndsAt;
  draftsRef.current = drafts;
  unitRef.current = unit;
  titleRef.current = title;
  historyRef.current = historyByExercise;

  const flushPending = useCallback(async () => {
    const patches = pendingRef.current;
    pendingRef.current = {};
    for (const timer of Object.values(timersRef.current)) {
      clearTimeout(timer);
    }
    timersRef.current = {};
    const notes = notePendingRef.current;
    notePendingRef.current = {};
    for (const timer of Object.values(noteTimersRef.current)) {
      clearTimeout(timer);
    }
    noteTimersRef.current = {};
    await Promise.all([
      ...Object.entries(patches).map(([setId, patch]) => updateSetNumbers(setId, patch.weightKg, patch.reps, patch.rpe)),
      ...Object.entries(notes).map(([workoutExerciseId, text]) => updateWorkoutExerciseNotes(workoutExerciseId, text)),
    ]);
  }, []);

  // Wait until typing pauses, then save. A burst of keystrokes becomes one write.
  const queueSave = useCallback((setId: string, patch: PendingSet) => {
    pendingRef.current[setId] = patch;
    const existing = timersRef.current[setId];
    if (existing) {
      clearTimeout(existing);
    }
    timersRef.current[setId] = setTimeout(() => {
      const patch = pendingRef.current[setId];
      delete pendingRef.current[setId];
      delete timersRef.current[setId];
      if (patch) {
        void updateSetNumbers(setId, patch.weightKg, patch.reps, patch.rpe);
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

  useEffect(() => {
    return () => {
      void flushPending();
    };
  }, [flushPending]);

  useEffect(() => {
    const current = workoutRef.current;
    if (!current) {
      return;
    }
    setDrafts(mergeDrafts({}, current.exercises.flatMap((exercise) => exercise.sets), unit));
  }, [unit]);

  useEffect(() => {
    if (!recordBanner) {
      return;
    }
    const id = setTimeout(() => setRecordBanner(null), 4000);
    return () => clearTimeout(id);
  }, [recordBanner]);

  useEffect(() => {
    if (!undo) {
      return;
    }
    const id = setTimeout(() => setUndo(null), 5000);
    return () => clearTimeout(id);
  }, [undo]);

  const recordIdsByExercise = useMemo(() => {
    const map = new Map<string, ReadonlySet<string>>();
    if (!workout) {
      return map;
    }
    for (const exercise of workout.exercises) {
      const history = (historyByExercise[exercise.exerciseId] ?? []).map(scoreLoggedSet).filter((set): set is ScoredSet => set != null);
      const ids = recordSetIds(
        exercise.sets.map((set) => ({ id: set.id, scored: scoreWorkoutSet(workout, exercise, set, workout.startedAt + set.position + 1) })),
        history,
      );
      if (ids.size > 0) {
        map.set(exercise.id, ids);
      }
    }
    return map;
  }, [historyByExercise, workout]);

  useEffect(() => {
    if (restEndsAt == null) {
      return;
    }
    const id = setTimeout(() => {
      setRestEndsAt(null);
      endRestActivity();
      void hapticSuccess();
    }, Math.max(0, restEndsAt - Date.now()));
    return () => clearTimeout(id);
  }, [restEndsAt]);

  useFocusEffect(
    useCallback(() => {
      let cancel = false;
      void (async () => {
        await flushPending();
        const loaded = await getWorkout(workoutId);
        if (cancel) {
          return;
        }
        if (!loaded) {
          setMissing(true);
          setWorkout(null);
          return;
        }
        const history = await getHistorySets(
          loaded.exercises.map((exercise) => exercise.exerciseId),
          loaded.id,
          loaded.finishedAt != null ? loaded.startedAt : undefined,
        );
        if (cancel) {
          return;
        }
        setMissing(false);
        setWorkout(loaded);
        setHistoryByExercise(history);
        setDrafts((previous) => mergeDrafts(previous, loaded.exercises.flatMap((exercise) => exercise.sets), unitRef.current));
        if (!titleFocused.current) {
          setTitle(loaded.name);
        }
      })();
      return () => {
        cancel = true;
      };
    }, [flushPending, workoutId]),
  );

  const leave = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Tabs');
  }, [navigation]);

  const handleRename = useCallback(() => {
    titleFocused.current = false;
    const current = workoutRef.current;
    if (!current) {
      return;
    }
    const next = titleRef.current.trim() || 'Workout';
    setTitle(next);
    setWorkout({ ...current, name: next });
    void renameWorkout(current.id, next);
  }, []);

  const handleFocusTitle = useCallback(() => {
    titleFocused.current = true;
  }, []);

  const readSetNumbers = useCallback((setId: string, fallback: { weightKg: number | null; reps: number | null; rpe: number | null }, override?: Partial<{ weightText: string; repsText: string; rpeText: string }>) => {
    const draft = draftsRef.current[setId];
    return {
      reps: repsTextToNumber(override?.repsText ?? draft?.repsText ?? '', fallback.reps),
      rpe: rpeTextToNumber(override?.rpeText ?? draft?.rpeText ?? '', fallback.rpe),
      weightKg: weightTextToKg(override?.weightText ?? draft?.weightText ?? '', unitRef.current, fallback.weightKg),
    };
  }, []);

  const queueNote = useCallback((workoutExerciseId: string, notes: string) => {
    notePendingRef.current[workoutExerciseId] = notes;
    const existing = noteTimersRef.current[workoutExerciseId];
    if (existing) {
      clearTimeout(existing);
    }
    noteTimersRef.current[workoutExerciseId] = setTimeout(() => {
      const text = notePendingRef.current[workoutExerciseId];
      delete notePendingRef.current[workoutExerciseId];
      delete noteTimersRef.current[workoutExerciseId];
      if (text != null) {
        void updateWorkoutExerciseNotes(workoutExerciseId, text);
      }
    }, 300);
  }, []);

  const handleChangeWeight = useCallback(
    (setId: string, value: string) => {
      setDrafts((previous) => ({
        ...previous,
        [setId]: withDraft(previous[setId], { weightText: value }),
      }));
      const current = workoutRef.current;
      const located = current ? findSet(current, setId) : null;
      if (!current || !located) {
        return;
      }
      if (value.trim() !== '' && parseDecimal(value) == null) {
        return;
      }
      const numbers = readSetNumbers(setId, located.set, { weightText: value });
      setWorkout(updateSetInWorkout(current, setId, numbers));
      queueSave(setId, numbers);
    },
    [queueSave, readSetNumbers],
  );

  const handleChangeReps = useCallback(
    (setId: string, value: string) => {
      setDrafts((previous) => ({
        ...previous,
        [setId]: withDraft(previous[setId], { repsText: value }),
      }));
      const current = workoutRef.current;
      const located = current ? findSet(current, setId) : null;
      if (!current || !located) {
        return;
      }
      if (value.trim() !== '' && repsTextToNumber(value, null) == null) {
        return;
      }
      const numbers = readSetNumbers(setId, located.set, { repsText: value });
      setWorkout(updateSetInWorkout(current, setId, numbers));
      queueSave(setId, numbers);
    },
    [queueSave, readSetNumbers],
  );

  const handleChangeRpe = useCallback(
    (setId: string, value: string) => {
      setDrafts((previous) => ({
        ...previous,
        [setId]: withDraft(previous[setId], { rpeText: value }),
      }));
      const current = workoutRef.current;
      const located = current ? findSet(current, setId) : null;
      if (!current || !located) {
        return;
      }
      if (value.trim() !== '' && parseRpe(value) == null) {
        return;
      }
      const numbers = readSetNumbers(setId, located.set, { rpeText: value });
      setWorkout(updateSetInWorkout(current, setId, numbers));
      queueSave(setId, numbers);
    },
    [queueSave, readSetNumbers],
  );

  const handleChangeNotes = useCallback(
    (workoutExerciseId: string, value: string) => {
      const notes = value.slice(0, 500);
      setWorkout((current) => {
        if (!current) {
          return current;
        }
        return {
          ...current,
          exercises: current.exercises.map((exercise) => (exercise.id === workoutExerciseId ? { ...exercise, notes } : exercise)),
        };
      });
      queueNote(workoutExerciseId, notes);
    },
    [queueNote],
  );

  const handleToggleWarmup = useCallback((setId: string) => {
    const current = workoutRef.current;
    const located = current ? findSet(current, setId) : null;
    if (!current || !located) {
      return;
    }
    const setType = located.set.setType === 'warmup' ? 'normal' : 'warmup';
    setWorkout(updateSetInWorkout(current, setId, { setType }));
    void updateSetType(setId, setType);
    void hapticLight();
  }, []);

  const handleToggleComplete = useCallback(
    (setId: string) => {
      const current = workoutRef.current;
      const located = current ? findSet(current, setId) : null;
      if (!current || !located) {
        return;
      }
      const numbers = readSetNumbers(setId, located.set);
      if (!located.set.completed && (numbers.reps == null || numbers.reps <= 0)) {
        setBanner('Add reps before completing the set.');
        return;
      }
      const completed = !located.set.completed;
      setBanner(null);
      clearPending(setId);
      setWorkout(updateSetInWorkout(current, setId, { completed, ...numbers }));
      void updateSetCompleted(setId, completed, numbers.weightKg, numbers.reps, numbers.rpe);
      if (!completed) {
        return;
      }
      void hapticLight();
      if (editingRef.current) {
        return;
      }
      const startedAt = Date.now();
      const endsAt = startedAt + (located.exercise.restSeconds ?? restSeconds) * 1000;
      const nextSet = located.exercise.sets.find((set) => set.id !== setId && !set.completed);
      restExerciseRef.current = located.exercise.id;
      restActivityRef.current = {
        exerciseName: located.exercise.name,
        nextSet: nextSet ? formatLoggedLoad(nextSet.weightKg, nextSet.reps, unitRef.current, nextSet.setType === 'warmup') : '',
        startedAt,
      };
      setRestEndsAt(endsAt);
      void scheduleRestEnd(endsAt, located.exercise.name);
      showRestActivity({ ...restActivityRef.current, endsAt });
      const scored = scoreWorkoutSet(current, located.exercise, { ...located.set, ...numbers, completed: true }, current.startedAt + located.set.position + 1);
      if (!scored) {
        return;
      }
      const prior = [
        ...(historyRef.current[located.exercise.exerciseId] ?? []).map(scoreLoggedSet),
        ...located.exercise.sets
          .filter((set) => set.id !== setId && set.completed)
          .map((set) => scoreWorkoutSet(current, located.exercise, set, current.startedAt + set.position)),
      ].filter((set): set is ScoredSet => set != null);
      const hits = detectRecords(scored, prior, unitRef.current);
      if (hits.length > 0) {
        setRecordBanner({ exerciseName: located.exercise.name, lines: hits.map((hit) => hit.title) });
        void hapticSuccess();
      }
    },
    [clearPending, readSetNumbers, restSeconds],
  );

  const handleChangeRest = useCallback((workoutExerciseId: string, seconds: number | null) => {
    const next = seconds == null ? null : clampRestSeconds(seconds);
    setWorkout((current) =>
      current
        ? { ...current, exercises: current.exercises.map((exercise) => (exercise.id === workoutExerciseId ? { ...exercise, restSeconds: next } : exercise)) }
        : current,
    );
    void updateWorkoutExerciseRest(workoutExerciseId, next);
  }, []);

  const handleDeleteSet = useCallback(
    (setId: string) => {
      const current = workoutRef.current;
      const located = current ? findSet(current, setId) : null;
      clearPending(setId);
      setWorkout((workout) => {
        if (!workout) {
          return workout;
        }
        return {
          ...workout,
          exercises: workout.exercises.map((exercise) => ({
            ...exercise,
            sets: exercise.sets.filter((set) => set.id !== setId).map((set, position) => ({ ...set, position })),
          })),
        };
      });
      void deleteSet(setId);
      if (!located) {
        return;
      }
      const workoutExerciseId = located.exercise.id;
      const index = located.exercise.sets.findIndex((set) => set.id === setId);
      const removed = { ...located.set, ...readSetNumbers(setId, located.set) };
      setUndo({
        message: `Deleted set ${index + 1} of ${located.exercise.name}`,
        restore: () => {
          setWorkout((workout) => {
            if (!workout) {
              return workout;
            }
            return {
              ...workout,
              exercises: workout.exercises.map((exercise) => {
                if (exercise.id !== workoutExerciseId || exercise.sets.some((set) => set.id === setId)) {
                  return exercise;
                }
                const sets = [...exercise.sets];
                sets.splice(Math.min(index, sets.length), 0, removed);
                return { ...exercise, sets: sets.map((set, position) => ({ ...set, position })) };
              }),
            };
          });
          void restoreSet(workoutExerciseId, removed, index);
        },
      });
    },
    [clearPending, readSetNumbers],
  );

  const handleAddSet = useCallback(async (workoutExerciseId: string) => {
    const current = workoutRef.current;
    const exercise = current?.exercises.find((item) => item.id === workoutExerciseId);
    if (!exercise) {
      return;
    }
    const last = exercise.sets[exercise.sets.length - 1];
    const draft = last ? draftsRef.current[last.id] : undefined;
    try {
      const created = await insertSet(workoutExerciseId, {
        reps: draft ? repsTextToNumber(draft.repsText, last?.reps ?? null) : (last?.reps ?? null),
        rpe: null,
        setType: 'normal',
        weightKg: draft ? weightTextToKg(draft.weightText, unitRef.current, last?.weightKg ?? null) : (last?.weightKg ?? null),
      });
      setWorkout((previous) => {
        if (!previous) {
          return previous;
        }
        return {
          ...previous,
          exercises: previous.exercises.map((item) => (item.id === workoutExerciseId ? { ...item, sets: [...item.sets, created] } : item)),
        };
      });
      setDrafts((previous) => ({ ...previous, [created.id]: draftFromSet(created, unitRef.current) }));
    } catch (error) {
      setBanner(error instanceof Error ? error.message : 'Could not add the set.');
    }
  }, []);

  const pressAddSet = useCallback(
    (id: string) => {
      void handleAddSet(id);
    },
    [handleAddSet],
  );

  const handleRemove = useCallback((workoutExerciseId: string) => {
    const current = workoutRef.current;
    const index = current?.exercises.findIndex((item) => item.id === workoutExerciseId) ?? -1;
    const exercise = current?.exercises[index];
    const snapshot = exercise ? { ...exercise, sets: exercise.sets.map((set) => ({ ...set, ...readSetNumbers(set.id, set) })) } : null;
    exercise?.sets.forEach((set) => clearPending(set.id));
    delete notePendingRef.current[workoutExerciseId];
    const noteTimer = noteTimersRef.current[workoutExerciseId];
    if (noteTimer) {
      clearTimeout(noteTimer);
      delete noteTimersRef.current[workoutExerciseId];
    }
    setWorkout((workout) => (workout ? { ...workout, exercises: workout.exercises.filter((item) => item.id !== workoutExerciseId) } : workout));
    void removeWorkoutExercise(workoutExerciseId);
    if (!current || !snapshot) {
      return;
    }
    setUndo({
      message: `Removed ${snapshot.name}`,
      restore: () => {
        setWorkout((workout) => {
          if (!workout || workout.exercises.some((item) => item.id === snapshot.id)) {
            return workout;
          }
          const exercises = [...workout.exercises];
          exercises.splice(Math.min(index, exercises.length), 0, snapshot);
          return { ...workout, exercises: exercises.map((item, position) => ({ ...item, position })) };
        });
        void restoreWorkoutExercise(current.id, snapshot, index);
      },
    });
  }, [clearPending, readSetNumbers]);

  const handleUndo = useCallback(() => {
    const pending = undo;
    setUndo(null);
    pending?.restore();
    void hapticLight();
  }, [undo]);

  const dismissRecord = useCallback(() => setRecordBanner(null), []);

  const beginReorder = useCallback(() => {
    const current = workoutRef.current;
    if (!current || current.exercises.length === 0) {
      return;
    }
    Keyboard.dismiss();
    void hapticLight();
    setOrderIds(current.exercises.map((exercise) => exercise.id));
  }, []);

  const cancelReorder = useCallback(() => {
    setOrderDragging(false);
    setOrderIds(null);
  }, []);

  const commitReorder = useCallback(() => {
    const current = workoutRef.current;
    if (current && orderIds) {
      const ordered = orderByIds(current.exercises, orderIds);
      const changed = ordered.some((exercise, index) => exercise.id !== current.exercises[index]?.id);
      if (changed) {
        setWorkout({ ...current, exercises: ordered });
        void saveWorkoutExercisePositions(ordered.map((exercise) => ({ id: exercise.id, position: exercise.position })));
      }
    }
    setOrderDragging(false);
    setOrderIds(null);
  }, [orderIds]);

  const handleAddExercise = useCallback(() => {
    navigation.navigate('ExercisePicker', { mode: 'workout', workoutId });
  }, [navigation, workoutId]);

  const handleFinish = useCallback(async () => {
    const current = workoutRef.current;
    if (!current || finishing) {
      return;
    }
    const hasCompletedSet = current.exercises.some((exercise) => exercise.sets.some((set) => set.completed && (set.reps ?? 0) > 0));
    if (!hasCompletedSet) {
      setConfirm({
        confirmLabel: 'OK',
        hideCancel: true,
        message: 'Add reps and check off at least one set before finishing.',
        onConfirm: () => setConfirm(null),
        title: 'No completed sets',
      });
      return;
    }
    setFinishing(true);
    try {
      await flushPending();
      await renameWorkout(current.id, titleRef.current);
      await finishWorkout(current.id);
      setRestEndsAt(null);
      void cancelRestEnd();
      endRestActivity();
      dispatch(activeWorkoutChanged(null));
      dispatch(dataChanged());
      leave();
    } catch (error) {
      setBanner(error instanceof Error ? error.message : 'Could not finish the workout.');
    } finally {
      setFinishing(false);
    }
  }, [dispatch, finishing, flushPending, leave]);

  const handleDiscard = useCallback(() => {
    setConfirm({
      confirmLabel: 'Discard',
      destructive: true,
      message: 'This removes the session and its sets.',
      onConfirm: () => {
        setConfirm(null);
        void (async () => {
          await discardWorkout(workoutId);
          setRestEndsAt(null);
          void cancelRestEnd();
          endRestActivity();
          dispatch(activeWorkoutChanged(null));
          dispatch(dataChanged());
          leave();
        })();
      },
      title: 'Discard workout?',
    });
  }, [dispatch, leave, workoutId]);

  const pressFinish = useCallback(() => {
    void handleFinish();
  }, [handleFinish]);

  const handleDoneEditing = useCallback(async () => {
    await flushPending();
    const current = workoutRef.current;
    if (current) {
      await renameWorkout(current.id, titleRef.current);
    }
    dispatch(dataChanged());
    leave();
  }, [dispatch, flushPending, leave]);

  const pressDoneEditing = useCallback(() => {
    void handleDoneEditing();
  }, [handleDoneEditing]);

  const adjustRest = useCallback(
    (delta: number) => {
      const current = restEndsAtRef.current;
      if (current == null) {
        return;
      }
      const next = Math.max(Date.now() + 1000, current + delta * 1000);
      restEndsAtRef.current = next;
      setRestEndsAt(next);
      const seconds = Math.round((next - Date.now()) / 1000);
      const exercise = workoutRef.current?.exercises.find((item) => item.id === restExerciseRef.current);
      if (exercise?.restSeconds != null) {
        handleChangeRest(exercise.id, seconds);
      } else {
        setRestSeconds(seconds);
      }
      void scheduleRestEnd(next, exercise?.name ?? 'your exercise');
      if (restActivityRef.current) {
        showRestActivity({ ...restActivityRef.current, endsAt: next });
      }
    },
    [handleChangeRest, setRestSeconds],
  );
  const subtractRest = useCallback(() => adjustRest(-15), [adjustRest]);
  const addRest = useCallback(() => adjustRest(15), [adjustRest]);
  const skipRest = useCallback(() => {
    setRestEndsAt(null);
    void cancelRestEnd();
    endRestActivity();
  }, []);
  const closeConfirm = useCallback(() => setConfirm(null), []);

  return (
    <Screen bottomInset={false}>
      <Header
        left={orderIds ? <TextButton label="Cancel" onPress={cancelReorder} /> : editing ? undefined : <TextButton label="Discard" onPress={handleDiscard} tone="danger" />}
        right={
          orderIds ? (
            <TextButton label="Done" onPress={commitReorder} tone="accent" />
          ) : editing ? (
            <TextButton label="Done" onPress={pressDoneEditing} tone="accent" />
          ) : (
            <TextButton disabled={finishing} label={finishing ? 'Saving' : 'Finish'} onPress={pressFinish} tone="accent" />
          )
        }
        title={orderIds ? 'Reorder' : editing ? 'Edit workout' : undefined}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        {missing ? (
          <EmptyState actionLabel="Go back" message="This workout is no longer on the device." onAction={leave} title="Workout missing" />
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingBottom: (restEndsAt || recordBanner || undo ? 168 : 48) + insets.bottom }}
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={!orderDragging}
            style={styles.fill}
          >
            {orderIds ? null : (
              <View style={styles.intro}>
                <TextInput onBlur={handleRename} onChangeText={setTitle} onFocus={handleFocusTitle} style={styles.title} value={title} />
                <View style={styles.metaRow}>
                  {workout?.finishedAt != null ? (
                    <Text style={styles.elapsed}>{formatWorkoutWhen(workout.finishedAt)}</Text>
                  ) : workout ? (
                    <ElapsedClock startedAt={workout.startedAt} />
                  ) : (
                    <Text style={styles.elapsed}>0:00</Text>
                  )}
                  <UnitToggle onChange={setUnit} unit={unit} />
                </View>
                {banner ? <Text style={styles.banner}>{banner}</Text> : null}
              </View>
            )}
            <View style={styles.list}>
              {orderIds && workout ? (
                <View>
                  <Text style={styles.reorderHint}>Drag an exercise into place.</Text>
                  <ExerciseOrderList
                    items={orderIds.flatMap((id) => {
                      const exercise = workout.exercises.find((item) => item.id === id);
                      return exercise ? [{ detail: `${exercise.muscleGroup} · ${exercise.equipment}`, id: exercise.id, name: exercise.name }] : [];
                    })}
                    onChange={setOrderIds}
                    onDraggingChange={setOrderDragging}
                  />
                </View>
              ) : (
                <View>
                  {workout && workout.exercises.length === 0 ? (
                    <EmptyState actionLabel="Add exercise" message="Search the library, then log weight and reps. Tap a set number to mark a warmup." onAction={handleAddExercise} title="Empty workout" />
                  ) : null}
                  {workout?.exercises.map((exercise) => (
                    <ExerciseBlock
                      defaultRestSeconds={restSeconds}
                      drafts={drafts}
                      exercise={exercise}
                      key={exercise.id}
                      onAddSet={pressAddSet}
                      onChangeNotes={handleChangeNotes}
                      onChangeRest={handleChangeRest}
                      onChangeReps={handleChangeReps}
                      onChangeRpe={handleChangeRpe}
                      onChangeWeight={handleChangeWeight}
                      onDeleteSet={handleDeleteSet}
                      onHold={beginReorder}
                      onRemove={handleRemove}
                      onToggleComplete={handleToggleComplete}
                      onToggleWarmup={handleToggleWarmup}
                      recordIds={recordIdsByExercise.get(exercise.id) ?? noRecords}
                      unit={unit}
                    />
                  ))}
                  {workout && workout.exercises.length > 0 ? (
                    <Text style={styles.holdHint}>Hold an exercise to reorder.</Text>
                  ) : null}
                  {workout && workout.exercises.length > 0 ? (
                    <TextButton label="Add exercise" onPress={handleAddExercise} tone="accent" />
                  ) : null}
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
      {recordBanner || undo ? (
        <View pointerEvents="box-none" style={[styles.toasts, { bottom: (restEndsAt ? 92 : 16) + insets.bottom }]}>
          {recordBanner ? (
            <Pressable accessibilityLiveRegion="polite" accessibilityRole="alert" onPress={dismissRecord} style={styles.record}>
              <Text style={styles.recordTitle}>★ New PR · {recordBanner.exerciseName}</Text>
              {recordBanner.lines.map((line) => (
                <Text key={line} style={styles.recordText}>
                  {line}
                </Text>
              ))}
            </Pressable>
          ) : null}
          {undo ? (
            <View style={styles.undo}>
              <Text numberOfLines={1} style={styles.undoText}>
                {undo.message}
              </Text>
              <TextButton label="Undo" onPress={handleUndo} tone="accent" />
            </View>
          ) : null}
        </View>
      ) : null}
      {restEndsAt ? <RestBar endsAt={restEndsAt} onAdd={addRest} onSkip={skipRest} onSubtract={subtractRest} /> : null}
      <KeyboardDoneBar />
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
  banner: {
    color: colors.danger,
    fontSize: 14,
    marginTop: 8,
  },
  elapsed: {
    color: colors.muted,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  fill: {
    flex: 1,
  },
  intro: {
    paddingHorizontal: 20,
  },
  holdHint: {
    color: colors.faint,
    fontSize: 13,
    marginBottom: 8,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  reorderHint: {
    color: colors.muted,
    fontSize: 15,
    marginBottom: 14,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  record: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  recordText: {
    color: colors.accentInk,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  recordTitle: {
    color: colors.accentInk,
    fontSize: 15,
    fontWeight: '800',
  },
  toasts: {
    gap: 8,
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
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
    padding: 0,
  },
});
