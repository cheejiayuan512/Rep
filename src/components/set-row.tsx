/**
 * One set inside an exercise card: set number, previous result, weight, reps, RPE, and a check.
 * Tap the set number to mark it as a warmup. The boxes show text; the parent converts that text to numbers.
 * Swipe the row left to reveal Delete; a long swipe deletes straight away (the card shows Undo).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatLoggedLoad } from '../domain/format';
import type { SetDraft } from '../domain/drafts';
import type { PreviousSet, SetRecord, SetType, WeightUnit } from '../domain/types';
import { colors } from '../theme/colors';
import { keyboardDoneId } from './keyboard-done-bar';
import { SetTypeBadge, SetTypeMenu } from './set-type-badge';
import { SwipeToDelete } from './swipe-to-delete';

const nativeDriver = Platform.OS !== 'web';

export const setColumn = {
  check: 36,
  gap: 4,
  reps: 50,
  rpe: 44,
  set: 26,
  weight: 60,
};

interface SetRowProps {
  index: number;
  set: SetRecord;
  draft: SetDraft;
  previous: PreviousSet | null;
  unit: WeightUnit;
  /** Append the stack name on machine and cable rows. */
  showSetup?: boolean;
  /** When false, the RPE field is omitted. */
  showRpe?: boolean;
  /** True when this completed set beat a previous best. */
  isRecord: boolean;
  onChangeWeight: (setId: string, value: string) => void;
  onChangeReps: (setId: string, value: string) => void;
  onChangeRpe: (setId: string, value: string) => void;
  onToggleComplete: (setId: string) => void;
  onChangeSetType: (setId: string, setType: SetType) => void;
  onApplyPrevious: (setId: string) => void;
  onDelete: (setId: string) => void;
}

