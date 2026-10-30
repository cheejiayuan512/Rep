/**
 * The set badge. Tap it and Normal, Warm-up, Drop, or Failure hover over the
 * row. The list under the badge does not move.
 */
import React, { useCallback, useRef, useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { SetType } from '../domain/types';
import { setTypeLabel, setTypeMark } from '../domain/types';
import { colors } from '../theme/colors';

const choices: SetType[] = ['normal', 'warmup', 'drop', 'failure'];
const MENU_WIDTH = 168;
const ROW_HEIGHT = 40;

interface Anchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SetTypeBadgeProps {
  setType: SetType;
  index: number;
  onChange: (setType: SetType) => void;
}

export const SetTypeBadge: React.FC<SetTypeBadgeProps> = React.memo(function SetTypeBadge({ setType, index, onChange }) {
  const anchorRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor>({ height: 0, width: 0, x: 12, y: 12 });
  const mark = setTypeMark(setType);
  const close = useCallback(() => setOpen(false), []);
  const openMenu = useCallback(() => {
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ height, width, x, y });
      setOpen(true);
    });
  }, []);
  const choose = useCallback(
    (next: SetType) => {
      setOpen(false);
      if (next !== setType) {
        onChange(next);
      }
    },
    [onChange, setType],
  );

  return (
    <>
      <Pressable
        accessibilityLabel={`${setTypeLabel(setType)}. Change set type`}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        collapsable={false}
        onPress={openMenu}
        ref={anchorRef}
        style={styles.badge}
      >
        <Text style={[styles.mark, setType === 'drop' && styles.drop, setType === 'failure' && styles.failure]}>{mark ?? String(index + 1)}</Text>
      </Pressable>
      {open ? (
        <Modal animationType="none" onRequestClose={close} statusBarTranslucent transparent visible>
          <SetTypeMenu anchor={anchor} onChange={choose} onClose={close} value={setType} />
        </Modal>
      ) : null}
    </>
  );
});

const SetTypeMenu: React.FC<{ anchor: Anchor; value: SetType; onChange: (setType: SetType) => void; onClose: () => void }> = ({ anchor, onChange, onClose, value }) => {
  const window = Dimensions.get('window');
  const menuHeight = choices.length * ROW_HEIGHT + 8;
  let top = anchor.y + anchor.height + 6;
  if (top + menuHeight > window.height - 12) {
    top = Math.max(12, anchor.y - menuHeight - 6);
  }
  let left = anchor.x;
  if (left + MENU_WIDTH > window.width - 12) {
    left = Math.max(12, window.width - MENU_WIDTH - 12);
  }

  return (
    <View style={styles.modal}>
      <Pressable accessibilityLabel="Close set types" onPress={onClose} style={styles.backdrop} />
      <View style={[styles.menu, { left, top }]}>
        {choices.map((choice) => (
          <TypeChoice current={value} key={choice} onChange={onChange} setType={choice} />
        ))}
      </View>
    </View>
  );
};

const TypeChoice: React.FC<{ setType: SetType; current: SetType; onChange: (setType: SetType) => void }> = ({ setType, current, onChange }) => {
  const selected = setType === current;
  const handlePress = useCallback(() => {
    onChange(setType);
  }, [onChange, setType]);
  const mark = setTypeMark(setType);
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={handlePress} style={[styles.choice, selected && styles.choiceSelected]}>
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{mark ? `${mark}  ${setTypeLabel(setType)}` : setTypeLabel(setType)}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  badge: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 26,
  },
  choice: {
    borderRadius: 8,
    height: ROW_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  choiceSelected: {
    backgroundColor: colors.accent,
  },
  choiceText: {
    color: colors.text,
    fontSize: 14,
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
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    position: 'absolute',
    width: MENU_WIDTH,
  },
  modal: {
    flex: 1,
  },
});
