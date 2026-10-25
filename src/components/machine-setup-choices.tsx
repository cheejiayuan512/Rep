/**
 * Stack brand chips for a machine or cable card. Unknown is a real choice:
 * old sets sit there until someone names the stack.
 */
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { extraMachineSetups, formatMachineSetup, machineBrands, normalizeMachineSetup } from '../domain/types';
import { colors } from '../theme/colors';
import { Chip } from './chip';
import { keyboardDoneId } from './keyboard-done-bar';

interface MachineSetupChoicesProps {
  value: string | null;
  extras?: string[];
  onChange: (value: string | null) => void;
}

export const MachineSetupChoices: React.FC<MachineSetupChoicesProps> = ({ value, extras = [], onChange }) => {
  const [custom, setCustom] = useState('');
  const names = extraMachineSetups([value, ...extras]);

  const handleUnknown = useCallback(() => {
    onChange(null);
  }, [onChange]);

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
      <View style={styles.chips}>
        <Chip label={formatMachineSetup(null)} onSelect={handleUnknown} selected={value == null} value={null} />
        {machineBrands.map((brand) => (
          <Chip key={brand} label={brand} onSelect={onChange} selected={value === brand} value={brand} />
        ))}
        {names.map((name) => (
          <Chip key={name} label={name} onSelect={onChange} selected={value === name} value={name} />
        ))}
      </View>
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
      <Text style={styles.hint}>Previous, PRs, and the chart only compare the same stack. Unknown is for sets you have not named yet.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
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
});
