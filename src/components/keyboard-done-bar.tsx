/**
 * The iOS number pad has no return key, so inputs that use it attach this bar
 * with a Done button that hides the keyboard. Android and web render nothing.
 */
import React from 'react';
import { InputAccessoryView, Keyboard, Platform, StyleSheet, View } from 'react-native';

import { colors } from '../theme/colors';
import { TextButton } from './header';

export const keyboardDoneId = Platform.OS === 'ios' ? 'rep-keyboard-done' : undefined;

function dismiss(): void {
  Keyboard.dismiss();
}

export const KeyboardDoneBar: React.FC = () => {
  if (Platform.OS !== 'ios' || !keyboardDoneId) {
    return null;
  }

  return (
    <InputAccessoryView nativeID={keyboardDoneId}>
      <View style={styles.bar}>
        <TextButton label="Done" onPress={dismiss} tone="accent" />
      </View>
    </InputAccessoryView>
  );
};

const styles = StyleSheet.create({
  bar: {
    alignItems: 'flex-end',
    backgroundColor: colors.surfaceRaised,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
