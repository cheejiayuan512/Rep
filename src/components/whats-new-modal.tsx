/**
 * One-shot notice from the remote whats-new.json. Dismiss stores that notice id.
 */
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { WhatsNewNotice } from '../domain/whats-new';
import { colors } from '../theme/colors';

interface WhatsNewModalProps {
  notice: WhatsNewNotice;
  onClose: () => void;
}

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ notice, onClose }) => (
  <Modal animationType="fade" onRequestClose={onClose} transparent visible>
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <Text style={styles.kicker}>What's new</Text>
        <Text style={styles.title}>{notice.title}</Text>
        {notice.bullets.map((bullet) => (
          <Text key={bullet} style={styles.bullet}>
            • {bullet}
          </Text>
        ))}
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.done}>
          <Text style={styles.doneText}>Got it</Text>
        </Pressable>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: colors.overlay,
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  bullet: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 22,
    marginTop: 10,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    padding: 22,
  },
  done: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 12,
    marginTop: 22,
    minHeight: 48,
    justifyContent: 'center',
  },
  doneText: {
    color: colors.accentInk,
    fontSize: 16,
    fontWeight: '800',
  },
  kicker: {
    color: colors.faint,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
    marginTop: 6,
  },
});
