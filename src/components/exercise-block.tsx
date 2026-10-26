/**
 * One exercise, one card. The notes box is for the whole exercise.
 * The rows under it are the sets. This component draws the card; the workout screen saves.
 */
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type AccessibilityActionEvent } from 'react-native';

import type { DraftMap } from '../domain/drafts';
import { draftFromSet } from '../domain/drafts';
import { formatClock } from '../domain/format';
import { defaultRestFor, REST_CLASS_LABELS, restClassFor } from '../domain/rest';
import type { MachineSetupOption } from '../domain/machine-setup';
import { cableAttachments, formatMachineSetup, usesMachineSetup, type CableAttachment, type SetType, type WeightUnit, type WorkoutExercise } from '../domain/types';
import { previousForSet, type SupersetRole } from '../domain/workout-edits';
import { colors } from '../theme/colors';
import { CloseIcon, PencilIcon, SwapIcon } from './icons';
import { keyboardDoneId } from './keyboard-done-bar';
import { MachineSetupChoices } from './machine-setup-choices';
import { setColumn, SetRow } from './set-row';
import type { SortHandle } from './sortable-list';

const restChoices = [30, 60, 90, 120, 150, 180, 240, 300];
const moveActions = [
  { label: 'Move up', name: 'up' },
  { label: 'Move down', name: 'down' },
];

interface ExerciseBlockProps {
  exercise: WorkoutExercise;
  unit: WeightUnit;
  drafts: DraftMap;
  /** Ids of completed sets in this card that beat a previous best. */
  recordIds: ReadonlySet<string>;
  superset: SupersetRole;
  /** False on the last card, which has nothing below it to link. */
  canLinkSuperset: boolean;
  /** When false, the RPE column stays off the row. */
  showRpe: boolean;
  /** Added to each set's pad order so Next continues onto the next card. */
  orderBase?: number;
  onChangeRest: (workoutExerciseId: string, seconds: number | null) => void;
  onChangeAttachment: (workoutExerciseId: string, attachment: CableAttachment | null) => void;
  onChangeSetup: (workoutExerciseId: string, setup: string | null) => void;
  setupOptions: MachineSetupOption[];
  onChangeWeight: (setId: string, value: string) => void;
  onChangeReps: (setId: string, value: string) => void;
  onChangeRpe: (setId: string, value: string) => void;
  onChangeNotes: (workoutExerciseId: string, value: string) => void;
  onToggleComplete: (setId: string) => void;
  onChangeSetType: (setId: string, setType: SetType) => void;
  onToggleSuperset: (workoutExerciseId: string) => void;
  onDeleteSet: (setId: string) => void;
  onAddSet: (workoutExerciseId: string) => void;
  onRemove: (workoutExerciseId: string) => void;
  onSwap: (workoutExerciseId: string) => void;
  onApplyPrevious: (setId: string) => void;
  onMove: (workoutExerciseId: string, direction: -1 | 1) => void;
  sortHandle: SortHandle;
}

type OpenPanel = 'rest' | 'attachment' | 'setup' | null;

