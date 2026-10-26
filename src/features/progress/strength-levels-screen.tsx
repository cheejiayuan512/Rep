/**
 * Strength levels: each main lift's best estimated 1RM against standards for
 * your bodyweight, age, and sex, from Beginner to Elite, with a rough percentile.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { BodyProfileForm } from '../../components/body-profile-form';
import { Header, TextButton } from '../../components/header';
import { Screen } from '../../components/screen';
import { formatWorkoutWhen } from '../../domain/format';
import { STRENGTH_LEVELS, type StrengthRating } from '../../domain/strength';
import { formatWeight, kgToDisplay } from '../../domain/units';
import type { WeightUnit } from '../../domain/types';
import type { StackNavigation } from '../../navigation/types';
import { useBodyProfile, useStrengthOverview, useWeightUnit } from '../../state/hooks';
import { colors } from '../../theme/colors';

export const StrengthLevelsScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigation>();
  const { unit } = useWeightUnit();
  const { body, setBody } = useBodyProfile();
  const overview = useStrengthOverview();
  const ready = body.bodyweightKg != null && body.sex != null;
  const best = overview?.ratings[0] ?? null;

  return (
    <Screen bottomInset>
      <Header left={<TextButton label="Back" onPress={navigation.goBack} />} title="Strength levels" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>Your best estimated 1RM on each main lift, compared with other lifters at your bodyweight and age.</Text>
        <View style={styles.card}>
          <BodyProfileForm body={body} onChange={setBody} unit={unit} />
        </View>
        {!ready ? (
          <Text style={styles.prompt}>Enter your bodyweight and pick a standards table to see where you stand. Age scales the table; peak is 24–39.</Text>
        ) : !overview || overview.ratings.length === 0 ? (
          <Text style={styles.prompt}>Log a working set of 10 reps or fewer on one of the lifts below to get a level.</Text>
        ) : (
          <View>
            {best ? (
              <View style={styles.hero}>
                <Text style={styles.heroKicker}>Strongest lift</Text>
                <Text style={styles.heroTitle}>
                  {best.liftName} · {best.level}
                </Text>
                <Text style={styles.heroText}>Stronger than about {best.percentile}% of lifters</Text>
              </View>
            ) : null}
            {overview.ratings.map((rating) => (
              <RatingCard key={rating.exerciseId} rating={rating} unit={unit} />
            ))}
          </View>
        )}
        {overview && overview.untrained.length > 0 ? (
          <View>
            <Text style={styles.section}>Not logged yet</Text>
            <Text style={styles.muted}>{overview.untrained.map((lift) => lift.name).join(' · ')}</Text>
          </View>
        ) : null}
        <Text style={styles.note}>
          Levels follow common strength standards: Beginner, Novice, Intermediate, Advanced, and Elite sit near the 5th, 20th, 50th, 80th, and 95th percentile of people who
          lift. Thresholds rise with bodyweight to the ⅔ power and drop for ages outside 24–39. Most people who don&apos;t train would sit below Beginner, so against the
          general population you rank higher than shown. Estimates use Epley on sets of 10 reps or fewer.
        </Text>
      </ScrollView>
    </Screen>
  );
};

const RatingCard: React.FC<{ rating: StrengthRating & { achievedAt: number }; unit: WeightUnit }> = React.memo(function RatingCard({ rating, unit }) {
  const show = (kg: number) => `${formatWeight(Math.round(kgToDisplay(kg, unit)))} ${unit}`;
  return (
    <View accessibilityLabel={`${rating.liftName}, ${rating.level}, stronger than ${rating.percentile} percent of lifters`} style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.flex}>
          <Text style={styles.lift}>{rating.liftName}</Text>
          <Text style={styles.muted}>
            Est. 1RM {show(rating.oneRepMaxKg)} · {formatWorkoutWhen(rating.achievedAt)}
          </Text>
        </View>
        <View style={styles.levelPill}>
          <Text style={styles.levelText}>{rating.level}</Text>
        </View>
      </View>
      <LevelScale rating={rating} />
      <View style={styles.scaleLabels}>
        {STRENGTH_LEVELS.map((level, index) => (
          <View key={level} style={styles.scaleLabel}>
            <Text numberOfLines={1} style={[styles.scaleName, index <= rating.levelIndex && styles.scaleNameOn]}>
              {level}
            </Text>
            <Text style={styles.scaleKg}>{show(rating.thresholdsKg[index] ?? 0)}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.percentile}>
        Stronger than about {rating.percentile}% of lifters
        {rating.nextLevel && rating.nextKg ? ` · ${show(rating.nextKg - rating.oneRepMaxKg)} to ${rating.nextLevel}` : ''}
      </Text>
    </View>
  );
});

/** Five segments, filled up to the current level, with a partial fill toward the next. */
const LevelScale: React.FC<{ rating: StrengthRating }> = ({ rating }) => (
  <View style={styles.scale}>
    {STRENGTH_LEVELS.map((level, index) => {
      const fill = index <= rating.levelIndex ? 1 : index === rating.levelIndex + 1 ? rating.progress : 0;
      return (
        <View key={level} style={styles.segment}>
          <View style={[styles.segmentFill, { width: `${fill * 100}%` }]} />
        </View>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 14,
    padding: 14,
  },
  cardHead: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  flex: {
    flex: 1,
  },
  hero: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    marginTop: 14,
    padding: 16,
  },
  heroKicker: {
    color: colors.accentInk,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroText: {
    color: colors.accentInk,
    fontSize: 14,
    marginTop: 4,
  },
  heroTitle: {
    color: colors.accentInk,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  lead: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  levelPill: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  levelText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
  },
  lift: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  muted: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  note: {
    color: colors.faint,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 24,
  },
  percentile: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
  },
  prompt: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 16,
  },
  scale: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 12,
  },
  scaleKg: {
    color: colors.faint,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  scaleLabel: {
    flex: 1,
  },
  scaleLabels: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  scaleName: {
    color: colors.faint,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  scaleNameOn: {
    color: colors.accent,
  },
  section: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 22,
  },
  segment: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 999,
    flex: 1,
    height: 8,
    overflow: 'hidden',
  },
  segmentFill: {
    backgroundColor: colors.accent,
    height: 8,
  },
});
