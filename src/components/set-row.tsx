import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatLoggedLoad } from '../domain/format';
import type { SetDraft } from '../domain/drafts';
import type { PreviousSet, SetRecord, WeightUnit } from '../domain/types';
import { colors } from '../theme/colors';

export const setColumn = {
  check: 32,
  delete: 18,
  gap: 4,
  reps: 48,
  rpe: 44,
  set: 26,
  weight: 56,
};

interface SetRowProps {
  index: number;
  set: SetRecord;
  draft: SetDraft;
  previous: PreviousSet | null;
  unit: WeightUnit;
  onChangeWeight: (setId: string, value: string) => void;
  onChangeReps: (setId: string, value: string) => void;
  onChangeRpe: (setId: string, value: string) => void;
  onToggleComplete: (setId: string) => void;
  onToggleWarmup: (setId: string) => void;
  onDelete: (setId: string) => void;
}

export const SetRow: React.FC<SetRowProps> = React.memo(function SetRow({
  index,
  set,
  draft,
  previous,
  unit,
  onChangeWeight,
  onChangeReps,
  onChangeRpe,
  onToggleComplete,
  onToggleWarmup,
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
  const handleRpe = useCallback(
    (value: string) => {
      onChangeRpe(set.id, value);
    },
    [onChangeRpe, set.id],
  );
  const handleComplete = useCallback(() => {
    onToggleComplete(set.id);
  }, [onToggleComplete, set.id]);
  const handleWarmup = useCallback(() => {
    onToggleWarmup(set.id);
  }, [onToggleWarmup, set.id]);
  const handleDelete = useCallback(() => {
    onDelete(set.id);
  }, [onDelete, set.id]);

  return (
    <View style={[styles.row, set.setType === 'warmup' && styles.warmup]}>
      <Pressable accessibilityLabel={set.setType === 'warmup' ? 'Mark as a working set' : 'Mark as a warmup set'} onPress={handleWarmup} style={styles.setNumber}>
        <Text style={styles.setNumberText}>{set.setType === 'warmup' ? 'W' : String(index + 1)}</Text>
      </Pressable>
      <Text numberOfLines={1} style={styles.previous}>
        {previous ? formatLoggedLoad(previous.weightKg, previous.reps, unit, previous.setType === 'warmup') : '—'}
      </Text>
      <TextInput
        accessibilityLabel="Weight"
        keyboardType="decimal-pad"
        onChangeText={handleWeight}
        placeholder="—"
        placeholderTextColor={colors.faint}
        selectTextOnFocus
        style={[styles.input, styles.weight]}
        value={draft.weightText}
      />
      <TextInput
        accessibilityLabel="Reps"
        keyboardType="number-pad"
        onChangeText={handleReps}
        placeholder="—"
        placeholderTextColor={colors.faint}
        selectTextOnFocus
        style={[styles.input, styles.reps]}
        value={draft.repsText}
      />
      <TextInput
        accessibilityLabel="RPE"
        keyboardType="decimal-pad"
        onChangeText={handleRpe}
        placeholder="—"
        placeholderTextColor={colors.faint}
        selectTextOnFocus
        style={[styles.input, styles.rpe]}
        value={draft.rpeText}
      />
      <Pressable accessibilityLabel={set.completed ? 'Mark set incomplete' : 'Complete set'} accessibilityRole="button" onPress={handleComplete} style={[styles.check, set.completed && styles.checkDone]}>
        <Text style={[styles.checkText, set.completed && styles.checkTextDone]}>{set.completed ? '✓' : ''}</Text>
      </Pressable>
      <Pressable accessibilityLabel="Delete set" hitSlop={6} onPress={handleDelete} style={styles.delete}>
        <Text style={styles.deleteText}>×</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  check: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: setColumn.check,
  },
  checkDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  checkTextDone: {
    color: colors.accentInk,
  },
  delete: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: setColumn.delete,
  },
  deleteText: {
    color: colors.faint,
    fontSize: 20,
    lineHeight: 22,
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
  },
  previous: {
    color: colors.muted,
    flex: 1,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    minWidth: 52,
  },
  reps: {
    width: setColumn.reps,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: setColumn.gap,
    marginTop: 8,
  },
  rpe: {
    width: setColumn.rpe,
  },
  setNumber: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: setColumn.set,
  },
  setNumberText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  warmup: {
    opacity: 0.72,
  },
  weight: {
    width: setColumn.weight,
  },
});
