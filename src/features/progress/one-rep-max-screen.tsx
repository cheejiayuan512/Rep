/**
 * 1RM calculator. "One set" takes a weight and reps and shows three formulas.
 * "Whole session" takes every set of a lift (optionally with RPE), or loads
 * your last session of an exercise, and blends them into one estimate.
 * Both end with a table of training weights by percentage.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Chip } from '../../components/chip';
import { Header, TextButton } from '../../components/header';
import { keyboardDoneId } from '../../components/keyboard-done-bar';
import { Screen } from '../../components/screen';
import { getLatestSession } from '../../data/repository';
import { formatWorkoutWhen } from '../../domain/format';
import { estimateAll, estimateFromSets, MAX_ESTIMATE_REPS, percentTable, type SessionSet } from '../../domain/one-rep-max';
import type { TrainedExercise, WeightUnit } from '../../domain/types';
import { formatWeight, kgToDisplay, parseReps, parseRpe, weightTextToKg } from '../../domain/units';
import type { StackNavigation } from '../../navigation/types';
import { useTrainedExercises, useWeightUnit } from '../../state/hooks';
import { colors } from '../../theme/colors';

type Mode = 'single' | 'session';

interface SessionRow {
  id: number;
  weightText: string;
  repsText: string;
  rpeText: string;
}

type RowField = 'weightText' | 'repsText' | 'rpeText';

let nextRowId = 1;

function emptyRow(): SessionRow {
  nextRowId += 1;
  return { id: nextRowId, repsText: '', rpeText: '', weightText: '' };
}

/** Nearest 0.5 in the display unit, the smallest jump most gyms can load. */
function roundForPlates(value: number): number {
  return Math.round(value * 2) / 2;
}

function showWeight(kg: number, unit: WeightUnit): string {
  return `${formatWeight(roundForPlates(kgToDisplay(kg, unit)))} ${unit}`;
}

export const OneRepMaxScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigation>();
  const { unit } = useWeightUnit();
  const [mode, setMode] = useState<Mode>('session');

  return (
    <Screen bottomInset>
      <Header left={<TextButton label="Back" onPress={navigation.goBack} />} title="1RM calculator" />
      <ScrollView contentContainerStyle={styles.content} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" style={styles.fill}>
        <View style={styles.modes}>
          <Chip label="Whole session" onSelect={setMode} selected={mode === 'session'} value="session" />
          <Chip label="One set" onSelect={setMode} selected={mode === 'single'} value="single" />
        </View>
        {mode === 'single' ? <SingleSet unit={unit} /> : <WholeSession unit={unit} />}
      </ScrollView>
    </Screen>
  );
};

const SingleSet: React.FC<{ unit: WeightUnit }> = ({ unit }) => {
  const [weightText, setWeightText] = useState('');
  const [repsText, setRepsText] = useState('');
  const weightKg = weightTextToKg(weightText, unit, null);
  const reps = parseReps(repsText);
  const estimate = useMemo(() => (weightKg != null && reps != null ? estimateAll(weightKg, reps) : null), [reps, weightKg]);
  const tooManyReps = reps != null && reps > MAX_ESTIMATE_REPS;

  return (
    <View>
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
          <ResultCard label="Estimated 1RM" note="Average of three formulas" unit={unit} valueKg={estimate.averageKg} />
          <View style={styles.formulas}>
            <Formula name="Epley" note="Used for Rep's records" value={showWeight(estimate.epleyKg, unit)} />
            <Formula name="Brzycki" note="Reads low past 10 reps" value={showWeight(estimate.brzyckiKg, unit)} />
            <Formula name="Lombardi" note="Reads high at low reps" value={showWeight(estimate.lombardiKg, unit)} />
          </View>
          <TrainingWeights oneRepMaxKg={estimate.averageKg} unit={unit} />
        </>
      ) : (
        <Text style={styles.hint}>
          {tooManyReps ? `Estimates stop meaning much past ${MAX_ESTIMATE_REPS} reps. Try a heavier set.` : 'Results show here once both numbers are in.'}
        </Text>
      )}
    </View>
  );
};

