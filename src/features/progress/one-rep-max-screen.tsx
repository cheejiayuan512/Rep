/**
 * 1RM calculator: type a weight and reps, get the estimated one-rep max from
 * three formulas and a table of training weights by percentage.
 */
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Header, TextButton } from '../../components/header';
import { KeyboardDoneBar, keyboardDoneId } from '../../components/keyboard-done-bar';
import { Screen } from '../../components/screen';
import { UnitToggle } from '../../components/unit-toggle';
import { estimateAll, MAX_ESTIMATE_REPS, percentTable } from '../../domain/one-rep-max';
import { formatWeight, kgToDisplay, parseReps, weightTextToKg } from '../../domain/units';
import type { StackNavigation } from '../../navigation/types';
import { useWeightUnit } from '../../state/hooks';
import { colors } from '../../theme/colors';

export const OneRepMaxScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigation>();
  const { unit, setUnit } = useWeightUnit();
  const [weightText, setWeightText] = useState('');
  const [repsText, setRepsText] = useState('');

  const weightKg = weightTextToKg(weightText, unit, null);
  const reps = parseReps(repsText);
  const estimate = useMemo(() => (weightKg != null && reps != null ? estimateAll(weightKg, reps) : null), [reps, weightKg]);
  const table = useMemo(() => (estimate ? percentTable(estimate.averageKg) : []), [estimate]);
  const show = (kg: number) => `${formatWeight(roundForPlates(kgToDisplay(kg, unit)))} ${unit}`;
  const tooManyReps = reps != null && reps > MAX_ESTIMATE_REPS;

  return (
    <Screen bottomInset>
      <Header left={<TextButton label="Back" onPress={navigation.goBack} />} right={<UnitToggle onChange={setUnit} unit={unit} />} title="1RM calculator" />
      <ScrollView contentContainerStyle={styles.content} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" style={styles.fill}>
        <Text style={styles.lead}>Enter a set you did to estimate the most you could lift for one rep.</Text>
        <View style={styles.inputs}>
          <View style={styles.field}>
            <Text style={styles.label}>Weight ({unit})</Text>
            <TextInput
              accessibilityLabel={`Weight in ${unit}`}
              inputAccessoryViewID={keyboardDoneId}
              keyboardType="decimal-pad"
              onChangeText={setWeightText}
              placeholder="100"
              placeholderTextColor={colors.faint}
              style={styles.input}
              value={weightText}
            />
          </View>
          <Text style={styles.times}>×</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Reps</Text>
            <TextInput
              accessibilityLabel="Reps"
              inputAccessoryViewID={keyboardDoneId}
              keyboardType="number-pad"
              onChangeText={setRepsText}
              placeholder="5"
              placeholderTextColor={colors.faint}
              style={styles.input}
              value={repsText}
            />
          </View>
        </View>

        {estimate ? (
          <>
            <View accessibilityLabel={`Estimated one-rep max ${show(estimate.averageKg)}`} style={styles.result}>
              <Text style={styles.resultLabel}>Estimated 1RM</Text>
              <Text style={styles.resultValue}>{show(estimate.averageKg)}</Text>
              <Text style={styles.resultNote}>Average of three formulas</Text>
            </View>
            <View style={styles.formulas}>
              <Formula name="Epley" value={show(estimate.epleyKg)} note="Used for Rep's records" />
              <Formula name="Brzycki" value={show(estimate.brzyckiKg)} note="Reads low past 10 reps" />
              <Formula name="Lombardi" value={show(estimate.lombardiKg)} note="Reads high at low reps" />
            </View>
            <Text style={styles.section}>Training weights</Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHead]}>
                <Text style={[styles.cell, styles.headText]}>% 1RM</Text>
                <Text style={[styles.cell, styles.headText, styles.cellRight]}>Weight</Text>
                <Text style={[styles.cell, styles.headText, styles.cellRight]}>About</Text>
              </View>
              {table.map((row) => (
                <View key={row.percent} style={styles.tableRow}>
                  <Text style={[styles.cell, styles.cellStrong]}>{row.percent}%</Text>
                  <Text style={[styles.cell, styles.cellRight, styles.cellStrong]}>{show(row.weightKg)}</Text>
                  <Text style={[styles.cell, styles.cellRight]}>
                    {row.reps} {row.reps === 1 ? 'rep' : 'reps'}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <Text style={styles.hint}>
            {tooManyReps ? `Estimates stop meaning much past ${MAX_ESTIMATE_REPS} reps. Try a heavier set.` : 'Results show here once both numbers are in.'}
          </Text>
        )}
      </ScrollView>
      <KeyboardDoneBar />
    </Screen>
  );
};

const Formula: React.FC<{ name: string; value: string; note: string }> = ({ name, note, value }) => {
  return (
    <View style={styles.formula}>
      <View style={styles.formulaCopy}>
        <Text style={styles.formulaName}>{name}</Text>
        <Text style={styles.formulaNote}>{note}</Text>
      </View>
      <Text style={styles.formulaValue}>{value}</Text>
    </View>
  );
};

/** Nearest 0.5 in the display unit, the smallest jump most gyms can load. */
function roundForPlates(value: number): number {
  return Math.round(value * 2) / 2;
}

const styles = StyleSheet.create({
  cell: {
    color: colors.muted,
    flex: 1,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  cellRight: {
    textAlign: 'right',
  },
  cellStrong: {
    color: colors.text,
    fontWeight: '700',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  field: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  formula: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingVertical: 12,
  },
  formulaCopy: {
    flex: 1,
  },
  formulaName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  formulaNote: {
    color: colors.faint,
    fontSize: 12,
    marginTop: 2,
  },
  formulaValue: {
    color: colors.text,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  formulas: {
    marginTop: 8,
  },
  headText: {
    color: colors.faint,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  hint: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.text,
    fontSize: 28,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    minHeight: 64,
    paddingHorizontal: 16,
    textAlign: 'center',
  },
  inputs: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  lead: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  result: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 18,
    marginTop: 24,
    paddingVertical: 20,
  },
  resultLabel: {
    color: colors.accentInk,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  resultNote: {
    color: colors.accentInk,
    fontSize: 13,
    marginTop: 2,
    opacity: 0.75,
  },
  resultValue: {
    color: colors.accentInk,
    fontSize: 44,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    marginTop: 4,
  },
  section: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 28,
  },
  table: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    paddingHorizontal: 14,
  },
  tableHead: {
    paddingVertical: 10,
  },
  tableRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingVertical: 11,
  },
  times: {
    color: colors.faint,
    fontSize: 24,
    fontWeight: '700',
    paddingBottom: 18,
  },
});
