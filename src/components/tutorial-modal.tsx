/**
 * A short first-run tour. Profile can open it again after it has been dismissed.
 */
import React, { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

interface TutorialModalProps {
  onClose: () => void;
}

const steps = [
  {
    title: 'Start a workout',
    body: 'On the Workout tab, tap Start workout. A routine starts the same way, with its exercises already on the page.',
  },
  {
    title: 'Log each set',
    body: 'Add an exercise, enter the weight and reps, then check the set. Swipe a set left to delete it. Warmups stay out of the totals.',
  },
  {
    title: 'Cable attachments',
    body: 'A cable exercise can be added again when the attachment is different, such as a rope and a straight bar. Previous and records stay with that attachment.',
  },
  {
    title: 'Finish, then look back',
    body: 'Finish saves the session. History keeps it, and Progress charts it. You can open this tour again from Profile.',
  },
] as const;

export const TutorialModal: React.FC<TutorialModalProps> = ({ onClose }) => {
  const [step, setStep] = useState(0);
  const current = steps[step] ?? steps[0];
  const last = step >= steps.length - 1;
  const goNext = useCallback(() => {
    if (last) {
      onClose();
      return;
    }
    setStep((index) => Math.min(steps.length - 1, index + 1));
  }, [last, onClose]);
  const goBack = useCallback(() => {
    setStep((index) => Math.max(0, index - 1));
  }, []);

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.kicker}>
            {step + 1} of {steps.length}
          </Text>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.body}>{current.body}</Text>
          <View style={styles.dots}>
            {steps.map((item, index) => (
              <View key={item.title} style={[styles.dot, index === step && styles.dotOn]} />
            ))}
          </View>
          <View style={styles.actions}>
            {step > 0 ? (
              <Pressable accessibilityRole="button" onPress={goBack} style={styles.quiet}>
                <Text style={styles.quietText}>Back</Text>
              </Pressable>
            ) : (
              <Pressable accessibilityRole="button" onPress={onClose} style={styles.quiet}>
                <Text style={styles.quietText}>Skip</Text>
              </Pressable>
            )}
            <Pressable accessibilityRole="button" onPress={goNext} style={styles.next}>
              <Text style={styles.nextText}>{last ? 'Got it' : 'Next'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 22,
  },
  backdrop: {
    backgroundColor: colors.overlay,
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  body: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 22,
    marginTop: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    padding: 22,
  },
  dot: {
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  dotOn: {
    backgroundColor: colors.accent,
    width: 16,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 18,
  },
  kicker: {
    color: colors.faint,
    fontSize: 12,
    fontWeight: '700',
  },
  next: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 12,
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
  },
  nextText: {
    color: colors.accentInk,
    fontSize: 16,
    fontWeight: '800',
  },
  quiet: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 12,
  },
  quietText: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '700',
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 6,
  },
});
