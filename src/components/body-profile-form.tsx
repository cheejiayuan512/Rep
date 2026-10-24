/**
 * Bodyweight and sex, used only to pick and scale the strength-standards table.
 * Bodyweight is typed in the display unit and saved in kilograms.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { formatWeight, kgToDisplay, weightTextToKg } from '../domain/units';
import type { BodyProfile, BodySex, WeightUnit } from '../domain/types';
import { colors } from '../theme/colors';
import { Chip } from './chip';
import { keyboardDoneId } from './keyboard-done-bar';

interface BodyProfileFormProps {
  body: BodyProfile;
  unit: WeightUnit;
  onChange: (body: BodyProfile) => void;
}

function bodyweightText(body: BodyProfile, unit: WeightUnit): string {
  return body.bodyweightKg == null ? '' : formatWeight(kgToDisplay(body.bodyweightKg, unit));
}

export const BodyProfileForm: React.FC<BodyProfileFormProps> = ({ body, onChange, unit }) => {
  const [text, setText] = useState(() => bodyweightText(body, unit));

  useEffect(() => {
    setText(bodyweightText(body, unit));
  }, [body, unit]);

  const commit = useCallback(() => {
    const kg = weightTextToKg(text, unit, null);
    const next = kg != null && kg >= 25 && kg <= 350 ? kg : null;
    if (next !== body.bodyweightKg) {
      onChange({ ...body, bodyweightKg: next });
    }
    if (next == null) {
      setText(text.trim() === '' ? '' : bodyweightText(body, unit));
    }
  }, [body, onChange, text, unit]);

  const selectSex = useCallback(
    (sex: BodySex) => {
      onChange({ ...body, sex });
    },
    [body, onChange],
  );

  return (
    <View>
      <View style={styles.row}>
        <Text style={styles.label}>Bodyweight</Text>
        <View style={styles.inputWrap}>
          <TextInput
            accessibilityLabel={`Bodyweight in ${unit}`}
            inputAccessoryViewID={keyboardDoneId}
            keyboardType="decimal-pad"
            onBlur={commit}
            onChangeText={setText}
            onSubmitEditing={commit}
            placeholder="—"
            placeholderTextColor={colors.faint}
            returnKeyType="done"
            style={styles.input}
            value={text}
          />
          <Text style={styles.unit}>{unit}</Text>
        </View>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Standards</Text>
        <View style={styles.chips}>
          <Chip label="Male" onSelect={selectSex} selected={body.sex === 'male'} value="male" />
          <Chip label="Female" onSelect={selectSex} selected={body.sex === 'female'} value="female" />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 10,
    color: colors.text,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    height: 40,
    textAlign: 'center',
    width: 80,
  },
  inputWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  label: {
    color: colors.text,
    fontSize: 16,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  unit: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    width: 20,
  },
});
