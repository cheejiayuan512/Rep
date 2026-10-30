/**
 * The page right after Finish. The top follows Strong's summary:
 * stars, the session count, and a card of duration, volume, and best sets.
 * XP and badges stay underneath.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { BadgeGlyph } from '../../components/badge-icons';
import { Header, IconButton, TextButton } from '../../components/header';
import { CloseIcon, ShareIcon } from '../../components/icons';
import { Screen } from '../../components/screen';
import { getWorkoutRecap, unfinishWorkout, type WorkoutRecap } from '../../data/repository';
import { activeWorkoutChanged, dataChanged, useAppDispatch } from '../../state/store';
import { formatDuration, formatLoggedLoad, formatLongDate, formatOrdinal } from '../../domain/format';
import type { ProfileBadge } from '../../domain/profile';
import { formatEstimate, formatVolume, kgToDisplay } from '../../domain/units';
import type { WeightUnit } from '../../domain/types';
import type { StackNavigation, StackRoute } from '../../navigation/types';
import { useStored, useWeightUnit } from '../../state/hooks';
import { useReduceMotion } from '../../components/use-reduce-motion';
import { colors } from '../../theme/colors';

const nativeDriver = Platform.OS !== 'web';
const starGold = '#F5C518';

export const WorkoutCompleteScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigation>();
  const route = useRoute<StackRoute<'WorkoutComplete'>>();
  const dispatch = useAppDispatch();
  const { unit } = useWeightUnit();
  const recap = useStored(getWorkoutRecap, route.params.workoutId);
  const [recordsOpen, setRecordsOpen] = useState(false);

  const handleDone = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Tabs');
  }, [navigation]);

  const handleView = useCallback(() => {
    navigation.replace('WorkoutDetail', { workoutId: route.params.workoutId });
  }, [navigation, route.params.workoutId]);

  const handleUndo = useCallback(() => {
    const workoutId = route.params.workoutId;
    void (async () => {
      await unfinishWorkout(workoutId);
      dispatch(activeWorkoutChanged(workoutId));
      dispatch(dataChanged());
      navigation.replace('ActiveWorkout', { workoutId });
    })();
  }, [dispatch, navigation, route.params.workoutId]);

  const handleShare = useCallback(() => {
    if (!recap) {
      return;
    }
    const { workout } = recap;
    const lines = [
      workout.name,
      formatLongDate(workout.startedAt),
      `${formatDuration(workout.startedAt, workout.finishedAt)} · ${formatVolume(kgToDisplay(workout.volumeKg, unit))} ${unit} · ${workout.recordCount} PRs`,
      ...recap.exercises.map((exercise) => {
        const best = exercise.best ? formatLoggedLoad(exercise.best.weightKg, exercise.best.reps, unit) : '—';
        return `${exercise.sets} × ${exercise.name} · ${best}`;
      }),
    ];
    void Share.share({ message: lines.join('\n') }).catch(() => undefined);
  }, [recap, unit]);

  const toggleRecords = useCallback(() => {
    setRecordsOpen((open) => !open);
  }, []);

  return (
    <Screen>
      <Header
        left={
          <IconButton accessibilityLabel="Close" onPress={handleDone}>
            <CloseIcon color={colors.text} size={22} />
          </IconButton>
        }
        right={
          <IconButton accessibilityLabel="Share workout" onPress={handleShare}>
            <ShareIcon color={colors.accent} size={22} />
          </IconButton>
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        {recap ? <RecapBody recap={recap} recordsOpen={recordsOpen} unit={unit} /> : <Text style={styles.muted}>Saving your workout…</Text>}
        <View style={styles.quiet}>
          <TextButton label="Undo finish" onPress={handleUndo} />
          <TextButton label="View workout" onPress={handleView} />
        </View>
      </ScrollView>
      {recap && recap.records.length > 0 ? (
        <Pressable accessibilityRole="button" onPress={toggleRecords} style={styles.pill}>
          <Text style={styles.pillText}>
            ★ {recap.records.length} Personal {recap.records.length === 1 ? 'Record' : 'Records'}
          </Text>
        </Pressable>
      ) : null}
    </Screen>
  );
};

const RecapBody: React.FC<{ recap: WorkoutRecap; unit: WeightUnit; recordsOpen: boolean }> = ({ recap, unit, recordsOpen }) => {
  const { after, before, workout } = recap;
  const gained = after.level.points - before.level.points;
  const leveledUp = after.level.level > before.level.level;
  const newBadges = useMemo(() => upgradedBadges(before.badges, after.badges), [after.badges, before.badges]);

  return (
    <View>
      <Stars />
      <Text style={styles.wellDone}>Well Done!</Text>
      <Text style={styles.subtitle}>That's your {formatOrdinal(recap.sessionNumber)} workout!</Text>

      <View style={styles.summary}>
        <Text style={styles.workoutName}>{workout.name}</Text>
        <Text style={styles.date}>{formatLongDate(workout.startedAt)}</Text>
        <View style={styles.metrics}>
          <Metric label={formatDuration(workout.startedAt, workout.finishedAt)} />
          <Metric label={`${formatVolume(kgToDisplay(workout.volumeKg, unit))} ${unit}`} />
          <Metric label={`${workout.recordCount} PRs`} />
        </View>
        <View style={styles.tableHead}>
          <Text style={styles.tableLabel}>Exercise</Text>
          <Text style={styles.tableLabel}>Best Set</Text>
        </View>
        {recap.exercises.map((exercise) => (
          <View key={exercise.name} style={styles.tableRow}>
            <Text style={styles.exerciseName}>
              {exercise.sets} × {exercise.name}
            </Text>
            <Text style={styles.bestSet}>{exercise.best ? formatLoggedLoad(exercise.best.weightKg, exercise.best.reps, unit) : '—'}</Text>
          </View>
        ))}
        {recordsOpen
          ? recap.records.map((record) => (
              <Text key={record.name} style={styles.recordLine}>
                {record.name} · est. 1RM {formatEstimate(kgToDisplay(record.oneRepMaxKg, unit))} {unit}
              </Text>
            ))
          : null}
      </View>

      <View style={styles.card}>
        <View style={styles.xpHead}>
          <Text style={styles.xpGain}>+{gained} XP</Text>
          {leveledUp ? <Text style={styles.levelUp}>Level up!</Text> : null}
        </View>
        <Text style={styles.levelLine}>
          Level {after.level.level} of {after.level.maxLevel} · {after.level.title}
        </Text>
        <XpBar after={after.level} before={before.level} />
        <Text style={styles.muted}>
          {after.level.toNext == null ? 'Top level reached.' : `${after.level.toNext.toLocaleString()} XP to level ${after.level.level + 1}`}
        </Text>
      </View>

      {newBadges.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.section}>{newBadges.length === 1 ? 'Badge unlocked' : 'Badges unlocked'}</Text>
          {newBadges.map((badge) => (
            <View key={badge.id} style={styles.badgeRow}>
              <BadgeGlyph color={colors.accent} id={badge.id} size={26} />
              <View style={styles.badgeCopy}>
                <Text style={styles.badgeName}>
                  {badge.title} · {badge.detail}
                </Text>
                <Text style={styles.muted}>{badge.description}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
};

function upgradedBadges(before: ProfileBadge[], after: ProfileBadge[]): ProfileBadge[] {
  const rank = { expert: 3, locked: 0, novice: 1, regular: 2 } as const;
  return after.filter((badge) => {
    const previous = before.find((item) => item.id === badge.id);
    return rank[badge.tier] > rank[previous?.tier ?? 'locked'];
  });
}

const Metric: React.FC<{ label: string }> = ({ label }) => <Text style={styles.metric}>{label}</Text>;

const XpBar: React.FC<{ before: WorkoutRecap['before']['level']; after: WorkoutRecap['after']['level'] }> = ({ after, before }) => {
  const ratioOf = (points: number) => {
    if (after.ceiling == null) {
      return 1;
    }
    return Math.min(1, Math.max(0, (points - after.floor) / Math.max(1, after.ceiling - after.floor)));
  };
  const start = after.level > before.level ? 0 : ratioOf(before.points);
  const fill = useRef(new Animated.Value(start)).current;

  const reduceMotion = useReduceMotion();
  const target = ratioOf(after.points);
  useEffect(() => {
    if (reduceMotion) {
      fill.setValue(target);
      return;
    }
    Animated.timing(fill, { delay: 450, duration: 1100, easing: Easing.out(Easing.cubic), toValue: target, useNativeDriver: false }).start();
  }, [fill, reduceMotion, target]);

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.track}>
      <Animated.View style={[styles.trackFill, { width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
    </View>
  );
};

const Stars: React.FC = () => {
  const left = useRef(new Animated.Value(0)).current;
  const middle = useRef(new Animated.Value(0)).current;
  const right = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReduceMotion();
  useEffect(() => {
    if (reduceMotion) {
      left.setValue(1);
      middle.setValue(1);
      right.setValue(1);
      return;
    }
    Animated.stagger(90, [left, middle, right].map((value) => Animated.spring(value, { friction: 5, tension: 80, toValue: 1, useNativeDriver: nativeDriver }))).start();
  }, [left, middle, reduceMotion, right]);
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.stars}>
      <Animated.Text style={[styles.star, styles.starSide, { transform: [{ scale: left }] }]}>★</Animated.Text>
      <Animated.Text style={[styles.star, styles.starMiddle, { transform: [{ scale: middle }] }]}>★</Animated.Text>
      <Animated.Text style={[styles.star, styles.starSide, { transform: [{ scale: right }] }]}>★</Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeCopy: {
    flex: 1,
  },
  badgeName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  badgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  bestSet: {
    color: colors.text,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  date: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 4,
  },
  exerciseName: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    paddingRight: 12,
  },
  levelLine: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
  },
  levelUp: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '800',
  },
  metric: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  metrics: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 14,
  },
  muted: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  quiet: {
    alignItems: 'center',
    marginTop: 18,
  },
  pill: {
    alignSelf: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: 999,
    bottom: 28,
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: 'absolute',
  },
  pillText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  recordLine: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  section: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  star: {
    color: starGold,
  },
  starMiddle: {
    fontSize: 54,
    marginHorizontal: 6,
  },
  starSide: {
    fontSize: 34,
    marginTop: 10,
  },
  stars: {
    alignItems: 'flex-end',
    alignSelf: 'center',
    flexDirection: 'row',
    marginTop: 8,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    marginTop: 6,
    textAlign: 'center',
  },
  summary: {
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 28,
    padding: 16,
  },
  tableHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  tableLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  track: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 999,
    height: 10,
    marginTop: 10,
    overflow: 'hidden',
  },
  trackFill: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 10,
  },
  wellDone: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 8,
    textAlign: 'center',
  },
  workoutName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  xpGain: {
    color: colors.accent,
    fontSize: 26,
    fontWeight: '800',
  },
  xpHead: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