const WholeSession: React.FC<{ unit: WeightUnit }> = ({ unit }) => {
  const trained = useTrainedExercises();
  const [rows, setRows] = useState<SessionRow[]>(() => [emptyRow(), emptyRow(), emptyRow()]);
  const [loaded, setLoaded] = useState<string | null>(null);

  const sets = useMemo(
    () =>
      rows.map((row): SessionSet | null => {
        const weightKg = weightTextToKg(row.weightText, unit, null);
        const reps = parseReps(row.repsText);
        return weightKg != null && reps != null ? { reps, rpe: parseRpe(row.rpeText), weightKg } : null;
      }),
    [rows, unit],
  );
  const filled = useMemo(() => sets.filter((set): set is SessionSet => set != null), [sets]);
  const estimate = useMemo(() => estimateFromSets(filled), [filled]);
  const perRow = useMemo(() => {
    const perSet = estimate?.perSetKg ?? [];
    let cursor = 0;
    return sets.map((set) => (set ? (perSet[cursor++] ?? null) : null));
  }, [estimate, sets]);

  const changeRow = useCallback((id: number, field: RowField, value: string) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }, []);
  const removeRow = useCallback((id: number) => {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
  }, []);
  const addRow = useCallback(() => {
    setRows((current) => [...current, emptyRow()]);
  }, []);

  const loadExercise = useCallback(
    async (exercise: TrainedExercise) => {
      const session = await getLatestSession(exercise.id);
      if (!session || session.sets.length === 0) {
        return;
      }
      setRows(
        session.sets.map((set) => ({
          ...emptyRow(),
          repsText: String(set.reps),
          rpeText: set.rpe != null ? formatWeight(set.rpe) : '',
          weightText: formatWeight(kgToDisplay(set.weightKg, unit)),
        })),
      );
      setLoaded(`${exercise.name} · ${formatWorkoutWhen(session.finishedAt)}`);
    },
    [unit],
  );

  return (
    <View>
      <Text style={styles.lead}>
        Enter every working set of one lift. RPE is optional: RPE 8 means two reps left, so it counts toward the estimate. Sets well below your best, like back-off sets, are left out.
      </Text>
      {trained.length > 0 ? (
        <>
          <Text style={[styles.label, styles.labelSpaced]}>Load your last session</Text>
          <ScrollView contentContainerStyle={styles.trained} horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false}>
            {trained.slice(0, 12).map((exercise) => (
              <TrainedChip exercise={exercise} key={exercise.id} onPress={loadExercise} />
            ))}
          </ScrollView>
        </>
      ) : null}
      {loaded ? <Text style={styles.loaded}>{loaded}</Text> : null}
      <View style={styles.sessionHead}>
        <Text style={[styles.headText, styles.sessionWeight]}>{unit}</Text>
        <Text style={[styles.headText, styles.sessionReps]}>Reps</Text>
        <Text style={[styles.headText, styles.sessionRpe]}>RPE</Text>
        <Text style={[styles.headText, styles.sessionEstimate]}>e1RM</Text>
        <View style={styles.sessionRemove} />
      </View>
      {rows.map((row, index) => (
        <SessionRowView canRemove={rows.length > 1} estimateKg={perRow[index] ?? null} key={row.id} onChange={changeRow} onRemove={removeRow} row={row} unit={unit} />
      ))}
      <TextButton label="Add set" onPress={addRow} tone="accent" />

      {estimate ? (
        <>
          <ResultCard
            label="Session 1RM"
            note={`Blends ${estimate.used} of ${filled.length} ${filled.length === 1 ? 'set' : 'sets'}, leaning on the heavier ones`}
            unit={unit}
            valueKg={estimate.sessionKg}
          />
          <Formula name="Best single set" note="The one set that predicts the most" value={showWeight(estimate.bestKg, unit)} />
          <TrainingWeights oneRepMaxKg={estimate.sessionKg} unit={unit} />
        </>
      ) : (
        <Text style={styles.hint}>Results show here once a set has weight and reps.</Text>
      )}
    </View>
  );
};

interface SessionRowViewProps {
  row: SessionRow;
  unit: WeightUnit;
  estimateKg: number | null;
  canRemove: boolean;
  onChange: (id: number, field: RowField, value: string) => void;
  onRemove: (id: number) => void;
}

