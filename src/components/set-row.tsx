/**
 * One set inside an exercise card: set number, previous result, weight, reps, RPE, and a check.
 * Tap the set number to mark it as a warmup. The boxes show text; the parent converts that text to numbers.
 * Swipe the row left to reveal Delete; a long swipe deletes straight away (the card shows Undo).
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatCardioEffort } from '../domain/cardio';
import { formatLoggedLoad } from '../domain/format';
import type { SetDraft } from '../domain/drafts';
import type { PreviousSet, SetRecord, SetType, WeightUnit } from '../domain/types';
import { colors } from '../theme/colors';
import { hitTarget } from '../theme/spacing';
import { type, workoutMaxFontScale } from '../theme/typography';
import { LogValue } from './log-pad';
import { SetTypeBadge } from './set-type-badge';
import { SwipeToDelete } from './swipe-to-delete';
import { useReduceMotion } from './use-reduce-motion';

const nativeDriver = Platform.OS !== 'web';

export const setColumn = {
  check: 44,
  distance: 68,
  gap: 8,
  reps: 48,
  rpe: 44,
  set: 28,
  time: 72,
  weight: 56,
};

interface SetRowProps {
  index: number;
  set: SetRecord;
  draft: SetDraft;
  previous: PreviousSet | null;
  unit: WeightUnit;
  /** Append the stack name on machine and cable rows. */
  showSetup?: boolean;
  /** When false, the RPE field is omitted. The pad can still write one. */
  showRpe?: boolean;
  /** Time and distance instead of weight and reps. */
  cardio?: boolean;
  onChangeDuration?: (setId: string, value: string) => void;
  onChangeDistance?: (setId: string, value: string) => void;
  /** Weight field order. Reps and RPE follow it, so Next walks the card. */
  order: number;
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
  cardio = false,
  onChangeDuration,
  onChangeDistance,
  order,
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
  const handleDuration = useCallback(
    (value: string) => {
      onChangeDuration?.(set.id, value);
    },
    [onChangeDuration, set.id],
  );
  const handleDistance = useCallback(
    (value: string) => {
      onChangeDistance?.(set.id, value);
    },
    [onChangeDistance, set.id],
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
  const handleSetType = useCallback(
    (setType: SetType) => {
      onChangeSetType(set.id, setType);
    },
    [onChangeSetType, set.id],
  );
  const reduceMotion = useReduceMotion();
  const checkScale = useRef(new Animated.Value(1)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const wasCompleted = useRef(set.completed);
  useEffect(() => {
    if (set.completed && !wasCompleted.current && !reduceMotion) {
      checkScale.setValue(0.4);
      burst.setValue(0);
      Animated.parallel([
        Animated.spring(checkScale, { friction: 4, tension: 180, toValue: 1, useNativeDriver: nativeDriver }),
        Animated.timing(burst, { duration: 420, toValue: 1, useNativeDriver: nativeDriver }),
      ]).start();
    }
    wasCompleted.current = set.completed;
  }, [burst, checkScale, reduceMotion, set.completed]);

  const handleDelete = useCallback(() => {
    onDelete(set.id);
  }, [onDelete, set.id]);
  const handleApplyPrevious = useCallback(() => {
    onApplyPrevious(set.id);
  }, [onApplyPrevious, set.id]);
  const previousText = !previous
    ? '—'
    : cardio
      ? formatCardioEffort(previous.durationSeconds, previous.distanceKm, unit, previous.setType === 'warmup')
      : formatLoggedLoad(previous.weightKg, previous.reps, unit, previous.setType === 'warmup', showSetup ? (previous.machineSetup ?? null) : undefined);
  const links = useMemo(
    () => ({
      repsId: `${set.id}:reps`,
      rpe: cardio ? null : { id: `${set.id}:rpe`, onChange: handleRpe, value: draft.rpeText },
      weightId: `${set.id}:weight`,
    }),
    [cardio, draft.rpeText, handleRpe, set.id],
  );

  return (
    <SwipeToDelete accessibilityLabel="Delete set" label="Delete" onDelete={handleDelete} style={styles.wrap} testID="set-row">
      <View style={styles.row}>
        <View style={styles.badgeWrap}>
          <SetTypeBadge index={index} onChange={handleSetType} setType={set.setType} />
          {isRecord ? (
            <Text accessibilityLabel="Personal record" maxFontSizeMultiplier={workoutMaxFontScale} style={styles.star}>
              ★
            </Text>
          ) : null}
        </View>
        <Pressable
          accessibilityLabel={previous ? `Apply previous ${previousText}` : undefined}
          accessibilityRole={previous ? 'button' : undefined}
          disabled={!previous}
          onPress={handleApplyPrevious}
          style={styles.previousHit}
        >
          <Text maxFontSizeMultiplier={workoutMaxFontScale} numberOfLines={1} style={styles.previous}>
            {previousText}
          </Text>
        </Pressable>
        {cardio ? (
          <>
            <LogValue
              accessibilityLabel="Time"
              id={`${set.id}:duration`}
              kind="duration"
              links={links}
              onChange={handleDuration}
              order={order}
              style={styles.time}
              unit={unit}
              value={draft.durationText}
            />
            <LogValue
              accessibilityLabel="Distance"
              id={`${set.id}:distance`}
              kind="distance"
              links={links}
              onChange={handleDistance}
              order={order + 1}
              style={styles.distance}
              unit={unit}
              value={draft.distanceText}
            />
          </>
        ) : (
          <LogValue
            accessibilityLabel="Weight"
            id={`${set.id}:weight`}
            kind="weight"
            links={links}
            onChange={handleWeight}
            order={order}
            style={styles.weight}
            unit={unit}
            value={draft.weightText}
          />
        )}
        {cardio ? null : (
          <LogValue
            accessibilityLabel="Reps"
            id={`${set.id}:reps`}
            kind="reps"
            links={links}
            onChange={handleReps}
            order={order + 1}
            style={styles.reps}
            unit={unit}
            value={draft.repsText}
          />
        )}
        {showRpe && !cardio ? (
          <LogValue
            accessibilityLabel="RPE"
            id={`${set.id}:rpe`}
            kind="rpe"
            links={links}
            onChange={handleRpe}
            order={order + 2}
            style={styles.rpe}
            unit={unit}
            value={draft.rpeText}
          />
        ) : null}
        <Pressable
          accessibilityLabel={set.completed ? 'Mark set incomplete' : 'Complete set'}
          accessibilityRole="button"
          accessibilityState={{ checked: set.completed }}
          onPress={handleComplete}
          style={[styles.check, set.completed && styles.checkDone]}
        >
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
          <Animated.Text
            maxFontSizeMultiplier={workoutMaxFontScale}
            style={[styles.checkText, set.completed && styles.checkTextDone, { transform: [{ scale: checkScale }] }]}
          >
            {set.completed ? '✓' : ''}
          </Animated.Text>
        </Pressable>
      </View>
    </SwipeToDelete>
  );
});

