/**
 * The message shown when a list has nothing in it yet, plus an optional button.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { Button } from './button';

interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, message, actionLabel, onAction }) => {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} style={styles.button} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    alignSelf: 'stretch',
    marginTop: 16,
  },
  message: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
    textAlign: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  wrap: {
    alignItems: 'center',
    // The same gutter as the screens, so the button lines up with full-width buttons above it.
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
});
