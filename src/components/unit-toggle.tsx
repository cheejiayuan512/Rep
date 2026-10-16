/**
 * The kg / lb switch. It changes the display unit only.
 * Saved weights stay in kilograms.
 */
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { WeightUnit } from '../domain/types';
import { colors } from '../theme/colors';

interface UnitToggleProps {
  unit: WeightUnit;
  onChange: (unit: WeightUnit) => void;
}

export const UnitToggle: React.FC<UnitToggleProps> = ({ unit, onChange }) => {
  const selectKg = useCallback(() => {
    onChange('kg');
  }, [onChange]);
  const selectLb = useCallback(() => {
    onChange('lb');
  }, [onChange]);

  return (
    <View style={styles.wrap}>
      <UnitOption label="kg" onPress={selectKg} selected={unit === 'kg'} />
      <UnitOption label="lb" onPress={selectLb} selected={unit === 'lb'} />
    </View>
  );
};

interface UnitOptionProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

const UnitOption: React.FC<UnitOptionProps> = ({ label, selected, onPress }) => {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.option, selected && styles.selected]}>
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  label: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  option: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: colors.accent,
  },
  selectedLabel: {
    color: colors.accentInk,
  },
  wrap: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 12,
    flexDirection: 'row',
    padding: 3,
    width: 112,
  },
});
