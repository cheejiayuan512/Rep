/**
 * A hide-keyboard chip above the number pad. Number pads have no return key.
 * iOS must use InputAccessoryView — a root overlay sits behind the workout
 * modal and never appears. Android has no accessory view, so the chip sits
 * at the bottom of the resized window. Web has no keyboard chrome.
 *
 * Mount once at the app root. Number fields point at `keyboardDoneId`.
 */
import React, { useEffect, useState } from 'react';
import { InputAccessoryView, Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';

import { colors } from '../theme/colors';
import { KeyboardHideIcon } from './icons';

export const keyboardDoneId = Platform.OS === 'ios' ? 'rep-hide-keyboard' : undefined;

function dismiss(): void {
  Keyboard.dismiss();
}

const HideChip: React.FC = () => (
  <View style={styles.row}>
    <Pressable accessibilityLabel="Hide keyboard" accessibilityRole="button" onPress={dismiss} style={styles.chip}>
      <KeyboardHideIcon color={colors.accentInk} size={22} />
    </Pressable>
  </View>
);

export const KeyboardDoneBar: React.FC = () => {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }
    const onShow = (event: { endCoordinates: { height: number } }) => {
      setHeight(event.endCoordinates.height);
    };
    const show = Keyboard.addListener('keyboardDidShow', onShow);
    const change = Keyboard.addListener('keyboardDidChangeFrame', onShow);
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setHeight(0);
    });
    return () => {
      show.remove();
      change.remove();
      hide.remove();
    };
  }, []);

  if (Platform.OS === 'ios' && keyboardDoneId) {
    return (
      <InputAccessoryView backgroundColor="transparent" nativeID={keyboardDoneId}>
        <HideChip />
      </InputAccessoryView>
    );
  }

  if (Platform.OS !== 'android' || height <= 0) {
    return null;
  }

  return <HideChip />;
};

const styles = StyleSheet.create({
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
  row: {
    alignItems: 'flex-end',
    paddingBottom: 6,
    paddingHorizontal: 12,
    paddingTop: 4,
  },
});