const styles = StyleSheet.create({
  burst: {
    backgroundColor: colors.accent,
    borderRadius: 22,
    height: hitTarget,
    position: 'absolute',
    width: hitTarget,
  },
  badgeWrap: {
    position: 'relative',
    width: setColumn.set,
  },
  check: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    height: hitTarget,
    justifyContent: 'center',
    overflow: 'visible',
    width: setColumn.check,
  },
  checkDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkText: {
    ...type.callout,
    color: colors.text,
    fontWeight: '700',
  },
  checkTextDone: {
    color: colors.accentInk,
  },
  previous: {
    ...type.footnote,
    color: colors.muted,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  previousHit: {
    flex: 1,
    justifyContent: 'center',
    minHeight: hitTarget,
    minWidth: 52,
  },
  distance: {
    width: setColumn.distance,
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
    height: hitTarget,
    justifyContent: 'center',
    width: setColumn.set,
  },
  setNumberText: {
    ...type.footnote,
    color: colors.muted,
    fontWeight: '700',
  },
  star: {
    ...type.caption2,
    color: colors.accent,
    fontWeight: '700',
    position: 'absolute',
    right: -2,
    top: 0,
  },
  time: {
    width: setColumn.time,
  },
  weight: {
    width: setColumn.weight,
  },
  wrap: {
    marginTop: 8,
  },
});
