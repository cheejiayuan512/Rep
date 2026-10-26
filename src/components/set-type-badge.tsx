/**
 * The set badge. Tap it to choose Normal, Warm-up, Drop, or Failure.
 * The check on the row stays one tap, so logging a filled set does not get slower.
 */
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { SetType } from '../domain/types';
import { setTypeLabel, setTypeMark } from '../domain/types';
import { colors } from '../theme/colors';

const choices: SetType[] = ['normal', 'warmup', 'drop', 'failure'];

interface SetTypeBadgeProps {
  setType: SetType;
  index: number;
  open: boolean;
  onPress: () => void;
}

export const SetTypeBadge: React.FC<SetTypeBadgeProps> = React.memo(function SetTypeBadge({ setType, index, open, onPress }) {
  const mark = setTypeMark(setType);
  return (
    <Pressable accessibilityLabel={`${setTypeLabel(setType)}. Change set type`} accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onPress} style={styles.badge}>
      <Text style={[styles.mark, setType === 'drop' && styles.drop, setType === 'failure' && styles.failure]}>{mark ?? String(index + 1)}</Text>
    </Pressable>
  );
});

interface SetTypeMenuProps {
  value: SetType;
  onChange: (setType: SetType) => void;
}

export const SetTypeMenu: React.FC<SetTypeMenuProps> = React.memo(function SetTypeMenu({ value, onChange }) {
  return (
    <View style={styles.menu}>
      {choices.map((choice) => (
        <TypeChoice current={value} key={choice} onChange={onChange} setType={choice} />
      ))}
    </View>
  );
});

const TypeChoice: React.FC<{ setType: SetType; current: SetType; onChange: (setType: SetType) => void }> = ({ setType, current, onChange }) => {
  const selected = setType === current;
  const handlePress = useCallback(() => {
    onChange(setType);
  }, [onChange, setType]);
  const mark = setTypeMark(setType);
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={handlePress} style={[styles.choice, selected && styles.choiceSelected]}>
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{mark ? `${mark} ${setTypeLabel(setType)}` : setTypeLabel(setType)}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 26,
  },
  choice: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  choiceSelected: {
    backgroundColor: colors.accent,
  },
  choiceText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  choiceTextSelected: {
    color: colors.accentInk,
  },
  drop: {
    color: colors.accent,
  },
  failure: {
    color: colors.danger,
  },
  mark: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  menu: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingBottom: 6,
    paddingTop: 2,
  },
});