const SessionRowView: React.FC<SessionRowViewProps> = React.memo(function SessionRowView({ row, unit, estimateKg, canRemove, onChange, onRemove }) {
  const changeWeight = useCallback((value: string) => onChange(row.id, 'weightText', value), [onChange, row.id]);
  const changeReps = useCallback((value: string) => onChange(row.id, 'repsText', value), [onChange, row.id]);
  const changeRpe = useCallback((value: string) => onChange(row.id, 'rpeText', value), [onChange, row.id]);
  const remove = useCallback(() => onRemove(row.id), [onRemove, row.id]);

  return (
    <View style={styles.sessionRow}>
      <TextInput
        accessibilityLabel={`Session weight in ${unit}`}
        inputAccessoryViewID={keyboardDoneId}
        keyboardType="decimal-pad"
        onChangeText={changeWeight}
        placeholder="—"
        placeholderTextColor={colors.faint}
        style={[styles.sessionInput, styles.sessionWeight]}
        value={row.weightText}
      />
      <TextInput
        accessibilityLabel="Session reps"
        inputAccessoryViewID={keyboardDoneId}
        keyboardType="number-pad"
        onChangeText={changeReps}
        placeholder="—"
        placeholderTextColor={colors.faint}
        style={[styles.sessionInput, styles.sessionReps]}
        value={row.repsText}
      />
      <TextInput
        accessibilityLabel="Session RPE"
        inputAccessoryViewID={keyboardDoneId}
        keyboardType="decimal-pad"
        onChangeText={changeRpe}
        placeholder="—"
        placeholderTextColor={colors.faint}
        style={[styles.sessionInput, styles.sessionRpe]}
        value={row.rpeText}
      />
      <Text style={styles.sessionEstimate}>{estimateKg != null ? formatWeight(roundForPlates(kgToDisplay(estimateKg, unit))) : '—'}</Text>
      <Pressable accessibilityLabel="Remove set" accessibilityRole="button" disabled={!canRemove} hitSlop={6} onPress={remove} style={styles.sessionRemove}>
        <Text style={[styles.removeText, !canRemove && styles.removeDisabled]}>×</Text>
      </Pressable>
    </View>
  );
});

const TrainedChip: React.FC<{ exercise: TrainedExercise; onPress: (exercise: TrainedExercise) => void }> = React.memo(function TrainedChip({ exercise, onPress }) {
  const handlePress = useCallback(() => onPress(exercise), [exercise, onPress]);
  return (
    <Pressable accessibilityRole="button" onPress={handlePress} style={styles.trainedChip}>
      <Text numberOfLines={1} style={styles.trainedText}>
        {exercise.name}
      </Text>
    </Pressable>
  );
});

const ResultCard: React.FC<{ label: string; note: string; valueKg: number; unit: WeightUnit }> = ({ label, note, unit, valueKg }) => {
  return (
    <View accessibilityLabel={`Estimated one-rep max ${showWeight(valueKg, unit)}`} style={styles.result}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={styles.resultValue}>{showWeight(valueKg, unit)}</Text>
      <Text style={styles.resultNote}>{note}</Text>
    </View>
  );
};

const TrainingWeights: React.FC<{ oneRepMaxKg: number; unit: WeightUnit }> = ({ oneRepMaxKg, unit }) => {
  const table = useMemo(() => percentTable(oneRepMaxKg), [oneRepMaxKg]);
  return (
    <>
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
            <Text style={[styles.cell, styles.cellRight, styles.cellStrong]}>{showWeight(row.weightKg, unit)}</Text>
            <Text style={[styles.cell, styles.cellRight]}>
              {row.reps} {row.reps === 1 ? 'rep' : 'reps'}
            </Text>
          </View>
        ))}
      </View>
    </>
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
  labelSpaced: {
    marginTop: 16,
  },
  lead: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  loaded: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
  },
  modes: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  removeDisabled: {
    opacity: 0.3,
  },
  removeText: {
    color: colors.muted,
    fontSize: 20,
    textAlign: 'center',
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
    paddingHorizontal: 16,
    textAlign: 'center',
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
  sessionEstimate: {
    color: colors.muted,
    flex: 1,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  sessionHead: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
  },
  sessionInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.text,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    minHeight: 44,
    textAlign: 'center',
  },
  sessionRemove: {
    width: 28,
  },
  sessionReps: {
    textAlign: 'center',
    width: 60,
  },
  sessionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  sessionRpe: {
    textAlign: 'center',
    width: 56,
  },
  sessionWeight: {
    textAlign: 'center',
    width: 84,
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
  trained: {
    gap: 8,
  },
  trainedChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 200,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  trainedText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
});
