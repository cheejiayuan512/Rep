/**
 * A hide-keyboard chip above the number pad on iOS and Android. Number pads
 * have no return key, and some Android decimal pads hide theirs. Web has no
 * keyboard chrome, so this renders nothing there.
 *
 * Mount once at the app root. iOS overlays the chip on the keyboard; Android
 * sits it at the bottom of the resized window.
 */
import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';

import { colors } from '../theme/colors';
import { KeyboardHideIcon } from './icons';

/** Kept so number fields can still point at an accessory. Unused on either platform. */
export const keyboardDoneId: string | undefined = undefined;

function dismiss(): void {
  Keyboard.dismiss();
}

export const KeyboardDoneBar: React.FC = () => {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const changeEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidChangeFrame';
    const onShow = (event: { endCoordinates: { height: number } }) => {
      setHeight(event.endCoordinates.height);
    };
    const show = Keyboard.addListener(showEvent, onShow);
    const change = Keyboard.addListener(changeEvent, onShow);
    const hide = Keyboard.addListener(hideEvent, () => {
      setHeight(0);
    });
    return () => {
      show.remove();
      change.remove();
      hide.remove();
    };
  }, []);

  if (Platform.OS === 'web' || height <= 0) {
    return null;
  }

  const chip = (
    <View style={styles.row}>
      <Pressable accessibilityLabel="Hide keyboard" accessibilityRole="button" onPress={dismiss} style={styles.chip}>
        <KeyboardHideIcon color={colors.accentInk} size={22} />
      </Pressable>
    </View>
  );

  if (Platform.OS === 'android') {
    return chip;
  }

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <View style={[styles.anchor, { bottom: height }]}>{chip}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  anchor: {
    left: 0,
    position: 'absolute',
    right: 0,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: '#F4F7FB',
    borderRadius: 10,
    elevation: 4,
    height: 40,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    width: 52,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
  },
  row: {
    alignItems: 'flex-end',
    paddingBottom: 6,
    paddingHorizontal: 12,
  },
});
