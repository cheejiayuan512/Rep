/**
 * A few shared layout styles. Most components keep their own StyleSheet
 * at the bottom of the file instead of using this.
 */
import { StyleSheet } from 'react-native';

import { colors } from './colors';

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
