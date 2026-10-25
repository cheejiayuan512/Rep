/**
 * One routine exercise as a workout-style card: planned sets with weight and reps.
 * Drag the three dots to reorder. Swipe the card left to remove the exercise,
 * or swipe a set left to delete that set. Tap a set number to mark a warmup.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type AccessibilityActionEvent, type GestureResponderHandlers } from 'react-native';

import { keyboardDoneId } from '../../components/keyboard-done-bar';
import { SwipeToDelete } from '../../components/swipe-to-delete';
import type { DraftMap, SetDraft } from '../../domain/drafts';
import { draftFromSet } from '../../domain/drafts';
import { MachineSetupChoices } from '../../components/machine-setup-choices';
import { formatLoggedLoad } from '../../domain/format';
import type { MachineSetupOption } from '../../domain/machine-setup';
import type { PreviousSet, RoutineExercise, RoutineSet, WeightUnit } from '../../domain/types';
import { formatMachineSetup, usesMachineSetup } from '../../domain/types';
import { colors } from '../../theme/colors';

const column = {
  gap: 6,
  reps: 64,
  set: 26,
  weight: 76,
};

interface RoutineExerciseCardProps {
  exercise: RoutineExercise;
  unit: WeightUnit;
  drafts: DraftMap;
  panHandlers: GestureResponderHandlers;
  dragging: boolean;
  onMove: (routineExerciseId: string, direction: -1 | 1) => void;
  onRemove: (routineExerciseId: string) => void;
  onAddSet: (routineExerciseId: string) => void;
  onChangeWeight: (setId: string, value: string) => void;
  onChangeReps: (setId: string, value: string) => void;
  onToggleWarmup: (setId: string) => void;
  onDeleteSet: (setId: string) => void;
  onChangeSetup: (routineExerciseId: string, setup: string | null) => void;
  setupOptions: MachineSetupOption[];
}

const moveActions = [
  { label: 'Move up', name: 'up' },
  { label: 'Move down', name: 'down' },
];

export const RoutineExerciseCard: React.FC<RoutineExerciseCardProps> = React.memo(function RoutineExerciseCard({
  exercise,
  unit,
  drafts,
  panHandlers,
  dragging,
  onMove,
  onRemove,
  onAddSet,
  onChangeWeight,
  onChangeReps,
  onToggleWarmup,
  onDeleteSet,
  onChangeSetup,
  setupOptions,
}) {
  const handleRemove = useCallback(() => {
    onRemove(exercise.id);
  }, [exercise.id, onRemove]);
  const handleAdd = useCallback(() => {
    onAddSet(exercise.id);
  }, [exercise.id, onAddSet]);
  const [setupOpen, setSetupOpen] = useState(false);
  const toggleSetup = useCallback(() => {
    setSetupOpen((open) => !open);
  }, []);
  const handleSetup = useCallback(
    (setup: string | null) => {
      onChangeSetup(exercise.id, setup);
      setSetupOpen(false);
    },
    [exercise.id, onChangeSetup],
  );
  const showSetup = usesMachineSetup(exercise.equipment);
  const handleMoveAction = useCallback(
    (event: AccessibilityActionEvent) => {
      onMove(exercise.id, event.nativeEvent.actionName === 'up' ? -1 : 1);
    },
    [exercise.id, onMove],
  );

  return (
    <SwipeToDelete accessibilityLabel={`Remove ${exercise.name}`} label="Remove" onDelete={handleRemove} radius={18} style={styles.swipe}>
      <View style={[styles.card, dragging && styles.cardDragging]}>
        <View style={styles.header}>
          <View style={styles.titleWrap}>
            <Text style={styles.name}>{exercise.name}</Text>
            <Text style={styles.meta}>
              {exercise.muscleGroup} · {exercise.equipment}
            </Text>
          </View>
          <View
            accessibilityActions={moveActions}
            accessibilityHint="Drag to reorder"
            accessibilityLabel={`Reorder ${exercise.name}`}
            accessibilityRole="adjustable"
            hitSlop={12}
            onAccessibilityAction={handleMoveAction}
            style={styles.handle}
            {...panHandlers}
          >
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>
        {showSetup ? (
          <Pressable
            accessibilityLabel={`Machine setup ${formatMachineSetup(exercise.machineSetup)}`}
            accessibilityRole="button"
            accessibilityState={{ expanded: setupOpen }}
            onPress={toggleSetup}
            style={[styles.setupChip, setupOpen && styles.setupChipOpen]}
          >
            <Text style={styles.setupChipText}>{formatMachineSetup(exercise.machineSetup)} ▾</Text>
          </Pressable>
        ) : null}
        {setupOpen ? <MachineSetupChoices onChange={handleSetup} options={setupOptions} unit={unit} value={exercise.machineSetup} /> : null}
        <View style={styles.columns}>
          <Text style={[styles.column, styles.setCol]}>SET</Text>
          <Text style={[styles.column, styles.previousCol]}>PREVIOUS</Text>
          <Text style={[styles.column, styles.weightCol]}>{unit.toUpperCase()}</Text>
          <Text style={[styles.column, styles.repsCol]}>REPS</Text>
        </View>
        {exercise.sets.map((set, index) => (
          <RoutineSetRow
            draft={drafts[set.id] ?? draftFromSet({ ...set, rpe: null }, unit)}
            index={exercise.sets.slice(0, index).filter((item) => item.setType !== 'warmup').length}
            key={set.id}
            onChangeReps={onChangeReps}
            onChangeWeight={onChangeWeight}
            onDelete={onDeleteSet}
            onToggleWarmup={onToggleWarmup}
            previous={exercise.previousSets[index] ?? null}
            set={set}
            showSetup={showSetup}
            unit={unit}
          />
        ))}
        <View style={styles.footer}>
          <Pressable accessibilityRole="button" onPress={handleAdd} style={styles.add}>
            <Text style={styles.addText}>Add set</Text>
          </Pressable>
          {exercise.sets.length > 0 ? <Text style={styles.hint}>Swipe a set left to delete</Text> : null}
        </View>
      </View>
    </SwipeToDelete>
  );
});

interface RoutineSetRowProps {
  set: RoutineSet;
  index: number;
  draft: SetDraft;
  previous: PreviousSet | null;
  unit: WeightUnit;
  showSetup?: boolean;
  onChangeWeight: (setId: string, value: string) => void;
  onChangeReps: (setId: string, value: string) => void;
  onToggleWarmup: (setId: string) => void;
  onDelete: (setId: string) => void;
}

const RoutineSetRow: React.FC<RoutineSetRowProps> = React.memo(function RoutineSetRow({ set, index, draft, previous, unit, showSetup = false, onChangeWeight, onChangeReps, onToggleWarmup, onDelete }) {
  const handleWeight = useCallback(
    (value: string) => {
      onChangeWeight(set.id, value);
    },
    [onChangeWeight, set.id],
  );
  const handleReps = useCallback(
    (value: string) => {
      onChangeReps(set.id, value);
    },
    [onChangeReps, set.id],
  );
  const handleWarmup = useCallback(() => {
    onToggleWarmup(set.id);
  }, [onToggleWarmup, set.id]);
  const handleDelete = useCallback(() => {
    onDelete(set.id);
  }, [onDelete, set.id]);
  const previousText = useMemo(
    () => (previous ? formatLoggedLoad(previous.weightKg, previous.reps, unit, previous.setType === 'warmup', showSetup ? (previous.machineSetup ?? null) : undefined) : '—'),
    [previous, showSetup, unit],
  );
  const warmup = set.setType === 'warmup';

  return (
    <SwipeToDelete accessibilityLabel="Delete set" label="Delete" onDelete={handleDelete} style={styles.setWrap}>
      <View style={[styles.row, warmup && styles.warmup]}>
        <Pressable accessibilityLabel={warmup ? 'Mark as a working set' : 'Mark as a warmup set'} onPress={handleWarmup} style={styles.setNumber}>
          <Text style={styles.setNumberText}>{warmup ? 'W' : String(index + 1)}</Text>
        </Pressable>
        <Text numberOfLines={1} style={styles.previous}>
          {previousText}
        </Text>
        <TextInput
          accessibilityLabel="Weight"
          inputAccessoryViewID={keyboardDoneId}
          keyboardType="decimal-pad"
          onChangeText={handleWeight}
          placeholder="—"
          placeholderTextColor={colors.faint}
          selectTextOnFocus
          style={[styles.input, styles.weightCol]}
          value={draft.weightText}
        />
        <TextInput
          accessibilityLabel="Reps"
          inputAccessoryViewID={keyboardDoneId}
          keyboardType="number-pad"
          onChangeText={handleReps}
          placeholder="—"
          placeholderTextColor={colors.faint}
          selectTextOnFocus
          style={[styles.input, styles.repsCol]}
          value={draft.repsText}
        />
      </View>
    </SwipeToDelete>
  );
});

const styles = StyleSheet.create({
  add: {
    paddingVertical: 4,
  },
  addText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    userSelect: 'none',
  },
  cardDragging: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.accent,
  },
  column: {
    color: colors.faint,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  columns: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: column.gap,
    marginTop: 14,
  },
  dot: {
    backgroundColor: colors.muted,
    borderRadius: 2.5,
    height: 5,
    width: 5,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  handle: {
    alignItems: 'center',
    gap: 3,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  hint: {
    color: colors.faint,
    fontSize: 12,
  },
  input: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 10,
    color: colors.text,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    height: 40,
    textAlign: 'center',
    userSelect: 'text',
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  previous: {
    color: colors.muted,
    flex: 1,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    minWidth: 52,
  },
  previousCol: {
    flex: 1,
    minWidth: 52,
  },
  repsCol: {
    textAlign: 'center',
    width: column.reps,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: column.gap,
    paddingVertical: 4,
  },
  setCol: {
    textAlign: 'center',
    width: column.set,
  },
  setNumber: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: column.set,
  },
  setNumberText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  setWrap: {
    marginTop: 4,
  },
  setupChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  setupChipOpen: {
    borderColor: colors.accent,
  },
  setupChipText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  swipe: {
    marginBottom: 12,
  },
  titleWrap: {
    flex: 1,
  },
  warmup: {
    opacity: 0.72,
  },
  weightCol: {
    textAlign: 'center',
    width: column.weight,
  },
});
