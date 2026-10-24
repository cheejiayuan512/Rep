/**
 * One set inside an exercise card: set number, previous result, weight, reps, RPE, and a check.
 * Tap the set number to mark it as a warmup. The boxes show text; the parent converts that text to numbers.
 * Swipe the row left to reveal Delete; a long swipe deletes straight away (the card shows Undo).
 */
import React, { useCallback, useMemo, useRef } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, TextInput, View, type AccessibilityActionEvent, type LayoutChangeEvent } from 'react-native';

import { formatLoggedLoad } from '../domain/format';
import type { SetDraft } from '../domain/drafts';
import type { PreviousSet, SetRecord, WeightUnit } from '../domain/types';
import { colors } from '../theme/colors';
import { hapticLight } from './haptics';
import { keyboardDoneId } from './keyboard-done-bar';

export const setColumn = {
  check: 36,
  gap: 4,
  reps: 50,
  rpe: 44,
  set: 26,
  weight: 60,
};

/** Width of the Delete button a swipe reveals. */
const ACTION_WIDTH = 84;
/** A swipe past this share of the row deletes without a second tap. */
const FULL_SWIPE = 0.5;

const deleteAction = [{ label: 'Delete set', name: 'delete' }];

interface SetRowProps {
  index: number;
  set: SetRecord;
  draft: SetDraft;
  previous: PreviousSet | null;
  unit: WeightUnit;
  /** True when this completed set beat a previous best. */
  isRecord: boolean;
  onChangeWeight: (setId: string, value: string) => void;
  onChangeReps: (setId: string, value: string) => void;
  onChangeRpe: (setId: string, value: string) => void;
  onToggleComplete: (setId: string) => void;
  onToggleWarmup: (setId: string) => void;
  onDelete: (setId: string) => void;
}

export const SetRow: React.FC<SetRowProps> = React.memo(function SetRow({
  index,
  set,
  draft,
  previous,
  unit,
  isRecord,
  onChangeWeight,
  onChangeReps,
  onChangeRpe,
  onToggleComplete,
  onToggleWarmup,
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
  const handleWarmup = useCallback(() => {
    onToggleWarmup(set.id);
  }, [onToggleWarmup, set.id]);

  const translateX = useRef(new Animated.Value(0)).current;
  const resting = useRef(0);
  const width = useRef(320);
  const deleteRef = useRef(() => onDelete(set.id));
  deleteRef.current = () => onDelete(set.id);

  const settle = useCallback(
    (to: number) => {
      resting.current = to;
      Animated.spring(translateX, { bounciness: 0, toValue: to, useNativeDriver: false }).start();
    },
    [translateX],
  );

  const removeNow = useCallback(() => {
    resting.current = 0;
    Animated.timing(translateX, { duration: 160, toValue: -width.current, useNativeDriver: false }).start(() => {
      deleteRef.current();
    });
    void hapticLight();
  }, [translateX]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
        onPanResponderMove: (_event, gesture) => {
          translateX.setValue(Math.min(0, Math.max(-width.current, resting.current + gesture.dx)));
        },
        onPanResponderRelease: (_event, gesture) => {
          const x = resting.current + gesture.dx;
          if (x < -width.current * FULL_SWIPE) {
            removeNow();
          } else if (x < -ACTION_WIDTH / 2 || gesture.vx < -0.8) {
            settle(-ACTION_WIDTH);
          } else {
            settle(0);
          }
        },
        onPanResponderTerminate: () => settle(resting.current),
        onPanResponderTerminationRequest: () => false,
      }),
    [removeNow, settle, translateX],
  );

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    width.current = event.nativeEvent.layout.width;
  }, []);

  const handleAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === 'delete') {
        removeNow();
      }
    },
    [removeNow],
  );

  return (
    <View onLayout={handleLayout} style={styles.wrap}>
      <Pressable accessibilityLabel="Delete set" accessibilityRole="button" onPress={removeNow} style={styles.action}>
        <Text style={styles.actionText}>Delete</Text>
      </Pressable>
      <Animated.View
        accessibilityActions={deleteAction}
        onAccessibilityAction={handleAction}
        style={[styles.front, { transform: [{ translateX }] }]}
        testID="set-row"
        {...responder.panHandlers}
      >
        <View style={[styles.row, set.setType === 'warmup' && styles.warmup]}>
          <Pressable accessibilityLabel={set.setType === 'warmup' ? 'Mark as a working set' : 'Mark as a warmup set'} onPress={handleWarmup} style={styles.setNumber}>
            <Text style={styles.setNumberText}>{set.setType === 'warmup' ? 'W' : String(index + 1)}</Text>
            {isRecord ? (
              <Text accessibilityLabel="Personal record" style={styles.star}>
                ★
              </Text>
            ) : null}
          </Pressable>
          <Text numberOfLines={1} style={styles.previous}>
            {previous ? formatLoggedLoad(previous.weightKg, previous.reps, unit, previous.setType === 'warmup') : '—'}
          </Text>
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
          <Pressable accessibilityLabel={set.completed ? 'Mark set incomplete' : 'Complete set'} accessibilityRole="button" onPress={handleComplete} style={[styles.check, set.completed && styles.checkDone]}>
            <Text style={[styles.checkText, set.completed && styles.checkTextDone]}>{set.completed ? '✓' : ''}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: 10,
    bottom: 0,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    top: 0,
    width: ACTION_WIDTH,
  },
  actionText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  check: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
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
  front: {
    backgroundColor: colors.surface,
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
    flex: 1,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
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
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
  },
});
