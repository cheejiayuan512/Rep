/**
 * One exercise, one card. The notes box is for the whole exercise.
 * The rows under it are the sets. This component draws the card; the workout screen saves.
 */
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { DraftMap } from '../domain/drafts';
import { draftFromSet } from '../domain/drafts';
import { formatClock } from '../domain/format';
import type { WeightUnit, WorkoutExercise } from '../domain/types';
import { colors } from '../theme/colors';
import { keyboardDoneId } from './keyboard-done-bar';
import { setColumn, SetRow } from './set-row';

const restChoices = [30, 60, 90, 120, 150, 180, 240, 300];

interface ExerciseBlockProps {
  exercise: WorkoutExercise;
  unit: WeightUnit;
  drafts: DraftMap;
  /** Ids of completed sets in this card that beat a previous best. */
  recordIds: ReadonlySet<string>;
  defaultRestSeconds: number;
  onChangeRest: (workoutExerciseId: string, seconds: number | null) => void;
  onChangeWeight: (setId: string, value: string) => void;
  onChangeReps: (setId: string, value: string) => void;
  onChangeRpe: (setId: string, value: string) => void;
  onChangeNotes: (workoutExerciseId: string, value: string) => void;
  onToggleComplete: (setId: string) => void;
  onToggleWarmup: (setId: string) => void;
  onDeleteSet: (setId: string) => void;
  onAddSet: (workoutExerciseId: string) => void;
  onRemove: (workoutExerciseId: string) => void;
  onHold: (workoutExerciseId: string) => void;
}

