/**
 * The dark page background. It pads the top so content sits below the notch.
 * Pass `bottomInset` when the page should also clear the home indicator.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';

interface ScreenProps {
  children: React.ReactNode;
  bottomInset?: boolean;
}

export const Screen: React.FC<ScreenProps> = ({ children, bottomInset = false }) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.screen,
        {
          paddingBottom: bottomInset ? insets.bottom : 0,
          paddingLeft: insets.left,
          paddingRight: insets.right,
          paddingTop: insets.top,
        },
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.bg,
    flex: 1,
  },
});
