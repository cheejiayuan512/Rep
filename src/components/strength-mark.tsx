/**
 * Five short bars, Beginner through Elite, beside an exercise name.
 * The fill is static. Nothing moves when the level changes.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { STRENGTH_LEVELS, type StrengthRating } from '../domain/strength';
import { colors } from '../theme/colors';

interface StrengthMarkProps {
  rating: Pick<StrengthRating, 'level' | 'levelIndex' | 'percentile' | 'progress'>;
}

export const StrengthMark: React.FC<StrengthMarkProps> = React.memo(function StrengthMark({ rating }) {
  return (
    <View
      accessibilityLabel={`${rating.level}, stronger than ${rating.percentile} percent of lifters`}
      accessible
      style={styles.mark}
    >
      <View style={styles.segments}>
        {STRENGTH_LEVELS.map((level, index) => {
          const fill = index <= rating.levelIndex ? 1 : index === rating.levelIndex + 1 ? rating.progress : 0;
          return (
            <View key={level} style={styles.segment}>
              <View style={[styles.fill, { width: `${Math.round(fill * 100)}%` }]} />
            </View>
          );
        })}
      </View>
      <Text numberOfLines={1} style={styles.level}>
        {rating.level}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  fill: {
    backgroundColor: colors.accent,
    height: '100%',
  },
  level: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    maxWidth: 92,
  },
  mark: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    gap: 6,
  },
  segment: {
    backgroundColor: colors.border,
    borderRadius: 2,
    height: 8,
    overflow: 'hidden',
    width: 7,
  },
  segments: {
    flexDirection: 'row',
    gap: 2,
  },
});
