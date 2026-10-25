/**
 * One exercise, one card. The notes box is for the whole exercise.
 * The rows under it are the sets. This component draws the card; the workout screen saves.
 */
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { DraftMap } from '../domain/drafts';
import { draftFromSet } from '../domain/drafts';
import { formatClock } from '../domain/format';
import { defaultRestFor, formatMultiplier, REST_CLASS_LABELS, restClassFor, WARMUP_MULTIPLIERS } from '../domain/rest';
import { cableAttachments, formatMachineSetup, usesMachineSetup, type CableAttachment, type WeightUnit, type WorkoutExercise } from '../domain/types';
import { colors } from '../theme/colors';
import { keyboardDoneId } from './keyboard-done-bar';
import { MachineSetupChoices } from './machine-setup-choices';
import { setColumn, SetRow } from './set-row';

const restChoices = [30, 60, 90, 120, 150, 180, 240, 300];

interface ExerciseBlockProps {
  exercise: WorkoutExercise;
  unit: WeightUnit;
  drafts: DraftMap;
  /** Ids of completed sets in this card that beat a previous best. */
  recordIds: ReadonlySet<string>;
  /** Warmup rest as a fraction of this card's rest. One setting for every exercise. */
  warmupMultiplier: number;
  onChangeRest: (workoutExerciseId: string, seconds: number | null) => void;
  onChangeWarmupMultiplier: (multiplier: number) => void;
  onChangeAttachment: (workoutExerciseId: string, attachment: CableAttachment | null) => void;
  onChangeSetup: (workoutExerciseId: string, setup: string | null) => void;
  /** Custom stack names already used for this exercise. */
  setupExtras?: string[];
  onChangeWeight: (setId: string, value: string) => void;
  onChangeReps: (setId: string, value: string) => void;
  onChangeRpe: (setId: string, value: string) => void;
  onChangeNotes: (workoutExerciseId: string, value: string) => void;
  onToggleComplete: (setId: string) => void;
  onToggleWarmup: (setId: string) => void;
  onDeleteSet: (setId: string) => void;
  onAddSet: (workoutExerciseId: string) => void;
  onRemove: (workoutExerciseId: string) => void;
  onSwap: (workoutExerciseId: string) => void;
  onHold: (workoutExerciseId: string) => void;
}

type OpenPanel = 'rest' | 'attachment' | 'setup' | null;

