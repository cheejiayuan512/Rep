/**
 * A Done button above the keyboard on iOS and Android. Number pads have no
 * return key, and some Android decimal pads hide theirs. Web has no keyboard
 * chrome, so this renders nothing there.
 *
 * Mount once at the app root. iOS overlays the bar on the keyboard; Android
 * sits it at the bottom of the resized window.
 */
import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, StyleSheet, View } from 'react-native';

import { colors } from '../theme/colors';
import { TextButton } from './header';

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

  const bar = (
    <View style={styles.bar}>
      <TextButton label="Done" onPress={dismiss} tone="accent" />
    </View>
  );

  if (Platform.OS === 'android') {
    return bar;
  }

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <View style={[styles.anchor, { bottom: height }]}>{bar}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  anchor: {
    left: 0,
    position: 'absolute',
    right: 0,
  },
  bar: {
    alignItems: 'flex-end',
    backgroundColor: colors.surfaceRaised,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
  },
});
