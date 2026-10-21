/**
 * One exercise, one card. The notes box is for the whole exercise.
 * The rows under it are the sets. This component draws the card; the workout screen saves.
 */
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { DraftMap } from '../domain/drafts';
import { draftFromSet } from '../domain/drafts';
import type { WeightUnit, WorkoutExercise } from '../domain/types';
import { colors } from '../theme/colors';
import { setColumn, SetRow } from './set-row';

interface ExerciseBlockProps {
  exercise: WorkoutExercise;
  unit: WeightUnit;
  drafts: DraftMap;
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

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable accessibilityHint="Hold to reorder exercises" accessibilityRole="button" delayLongPress={400} onLongPress={handleHold} style={styles.titleWrap}>
          <Text style={styles.name}>{exercise.name}</Text>
          <Text style={styles.meta}>
            {exercise.muscleGroup} · {exercise.equipment}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" hitSlop={4} onPress={handleRemove} style={styles.remove}>
          <Text style={styles.removeText}>Remove</Text>
        </Pressable>
      </View>
      <Text style={styles.section}>Notes</Text>
      <TextInput
        accessibilityLabel="Exercise notes"
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