export const ExerciseBlock: React.FC<ExerciseBlockProps> = React.memo(function ExerciseBlock({
  exercise,
  unit,
  drafts,
  recordIds,
  warmupMultiplier,
  onChangeRest,
  onChangeWarmupMultiplier,
  onChangeAttachment,
  onChangeSetup,
  setupExtras,
  onChangeWeight,
  onChangeReps,
  onChangeRpe,
  onChangeNotes,
  onToggleComplete,
  onToggleWarmup,
  onDeleteSet,
  onAddSet,
  onRemove,
  onSwap,
  onHold,
}) {
  const handleAdd = useCallback(() => {
    onAddSet(exercise.id);
  }, [exercise.id, onAddSet]);
  const handleRemove = useCallback(() => {
    onRemove(exercise.id);
  }, [exercise.id, onRemove]);
  const handleSwap = useCallback(() => {
    onSwap(exercise.id);
  }, [exercise.id, onSwap]);
  const handleHold = useCallback(() => {
    onHold(exercise.id);
  }, [exercise.id, onHold]);
  const handleNotes = useCallback(
    (value: string) => {
      onChangeNotes(exercise.id, value);
    },
    [exercise.id, onChangeNotes],
  );
  const [panel, setPanel] = useState<OpenPanel>(null);
  const toggleRest = useCallback(() => {
    setPanel((open) => (open === 'rest' ? null : 'rest'));
  }, []);
  const toggleAttachment = useCallback(() => {
    setPanel((open) => (open === 'attachment' ? null : 'attachment'));
  }, []);
  const handleRest = useCallback(
    (seconds: number | null) => {
      onChangeRest(exercise.id, seconds);
      setPanel(null);
    },
    [exercise.id, onChangeRest],
  );
  const handleAttachment = useCallback(
    (attachment: CableAttachment | null) => {
      onChangeAttachment(exercise.id, attachment);
      setPanel(null);
    },
    [exercise.id, onChangeAttachment],
  );
  const toggleSetup = useCallback(() => {
    setPanel((open) => (open === 'setup' ? null : 'setup'));
  }, []);
  const handleSetup = useCallback(
    (setup: string | null) => {
      onChangeSetup(exercise.id, setup);
      setPanel(null);
    },
    [exercise.id, onChangeSetup],
  );
  const hasRecord = exercise.sets.some((set) => recordIds.has(set.id));
  const showSetup = usesMachineSetup(exercise.equipment);
  const defaultRest = defaultRestFor(exercise);
  const restLabel = formatClock(exercise.restSeconds ?? defaultRest);
  const isCable = exercise.equipment === 'Cable';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable accessibilityHint="Hold to reorder exercises" accessibilityRole="button" delayLongPress={400} onLongPress={handleHold} style={styles.titleWrap}>
          <Text style={styles.name}>
            {exercise.name}
            {hasRecord ? <Text style={styles.star}> ★</Text> : null}
          </Text>
          <Text style={styles.meta}>
            {exercise.muscleGroup} · {exercise.equipment}
          </Text>
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable accessibilityLabel={`Swap ${exercise.name}`} accessibilityRole="button" hitSlop={4} onPress={handleSwap} style={styles.remove}>
            <Text style={styles.removeText}>Swap</Text>
          </Pressable>
          <Pressable accessibilityRole="button" hitSlop={4} onPress={handleRemove} style={styles.remove}>
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.chipRow}>
        <Pressable
          accessibilityLabel={`Rest timer ${restLabel}${exercise.restSeconds == null ? ', default' : ''}`}
          accessibilityRole="button"
          accessibilityState={{ expanded: panel === 'rest' }}
          onPress={toggleRest}
          style={[styles.chip, panel === 'rest' && styles.chipOpen]}
        >
          <Text style={styles.chipText}>
            Rest {restLabel}
            {exercise.restSeconds == null ? ' · default' : ''}
          </Text>
        </Pressable>
        {showSetup ? (
          <Pressable
            accessibilityLabel={`Machine setup ${formatMachineSetup(exercise.machineSetup)}`}
            accessibilityRole="button"
            accessibilityState={{ expanded: panel === 'setup' }}
            onPress={toggleSetup}
            style={[styles.chip, panel === 'setup' && styles.chipOpen]}
          >
            <Text style={styles.chipText}>{formatMachineSetup(exercise.machineSetup)} ▾</Text>
          </Pressable>
        ) : null}
        {isCable ? (
          <Pressable
            accessibilityLabel={`Attachment ${exercise.attachment ?? 'none'}`}
            accessibilityRole="button"
            accessibilityState={{ expanded: panel === 'attachment' }}
            onPress={toggleAttachment}
            style={[styles.chip, panel === 'attachment' && styles.chipOpen]}
          >
            <Text style={styles.chipText}>{exercise.attachment ?? 'Attachment'} ▾</Text>
          </Pressable>
        ) : null}
      </View>
      {panel === 'rest' ? (
        <View>
          <View style={styles.choices}>
            <Choice label={`Default ${formatClock(defaultRest)}`} onPress={handleRest} selected={exercise.restSeconds == null} value={null} />
            {restChoices.map((seconds) => (
              <Choice key={seconds} label={formatClock(seconds)} onPress={handleRest} selected={exercise.restSeconds === seconds} value={seconds} />
            ))}
          </View>
          <Text style={styles.choiceNote}>
            Default {formatClock(defaultRest)} for a {REST_CLASS_LABELS[restClassFor(exercise)].toLowerCase()} exercise.
          </Text>
          <Text style={styles.choiceNote}>Light warmups rest, for every exercise. Heavier warmups rest longer, up to the full rest:</Text>
          <View style={styles.choices}>
            {WARMUP_MULTIPLIERS.map((multiplier) => (
              <Choice key={multiplier} label={formatMultiplier(multiplier)} onPress={onChangeWarmupMultiplier} selected={warmupMultiplier === multiplier} value={multiplier} />
            ))}
          </View>
        </View>
      ) : null}
      {panel === 'setup' ? <MachineSetupChoices extras={setupExtras} onChange={handleSetup} value={exercise.machineSetup} /> : null}
      {panel === 'attachment' ? (
        <View style={styles.choices}>
          <Choice label="None" onPress={handleAttachment} selected={exercise.attachment == null} value={null} />
          {cableAttachments.map((attachment) => (
            <Choice key={attachment} label={attachment} onPress={handleAttachment} selected={exercise.attachment === attachment} value={attachment} />
          ))}
        </View>
      ) : null}
      <Text style={styles.section}>Notes</Text>
      <TextInput
        accessibilityLabel="Exercise notes"
        inputAccessoryViewID={keyboardDoneId}
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
            index={exercise.sets.slice(0, index).filter((item) => item.setType !== 'warmup').length}
            isRecord={recordIds.has(set.id)}
            key={set.id}
            onChangeReps={onChangeReps}
            onChangeRpe={onChangeRpe}
            onChangeWeight={onChangeWeight}
            onDelete={onDeleteSet}
            onToggleComplete={onToggleComplete}
            onToggleWarmup={onToggleWarmup}
            previous={exercise.previousSets[index] ?? null}
            showSetup={showSetup}
            set={set}
            unit={unit}
          />
        ))}
      </View>
      <View style={styles.footer}>
        <Pressable accessibilityRole="button" onPress={handleAdd} style={styles.add}>
          <Text style={styles.addText}>Add set</Text>
        </Pressable>
        {exercise.sets.length > 0 ? <Text style={styles.swipeHint}>Swipe a set left to delete</Text> : null}
      </View>
    </View>
  );
});

interface ChoiceProps<T> {
  label: string;
  value: T;
  selected: boolean;
  onPress: (value: T) => void;
}

function ChoiceInner<T>({ label, value, selected, onPress }: ChoiceProps<T>) {
  const handlePress = useCallback(() => {
    onPress(value);
  }, [onPress, value]);

  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={handlePress} style={[styles.option, selected && styles.optionSelected]}>
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const Choice = React.memo(ChoiceInner) as typeof ChoiceInner;

const styles = StyleSheet.create({
  add: {
    paddingVertical: 4,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  swipeHint: {
    color: colors.faint,
    fontSize: 12,
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
    width: setColumn.check,
  },
  chip: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipOpen: {
    borderColor: colors.accent,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  chipText: {
    color: colors.muted,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  choiceNote: {
    color: colors.faint,
    fontSize: 12,
    marginTop: 10,
  },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
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
  headerActions: {
    flexDirection: 'row',
    gap: 14,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
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
  option: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  optionSelected: {
    backgroundColor: colors.accent,
  },
  optionText: {
    color: colors.text,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  optionTextSelected: {
    color: colors.accentInk,
  },
  previousCol: {
    flex: 1,
    minWidth: 52,
  },
  remove: {
    paddingVertical: 2,
  },
  removeText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
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
  star: {
    color: colors.accent,
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
