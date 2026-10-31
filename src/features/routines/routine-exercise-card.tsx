/**
 * One routine exercise as a workout-style card: planned sets with weight and reps.
 * Drag the three dots to reorder. Swipe the card left to remove the exercise,
 * or swipe a set left to delete that set. Tap a set number to mark a warmup.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type AccessibilityActionEvent, type GestureResponderHandlers } from 'react-native';

import { LogValue } from '../../components/log-pad';
import { SwipeToDelete } from '../../components/swipe-to-delete';
import type { DraftMap, SetDraft } from '../../domain/drafts';
import { draftFromSet } from '../../domain/drafts';
import { MachineSetupChoices } from '../../components/machine-setup-choices';
import { formatCardioEffort, isCardioExercise } from '../../domain/cardio';
import { distanceUnitLabel } from '../../domain/units';
import { formatLoggedLoad } from '../../domain/format';
import type { MachineSetupOption } from '../../domain/machine-setup';
import type { PreviousSet, RoutineExercise, RoutineSet, SetType, WeightUnit } from '../../domain/types';
import { formatMachineSetup, usesMachineSetup } from '../../domain/types';
import { previousForSet, type SupersetRole } from '../../domain/workout-edits';
import { SetTypeBadge } from '../../components/set-type-badge';
import { colors } from '../../theme/colors';

const column = {
  distance: 72,
  gap: 6,
  reps: 64,
  set: 26,
  time: 76,
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
  onChangeDuration: (setId: string, value: string) => void;
  onChangeDistance: (setId: string, value: string) => void;
  onChangeSetType: (setId: string, setType: SetType) => void;
  onToggleSuperset: (routineExerciseId: string) => void;
  superset: SupersetRole;
  canLinkSuperset: boolean;
  onDeleteSet: (setId: string) => void;
  onChangeSetup: (routineExerciseId: string, setup: string | null) => void;
  setupOptions: MachineSetupOption[];
  /** Added to each set's pad order so Next continues onto the next card. */
  orderBase?: number;
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
  onChangeDuration,
  onChangeDistance,
  onChangeSetType,
  onToggleSuperset,
  superset,
  canLinkSuperset,
  onDeleteSet,
  onChangeSetup,
  setupOptions,
  orderBase = 0,
}) {
  const handleRemove = useCallback(() => {
    onRemove(exercise.id);
  }, [exercise.id, onRemove]);
  const handleAdd = useCallback(() => {
    onAddSet(exercise.id);
  }, [exercise.id, onAddSet]);
  const handleSuperset = useCallback(() => {
    onToggleSuperset(exercise.id);
  }, [exercise.id, onToggleSuperset]);
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
  const cardio = isCardioExercise(exercise.exerciseId, exercise.name);
  const handleMoveAction = useCallback(
    (event: AccessibilityActionEvent) => {
      onMove(exercise.id, event.nativeEvent.actionName === 'up' ? -1 : 1);
    },
    [exercise.id, onMove],
  );

  return (
    <SwipeToDelete accessibilityLabel={`Remove ${exercise.name}`} label="Remove" onDelete={handleRemove} radius={18} style={styles.swipe}>
      <View style={[styles.card, superset !== 'single' && styles.cardSuperset, dragging && styles.cardDragging]}>
        <View style={styles.header}>
          <View style={styles.titleWrap}>
            {superset !== 'single' ? <Text style={styles.superset}>Superset</Text> : null}
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
          {cardio ? (
            <>
              <Text style={[styles.column, styles.timeCol]}>TIME</Text>
              <Text style={[styles.column, styles.distanceCol]}>{distanceUnitLabel(unit).toUpperCase()}</Text>
            </>
          ) : (
            <>
              <Text style={[styles.column, styles.weightCol]}>{unit.toUpperCase()}</Text>
              <Text style={[styles.column, styles.repsCol]}>REPS</Text>
            </>
          )}
        </View>
        {exercise.sets.map((set, index) => (
          <RoutineSetRow
            draft={drafts[set.id] ?? draftFromSet({ ...set, rpe: null }, unit)}
            index={exercise.sets.slice(0, index).filter((item) => item.setType !== 'warmup').length}
            key={set.id}
            cardio={cardio}
            onChangeDistance={onChangeDistance}
            onChangeDuration={onChangeDuration}
            onChangeReps={onChangeReps}
            onChangeSetType={onChangeSetType}
            onChangeWeight={onChangeWeight}
            onDelete={onDeleteSet}
            order={orderBase + index * 10}
            previous={previousForSet(exercise.sets, exercise.previousSets, index)}
            set={set}
            showSetup={showSetup}
            unit={unit}
          />
        ))}
        <View style={styles.footer}>
          <Pressable accessibilityRole="button" onPress={handleAdd} style={styles.add}>
            <Text style={styles.addText}>Add set</Text>
          </Pressable>
          {canLinkSuperset || superset !== 'single' ? (
            <Pressable accessibilityRole="button" onPress={handleSuperset} style={styles.add}>
              <Text style={styles.addText}>{superset === 'single' ? 'Superset with next' : 'Remove from superset'}</Text>
            </Pressable>
          ) : null}
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
  cardio?: boolean;
  onChangeWeight: (setId: string, value: string) => void;
  onChangeReps: (setId: string, value: string) => void;
  onChangeDuration: (setId: string, value: string) => void;
  onChangeDistance: (setId: string, value: string) => void;
  onChangeSetType: (setId: string, setType: SetType) => void;
  onDelete: (setId: string) => void;
  order: number;
}

const RoutineSetRow: React.FC<RoutineSetRowProps> = React.memo(function RoutineSetRow({
  set,
  index,
  draft,
  previous,
  unit,
  showSetup = false,
  cardio = false,
  order,
  onChangeWeight,
  onChangeReps,
  onChangeDuration,
  onChangeDistance,
  onChangeSetType,
  onDelete,
}) {
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
  const handleDuration = useCallback(
    (value: string) => {
      onChangeDuration(set.id, value);
    },
    [onChangeDuration, set.id],
  );
  const handleDistance = useCallback(
    (value: string) => {
      onChangeDistance(set.id, value);
    },
    [onChangeDistance, set.id],
  );
  const handleSetType = useCallback(
    (setType: SetType) => {
      onChangeSetType(set.id, setType);
    },
    [onChangeSetType, set.id],
  );
  const handleDelete = useCallback(() => {
    onDelete(set.id);
  }, [onDelete, set.id]);
  const previousText = useMemo(
    () =>
      !previous
        ? '—'
        : cardio
          ? formatCardioEffort(previous.durationSeconds, previous.distanceKm, unit, previous.setType === 'warmup')
          : formatLoggedLoad(previous.weightKg, previous.reps, unit, previous.setType === 'warmup', showSetup ? (previous.machineSetup ?? null) : undefined),
    [cardio, previous, showSetup, unit],
  );
  const warmup = set.setType === 'warmup';
  const links = useMemo(
    () => ({
      repsId: `${set.id}:reps`,
      rpe: null,
      weightId: `${set.id}:weight`,
    }),
    [set.id],
  );

  return (
    <SwipeToDelete accessibilityLabel="Delete set" label="Delete" onDelete={handleDelete} style={styles.setWrap}>
      <View style={[styles.row, warmup && styles.warmup]}>
        <SetTypeBadge index={index} onChange={handleSetType} setType={set.setType} />
        <Text numberOfLines={1} style={styles.previous}>
          {previousText}
        </Text>
        {cardio ? (
          <>
            <LogValue accessibilityLabel="Time" id={`${set.id}:duration`} kind="duration" links={links} onChange={handleDuration} order={order} style={styles.timeCol} unit={unit} value={draft.durationText} />
            <LogValue accessibilityLabel="Distance" id={`${set.id}:distance`} kind="distance" links={links} onChange={handleDistance} order={order + 1} style={styles.distanceCol} unit={unit} value={draft.distanceText} />
          </>
        ) : (
          <>
            <LogValue accessibilityLabel="Weight" id={`${set.id}:weight`} kind="weight" links={links} onChange={handleWeight} order={order} style={styles.weightCol} unit={unit} value={draft.weightText} />
            <LogValue accessibilityLabel="Reps" id={`${set.id}:reps`} kind="reps" links={links} onChange={handleReps} order={order + 1} style={styles.repsCol} unit={unit} value={draft.repsText} />
          </>
        )}
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
  cardSuperset: {
    borderLeftColor: colors.accent,
    borderLeftWidth: 3,
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
  meta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  superset: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 2,
    textTransform: 'uppercase',
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
  distanceCol: {
    textAlign: 'center',
    width: column.distance,
  },
  timeCol: {
    textAlign: 'center',
    width: column.time,
  },
  weightCol: {
    textAlign: 'center',
    width: column.weight,
  },
});
