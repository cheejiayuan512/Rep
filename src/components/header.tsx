/**
 * The bar at the top of a pushed screen: a left button, a title, and a right button.
 * TextButton is the small word-style button used for Finish, Discard, and Back.
 */
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

interface HeaderProps {
  title?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  children?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, left, right, children }) => {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.side}>{left}</View>
        {title ? <Text style={styles.title}>{title}</Text> : <View style={styles.flex} />}
        <View style={[styles.side, styles.right]}>{right}</View>
      </View>
      {children}
    </View>
  );
};

interface IconButtonProps {
  accessibilityLabel: string;
  onPress: () => void;
  children: React.ReactNode;
}

export const IconButton: React.FC<IconButtonProps> = ({ accessibilityLabel, children, onPress }) => {
  return (
    <Pressable accessibilityLabel={accessibilityLabel} accessibilityRole="button" hitSlop={8} onPress={onPress} style={styles.iconButton}>
      {children}
    </Pressable>
  );
};

interface TextButtonProps {
  label: string;
  onPress: () => void;
  tone?: 'default' | 'accent' | 'danger';
  disabled?: boolean;
}

export const TextButton: React.FC<TextButtonProps> = ({ label, onPress, tone = 'default', disabled = false }) => {
  const handlePress = useCallback(() => {
    if (!disabled) {
      onPress();
    }
  }, [disabled, onPress]);

  return (
    <Pressable accessibilityRole="button" disabled={disabled} hitSlop={8} onPress={handlePress} style={styles.textButton}>
      <Text style={[styles.textButtonLabel, tone === 'accent' && styles.accent, tone === 'danger' && styles.danger, disabled && styles.disabled]}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  accent: {
    color: colors.accent,
  },
  danger: {
    color: colors.danger,
  },
  disabled: {
    opacity: 0.4,
  },
  flex: {
    flex: 1,
  },
  iconButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  right: {
    alignItems: 'flex-end',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 44,
  },
  side: {
    minWidth: 72,
  },
  textButton: {
    paddingVertical: 8,
  },
  textButtonLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  wrap: {
    paddingBottom: 8,
    paddingHorizontal: 20,
  },
});
