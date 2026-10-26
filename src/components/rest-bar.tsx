/**
 * The bar at the bottom after you check off a set.
 * It counts down on its own. Skip, -15, and +15 are passed in by the workout screen.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatClock } from '../domain/format';
import { colors } from '../theme/colors';
import { TextButton } from './header';

interface RestBarProps {
  endsAt: number;
  onSubtract: () => void;
  onAdd: () => void;
  onSkip: () => void;
  /** Pixels to sit above a logging pad. Zero keeps the bar on the screen bottom. */
  lift?: number;
}

export const RestBar: React.FC<RestBarProps> = ({ endsAt, onSubtract, onAdd, onSkip, lift = 0 }) => {
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={[styles.rest, { bottom: lift, paddingBottom: lift > 0 ? 12 : insets.bottom + 12 }]}>
      <View>
        <Text style={styles.restLabel}>Rest</Text>
        <Text style={styles.restTime}>{formatClock((endsAt - now) / 1000)}</Text>
      </View>
      <View style={styles.restActions}>
        <TextButton label="-15" onPress={onSubtract} />
        <TextButton label="+15" onPress={onAdd} />
        <TextButton label="Skip" onPress={onSkip} tone="accent" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  rest: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    position: 'absolute',
    right: 0,
  },
  restActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  restLabel: {
    color: colors.faint,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  restTime: {
    color: colors.text,
    fontSize: 28,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
});
