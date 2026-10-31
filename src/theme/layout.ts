/**
 * A few shared layout styles. Most components keep their own StyleSheet
 * at the bottom of the file instead of using this.
 *
 * Tab titles (Rep, History, Progress, Profile) share `screenTitle` and
 * `screenTitleInset` so the word sits in the same place on every tab.
 */
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { colors } from './colors';

export const screenTitle: TextStyle = {
  color: colors.text,
  fontSize: 34,
  fontWeight: '800',
  lineHeight: 40,
};

export const screenTitleInset: ViewStyle = {
  paddingHorizontal: 20,
  paddingTop: 8,
};

export const layout = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  fill: {
    flex: 1,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});
