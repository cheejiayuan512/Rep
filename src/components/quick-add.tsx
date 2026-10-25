/**
 * One-tap exercise suggestions for the open workout: what you train most,
 * then common starters. Tapping a chip adds that exercise as a new card.
 */
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { listQuickAddExercises } from '../data/repository';
import type { Exercise } from '../domain/types';
import { useStored } from '../state/hooks';
import { colors } from '../theme/colors';

interface QuickAddProps {
  workoutId: string;
  onAdd: (exerciseId: string) => Promise<void>;
}

export const QuickAdd: React.FC<QuickAddProps> = ({ onAdd, workoutId }) => {
  const suggestions = useStored(listQuickAddExercises, workoutId);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleAdd = useCallback(
    (exerciseId: string) => {
      if (pendingId) {
        return;
      }
      setPendingId(exerciseId);
      void onAdd(exerciseId).finally(() => setPendingId(null));
    },
    [onAdd, pendingId],
  );

  if (!suggestions || suggestions.length === 0) {
    return null;
  }
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Quick add</Text>
      <View style={styles.chips}>
        {suggestions.map((exercise) => (
          <QuickChip exercise={exercise} key={exercise.id} onAdd={handleAdd} pending={pendingId === exercise.id} />
        ))}
      </View>
    </View>
  );
};

const QuickChip: React.FC<{ exercise: Exercise; pending: boolean; onAdd: (exerciseId: string) => void }> = React.memo(function QuickChip({ exercise, onAdd, pending }) {
  const handlePress = useCallback(() => {
    onAdd(exercise.id);
  }, [exercise.id, onAdd]);

  return (
    <Pressable accessibilityHint="Adds it to the workout" accessibilityLabel={`Quick add ${exercise.name}`} accessibilityRole="button" onPress={handlePress} style={[styles.chip, pending && styles.chipPending]}>
      <Text style={styles.plus}>+</Text>
      <Text numberOfLines={1} style={styles.chipText}>
        {exercise.name}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    maxWidth: '100%',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  chipPending: {
    opacity: 0.5,
  },
  chipText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  label: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
  plus: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '800',
  },
  wrap: {
    marginTop: 8,
  },
});
