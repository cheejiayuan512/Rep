/**
 * A rounded choice button: lime when selected. Used for filters and pickers.
 */
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../theme/colors';

interface ChipProps<T extends string | null> {
  label: string;
  value: T;
  selected: boolean;
  onSelect: (value: T) => void;
}

function ChipInner<T extends string | null>({ label, value, selected, onSelect }: ChipProps<T>) {
  const handlePress = useCallback(() => {
    onSelect(value);
  }, [onSelect, value]);

  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={handlePress} style={[styles.chip, selected && styles.selected]}>
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

export const Chip = React.memo(ChipInner) as typeof ChipInner;

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  labelSelected: {
    color: colors.accentInk,
  },
  selected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
});