export const SetRow: React.FC<SetRowProps> = React.memo(function SetRow({
  index,
  set,
  draft,
  previous,
  unit,
  showSetup = false,
  showRpe = true,
  isRecord,
  onChangeWeight,
  onChangeReps,
  onChangeRpe,
  onToggleComplete,
  onChangeSetType,
  onApplyPrevious,
  onDelete,
}) {
  const handleWeight = useCallback(
    (value: string) => {
      onChangeWeight(set.id, value);
    },
    [onChangeWeight, set.id],
  );
  const handleReps = useCallback(
    (value: string) => {
      onChangeReps(set.id, value);
    },
    [onChangeReps, set.id],
  );
  const handleRpe = useCallback(
    (value: string) => {
      onChangeRpe(set.id, value);
    },
    [onChangeRpe, set.id],
  );
  const handleComplete = useCallback(() => {
    onToggleComplete(set.id);
  }, [onToggleComplete, set.id]);
  const [typesOpen, setTypesOpen] = useState(false);
  const toggleTypes = useCallback(() => {
    setTypesOpen((open) => !open);
  }, []);
  const handleSetType = useCallback(
    (setType: SetType) => {
      setTypesOpen(false);
      if (setType !== set.setType) {
        onChangeSetType(set.id, setType);
      }
    },
    [onChangeSetType, set.id, set.setType],
  );
  const checkScale = useRef(new Animated.Value(1)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const wasCompleted = useRef(set.completed);
  useEffect(() => {
    if (set.completed && !wasCompleted.current) {
      checkScale.setValue(0.4);
      burst.setValue(0);
      Animated.parallel([
        Animated.spring(checkScale, { friction: 4, tension: 180, toValue: 1, useNativeDriver: nativeDriver }),
        Animated.timing(burst, { duration: 420, toValue: 1, useNativeDriver: nativeDriver }),
      ]).start();
    }
    wasCompleted.current = set.completed;
  }, [burst, checkScale, set.completed]);

  const handleDelete = useCallback(() => {
    onDelete(set.id);
  }, [onDelete, set.id]);
  const handleApplyPrevious = useCallback(() => {
    onApplyPrevious(set.id);
  }, [onApplyPrevious, set.id]);
  const previousText = previous
    ? formatLoggedLoad(previous.weightKg, previous.reps, unit, previous.setType === 'warmup', showSetup ? (previous.machineSetup ?? null) : undefined)
    : '—';

  return (
    <SwipeToDelete accessibilityLabel="Delete set" label="Delete" onDelete={handleDelete} style={styles.wrap} testID="set-row">
      <View>
      <View style={[styles.row, set.setType === 'warmup' && styles.warmup]}>
        <View style={styles.badgeWrap}>
          <SetTypeBadge index={index} onPress={toggleTypes} open={typesOpen} setType={set.setType} />
          {isRecord ? (
            <Text accessibilityLabel="Personal record" style={styles.star}>
              ★
            </Text>
          ) : null}
        </View>
        <Pressable
          accessibilityLabel={previous ? `Apply previous ${previousText}` : undefined}
          disabled={!previous}
          onPress={handleApplyPrevious}
          style={styles.previousHit}
        >
          <Text numberOfLines={1} style={styles.previous}>
            {previousText}
          </Text>
        </Pressable>
        <TextInput
          accessibilityLabel="Weight"
          inputAccessoryViewID={keyboardDoneId}
          keyboardType="decimal-pad"
          onChangeText={handleWeight}
          placeholder="—"
          placeholderTextColor={colors.faint}
          selectTextOnFocus
          style={[styles.input, styles.weight]}
          value={draft.weightText}
        />
        <TextInput
          accessibilityLabel="Reps"
          inputAccessoryViewID={keyboardDoneId}
          keyboardType="number-pad"
          onChangeText={handleReps}
          placeholder="—"
          placeholderTextColor={colors.faint}
          selectTextOnFocus
          style={[styles.input, styles.reps]}
          value={draft.repsText}
        />
        {showRpe ? (
          <TextInput
            accessibilityLabel="RPE"
            inputAccessoryViewID={keyboardDoneId}
            keyboardType="decimal-pad"
            onChangeText={handleRpe}
            placeholder="—"
            placeholderTextColor={colors.faint}
            selectTextOnFocus
            style={[styles.input, styles.rpe]}
            value={draft.rpeText}
          />
        ) : null}
        <Pressable accessibilityLabel={set.completed ? 'Mark set incomplete' : 'Complete set'} accessibilityRole="button" onPress={handleComplete} style={[styles.check, set.completed && styles.checkDone]}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.burst,
              {
                opacity: burst.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.7, 0] }),
                transform: [{ scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.8] }) }],
              },
            ]}
          />
          <Animated.Text style={[styles.checkText, set.completed && styles.checkTextDone, { transform: [{ scale: checkScale }] }]}>{set.completed ? '✓' : ''}</Animated.Text>
        </Pressable>
      </View>
      {typesOpen ? <SetTypeMenu onChange={handleSetType} value={set.setType} /> : null}
      </View>
    </SwipeToDelete>
  );
});

const styles = StyleSheet.create({
  burst: {
    backgroundColor: colors.accent,
    borderRadius: 18,
    height: 36,
    position: 'absolute',
    width: 36,
  },
  badgeWrap: {
    position: 'relative',
    width: setColumn.set,
  },
  check: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    overflow: 'visible',
    width: setColumn.check,
  },
  checkDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  checkTextDone: {
    color: colors.accentInk,
  },
  input: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 10,
    color: colors.text,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    height: 40,
    textAlign: 'center',
  },
  previous: {
    color: colors.muted,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  previousHit: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 36,
    minWidth: 52,
  },
  reps: {
    width: setColumn.reps,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: setColumn.gap,
    paddingVertical: 4,
  },
  rpe: {
    width: setColumn.rpe,
  },
  setNumber: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: setColumn.set,
  },
  setNumberText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  star: {
    color: colors.accent,
    fontSize: 11,
    position: 'absolute',
    right: -2,
    top: 0,
  },
  warmup: {
    opacity: 0.72,
  },
  weight: {
    width: setColumn.weight,
  },
  wrap: {
    marginTop: 4,
  },
});
