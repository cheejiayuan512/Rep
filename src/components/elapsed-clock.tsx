/**
 * How long this workout has been open.
 * The clock updates itself every second. The page around it does not redraw
 * on that tick, so typing in a set stays smooth.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { formatClock } from '../domain/format';
import { colors } from '../theme/colors';

interface ElapsedClockProps {
  startedAt: number;
}

export const ElapsedClock: React.FC<ElapsedClockProps> = ({ startedAt }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return <Text style={styles.elapsed}>{formatClock((now - startedAt) / 1000)}</Text>;
};

const styles = StyleSheet.create({
  elapsed: {
    color: colors.muted,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
});
