/**
 * A popup that asks before a destructive action, such as discarding a workout.
 * Removing one exercise does not use this. That delete happens immediately.
 */
import React, { useCallback } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';

import { colors } from '../theme/colors';
import { Button } from './button';

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  hideCancel?: boolean;
  onConfirm: () => void;
}

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  hideCancel?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmLabel,
  destructive = false,
  hideCancel = false,
  onConfirm,
  onCancel,
}) => {
  const handleConfirm = useCallback(() => {
    onConfirm();
  }, [onConfirm]);
  const handleCardPress = useCallback((event: GestureResponderEvent) => {
    event.stopPropagation();
  }, []);

  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
      <Pressable accessibilityRole="button" onPress={hideCancel ? undefined : onCancel} style={styles.backdrop}>
        <Pressable onPress={handleCardPress} style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            {hideCancel ? null : <Button label="Cancel" onPress={onCancel} style={styles.action} variant="secondary" />}
            <Button label={confirmLabel} onPress={handleConfirm} style={styles.action} variant={destructive ? 'danger' : 'primary'} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  action: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  backdrop: {
    alignItems: 'center',
    backgroundColor: colors.overlay,
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 420,
    padding: 20,
    width: '100%',
  },
  message: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
});