export const ExerciseBlock: React.FC<ExerciseBlockProps> = React.memo(function ExerciseBlock({
  exercise,
  unit,
  drafts,
  recordIds,
  superset,
  canLinkSuperset,
  showRpe,
  orderBase = 0,
  onChangeRest,
  onChangeAttachment,
  onChangeSetup,
  setupOptions,
  onChangeWeight,
  onChangeReps,
  onChangeRpe,
  onChangeNotes,
  onToggleComplete,
  onChangeSetType,
  onToggleSuperset,
  onDeleteSet,
  onAddSet,
  onRemove,
  onSwap,
  onApplyPrevious,
  onMove,
  sortHandle,
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
  const handleSuperset = useCallback(() => {
    onToggleSuperset(exercise.id);
  }, [exercise.id, onToggleSuperset]);
  const handleMoveAction = useCallback(
    (event: AccessibilityActionEvent) => {
      onMove(exercise.id, event.nativeEvent.actionName === 'up' ? -1 : 1);
    },
    [exercise.id, onMove],
  );
  const handleNotes = useCallback(
    (value: string) => {
      onChangeNotes(exercise.id, value);
    },
    [exercise.id, onChangeNotes],
  );
  const [panel, setPanel] = useState<OpenPanel>(null);
  const [notesOpen, setNotesOpen] = useState(exercise.notes.trim().length > 0);
  const openNotes = useCallback(() => setNotesOpen(true), []);
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
  const showSetup = usesMachineSetup(exercise.equipment);
  const defaultRest = defaultRestFor(exercise);
  const restLabel = formatClock(exercise.restSeconds ?? defaultRest);
  const isCable = exercise.equipment === 'Cable';

  return (
    <View style={[styles.card, superset !== 'single' && styles.cardSuperset, sortHandle.dragging && styles.cardDragging]}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          {superset !== 'single' ? <Text style={styles.superset}>Superset</Text> : null}
          <Text style={styles.name}>{exercise.name}</Text>
          <Text style={styles.meta}>{exercise.equipment}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable accessibilityLabel={`Swap ${exercise.name}`} accessibilityRole="button" hitSlop={6} onPress={handleSwap} style={styles.iconAction}>
            <SwapIcon color={colors.muted} size={18} />
          </Pressable>
          <Pressable accessibilityLabel={`Remove ${exercise.name}`} accessibilityRole="button" hitSlop={6} onPress={handleRemove} style={styles.iconAction}>
            <CloseIcon color={colors.muted} size={18} />
          </Pressable>
          <View
            accessibilityActions={moveActions}
            accessibilityHint="Drag to reorder"
            accessibilityLabel={`Reorder ${exercise.name}`}
            accessibilityRole="adjustable"
            hitSlop={12}
            onAccessibilityAction={handleMoveAction}
            style={styles.handle}
            {...sortHandle.panHandlers}
          >
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
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
          <Text style={styles.chipText}>{restLabel}</Text>
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
        </View>
      ) : null}
      {panel === 'setup' ? <MachineSetupChoices onChange={handleSetup} options={setupOptions} unit={unit} value={exercise.machineSetup} /> : null}
      {panel === 'attachment' ? (
        <View style={styles.choices}>
          <Choice label="None" onPress={handleAttachment} selected={exercise.attachment == null} value={null} />
          {cableAttachments.map((attachment) => (
            <Choice key={attachment} label={attachment} onPress={handleAttachment} selected={exercise.attachment === attachment} value={attachment} />
          ))}
        </View>
      ) : null}
      {notesOpen || exercise.notes.trim().length > 0 ? (
        <View>
          <View style={styles.notesHead}>
            <Text style={[styles.section, styles.notesLabel]}>Notes</Text>
            <PencilIcon color={colors.muted} size={14} />
          </View>
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
        </View>
      ) : (
        <Pressable accessibilityLabel="Add notes" accessibilityRole="button" onPress={openNotes} style={styles.notesToggle}>
          <PencilIcon color={colors.accent} size={14} />
          <Text style={styles.addText}>Notes</Text>
        </Pressable>
      )}
      <View style={styles.table}>
        <View style={styles.columns}>
          <Text style={[styles.column, styles.setCol]}>SET</Text>
          <Text style={[styles.column, styles.previousCol]}>PREVIOUS</Text>
          <Text style={[styles.column, styles.weightCol]}>{unit.toUpperCase()}</Text>
          <Text style={[styles.column, styles.repsCol]}>REPS</Text>
          {showRpe ? <Text style={[styles.column, styles.rpeCol]}>RPE</Text> : null}
          <View style={styles.checkSpacer} />
        </View>
        {showSetup && exercise.previousSets.length === 0 ? (
          <Text style={styles.emptySetup}>No session on {formatMachineSetup(exercise.machineSetup)} yet</Text>
        ) : null}
        {exercise.sets.map((set, index) => (
          <SetRow
            draft={drafts[set.id] ?? draftFromSet(set, unit)}
            index={exercise.sets.slice(0, index).filter((item) => item.setType !== 'warmup').length}
            isRecord={recordIds.has(set.id)}
            key={set.id}
            onApplyPrevious={onApplyPrevious}
            onChangeReps={onChangeReps}
            onChangeRpe={onChangeRpe}
            onChangeWeight={onChangeWeight}
            onChangeSetType={onChangeSetType}
            onDelete={onDeleteSet}
            onToggleComplete={onToggleComplete}
            order={orderBase + index * 10}
            previous={previousForSet(exercise.sets, exercise.previousSets, index)}
            showRpe={showRpe}
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
        {canLinkSuperset || superset !== 'single' ? (
          <Pressable accessibilityRole="button" onPress={handleSuperset} style={styles.add}>
            <Text style={styles.addText}>{superset === 'single' ? 'Superset with next' : 'Remove from superset'}</Text>
          </Pressable>
        ) : null}
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
  cardSuperset: {
    borderLeftColor: colors.accent,
    borderLeftWidth: 3,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 12,
  },
  notesHead: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
  },
  notesLabel: {
    marginTop: 0,
  },
  notesToggle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
    paddingVertical: 4,
  },
  addText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  cardDragging: {
    opacity: 0.72,
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
  emptySetup: {
    color: colors.faint,
    fontSize: 12,
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
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  handle: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  iconAction: {
    padding: 6,
  },
  dot: {
    backgroundColor: colors.muted,
    borderRadius: 1.5,
    height: 3,
    marginVertical: 1.5,
    width: 3,
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
  repsCol: {
    textAlign: 'center',
    width: setColumn.reps,
  },
  rpeCol: {
    textAlign: 'center',
    width: setColumn.rpe,
  },
  superset: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 2,
    textTransform: 'uppercase',
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
