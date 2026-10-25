/**
 * Switch the stack on a machine or cable card. Each row shows that stack's
 * last session so you can see Precor 16 vs Life Fitness 20 before you tap.
 */
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatLoggedLoad } from '../domain/format';
import type { MachineSetupOption } from '../domain/machine-setup';
import { formatMachineSetup, normalizeMachineSetup, sameMachineSetup, type WeightUnit } from '../domain/types';
import { colors } from '../theme/colors';
import { keyboardDoneId } from './keyboard-done-bar';

interface MachineSetupChoicesProps {
  value: string | null;
  options: MachineSetupOption[];
  unit: WeightUnit;
  onChange: (value: string | null) => void;
}

export const MachineSetupChoices: React.FC<MachineSetupChoicesProps> = ({ value, options, unit, onChange }) => {
  const [custom, setCustom] = useState('');

  const handleCustom = useCallback(() => {
    const next = normalizeMachineSetup(custom);
    if (!next) {
      return;
    }
    onChange(next);
    setCustom('');
  }, [custom, onChange]);

  return (
    <View>
      {options.map((option) => (
        <SetupRow key={machineSetupKey(option.setup)} onSelect={onChange} option={option} selected={sameMachineSetup(option.setup, value)} unit={unit} />
      ))}
      <TextInput
        accessibilityLabel="Other machine brand"
        autoCapitalize="words"
        inputAccessoryViewID={keyboardDoneId}
        onChangeText={setCustom}
        onEndEditing={handleCustom}
        onSubmitEditing={handleCustom}
        placeholder="Other brand"
        placeholderTextColor={colors.faint}
        returnKeyType="done"
        style={styles.input}
        value={custom}
      />
      <Text style={styles.hint}>Tap a stack to load its last session. Checked-off sets stay. Previous and PRs stay on that stack.</Text>
    </View>
  );
};

function machineSetupKey(setup: string | null): string {
  return setup ?? 'unknown';
}

interface SetupRowProps {
  option: MachineSetupOption;
  selected: boolean;
  unit: WeightUnit;
  onSelect: (value: string | null) => void;
}

const SetupRow: React.FC<SetupRowProps> = React.memo(function SetupRow({ option, selected, unit, onSelect }) {
  const handlePress = useCallback(() => {
    onSelect(option.setup);
  }, [onSelect, option.setup]);
  const last = option.last
    ? formatLoggedLoad(option.last.weightKg, option.last.reps, unit, option.last.setType === 'warmup')
    : '—';

  return (
    <Pressable
      accessibilityLabel={`${formatMachineSetup(option.setup)}, last ${last}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={handlePress}
      style={[styles.row, selected && styles.rowSelected]}
    >
      <Text style={[styles.name, selected && styles.nameSelected]}>{formatMachineSetup(option.setup)}</Text>
      <Text style={[styles.last, selected && styles.lastSelected]}>{option.last ? `last ${last}` : 'No session yet'}</Text>
      {selected ? <Text style={styles.check}>✓</Text> : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  check: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 8,
  },
  hint: {
    color: colors.faint,
    fontSize: 12,
    marginTop: 10,
  },
  input: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 12,
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  last: {
    color: colors.muted,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  lastSelected: {
    color: colors.accentInk,
  },
  name: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  nameSelected: {
    color: colors.accentInk,
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowSelected: {
    backgroundColor: colors.accent,
  },
});
