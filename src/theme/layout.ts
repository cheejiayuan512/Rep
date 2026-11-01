/**
 * Shared layout tokens. Prefer typography + spacing for new UI.
 *
 * Tab titles (Rep, History, Progress, Profile) share `screenTitle` and
 * `screenTitleInset` so the word sits in the same place on every tab.
 */
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { colors } from './colors';
import { space } from './spacing';
import { type } from './typography';

export const screenTitle: TextStyle = {
  ...type.largeTitle,
  color: colors.text,
};

export const screenTitleInset: ViewStyle = {
  paddingHorizontal: space.lg,
  paddingTop: space.xs,
};

export const layout = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    padding: space.md,
  },
  fill: {
    flex: 1,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});