export const ExerciseBlock: React.FC<ExerciseBlockProps> = React.memo(function ExerciseBlock({
  exercise,
  unit,
  drafts,
  recordIds,
  defaultRestSeconds,
  onChangeRest,
  onChangeWeight,
  onChangeReps,
  onChangeRpe,
  onChangeNotes,
  onToggleComplete,
  onToggleWarmup,
  onDeleteSet,
  onAddSet,
  onRemove,
  onHold,
}) {
  const handleAdd = useCallback(() => {
    onAddSet(exercise.id);
  }, [exercise.id, onAddSet]);
  const handleRemove = useCallback(() => {
    onRemove(exercise.id);
  }, [exercise.id, onRemove]);
  const handleHold = useCallback(() => {
    onHold(exercise.id);
  }, [exercise.id, onHold]);
  const handleNotes = useCallback(
    (value: string) => {
      onChangeNotes(exercise.id, value);
    },
    [exercise.id, onChangeNotes],
  );
  const [pickingRest, setPickingRest] = useState(false);
  const toggleRestPicker = useCallback(() => {
    setPickingRest((open) => !open);
  }, []);
  const handleRest = useCallback(
    (seconds: number | null) => {
      onChangeRest(exercise.id, seconds);
      setPickingRest(false);
    },
    [exercise.id, onChangeRest],
  );
  const hasRecord = exercise.sets.some((set) => recordIds.has(set.id));
  const restLabel = formatClock(exercise.restSeconds ?? defaultRestSeconds);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable accessibilityHint="Hold to reorder exercises" accessibilityRole="button" delayLongPress={400} onLongPress={handleHold} style={styles.titleWrap}>
          <Text style={styles.name}>
            {exercise.name}
            {hasRecord ? <Text style={styles.star}> ★</Text> : null}
          </Text>
          <Text style={styles.meta}>
            {exercise.muscleGroup} · {exercise.equipment}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" hitSlop={4} onPress={handleRemove} style={styles.remove}>
          <Text style={styles.removeText}>Remove</Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityLabel={`Rest timer ${restLabel}${exercise.restSeconds == null ? ', default' : ''}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: pickingRest }}
        onPress={toggleRestPicker}
        style={[styles.restChip, pickingRest && styles.restChipOpen]}
      >
        <Text style={styles.restChipText}>
          Rest {restLabel}
          {exercise.restSeconds == null ? ' · default' : ''}
        </Text>
      </Pressable>
      {pickingRest ? (
        <View style={styles.restChoices}>
          <RestChoice label="Default" onPress={handleRest} seconds={null} selected={exercise.restSeconds == null} />
          {restChoices.map((seconds) => (
            <RestChoice key={seconds} label={formatClock(seconds)} onPress={handleRest} seconds={seconds} selected={exercise.restSeconds === seconds} />
          ))}
        </View>
      ) : null}
      <Text style={styles.section}>Notes</Text>
      <TextInput
        accessibilityLabel="Exercise notes"
        inputAccessoryViewID={keyboardDoneId}
        multiline
        onChangeText={handleNotes}
        placeholder="How did this exercise feel?"
        placeholderTextColor={colors.faint}
        style={styles.notes}
        textAlignVertical="top"
        value={exercise.notes}
      />
      <View style={styles.table}>
        <View style={styles.columns}>
          <Text style={[styles.column, styles.setCol]}>SET</Text>
          <Text style={[styles.column, styles.previousCol]}>PREVIOUS</Text>
          <Text style={[styles.column, styles.weightCol]}>{unit.toUpperCase()}</Text>
          <Text style={[styles.column, styles.repsCol]}>REPS</Text>
          <Text style={[styles.column, styles.rpeCol]}>RPE</Text>
          <View style={styles.checkSpacer} />
        </View>
        {exercise.sets.map((set, index) => (
          <SetRow
            draft={drafts[set.id] ?? draftFromSet(set, unit)}
            index={index}
            isRecord={recordIds.has(set.id)}
            key={set.id}
            onChangeReps={onChangeReps}
            onChangeRpe={onChangeRpe}
            onChangeWeight={onChangeWeight}
            onDelete={onDeleteSet}
            onToggleComplete={onToggleComplete}
            onToggleWarmup={onToggleWarmup}
            previous={exercise.previousSets[index] ?? null}
            set={set}
            unit={unit}
          />
        ))}
      </View>
      <Pressable accessibilityRole="button" onPress={handleAdd} style={styles.add}>
        <Text style={styles.addText}>Add set</Text>
      </Pressable>
    </View>
  );
});

interface RestChoiceProps {
  label: string;
  seconds: number | null;
  selected: boolean;
  onPress: (seconds: number | null) => void;
}

const RestChoice: React.FC<RestChoiceProps> = React.memo(function RestChoice({ label, seconds, selected, onPress }) {
  const handlePress = useCallback(() => {
    onPress(seconds);
  }, [onPress, seconds]);

  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={handlePress} style={[styles.restOption, selected && styles.restOptionSelected]}>
      <Text style={[styles.restOptionText, selected && styles.restOptionTextSelected]}>{label}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  add: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 4,
  },
  addText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    maxWidth: 560,
    padding: 14,
    width: '100%',
  },
  checkSpacer: {
    width: setColumn.check + setColumn.gap + setColumn.delete,
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
    gap: setColumn.gap,
    marginTop: 4,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  remove: {
    paddingVertical: 2,
  },
  removeText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  notes: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 12,
    color: colors.text,
    fontSize: 15,
    minHeight: 72,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  previousCol: {
    flex: 1,
    minWidth: 52,
  },
  repsCol: {
    textAlign: 'center',
    width: setColumn.reps,
  },
  rpeCol: {
    textAlign: 'center',
    width: setColumn.rpe,
  },
  restChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  restChipOpen: {
    borderColor: colors.accent,
  },
  restChipText: {
    color: colors.muted,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  restChoices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  restOption: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  restOptionSelected: {
    backgroundColor: colors.accent,
  },
  restOptionText: {
    color: colors.text,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  restOptionTextSelected: {
    color: colors.accentInk,
  },
  section: {
    color: colors.faint,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 14,
  },
  setCol: {
    textAlign: 'center',
    width: setColumn.set,
  },
  star: {
    color: colors.accent,
  },
  table: {
    marginTop: 14,
  },
  titleWrap: {
    flex: 1,
  },
  weightCol: {
    textAlign: 'center',
    width: setColumn.weight,
  },
});
